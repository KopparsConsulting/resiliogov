#!/usr/bin/env bash
# Kör SQL-testsviterna. Varje fil rullas tillbaka (slutar med RAISE EXCEPTION).
set -u
DB="${PGDATABASE:-resiliogov}"
HERE="$(cd "$(dirname "$0")/.." && pwd)"
PSQL="psql -q -d $DB"
# Testadmin (krävs av sviterna)
$PSQL <<'SQL' >/dev/null
INSERT INTO auth.users (id, email, email_confirmed_at) VALUES ('00000000-0000-0000-0000-000000000001','test-admin@resiliogov.local', now()) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.profiles (id, email, full_name, approved) VALUES ('00000000-0000-0000-0000-000000000001','test-admin@resiliogov.local','Testadmin', true) ON CONFLICT (id) DO UPDATE SET approved = true;
INSERT INTO public.user_roles (user_id, role) VALUES ('00000000-0000-0000-0000-000000000001','admin') ON CONFLICT DO NOTHING;
SQL
pass=0; fail=0
for f in "$HERE"/tests/*.sql; do
  out=$($PSQL -f "$f" 2>&1)
  if echo "$out" | grep -q "ALLA TESTER GODKÄNDA"; then echo "ok    $(basename "$f")"; pass=$((pass+1))
  else echo "FAIL  $(basename "$f")"; echo "$out" | grep -E "ERROR" | head -3 | sed 's/^/        /'; fail=$((fail+1)); fi
done
echo "---- $pass ok, $fail fel"
[ "${REQUIRE_ALL:-0}" = 1 ] && [ $fail -gt 0 ] && exit 1
exit 0
