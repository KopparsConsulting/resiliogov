# AI-tjänsten

Pratar OpenAI-kompatibelt med `LLM_BASE_URL`:

| Miljö | LLM_BASE_URL | Server |
|---|---|---|
| Mac mini (inre nod, test) | `http://host.docker.internal:11434/v1` | Ollama på värden |
| Linux/NVIDIA (inre nod, drift) | `http://vllm:8000/v1` | vLLM i container (profil `ai-gpu`) |
| Katalogmiljön (yttre nod) | OpenAI-kompatibel gateway mot Claude | – |

Endpoints (anropas bara av API:t): `POST /extract`, `POST /chat` (SSE), `POST /analytics` (ej klar), `GET /health`.

Strukturerad utdata: `/extract` tvingar svaret att följa ett JSON-schema
(`response_format: json_schema`). Det stöds av vLLM (xgrammar) och Ollama ≥ 0.5.
Modellen väljs i `.env` (`LLM_MODEL`); utvärderingen mot facit (418 krav från
prototypen) ligger i `eval/` när den är skriven.
