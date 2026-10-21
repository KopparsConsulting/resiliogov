"""Klient mot modellservern. OpenAI-kompatibelt API, så samma kod kör mot
Ollama (Mac mini), vLLM (Linux/NVIDIA) och – i katalogläge – Claude via en
OpenAI-kompatibel gateway. Ingen annan utgående trafik finns i tjänsten."""
import json
import os
from typing import Any, AsyncIterator

import httpx

BASE_URL = os.environ.get("LLM_BASE_URL", "http://host.docker.internal:11434/v1").rstrip("/")
MODEL = os.environ.get("LLM_MODEL", "mistral-small:24b")
EMBED_MODEL = os.environ.get("EMBED_MODEL", "bge-m3")
API_KEY = os.environ.get("LLM_API_KEY", "lokal")
TIMEOUT = httpx.Timeout(float(os.environ.get("LLM_TIMEOUT_SECONDS", "1800")), connect=10.0)
# Tak för svarslängd: utan det kan schema-styrd avkodning fastna i en lång sträng tills
# kontextfönstret är fullt (tiotals minuter). 6000 tokens räcker för ~30 krav med utdrag.
MAX_TOKENS = int(os.environ.get("LLM_MAX_TOKENS", "6000"))


def _headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}


async def chat_json(system: str, user: str, schema: dict[str, Any], *, temperature: float = 0.0) -> dict[str, Any]:
    """Ett svar som MÅSTE följa JSON-schemat (styrd avkodning i vLLM/Ollama)."""
    body = {
        "model": MODEL,
        "temperature": temperature,
        "max_tokens": MAX_TOKENS,
        "frequency_penalty": 0.2,   # dämpar upprepningsloopar i långa strängar
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        "response_format": {"type": "json_schema", "json_schema": {"name": "svar", "schema": schema, "strict": True}},
    }
    last: Exception | None = None
    for attempt in range(2):   # ett omförsök vid timeout/avbrott – modellservern kan vara upptagen
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as c:
                r = await c.post(f"{BASE_URL}/chat/completions", headers=_headers(), json=body)
                r.raise_for_status()
                content = r.json()["choices"][0]["message"]["content"]
            try:
                return json.loads(content)
            except json.JSONDecodeError:
                # Svaret slog i taket mitt i ett objekt: rädda de kompletta objekten
                salvaged = salvage_requirements_json(content)
                if salvaged is not None:
                    return salvaged
                raise
        except (httpx.TimeoutException, httpx.TransportError, json.JSONDecodeError) as e:
            last = e
    raise RuntimeError(f"modellanropet misslyckades efter omförsök: {last}")


def salvage_requirements_json(content: str) -> dict[str, Any] | None:
    """Plockar ut de kompletta objekten ur en avhuggen {"requirements":[{...},{...},{..."""
    start = content.find("[")
    if start < 0:
        return None
    depth = 0
    in_str = False
    esc = False
    last_complete = -1
    for i in range(start + 1, len(content)):
        ch = content[i]
        if in_str:
            if esc: esc = False
            elif ch == "\\": esc = True
            elif ch == '"': in_str = False
            continue
        if ch == '"': in_str = True
        elif ch == "{": depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                last_complete = i
    if last_complete < 0:
        return None
    try:
        return {"requirements": json.loads(content[start:last_complete + 1] + "]"), "truncated": True}
    except json.JSONDecodeError:
        return None


async def chat_stream(messages: list[dict[str, str]], *, temperature: float = 0.2) -> AsyncIterator[str]:
    """Strömmar textbitar (delta) från modellen."""
    body = {"model": MODEL, "temperature": temperature, "messages": messages, "stream": True}
    async with httpx.AsyncClient(timeout=TIMEOUT) as c:
        async with c.stream("POST", f"{BASE_URL}/chat/completions", headers=_headers(), json=body) as r:
            r.raise_for_status()
            async for line in r.aiter_lines():
                if not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    return
                try:
                    delta = json.loads(data)["choices"][0]["delta"].get("content")
                except (KeyError, IndexError, json.JSONDecodeError):
                    continue
                if delta:
                    yield delta


async def embed(texts: list[str]) -> list[list[float]]:
    async with httpx.AsyncClient(timeout=TIMEOUT) as c:
        r = await c.post(f"{BASE_URL}/embeddings", headers=_headers(), json={"model": EMBED_MODEL, "input": texts})
        r.raise_for_status()
        return [d["embedding"] for d in r.json()["data"]]
