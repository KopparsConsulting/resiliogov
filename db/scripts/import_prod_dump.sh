#!/usr/bin/env bash
# Läser in data från prototypens produktionsdatabas (Supabase-dump) i en
# Resiliogov 2-databas som byggts från baseline. Används en gång vid flytten.
#
#   PGDATABASE=resiliogov bash db/scripts/import_prod_dump.sh <dump.backup>
#
# Kräver pg_restore i samma huvudversion som dumpen gjordes med (Lovables
# export 2026-10-21 är format 1.16 = Postgres 18). Sätt PG_RESTORE om den
# inte ligger i PATH.
#
# Steg:
#  1. Dumpen återställs i en arbetsdatabas (<db>_prodraw): bara public-tabeller
#     och auth.users; Supabases övriga schemat (storage, vault, realtime …) tas inte med.
#  2. auth.users översätts till vår enklare tabell (id, e-post, bekräftad, namn).
#  3. Alla public-tabeller kopieras rad för rad med triggrar AVSTÄNGDA
#     (session_replication_role = replica), så att activity_log behåller
#     ursprungliga seq/prev_hash/row_hash och inga auto-synkar körs.
#  4. Sekvenser och audit_chain_head sätts; verify_activity_chain() måste ge intact = true.
set -euo pipefail
DUMP="${1:?ange sökväg till .backup-filen}"
DB="${PGDATABASE:-resiliogov}"
RAW="${DB}_prodraw"
PG_RESTORE="${PG_RESTORE:-pg_restore}"
PSQL="psql -v ON_ERROR_STOP=1 -q"

echo "1. arbetsdatabas $RAW"
$PSQL -d postgres -c "DROP DATABASE IF EXISTS $RAW" -c "CREATE DATABASE $RAW"
$PSQL -d "$RAW" -c "CREATE EXTENSION IF NOT EXISTS pgcrypto; CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"; CREATE SCHEMA IF NOT EXISTS extensions; CREATE SCHEMA IF NOT EXISTS auth;"
TOC=$(mktemp)
$PG_RESTORE -l "$DUMP" | grep -E " (TABLE|TABLE DATA|SEQUENCE|SEQUENCE SET|TYPE|DEFAULT) (public|-) | (TABLE|TABLE DATA|TYPE) auth (users|[a-z_]+) " \
  | grep -vE " TABLE DATA auth (?!users)" > "$TOC" || true
# bara auth.users-data, men alla auth-typer (users refererar till dem)
grep -vE " TABLE DATA auth " "$TOC" > "$TOC.2"; grep -E " TABLE DATA auth users " "$TOC" >> "$TOC.2" || true
$PG_RESTORE -d "$RAW" --no-owner --no-privileges -L "$TOC.2" "$DUMP" 2>&1 | grep -vE "warning|transaction_timeout|SET transaction_timeout" || true

echo "2–3. kopierar till $DB med triggrar avstängda"
TABLES=$($PSQL -At -d "$RAW" -c "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")
{
  echo "SET session_replication_role = replica;"
  echo "BEGIN;"
  # Tömmer referensdata som baseline seedade; dumpen har de riktiga raderna
  for t in $TABLES; do echo "TRUNCATE public.$t CASCADE;"; done
  echo "TRUNCATE auth.users CASCADE;"
  echo "COMMIT;"
} > "$TOC.pre"
$PSQL -d "$DB" -f "$TOC.pre"

# auth.users → vår enklare tabell
$PSQL -At -d "$RAW" -c "COPY (SELECT id, lower(email), email_confirmed_at, coalesce(raw_user_meta_data,'{}'::jsonb), created_at, last_sign_in_at FROM auth.users) TO STDOUT" \
  | $PSQL -d "$DB" -c "SET session_replication_role = replica" -c "COPY auth.users (id, email, email_confirmed_at, raw_user_meta_data, created_at, last_sign_in_at) FROM STDIN"

# public-tabeller (COPY), triggrar avstängda
pg_dump -d "$RAW" --data-only --no-owner -n public 2>/dev/null \
  | sed '1i SET session_replication_role = replica;' \
  | grep -vE "^SET transaction_timeout" \
  | $PSQL -d "$DB"

echo "4. kontroll"
$PSQL -d "$DB" -c "SELECT setval(pg_get_serial_sequence('public.activity_log','seq'), (SELECT max(seq) FROM public.activity_log))" >/dev/null 2>&1 || true
$PSQL -At -d "$DB" -c "SELECT 'krav: '||(SELECT count(*) FROM public.requirements)||', logg: '||(SELECT count(*) FROM public.activity_log)||', användare: '||(SELECT count(*) FROM auth.users)||', profiler: '||(SELECT count(*) FROM public.profiles)"
$PSQL -At -d "$DB" -c "SELECT CASE WHEN intact THEN 'hashkedja: INTAKT ('||checked||' rader)' ELSE 'hashkedja: BRUTEN vid seq '||coalesce(first_broken_seq::text,'?')||' ('||coalesce(problem,'')||')' END FROM public.verify_activity_chain()"
$PSQL -d postgres -c "DROP DATABASE $RAW"
rm -f "$TOC" "$TOC.2" "$TOC.pre" "$TOC.users"
