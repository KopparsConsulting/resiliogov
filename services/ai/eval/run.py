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

from app import chunking, extract, llm

CHUNK_CHARS = int(os.environ.get("EVAL_CHUNK_CHARS", "6000"))  # prototypen: 15000; mindre = snabbare och säkrare på CPU/Apple Silicon


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


def norm(s: str) -> str:
    # samma kanonisering på båda sidor så att "SR 1.1 (1)" och "SR 1.1 RE 1" räknas lika
    return chunking.canonical_reference(s or "").lower()


def facit(source_name: str) -> list[dict]:
    # Via SECURITY DEFINER-funktion: skriptet kör som app_api och RLS på
    # requirements skulle annars ge noll rader (migrering 0004).
    cols = ["document_name", "chapter_section", "description", "source_page", "requirement_level", "target_type"]
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn, conn.cursor() as cur:
        cur.execute("SELECT * FROM public.catalog_requirements(%s)", (source_name,))
        rows = [dict(zip(cols, row)) for row in cur]
    names = sorted({r["document_name"] for r in rows})
    if not rows:
        raise SystemExit(f"Inget facit för '{source_name}' – kontrollera document_name i requirement_sources "
                         f"(och att migrering 0004 är körd: docker compose exec db bash /db/scripts/init.sh)")
    if len(names) > 1:
        raise SystemExit(f"'{source_name}' matchar flera regelverk: {names} – ange ett mer exakt namn")
    print(f"facit: {len(rows)} krav i '{names[0]}'")
    return rows


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True, help="document_name i requirement_sources")
    ap.add_argument("--pdf", type=Path, help="krävs utom vid --rescore")
    ap.add_argument("--language", default=None)
    ap.add_argument("--resume", action="store_true", help="fortsätt från sparade delresultat")
    ap.add_argument("--rescore", action="store_true", help="räkna bara om mot facit från senaste körningens chunkar (ingen modell)")
    args = ap.parse_args()

    truth = facit(args.source)
    truth_by_ref = {norm(t["chapter_section"]): t for t in truth}
    if not args.rescore and not args.pdf:
        ap.error("--pdf krävs")
    parts = [] if args.rescore else chunking.split(pdf_to_text_with_pages(args.pdf), CHUNK_CHARS)
    # Delresultat per chunk så att en avbruten körning kan återupptas med --resume
    out = Path("eval/results"); out.mkdir(exist_ok=True)
    slug = f"{llm.MODEL.replace('/', '_').replace(':', '-')}-{re.sub(r'[^a-z0-9]+', '-', args.source.lower())}"
    partial = out / f"{slug}.partial.json"
    kept = out / f"{slug}.chunks.json"   # behålls efter körning så resultatet kan räknas om mot facit
    if args.rescore:
        if not kept.exists():
            raise SystemExit(f"Inga sparade chunkar: {kept}")
        state = json.loads(kept.read_text())
    else:
        state = json.loads(partial.read_text()) if args.resume and partial.exists() else {"chunks": {}, "seconds": 0.0}
    t0 = time.time()
    for i, chunk in enumerate(parts, 1):
        if str(i) in state["chunks"]:
            print(f"chunk {i}: {len(state['chunks'][str(i)])} krav (sparat)")
            continue
        tc = time.time()
        try:
            res = await extract.extract_chunk(chunk, args.source, [], args.language)
        except Exception as e:   # en misslyckad chunk ska inte stoppa hela mätningen
            print(f"chunk {i}/{len(parts)}: MISSLYCKADES ({e})")
            state["chunks"][str(i)] = []
            state.setdefault("failed", []).append(i)
            partial.write_text(json.dumps(state, ensure_ascii=False))
            continue
        state["chunks"][str(i)] = res["requirements"]
        state["seconds"] += time.time() - tc
        partial.write_text(json.dumps(state, ensure_ascii=False))
        note = f" – hoppad: {res['skipped']}" if res.get("skipped") else ""
        print(f"chunk {i}/{len(parts)}: {len(res['requirements'])} krav ({time.time() - tc:.0f} s){note}")
    merged = extract.merge_requirements([r for i in sorted(state["chunks"], key=int) for r in state["chunks"][i]])
    found: dict[str, dict] = {norm(r["chapter_section"]): r for r in merged}
    elapsed = state["seconds"]

    hits = [ref for ref in found if ref in truth_by_ref]
    page_ok = sum(1 for ref in hits if found[ref].get("source_page") == truth_by_ref[ref]["source_page"])
    text_ok = sum(1 for ref in hits if SequenceMatcher(None, norm(found[ref]["description"]), norm(truth_by_ref[ref]["description"])).ratio() >= 0.9)
    summary = {
        "model": llm.MODEL, "source": args.source, "date": date.today().isoformat(),
        "facit": len(truth), "found": len(found), "hits": len(hits),
        "recall": round(len(hits) / max(len(truth), 1), 3), "precision": round(len(hits) / max(len(found), 1), 3),
        "page_accuracy": round(page_ok / max(len(hits), 1), 3), "text_match": round(text_ok / max(len(hits), 1), 3),
        "seconds": round(elapsed, 1), "failed_chunks": state.get("failed", []), "chunk_chars": CHUNK_CHARS,
        "missed": sorted(set(truth_by_ref) - set(found)),
        "extra": sorted(set(found) - set(truth_by_ref)),
    }
    (out / f"{slug}-{summary['date']}.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2))
    kept.write_text(json.dumps(state, ensure_ascii=False))
    partial.unlink(missing_ok=True)
    print(json.dumps({k: v for k, v in summary.items() if k not in ('missed', 'extra')}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
