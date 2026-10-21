-- =====================================================================
-- Tester: granskningsbuntar och versionsbundna godkännanden
-- (migration 20261006100000). Rullas alltid tillbaka.
-- =====================================================================
DO $test$
DECLARE
  fails text[] := ARRAY[]::text[];
  n_ok int := 0;
  usr uuid;
  src uuid;
  r1 uuid;
  r2 uuid;
  b public.review_batches;
  st text;
  n int;
BEGIN
  SELECT p.id INTO usr FROM public.profiles p WHERE p.approved LIMIT 1;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', usr, 'role', 'authenticated')::text, true);

  INSERT INTO public.requirement_sources (document_name, category)
    VALUES ('TEST granskning', (SELECT category FROM public.requirement_sources LIMIT 1)) RETURNING id INTO src;
  INSERT INTO public.requirements (source_id, chapter_section, description, target_type, is_general_advice)
    VALUES (src, 'TEST G1', 'första', 'system', false) RETURNING id INTO r1;
  INSERT INTO public.requirements (source_id, chapter_section, description, target_type, is_general_advice)
    VALUES (src, 'TEST G2', 'andra', 'system', false) RETURNING id INTO r2;

  -- G1: bunt skapas, ordning behålls, dubbletter tas bort
  b := public.create_review_batch(ARRAY[r2, r1, r2]);
  IF b.requirement_ids = ARRAY[r2, r1] AND b.batch_no ~ '^\d{8}-\d{4}' AND b.created_by <> ''
    THEN n_ok := n_ok + 1; ELSE fails := fails || ('G1 bunt: ' || b.requirement_ids::text); END IF;

  -- G2: andra bunten samma minut får eget nummer
  IF (public.create_review_batch(ARRAY[r1])).batch_no <> b.batch_no
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'G2 dubblett-nummer'; END IF;

  -- G3: ogranskat krav är pending
  SELECT review_state INTO st FROM public.requirement_review_status WHERE requirement_id = r1;
  IF st = 'pending' THEN n_ok := n_ok + 1; ELSE fails := fails || ('G3 ' || coalesce(st, 'null')); END IF;

  -- G4: godkänn i bunten – status approved, bunt och kontrollsumma sparas
  n := public.submit_requirement_reviews(jsonb_build_array(jsonb_build_object('requirement_id', r1, 'status', 'approved')), b.id);
  SELECT review_state INTO st FROM public.requirement_review_status WHERE requirement_id = r1;
  IF n = 1 AND st = 'approved'
     AND EXISTS (SELECT 1 FROM public.requirement_reviews WHERE requirement_id = r1 AND batch_id = b.id
                 AND content_hash = public.requirement_content_hash(r1) AND reviewed_by <> '')
     AND EXISTS (SELECT 1 FROM public.requirement_audit_log WHERE requirement_id = r1 AND action = 'review_approved'
                 AND new_value->>'print_batch' = b.batch_no)
    THEN n_ok := n_ok + 1; ELSE fails := fails || ('G4 ' || coalesce(st, 'null')); END IF;

  -- G5: ändrad kravtext gör godkännandet inaktuellt
  UPDATE public.requirements SET description = 'första, ändrad' WHERE id = r1;
  SELECT review_state INTO st FROM public.requirement_review_status WHERE requirement_id = r1;
  IF st = 'changed' THEN n_ok := n_ok + 1; ELSE fails := fails || ('G5 ' || coalesce(st, 'null')); END IF;

  -- G6: domänbyte påverkar inte godkännandet av texten
  UPDATE public.requirements SET description = 'första' WHERE id = r1;
  UPDATE public.requirements SET domain_id = (SELECT id FROM public.security_domains LIMIT 1) WHERE id = r1;
  SELECT review_state INTO st FROM public.requirement_review_status WHERE requirement_id = r1;
  IF st = 'approved' THEN n_ok := n_ok + 1; ELSE fails := fails || ('G6 ' || coalesce(st, 'null')); END IF;

  -- G7: flaggning kräver kommentar
  BEGIN
    PERFORM public.submit_requirement_reviews(jsonb_build_array(jsonb_build_object('requirement_id', r2, 'status', 'flagged')));
    fails := fails || text 'G7 flagga utan kommentar gick igenom';
  EXCEPTION WHEN raise_exception THEN n_ok := n_ok + 1;
  END;

  -- G8: flera beslut i ett anrop, flaggat syns som flagged
  n := public.submit_requirement_reviews(jsonb_build_array(
         jsonb_build_object('requirement_id', r2, 'status', 'flagged', 'comment', 'Otydligt'),
         jsonb_build_object('requirement_id', r1, 'status', 'pending')), b.id);
  IF n = 2 AND (SELECT review_state FROM public.requirement_review_status WHERE requirement_id = r2) = 'flagged'
     AND (SELECT review_state FROM public.requirement_review_status WHERE requirement_id = r1) = 'pending'
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'G8 flera beslut'; END IF;

  -- G9: klienten kan inte ange egen kontrollsumma
  INSERT INTO public.requirement_reviews (requirement_id, status, reviewed_by, content_hash)
    VALUES (r2, 'approved', 'någon annan', 'falsk');
  IF (SELECT content_hash FROM public.requirement_reviews WHERE requirement_id = r2 ORDER BY created_at DESC, id DESC LIMIT 1)
     = public.requirement_content_hash(r2)
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'G9 egen kontrollsumma'; END IF;

  -- G10: buntar kan inte ändras
  BEGIN
    UPDATE public.review_batches SET batch_no = 'x' WHERE id = b.id;
    fails := fails || text 'G10 bunt ändrades';
  EXCEPTION WHEN OTHERS THEN n_ok := n_ok + 1;
  END;

  -- G11: bunten loggas
  IF EXISTS (SELECT 1 FROM public.activity_log WHERE action = 'review_batch_created' AND entity_id = b.id)
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'G11 logg'; END IF;

  IF cardinality(fails) = 0 THEN
    RAISE EXCEPTION 'ALLA TESTER GODKÄNDA (% st). Rullas tillbaka.', n_ok;
  ELSE
    RAISE EXCEPTION 'TESTFEL (% godkända, % fel): %', n_ok, cardinality(fails), array_to_string(fails, ' || ');
  END IF;
END
$test$;
