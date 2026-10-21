"""Kör en modell mot facit. Se eval/README.md."""
import argparse
import asyncio
import json
import os
import re
import time
from datetime import date
from difflib import SequenceMatcher
from pathlib import Path

import psycopg

from app import extract, llm

CHUNK_CHARS = int(os.environ.get("EVAL_CHUNK_CHARS", "8000"))  # prototypen: 15000; mindre = snabbare och säkrare på CPU/Apple Silicon


def pdf_to_text_with_pages(pdf: Path) -> str:
    from docling.document_converter import DocumentConverter  # tung import, bara här
    result = DocumentConverter().convert(str(pdf))
    pages: dict[int, list[str]] = {}
    for item, _level in result.document.iterate_items():
        prov = getattr(item, "prov", None)
        text = getattr(item, "text", None)
        if not text or not prov:
            continue
        pages.setdefault(prov[0].page_no, []).append(text)
    return "\n".join(f"--- Sida {n} ---\n" + "\n".join(t) for n, t in sorted(pages.items()))


def chunks(text: str) -> list[str]:
    if len(text) <= CHUNK_CHARS:
        return [text]
    out, cur = [], ""
    for page in re.split(r"(?=--- Sida \d+ ---)", text):
        if len(cur) + len(page) > CHUNK_CHARS and cur:
            out.append(cur)
            cur = ""
        cur += page
    if cur:
        out.append(cur)
    return out


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").lower()).strip()


def facit(source_name: str) -> list[dict]:
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn, conn.cursor() as cur:
        cur.execute("""SELECT r.chapter_section, r.description, r.source_page, r.requirement_level, r.target_type
                       FROM public.requirements r JOIN public.requirement_sources s ON s.id = r.source_id
                       WHERE s.document_name = %s AND r.repealed_at IS NULL""", (source_name,))
        return [dict(zip(["chapter_section", "description", "source_page", "requirement_level", "target_type"], row)) for row in cur]


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True, help="document_name i requirement_sources")
    ap.add_argument("--pdf", required=True, type=Path)
    ap.add_argument("--language", default=None)
    ap.add_argument("--resume", action="store_true", help="fortsätt från sparade delresultat")
    args = ap.parse_args()

    truth = facit(args.source)
    truth_by_ref = {norm(t["chapter_section"]): t for t in truth}
    text = pdf_to_text_with_pages(args.pdf)
    parts = chunks(text)
    # Delresultat per chunk så att en avbruten körning kan återupptas med --resume
    out = Path("eval/results"); out.mkdir(exist_ok=True)
    slug = f"{llm.MODEL.replace('/', '_').replace(':', '-')}-{re.sub(r'[^a-z0-9]+', '-', args.source.lower())}"
    partial = out / f"{slug}.partial.json"
    state = json.loads(partial.read_text()) if args.resume and partial.exists() else {"chunks": {}, "seconds": 0.0}
    t0 = time.time()
    for i, chunk in enumerate(parts, 1):
        if str(i) in state["chunks"]:
            print(f"chunk {i}: {len(state['chunks'][str(i)])} krav (sparat)")
            continue
        tc = time.time()
        res = await extract.extract(extract.ExtractRequest(text=chunk, document_name=args.source, language=args.language))
        state["chunks"][str(i)] = res["requirements"]
        state["seconds"] += time.time() - tc
        partial.write_text(json.dumps(state, ensure_ascii=False))
        print(f"chunk {i}/{len(parts)}: {len(res['requirements'])} krav ({time.time() - tc:.0f} s)")
    found: dict[str, dict] = {}
    for i in sorted(state["chunks"], key=int):
        for r in state["chunks"][i]:
            found.setdefault(norm(r["chapter_section"]), r)
    elapsed = state["seconds"]

    hits = [ref for ref in found if ref in truth_by_ref]
    page_ok = sum(1 for ref in hits if found[ref].get("source_page") == truth_by_ref[ref]["source_page"])
    text_ok = sum(1 for ref in hits if SequenceMatcher(None, norm(found[ref]["description"]), norm(truth_by_ref[ref]["description"])).ratio() >= 0.9)
    summary = {
        "model": llm.MODEL, "source": args.source, "date": date.today().isoformat(),
        "facit": len(truth), "found": len(found), "hits": len(hits),
        "recall": round(len(hits) / max(len(truth), 1), 3), "precision": round(len(hits) / max(len(found), 1), 3),
        "page_accuracy": round(page_ok / max(len(hits), 1), 3), "text_match": round(text_ok / max(len(hits), 1), 3),
        "seconds": round(elapsed, 1),
        "missed": sorted(set(truth_by_ref) - set(found))[:50],
        "extra": sorted(set(found) - set(truth_by_ref))[:50],
    }
    (out / f"{slug}-{summary['date']}.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2))
    partial.unlink(missing_ok=True)
    print(json.dumps({k: v for k, v in summary.items() if k not in ('missed', 'extra')}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
