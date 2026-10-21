#!/usr/bin/env bash
# Initierar en tom databas: roller, baseline, migreringar. Idempotent.
# Används av docker-entrypoint-initdb.d i Compose och av CI.
set -euo pipefail
DB="${PGDATABASE:-resiliogov}"
HERE="$(cd "$(dirname "$0")/.." && pwd)"
PSQL="psql -v ON_ERROR_STOP=1 -q -d $DB"

$PSQL -f "$HERE/baseline/0000_roles.sql"
$PSQL -tAc "SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='requirements'" | grep -q 1 \
  || { $PSQL -f "$HERE/baseline/0000_baseline.sql"; $PSQL -f "$HERE/baseline/0001_reference_data.sql"; }

$PSQL -c "CREATE TABLE IF NOT EXISTS public.schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())"
for f in $(ls "$HERE"/migrations/*.sql 2>/dev/null | sort); do
  n=$(basename "$f")
  if ! $PSQL -tAc "SELECT 1 FROM public.schema_migrations WHERE name='$n'" | grep -q 1; then
    echo "migrering: $n"
    $PSQL -1 -f "$f" -c "INSERT INTO public.schema_migrations(name) VALUES ('$n')"
  fi
done
echo "databas klar: $DB"
