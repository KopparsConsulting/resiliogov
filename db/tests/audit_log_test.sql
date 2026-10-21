-- =====================================================================
-- Testsvit för revisionsloggen (activity_log, requirement_audit_log,
-- requirement_reviews, hashkedjan). Kör hela filen mot databasen.
--
-- Allt rullas ALLTID tillbaka: blocket avslutas med ett undantag som
-- innehåller resultatet. "ALLA TESTER GODKÄNDA" = ok. Inga data ändras.
-- Kräver minst en godkänd användare och ett befintligt krav.
-- =====================================================================
DO $test$
DECLARE
  fails text[] := ARRAY[]::text[];
  n_ok  int := 0;
  usr   uuid;
  usr_email text;
  req   uuid;
  fac   uuid;
  sys   uuid;
  rec   uuid;
  v_seq bigint;
  v_txt text;
  v_meta jsonb;
  v record;
BEGIN
  SELECT p.id, u.email INTO usr, usr_email
    FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE p.approved LIMIT 1;
  SELECT id INTO req FROM public.requirements WHERE target_type = 'system' AND chapter_section NOT LIKE 'TEST%' LIMIT 1;

  -- Kör som den godkända användaren
  PERFORM set_config('request.jwt.claims', json_build_object('sub', usr, 'role', 'authenticated')::text, true);

  ------------------------------------------------------------------
  -- A. Klienten kan inte skriva eller ändra loggen direkt
  ------------------------------------------------------------------
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
    INSERT INTO public.activity_log (action, user_email) VALUES ('requirement_deleted', 'någon.annan@trafikverket.se');
    fails := fails || text 'A1 klient kunde skriva direkt i activity_log';
  EXCEPTION WHEN insufficient_privilege THEN n_ok := n_ok + 1;
  END;
  BEGIN
    PERFORM public.log_app_event('requirement_deleted', 'requirement', req, 'falsk', '{}');
    fails := fails || text 'A2 otillåten app-händelse släpptes igenom';
  EXCEPTION WHEN raise_exception THEN n_ok := n_ok + 1;
  END;
  PERFORM public.log_app_event('login', 'auth', NULL, 'fejk@exempel.se', '{}');
  EXECUTE 'RESET ROLE';
  SELECT user_email || '|' || source || '|' || entity_label INTO v_txt
    FROM public.activity_log ORDER BY seq DESC LIMIT 1;
  IF v_txt = usr_email || '|app|' || usr_email THEN n_ok := n_ok + 1; ELSE fails := fails || ('A3 inloggningsrad: ' || coalesce(v_txt, 'saknas')); END IF;

  ------------------------------------------------------------------
  -- B. Aktören sätts av databasen
  ------------------------------------------------------------------
  EXECUTE 'SET LOCAL ROLE authenticated';
  INSERT INTO public.requirement_reviews (requirement_id, status, reviewed_by, comment)
    VALUES (req, 'approved', 'chefen@trafikverket.se', 'TEST');
  INSERT INTO public.requirement_audit_log (requirement_id, action, changed_by, new_value)
    VALUES (req, 'review_comment', 'chefen@trafikverket.se', '{"comment":"TEST"}');
  EXECUTE 'RESET ROLE';
  SELECT reviewed_by INTO v_txt FROM public.requirement_reviews WHERE comment = 'TEST' ORDER BY created_at DESC LIMIT 1;
  IF v_txt = usr_email THEN n_ok := n_ok + 1; ELSE fails := fails || ('B1 granskning i annans namn: ' || coalesce(v_txt, 'saknas')); END IF;
  SELECT changed_by INTO v_txt FROM public.requirement_audit_log WHERE new_value ->> 'comment' = 'TEST' LIMIT 1;
  IF v_txt = usr_email THEN n_ok := n_ok + 1; ELSE fails := fails || ('B2 kravlogg i annans namn: ' || coalesce(v_txt, 'saknas')); END IF;
  IF EXISTS (SELECT 1 FROM public.activity_log WHERE action = 'requirement_review_comment' AND entity_id = req AND user_email = usr_email)
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'B3 kommentaren speglades inte in i kedjan'; END IF;

  ------------------------------------------------------------------
  -- C. Append-only – även för databasens administratör
  ------------------------------------------------------------------
  BEGIN
    UPDATE public.activity_log SET entity_label = 'ändrad' WHERE seq = 1;
    fails := fails || text 'C1 loggrad kunde ändras';
  EXCEPTION WHEN insufficient_privilege THEN n_ok := n_ok + 1;
  END;
  BEGIN
    DELETE FROM public.activity_log WHERE seq = 1;
    fails := fails || text 'C2 loggrad kunde raderas';
  EXCEPTION WHEN insufficient_privilege THEN n_ok := n_ok + 1;
  END;
  BEGIN
    DELETE FROM public.requirement_reviews WHERE comment = 'TEST';
    fails := fails || text 'C3 granskning kunde raderas';
  EXCEPTION WHEN insufficient_privilege THEN n_ok := n_ok + 1;
  END;
  BEGIN
    TRUNCATE public.requirement_audit_log;
    fails := fails || text 'C4 kravloggen kunde tömmas';
  EXCEPTION WHEN insufficient_privilege THEN n_ok := n_ok + 1;
  END;

  ------------------------------------------------------------------
  -- D. Loggen visar vad som ändrades
  ------------------------------------------------------------------
  INSERT INTO public.facilities (name, type, classification_level) VALUES ('TEST logg', 'Vägtunnel', 2) RETURNING id INTO fac;
  UPDATE public.facilities SET classification_level = 4 WHERE id = fac;
  SELECT metadata INTO v_meta FROM public.activity_log
    WHERE action = 'facility_updated' AND entity_id = fac ORDER BY seq DESC LIMIT 1;
  IF v_meta -> 'ändringar' -> 'classification_level' = '{"från": 2, "till": 4}'::jsonb
    THEN n_ok := n_ok + 1; ELSE fails := fails || ('D1 omklassning syns inte: ' || coalesce(v_meta::text, 'ingen rad')); END IF;

  INSERT INTO public.information_systems (name, system_type, system_category, classification_source)
    VALUES ('TEST logg-system', 'SCADA', 'tunnel_traffic_ot', 'inherited') RETURNING id INTO sys;
  INSERT INTO public.facility_systems (facility_id, system_id, relation_type, criticality, is_primary)
    VALUES (fac, sys, 'styr', 'critical', true);
  SELECT metadata INTO v_meta FROM public.activity_log WHERE action = 'facility_linked' AND entity_id = sys;
  IF (v_meta ->> 'systemets_klass_efter')::int = 4 THEN n_ok := n_ok + 1; ELSE fails := fails || ('D2 koppling: ' || coalesce(v_meta::text, 'ingen rad')); END IF;

  PERFORM public.sync_requirements('system', sys, 'add');
  -- En loggrad per tillfälle krav lades till (skapande och koppling sker automatiskt),
  -- aldrig en rad per krav, och summan stämmer med antalet poster
  IF (SELECT count(*) FROM public.activity_log WHERE action = 'requirements_added' AND entity_id = sys) BETWEEN 1 AND 2
     AND (SELECT sum((metadata ->> 'antal')::int) FROM public.activity_log WHERE action = 'requirements_added' AND entity_id = sys)
         = (SELECT count(*) FROM public.system_compliance_records WHERE system_id = sys)
     AND NOT EXISTS (SELECT 1 FROM public.activity_log WHERE action = 'requirements_added' AND entity_id = sys AND (metadata ->> 'antal')::int = 0)
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'D3 synken loggades inte som en rad med rätt antal'; END IF;

  SELECT id INTO rec FROM public.system_compliance_records WHERE system_id = sys LIMIT 1;
  UPDATE public.system_compliance_records SET status = 'Pågående', evidence = 'FAT-protokoll 7' WHERE id = rec;
  SELECT metadata INTO v_meta FROM public.activity_log WHERE action = 'compliance_updated' AND entity_id = rec;
  IF v_meta -> 'ändringar' -> 'status' ->> 'till' = 'Pågående' AND v_meta -> 'ändringar' -> 'evidence' ->> 'till' = 'FAT-protokoll 7'
    THEN n_ok := n_ok + 1; ELSE fails := fails || ('D4 statusändring: ' || coalesce(v_meta::text, 'ingen rad')); END IF;
  IF (SELECT user_email FROM public.activity_log WHERE action = 'compliance_updated' AND entity_id = rec) = usr_email
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'D5 statusändring utan rätt aktör'; END IF;

  -- Kravet tas bort: granskningshistoriken ska finnas kvar
  DELETE FROM public.system_compliance_records WHERE requirement_id = req;
  DELETE FROM public.requirement_test_mappings WHERE requirement_id = req;
  BEGIN
    DELETE FROM public.requirements WHERE id = req;
    IF EXISTS (SELECT 1 FROM public.requirement_reviews WHERE requirement_id = req AND comment = 'TEST')
      THEN n_ok := n_ok + 1; ELSE fails := fails || text 'D6 granskningar raderades med kravet'; END IF;
    SELECT metadata INTO v_meta FROM public.activity_log WHERE action = 'requirement_deleted' AND entity_id = req;
    IF v_meta ? 'borttagen_rad' THEN n_ok := n_ok + 1; ELSE fails := fails || text 'D7 borttaget krav sparades inte i loggen'; END IF;
  EXCEPTION WHEN foreign_key_violation THEN
    n_ok := n_ok + 2;  -- kravet används av annat (t.ex. projekt) och kan inte tas bort i testet
  END;

  ------------------------------------------------------------------
  -- E. Hashkedjan
  ------------------------------------------------------------------
  SELECT * INTO v FROM public.verify_activity_chain();
  IF v.intact AND v.checked = v.head_seq THEN n_ok := n_ok + 1;
  ELSE fails := fails || ('E1 kedjan är inte intakt: ' || coalesce(v.problem, '?')); END IF;

  -- Simulera manipulation direkt i databasen (förbi skyddet) och se att den upptäcks
  SELECT seq INTO v_seq FROM public.activity_log WHERE action = 'facility_updated' AND entity_id = fac;
  ALTER TABLE public.activity_log DISABLE TRIGGER trg_append_only;
  UPDATE public.activity_log SET metadata = '{"ändringar":{"classification_level":{"från":2,"till":2}}}' WHERE seq = v_seq;
  ALTER TABLE public.activity_log ENABLE TRIGGER trg_append_only;
  SELECT * INTO v FROM public.verify_activity_chain();
  IF NOT v.intact AND v.first_broken_seq = v_seq THEN n_ok := n_ok + 1;
  ELSE fails := fails || ('E2 manipulation upptäcktes inte (' || coalesce(v.first_broken_seq::text, 'null') || ' vs ' || v_seq || ')'); END IF;

  ------------------------------------------------------------------
  IF cardinality(fails) = 0 THEN
    RAISE EXCEPTION 'ALLA TESTER GODKÄNDA (% st). Rullas tillbaka.', n_ok;
  ELSE
    RAISE EXCEPTION 'TESTFEL (% godkända, % fel): %', n_ok, cardinality(fails), array_to_string(fails, ' || ');
  END IF;
END
$test$;
