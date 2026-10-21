"""Semantiskt index över kravmassan. Vektorerna beräknas på den lokala
modellservern (bge-m3) och lagras i public.requirement_embeddings. Körs som
bakgrundsjobb vid start och sedan periodiskt; nya eller ändrade krav
(content_hash) fångas automatiskt av requirements_needing_embedding()."""
import asyncio
import logging
import os

import psycopg

from . import llm

log = logging.getLogger("resiliogov.embed")
DATABASE_URL = os.environ["DATABASE_URL"]
INTERVAL_SECONDS = int(os.environ.get("EMBED_INTERVAL_SECONDS", "300"))
BATCH = 32


def _conn():
    # Indexeringen kör som app_api utan inloggad användare; skrivningen går via
    # upsert_requirement_embedding (SECURITY DEFINER, bara app_api får anropa).
    return psycopg.connect(DATABASE_URL, autocommit=True)


def _vec(v: list[float]) -> str:
    return "[" + ",".join(f"{x:.7f}" for x in v) + "]"


async def index_pending() -> int:
    """Beräknar vektor för alla krav som saknar aktuell. Returnerar antal."""
    with _conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT requirement_id, content_hash, text FROM public.requirements_needing_embedding(%s)", (llm.EMBED_MODEL,))
        rows = cur.fetchall()
    if not rows:
        return 0
    done = 0
    for i in range(0, len(rows), BATCH):
        chunk = rows[i:i + BATCH]
        vectors = await llm.embed([r[2] for r in chunk])
        with _conn() as conn, conn.cursor() as cur:
            for (rid, chash, _), vec in zip(chunk, vectors):
                cur.execute("SELECT public.upsert_requirement_embedding(%s, %s, %s, %s::vector)",
                            (rid, llm.EMBED_MODEL, chash, _vec(vec)))
        done += len(chunk)
        log.info("indexerade %d/%d krav", done, len(rows))
    return done


async def search(user_id: str, question: str, source_ids: list[str] | None, limit: int = 10) -> list[dict]:
    """Närmaste krav till frågan. Tom lista om indexet saknas."""
    [qv] = await llm.embed([question])
    with psycopg.connect(DATABASE_URL) as conn, conn.cursor() as cur:
        cur.execute("SELECT set_config('app.user_id', %s, true), set_config('app.role', 'authenticated', true)", (user_id,))
        cur.execute("SET LOCAL ROLE authenticated")
        cur.execute("SELECT * FROM public.search_requirements_semantic(%s::vector, %s, %s)", (_vec(qv), limit, source_ids))
        cols = [c.name for c in cur.description]
        return [{k: (str(v) if k == "id" else v) for k, v in zip(cols, row)} for row in cur.fetchall()]


async def run_forever() -> None:
    while True:
        try:
            n = await index_pending()
            if n:
                log.info("embeddings klara: %d krav", n)
        except Exception as e:  # modellservern kan vara nere – försök igen senare
            log.warning("indexering misslyckades: %s", e)
        await asyncio.sleep(INTERVAL_SECONDS)
