# Yttre noden: Hetzner bakom Cloudflare Tunnel

Den yttre noden (katalogmiljön) kör exakt samma Compose-stack som den inre,
med `INSTALLATION_ROLE=catalog` och Claude som modell. Den publiceras via
Cloudflare Tunnel: inga öppna portar på servern, TLS och DNS i Cloudflare,
inloggningsskydd med Cloudflare Access framför plattformens egen OIDC.

## Varför inte Workers/Pages för hela noden

Hela produkten är PL/pgSQL i Postgres. Cloudflare har ingen Postgres (D1 är
SQLite), så databasen måste stå någon annanstans ändå. Att köra hela stacken
på Hetzner och låta Cloudflare vara kant ger ett enda deploymönster för båda
noderna – varje deploy ute är ett test av installationen inne.

## Uppsättning

1. Cloudflare Zero Trust → Networks → Tunnels → Create tunnel (Cloudflared).
   Kopiera token till `.env` som `CLOUDFLARE_TUNNEL_TOKEN`.
2. Public hostname: `katalog.resiliogov.com` → `http://web:80`.
3. Access → Applications → lägg till hostnamnet med policy (e-postdomän eller
   namngivna adresser). Det skyddar även `/api/*`.
4. På servern:
   ```sh
   cp .env.example .env     # INSTALLATION_ROLE=catalog, PUBLIC_URL=https://katalog.resiliogov.com
   docker compose --profile tunnel up -d
   ```
5. OIDC i katalogmiljön: Keycloak (profil `dev`) duger för två användare;
   alternativt Cloudflare Access som OIDC-leverantör (Zero Trust → Settings →
   Authentication → "Access for SaaS") så att samma inloggning används i
   båda lagren.

## Modell i katalogläge

`LLM_BASE_URL` pekas på en OpenAI-kompatibel gateway mot Claude (t.ex.
LiteLLM i samma Compose, eller Anthropic-API:t via gateway). Bara offentlig
lagtext går dit – aldrig anläggningar eller bedömningar; det kontrolleras av
`INSTALLATION_ROLE` i API:t och av att databasen i katalogmiljön inte
innehåller sådan data.
