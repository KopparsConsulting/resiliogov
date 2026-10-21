-- Läser in ett kravpaket (JSON-fil från Export → Kravpaket) i databasen.
--   psql -d resiliogov -v pkg="$(cat kravpaket.json)" -f db/scripts/import_package.sql
-- Kör som administratör (app.user_id sätts till första admin). Signaturen
-- kontrolleras av API:t i det riktiga flödet; här markeras den som okontrollerad.
\set ON_ERROR_STOP on
BEGIN;
SELECT set_config('app.user_id', (SELECT user_id::text FROM public.user_roles WHERE role = 'admin' LIMIT 1), true);
SELECT set_config('app.role', 'authenticated', true);
SELECT public.import_requirement_catalog(
  (:'pkg'::jsonb ->> 'content'),
  (:'pkg'::jsonb ->> 'sha256'),
  NULL, false);
COMMIT;
