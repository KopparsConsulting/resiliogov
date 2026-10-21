"""Regelverkschatt. Hämtar kravtexter ur databasen (som den inloggade
användaren, RLS gäller), bygger kontext och strömmar svaret som SSE med samma
händelseformat som prototypen: först {"type":"sources"}, sedan textdelta.

Sökningen är i första versionen samma nyckelordspoängsättning som prototypen.
Nästa steg: embeddings i pgvector (se embed.py) – sökningen byts då här utan
att gränssnittet påverkas."""
import json
import os
import re
from typing import AsyncIterator

import psycopg
from pydantic import BaseModel

from . import llm

DATABASE_URL = os.environ["DATABASE_URL"]

STOPWORDS = {"hur", "vad", "när", "var", "vilka", "vilken", "vilket", "vem", "ska", "bör", "måste", "kan", "får", "har", "är",
             "blir", "vara", "att", "och", "eller", "men", "som", "för", "med", "till", "från", "den", "det", "de", "en", "ett",
             "om", "vid", "enligt", "inom", "finns", "finnas", "göra", "gäller", "krav", "kräver", "behöver"}


class ChatRequest(BaseModel):
    question: str
    context_filter: dict | None = None


def _terms(question: str) -> list[str]:
    raw = [t for t in re.sub(r"[?!.,;:()]", "", question.lower()).split() if len(t) > 2 and t not in STOPWORDS]
    docs = [m.lower() for m in re.findall(r"(?:MSBFS|TSFS|PTSFS|TRVK|NIS2|CER|\d{4}:\d+)", question, re.I)]
    return list(dict.fromkeys(raw + docs))


def _fetch_requirements(user_id: str, source_ids: list[str] | None) -> list[dict]:
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT set_config('app.user_id', %s, true), set_config('app.role', 'authenticated', true)", (user_id,))
            cur.execute("SET LOCAL ROLE authenticated")
            sql = """SELECT r.id, s.document_name, r.chapter_section, r.description, r.requirement_level, d.name AS domain_name
                     FROM public.requirements r JOIN public.requirement_sources s ON s.id = r.source_id
                     LEFT JOIN public.security_domains d ON d.id = r.domain_id
                     WHERE r.repealed_at IS NULL"""
            params: list = []
            if source_ids:
                sql += " AND r.source_id = ANY(%s)"
                params.append(source_ids)
            cur.execute(sql, params)
            cols = [c.name for c in cur.description]
            return [dict(zip(cols, row)) for row in cur.fetchall()]


def _score(req: dict, terms: list[str]) -> int:
    desc = (req["description"] or "").lower()
    doc = (req["document_name"] or "").lower()
    sec = (req["chapter_section"] or "").lower()
    s = 0
    for t in terms:
        if re.search(rf"\b{re.escape(t)}\b", desc):
            s += 5
        elif t in desc:
            s += 3
        if t in doc:
            s += 4
        if t in sec:
            s += 2
    if req["requirement_level"] == "mandatory":
        s += 1
    return s


def retrieve(user_id: str, question: str, source_ids: list[str] | None, limit: int = 10) -> list[dict]:
    terms = _terms(question)
    reqs = _fetch_requirements(user_id, source_ids)
    scored = sorted(((_score(r, terms), r) for r in reqs), key=lambda x: x[0], reverse=True)
    return [r for s, r in scored[:limit] if s > 0]


def _context(sources: list[dict]) -> str:
    if not sources:
        return "TILLGÄNGLIGA KRAVTEXTER:\n\nInga relevanta krav hittades i databasen för denna fråga.\n"
    out = "TILLGÄNGLIGA KRAVTEXTER:\n\n"
    for i, s in enumerate(sources, 1):
        level = {"mandatory": "Bindande", "recommended": "Rekommendation"}.get(s["requirement_level"], "Strategiskt")
        out += f"[{i}] {s['document_name']} {s['chapter_section']}\nNivå: {level}\n"
        if s.get("domain_name"):
            out += f"Domän: {s['domain_name']}\n"
        out += f"Kravtext: {s['description']}\n\n"
    return out


SYSTEM = """Du är en regelverksassistent för svenska myndigheter som arbetar med informationssäkerhet och kritisk infrastruktur.

REGLER:
1. Svara ENDAST baserat på de medföljande kravtexterna nedan
2. Om du inte hittar relevant krav, svara "Jag hittar inget krav som direkt besvarar din fråga i de tillgängliga källorna."
3. Börja alltid med en sammanfattning på 2-3 meningar
4. Referera till specifika paragrafer med formatet [Dokument Kapitel/Paragraf], t.ex. [MSBFS 2020:7 4 kap. 3 §]
5. Vid flera relevanta krav, lista dem i prioritetsordning (bindande före rekommendationer)
6. Förklara juridisk/teknisk terminologi när det behövs
7. Var tydlig med vad som är bindande krav ("ska") vs rekommendationer ("bör")

"""


async def stream(user_id: str, req: ChatRequest) -> AsyncIterator[str]:
    source_ids = (req.context_filter or {}).get("sources") or None
    sources = retrieve(user_id, req.question, source_ids)
    yield "data: " + json.dumps({"type": "sources", "data": sources}, ensure_ascii=False) + "\n\n"
    messages = [{"role": "system", "content": SYSTEM + _context(sources)}, {"role": "user", "content": req.question}]
    async for delta in llm.chat_stream(messages):
        yield "data: " + json.dumps({"choices": [{"delta": {"content": delta}}]}, ensure_ascii=False) + "\n\n"
    yield "data: [DONE]\n\n"
