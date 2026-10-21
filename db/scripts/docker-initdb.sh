#!/usr/bin/env bash
# Körs av Postgres-containern vid första start (tom datavolym).
set -euo pipefail
export PGDATABASE="${POSTGRES_DB:-resiliogov}" PGUSER=postgres
bash /db/scripts/init.sh
# API-rollens lösenord (app_api skapas i 0000_roles.sql)
psql -v ON_ERROR_STOP=1 -q -c "ALTER ROLE app_api PASSWORD '${APP_API_PASSWORD:-app_api}'"
