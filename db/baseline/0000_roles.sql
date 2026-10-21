-- Roller som schemat refererar till. Körs före 0000_baseline.sql.
-- anon/authenticated/service_role finns kvar som namn från prototypen; i
-- Resiliogov 2 ansluter API:t som app_api (medlem i authenticated) och sätter
-- app.user_id per transaktion. Ingen klient ansluter direkt till databasen.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_api') THEN CREATE ROLE app_api LOGIN IN ROLE authenticated; END IF;
END $$;
