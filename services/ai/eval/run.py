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

CHUNK_CHARS = 15000  # samma som prototypen


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
    args = ap.parse_args()

    truth = facit(args.source)
    truth_by_ref = {norm(t["chapter_section"]): t for t in truth}
    text = pdf_to_text_with_pages(args.pdf)
    t0 = time.time()
    found: dict[str, dict] = {}
    for i, chunk in enumerate(chunks(text), 1):
        res = await extract.extract(extract.ExtractRequest(text=chunk, document_name=args.source, language=args.language))
        for r in res["requirements"]:
            found.setdefault(norm(r["chapter_section"]), r)
        print(f"chunk {i}: {len(res['requirements'])} krav (totalt {len(found)})")
    elapsed = time.time() - t0

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
    out = Path("eval/results"); out.mkdir(exist_ok=True)
    name = f"{llm.MODEL.replace('/', '_').replace(':', '-')}-{re.sub(r'[^a-z0-9]+', '-', args.source.lower())}-{summary['date']}.json"
    (out / name).write_text(json.dumps(summary, ensure_ascii=False, indent=2))
    print(json.dumps({k: v for k, v in summary.items() if k not in ('missed', 'extra')}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
