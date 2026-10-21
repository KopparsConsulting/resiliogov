# Arbetsregler för Resiliogov 2

Gäller alla som ändrar i repot: Claude-sessioner (Claude Code på minin eller i
molnet), Cursor och utvecklare. Reglerna är ärvda från prototypen och
anpassade till den nya strukturen.

## Ansvar

- **Claude (på uppdrag av Anders Runhem) är tekniskt ansvarig** för hela
  plattformen: databas, API, AI-tjänst och gränssnitt.
- AddContext (Fredrik) äger kravmassans innehåll och granskning.
- Är något oklart eller krockar med reglerna: fråga Anders, hitta inte på en egen lösning.

## Databasen – ett spår

- `db/baseline/` ändras aldrig. Nya ändringar i `db/migrations/NNNN_beskrivning.sql`,
  idempotenta (`IF NOT EXISTS`, `CREATE OR REPLACE`, `DROP … IF EXISTS`).
- En körd migrering ändras aldrig i efterhand – rätta med en ny.
- Nya tabeller: `ENABLE ROW LEVEL SECURITY`, `REVOKE ALL FROM PUBLIC, anon`, bara
  nödvändiga rättigheter till `authenticated`. Beslut går via
  `SECURITY DEFINER`-funktioner som kontrollerar roll.
- Kör `db/scripts/test.sh` efter varje databasändring. CI gör det också.

## Regler som inte får brytas

- **En kravmotor.** Vilka krav som gäller ett objekt avgörs bara i databasen
  (`get_applicable_requirements`, `sync_requirements`, `sync_component_requirements`).
  Ingen matchning i API eller webb.
- **Ett sätt att räkna mått.** `compliance_record_scope`, `compliance_object_metrics`,
  `compliance_domain_metrics`, `facility_rollup_metrics`. Inga egna procent i appen.
- **Allt loggas och loggen kan inte ändras.** `activity_log` (hashkedja),
  `requirement_audit_log`, `requirement_reviews`, `export_history`,
  `requirement_catalog_releases`, `review_batches` är append-only. Aktören sätts av
  databasen via `app.user_id`, aldrig av appen.
- **API:t sätter användaren per transaktion**: `SET LOCAL app.user_id = '<uuid>'`
  och `SET LOCAL ROLE authenticated` innan någon fråga. Inget anrop går som
  superuser utom migreringar.
- **Inget raderas som har arbete.** Krav och regelverk med bedömningar upphävs
  (`repeal_requirement`), raderas inte.
- **Förslag gäller först när de godkänts.** Domänförslag, kravlänkar och AI-förslag
  hamnar i granskningsköer.
- **AI föreslår, människa godkänner, regelmotorn beslutar.** AI-tjänsten skriver
  aldrig direkt i `requirements`; den returnerar förslag till API:t som lägger dem i kö.
- **Ingen data lämnar noden.** I `operations`-läge görs inga utgående anrop; AI-tjänsten
  pratar bara med den lokala modellservern. Testas i CI (`noOutboundCalls`).
- **Kravpaket innehåller aldrig** anläggningar, system eller bedömningar.
  Privata signeringsnycklar sparas aldrig på servern.
- **Listor hämtas sidvis** i API:t; ingen endpoint returnerar obegränsat antal rader.

## Gränssnittet

- Språk: svenska. Design: neutral gråskala, färg bara för status. Geist, laddad
  lokalt (inga externa CDN:er – fungerar inte innanför brandväggen).
- Måste fungera i Edge på Windows.
- Datalagret går via API-klienten i `apps/web/src/api/`, aldrig direkt mot databasen.

## Kontroll

- CI: databas från baseline + migreringar → SQL-testsviter; typkontroll, tester och
  bygge för api och web. Håll den grön.
- `.env` ligger aldrig i git. Inga hemligheter i kod, Compose eller README.
