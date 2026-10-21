# Resiliogov 2

Kravefterlevnadssystem för Trafikverkets anläggningar och IT/OT-system, byggt
för drift helt innanför egna brandväggar med lokal språkmodell. Efterföljare
till prototypen `compliancemanager2` (Lovable/Supabase), som behålls som demo.

Plan och bakgrund: projektdokumentet *Plan för ombyggnad till egen drift*
(claude/plan-resiliogov-2-egen-drift.md i Claude-projektet "TrV - Compliance Manager").

## Två noder, en kodbas

| | Yttre noden (katalog) | Inre noden (drift) |
|---|---|---|
| Var | Koppars/AddContext (Hetzner bakom Cloudflare Tunnel) | Innanför Trafikverkets nät (test: Mac mini) |
| `INSTALLATION_ROLE` | `catalog` | `operations` |
| Modell | Claude (via API) | Lokal: Ollama/vLLM, t.ex. Mistral Small 4 |
| Data | Offentlig lagtext, standarder | Anläggningar, system, bedömningar, interna dokument |
| Flöde | Läser in och granskar kravmassan → **signerat kravpaket** | Importerar kravpaket; allt övrigt lokalt |

Kravpaketet (SHA-256 + Ed25519) innehåller aldrig anläggningar, system eller
bedömningar och går bara åt ett håll: ut → in.

## Struktur

```
db/            Postgres: baseline (från prototypen, verifierad mot produktion),
               migreringar, SQL-testsviter, init-skript
apps/api/      Node 22 + Fastify. Auth (OIDC), roller, kravmotor-endpoints, filarkiv
apps/web/      React 18 + Vite + shadcn. Gränssnittet från prototypen, mot API:t
services/ai/   Docling (PDF→struktur), extraktion med JSON-schema, embeddings, chatt
deploy/        Keycloak-realm för utveckling, Mac mini-instruktion, Cloudflare Tunnel
```

All affärslogik ligger i databasen: kravmotorn (`get_applicable_requirements`,
`sync_requirements`, `sync_component_requirements`), måtten (`compliance_*_metrics`),
hashkedjan i `activity_log`, granskningsflöden och kravpaket. API:t är ett tunt
lager som sätter användare per transaktion (`app.user_id`) och anropar samma
funktioner som prototypen anropade via RPC.

## Köra

```sh
cp .env.example .env            # fyll i lösenord
docker compose --profile dev up -d          # db + api + web + minio + keycloak
docker compose --profile ai-host up -d ai   # AI-tjänst mot Ollama på värden (Mac mini)
```

Webb: http://localhost:8080 · API: http://localhost:3000 · Keycloak: http://localhost:8081

### Bara databasen (utan Docker)

```sh
createdb resiliogov
PGDATABASE=resiliogov bash db/scripts/init.sh
PGDATABASE=resiliogov bash db/scripts/test.sh
```

## Databasen

- `db/baseline/0000_baseline.sql` är prototypens hela schema (52 migreringar i
  kronologisk ordning), dumpat 2026-10-21 och verifierat identiskt mot
  produktionsdatabasen: tabeller, enumtyper, triggrar, vyer, policyer och
  samtliga ~120 funktioner. Filen ändras aldrig.
- Nya ändringar läggs i `db/migrations/NNNN_beskrivning.sql`. `init.sh` kör dem i
  ordning och bokför i `public.schema_migrations`. Migreringar ska gå att köra
  flera gånger.
- `auth.uid()` finns kvar som funktion men läser `app.user_id` (satt av API:t)
  i stället för en Supabase-JWT. `auth.users` ägs av API:t och fylls vid
  första OIDC-inloggning. Allt annat i schemat är orört.
- `db/tests/*.sql` är prototypens testsviter. Varje fil slutar med
  `RAISE EXCEPTION` och rullas tillbaka. Sju av nio går på tomt schema; två
  kräver kravdata (importera ett kravpaket först).

## Status

- [x] Schema porterat till ren Postgres och verifierat mot produktion
- [ ] Kravpaket nr 1 importerat (från betan)
- [ ] Produktionsdata (anläggningar, bedömningar, logg) inläst via pg_dump
- [ ] API: auth, roller, motor-endpoints
- [ ] Webb kopplad till API
- [ ] AI-tjänst: inläsning, chatt, förslag
- [ ] Inre noden på Mac mini · yttre noden på Hetzner/Cloudflare
