-- =====================================================================
-- Tester: krav och regelverk med bedömningar kan inte raderas
-- (migration 20261005140000). Rullas alltid tillbaka.
-- =====================================================================
DO $test$
DECLARE
  fails text[] := ARRAY[]::text[];
  n_ok int := 0;
  usr uuid;
  src uuid;
  r_work uuid;
  r_clean uuid;
  sys uuid;
BEGIN
  SELECT p.id INTO usr FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'admin'
  WHERE p.approved LIMIT 1;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', usr, 'role', 'authenticated')::text, true);

  INSERT INTO public.requirement_sources (document_name, category)
    VALUES ('TEST spärr', (SELECT category FROM public.requirement_sources LIMIT 1)) RETURNING id INTO src;
  INSERT INTO public.requirements (source_id, chapter_section, description, target_type, is_general_advice)
    VALUES (src, 'TEST P1', 'bedöms', 'system', false) RETURNING id INTO r_work;
  INSERT INTO public.requirements (source_id, chapter_section, description, target_type, is_general_advice)
    VALUES (src, 'TEST P2', 'orört', 'system', false) RETURNING id INTO r_clean;
  INSERT INTO public.information_systems (name, system_type, system_category, classification_source, own_classification_level)
    VALUES ('TEST spärrsystem', 'SCADA', 'tunnel_traffic_ot', 'own', 2) RETURNING id INTO sys;
  UPDATE public.system_compliance_records SET status = 'Pågående', evidence = 'FAT 9'
    WHERE system_id = sys AND requirement_id = r_work;

  -- P1: krav utan arbete kan raderas, de orörda posterna följer med
  DELETE FROM public.requirements WHERE id = r_clean;
  IF NOT EXISTS (SELECT 1 FROM public.requirements WHERE id = r_clean)
     AND NOT EXISTS (SELECT 1 FROM public.system_compliance_records WHERE requirement_id = r_clean)
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'P1 orört krav kunde inte raderas'; END IF;

  -- P2: krav med bedömning kan inte raderas
  BEGIN
    DELETE FROM public.requirements WHERE id = r_work;
    fails := fails || text 'P2 krav med bedömning raderades';
  EXCEPTION WHEN restrict_violation THEN n_ok := n_ok + 1;
  END;
  IF EXISTS (SELECT 1 FROM public.system_compliance_records WHERE system_id = sys AND requirement_id = r_work AND evidence = 'FAT 9')
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'P3 bedömningen försvann'; END IF;

  -- P4: regelverket kan inte raderas när ett krav har bedömning
  BEGIN
    DELETE FROM public.requirement_sources WHERE id = src;
    fails := fails || text 'P4 regelverk med bedömt krav raderades';
  EXCEPTION WHEN restrict_violation THEN n_ok := n_ok + 1;
  END;

  -- P5: upphäv i stället – bedömningen finns kvar och väntar på granskning
  PERFORM public.repeal_requirement(r_work);
  IF (SELECT repealed_at IS NOT NULL FROM public.requirements WHERE id = r_work)
     AND EXISTS (SELECT 1 FROM public.system_compliance_records WHERE system_id = sys AND requirement_id = r_work)
     AND (SELECT deactivations FROM public.requirement_sync_pending('system', sys)) >= 1
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'P5 upphävandet'; END IF;

  -- P6: bara administratörer får upphäva
  DELETE FROM public.user_roles WHERE user_id = usr AND role = 'admin';
  BEGIN
    PERFORM public.repeal_requirement(r_work);
    fails := fails || text 'P6 icke-admin kunde upphäva';
  EXCEPTION WHEN insufficient_privilege THEN n_ok := n_ok + 1;
  END;

  IF cardinality(fails) = 0 THEN
    RAISE EXCEPTION 'ALLA TESTER GODKÄNDA (% st). Rullas tillbaka.', n_ok;
  ELSE
    RAISE EXCEPTION 'TESTFEL (% godkända, % fel): %', n_ok, cardinality(fails), array_to_string(fails, ' || ');
  END IF;
END
$test$;
