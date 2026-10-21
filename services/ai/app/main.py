"""AI-tjänsten. Nås bara från API:t (X-User-Id sätts där efter inloggning).
Inga utgående anrop utom till LLM_BASE_URL."""
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import StreamingResponse

from . import chat, embed, extract, llm

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    task = asyncio.create_task(embed.run_forever())   # semantiskt index i bakgrunden
    yield
    task.cancel()


app = FastAPI(title="Resiliogov AI", docs_url=None, redoc_url=None, lifespan=lifespan)


@app.get("/health")
async def health():
    return {"status": "ok", "model": llm.MODEL, "embed_model": llm.EMBED_MODEL, "llm_base_url": llm.BASE_URL}


@app.post("/extract")
async def extract_requirements(req: extract.ExtractRequest, x_user_id: str = Header()):
    if not req.text.strip():
        raise HTTPException(400, "Text saknas")
    return await extract.extract(req)


@app.post("/chat")
async def regulatory_chat(req: chat.ChatRequest, x_user_id: str = Header()):
    if not req.question.strip():
        raise HTTPException(400, "Frågan saknas eller är ogiltig")
    return StreamingResponse(chat.stream(x_user_id, req), media_type="text/event-stream")


@app.post("/reindex")
async def reindex():
    """Beräknar vektorer för krav som saknar aktuell. Anropas av API:t efter import."""
    return {"indexed": await embed.index_pending()}


@app.post("/analytics")
async def analytics_chat(x_user_id: str = Header()):
    # Byggs sist (se planen): verktygsanrop mot måttvyerna. Spärren sitter i API:t.
    raise HTTPException(501, "Analysassistenten är inte implementerad i den här versionen")
