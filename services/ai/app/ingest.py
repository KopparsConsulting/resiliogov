"""Inläsning av ett kravdokument som bakgrundsjobb.

API:t har sparat PDF:en i filarkivet och skapat raden i ingestion_jobs. Här:
  1. Docling läser PDF:en till text med sidmarkörer ("--- Sida N ---")
  2. Texten delas i chunkar på sidgränser
  3. Varje chunk extraheras med den lokala modellen (app.extract)
  4. Progress skrivs löpande; resultatet (alla krav, deduplicerade per
     referens) sparas på jobbet när allt är klart.
Jobbet skriver aldrig i requirements – förslagen granskas i gränssnittet."""
import asyncio
import json
import logging
import os
from pathlib import Path

import psycopg
from pydantic import BaseModel

from . import chunking, extract, llm

log = logging.getLogger("resiliogov.ingest")
DATABASE_URL = os.environ["DATABASE_URL"]
FILE_DIR = Path(os.environ.get("FILE_DIR", "/data/files"))
CHUNK_CHARS = int(os.environ.get("INGEST_CHUNK_CHARS", "6000"))


class IngestRequest(BaseModel):
    job_id: str
    file_path: str                       # nyckel i filarkivet, t.ex. requirement-documents/ingest/<id>.pdf
    document_name: str
    language: str | None = None
    domains: list[extract.Domain] = []
    page_from: int | None = None
    page_to: int | None = None


def _update(job_id: str, status: str | None = None, total_chunks: int | None = None, done_chunks: int | None = None,
            total_pages: int | None = None, error: str | None = None, result: dict | None = None) -> None:
    with psycopg.connect(DATABASE_URL, autocommit=True) as conn, conn.cursor() as cur:
        cur.execute("SELECT public.update_ingestion_job(%s, %s, %s, %s, %s, %s, %s, %s::jsonb)",
                    (job_id, status, total_chunks, done_chunks, total_pages, llm.MODEL, error,
                     json.dumps(result, ensure_ascii=False) if result is not None else None))


def pdf_to_pages(pdf: Path) -> dict[int, str]:
    """Sidnummer → text, via Docling (layoutmedveten, bättre än ren textextraktion)."""
    from docling.document_converter import DocumentConverter
    result = DocumentConverter().convert(str(pdf))
    pages: dict[int, list[str]] = {}
    for item, _level in result.document.iterate_items():
        prov = getattr(item, "prov", None)
        text = getattr(item, "text", None)
        if not text or not prov:
            continue
        pages.setdefault(prov[0].page_no, []).append(text)
    return {n: "\n".join(t) for n, t in sorted(pages.items())}


async def run(req: IngestRequest) -> None:
    try:
        _update(req.job_id, status="parsing")
        pdf = FILE_DIR / req.file_path
        if not pdf.is_file():
            raise FileNotFoundError(f"Filen saknas i filarkivet: {req.file_path}")
        pages = await asyncio.to_thread(pdf_to_pages, pdf)
        if req.page_from or req.page_to:
            lo, hi = req.page_from or 1, req.page_to or max(pages or [1])
            pages = {n: t for n, t in pages.items() if lo <= n <= hi}
        parts = chunking.split(chunking.pages_to_text(pages), CHUNK_CHARS)
        _update(req.job_id, status="extracting", total_chunks=len(parts), done_chunks=0, total_pages=len(pages))
        log.info("jobb %s: %d sidor, %d chunkar", req.job_id, len(pages), len(parts))

        found: list[dict] = []
        for i, chunk in enumerate(parts, 1):
            res = await extract.extract_chunk(chunk, req.document_name, req.domains, req.language)
            found = extract.merge_requirements(found + res["requirements"])
            _update(req.job_id, done_chunks=i)
            log.info("jobb %s: chunk %d/%d, %d krav hittills", req.job_id, i, len(parts), len(found))
        _update(req.job_id, status="done", result={"requirements": found, "model": llm.MODEL,
                                                    "pages": len(pages), "chunks": len(parts)})
    except Exception as e:
        log.exception("jobb %s misslyckades", req.job_id)
        _update(req.job_id, status="failed", error=str(e)[:2000])
