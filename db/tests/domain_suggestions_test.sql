-- =====================================================================
-- Tester: domänförslag och anläggningsmått inkl. system
-- (migration 20261006090000). Rullas alltid tillbaka.
-- =====================================================================
DO $test$
DECLARE
  fails text[] := ARRAY[]::text[];
  n_ok int := 0;
  usr uuid;
  s1 uuid; s2 uuid; s3 uuid;
  r1 uuid; r2 uuid; r3 uuid;
  d_other uuid;
  v_txt text;
BEGIN
  SELECT p.id INTO usr FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'admin' WHERE p.approved LIMIT 1;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', usr, 'role', 'authenticated')::text, true);

  SELECT id, requirement_id INTO s1, r1 FROM public.requirement_domain_suggestions WHERE status = 'pending' ORDER BY id LIMIT 1;
  SELECT id, requirement_id INTO s2, r2 FROM public.requirement_domain_suggestions WHERE status = 'pending' AND id > s1 ORDER BY id LIMIT 1;
  SELECT id, requirement_id INTO s3, r3 FROM public.requirement_domain_suggestions WHERE status = 'pending' AND id > s2 ORDER BY id LIMIT 1;
  SELECT d.id INTO d_other FROM public.security_domains d
    WHERE d.id <> (SELECT domain_id FROM public.requirement_domain_suggestions WHERE id = s3) AND d.slug <> 'manager-checklist' LIMIT 1;

  -- D1: godkänt förslag sätter kravets domän och loggas
  PERFORM public.decide_domain_suggestions(ARRAY[s1], true);
  IF (SELECT r.domain_id = s.domain_id FROM public.requirements r JOIN public.requirement_domain_suggestions s ON s.requirement_id = r.id WHERE s.id = s1)
     AND (SELECT status FROM public.requirement_domain_suggestions WHERE id = s1) = 'approved'
     AND EXISTS (SELECT 1 FROM public.activity_log WHERE action = 'requirement_updated' AND entity_id = r1)
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'D1 godkännande'; END IF;

  -- D2: avvisat förslag ändrar inte kravet
  PERFORM public.decide_domain_suggestions(ARRAY[s2], false);
  IF (SELECT domain_id IS NULL FROM public.requirements WHERE id = r2)
     AND (SELECT status FROM public.requirement_domain_suggestions WHERE id = s2) = 'rejected'
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'D2 avvisning'; END IF;

  -- D3: godkänn med annan domän än förslaget
  PERFORM public.decide_domain_suggestions(ARRAY[s3], true, d_other);
  IF (SELECT domain_id FROM public.requirements WHERE id = r3) = d_other
     AND (SELECT decided_domain_id FROM public.requirement_domain_suggestions WHERE id = s3) = d_other
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'D3 ändrad domän'; END IF;

  -- D4: domän räknas inte som innehållsändring (inga falska "ändrat efter bedömning")
  IF (SELECT content_changed_at < now() - interval '1 second' FROM public.requirements WHERE id = r1)
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'D4 domän ändrade content_changed_at'; END IF;

  -- D5: bara administratörer
  DELETE FROM public.user_roles WHERE user_id = usr AND role = 'admin';
  BEGIN
    PERFORM public.decide_domain_suggestions(ARRAY[s1], true);
    fails := fails || text 'D5 icke-admin kunde besluta';
  EXCEPTION WHEN insufficient_privilege THEN n_ok := n_ok + 1;
  END;
  INSERT INTO public.user_roles (user_id, role) VALUES (usr, 'admin');

  -- F1: anläggningens mått = egna poster + kopplade systems poster
  SELECT string_agg(f.name, ', ') INTO v_txt
  FROM public.facility_rollup_metrics m JOIN public.facilities f ON f.id = m.facility_id
  WHERE m.total <> m.own_total + m.systems_total
     OR m.own_total <> coalesce((SELECT total FROM public.compliance_object_metrics o WHERE o.object_type = 'facility' AND o.object_id = m.facility_id), 0)
     OR m.systems_total <> coalesce((SELECT sum(o.total) FROM public.compliance_object_metrics o
                                     JOIN public.facility_systems fs ON fs.system_id = o.object_id AND o.object_type = 'system'
                                     WHERE fs.facility_id = m.facility_id), 0);
  IF v_txt IS NULL THEN n_ok := n_ok + 1; ELSE fails := fails || ('F1 summor stämmer inte: ' || v_txt); END IF;

  -- A1: AI-analys är avstängd som standard
  IF NOT (SELECT ai_compliance_analysis FROM public.installation_settings WHERE id = 1)
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'A1 AI-analys är påslagen'; END IF;

  IF cardinality(fails) = 0 THEN
    RAISE EXCEPTION 'ALLA TESTER GODKÄNDA (% st). Rullas tillbaka.', n_ok;
  ELSE
    RAISE EXCEPTION 'TESTFEL (% godkända, % fel): %', n_ok, cardinality(fails), array_to_string(fails, ' || ');
  END IF;
END
$test$;
