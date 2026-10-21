-- =====================================================================
-- Testsvit: mått, "utanför omfattning", systemklass och automatisk
-- kravuppdatering. Kör hela filen mot databasen.
--
-- Allt rullas ALLTID tillbaka: blocket avslutas med ett undantag som
-- innehåller resultatet. "ALLA TESTER GODKÄNDA" = ok. Inga data ändras.
-- Måttfallen (M) är samma som i src/lib/complianceMetrics.test.ts.
-- =====================================================================
DO $test$
DECLARE
  fails text[] := ARRAY[]::text[];
  n_ok  int := 0;
  usr   uuid;
  src   uuid;
  r     uuid[] := ARRAY[]::uuid[];
  r_sl3 uuid; r_new uuid;
  sys   uuid; own_sys uuid; multi uuid; ovr uuid;
  f2 uuid; f4 uuid; f5 uuid;
  rec   uuid;
  i     int;
  v     record;
  v_txt text;
  v_int int;
BEGIN
  SELECT p.id INTO usr FROM public.profiles p WHERE p.approved LIMIT 1;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', usr, 'role', 'authenticated')::text, true);

  INSERT INTO public.requirement_sources (document_name, category)
    VALUES ('TEST mått', (SELECT category FROM public.requirement_sources LIMIT 1)) RETURNING id INTO src;

  ------------------------------------------------------------------
  -- M. Måtten i databasen = måtten i appen
  ------------------------------------------------------------------
  -- 9 krav som bara gäller systemtypen TESTTYP
  FOR i IN 1..9 LOOP
    INSERT INTO public.requirements (source_id, chapter_section, description, target_type, trigger_logic, is_general_advice)
      VALUES (src, 'TEST M' || i, 'mått ' || i, 'system', '{"system_type":"TESTTYP"}', false)
      RETURNING id INTO rec;
    r := r || rec;
  END LOOP;

  -- Systemet skapas – kraven ska läggas till automatiskt (ingen synk anropas)
  INSERT INTO public.information_systems (name, system_type, system_category, classification_source)
    VALUES ('TEST mått-system', 'TESTTYP', 'tunnel_traffic_ot', 'own') RETURNING id INTO sys;
  SELECT count(*) INTO v_int FROM public.system_compliance_records WHERE system_id = sys AND requirement_id = ANY (r);
  IF v_int = 9 THEN n_ok := n_ok + 1; ELSE fails := fails || ('A1 krav lades inte till automatiskt vid nytt system: ' || v_int); END IF;

  UPDATE public.system_compliance_records SET status = 'Pågående' WHERE system_id = sys AND requirement_id = r[2];
  UPDATE public.system_compliance_records SET status = 'Uppfyllt', evidence = 'x', valid_until = public.stockholm_today() + 100
    WHERE system_id = sys AND requirement_id = r[3];
  UPDATE public.system_compliance_records SET status = 'Uppfyllt', evidence = 'x', valid_until = public.stockholm_today() - 1
    WHERE system_id = sys AND requirement_id = r[4];
  UPDATE public.system_compliance_records SET status = 'Ej tillämpligt', justification = 'Gäller inte detta system alls'
    WHERE system_id = sys AND requirement_id = r[5];
  UPDATE public.system_compliance_records SET status = 'Delvis uppfyllt', evidence = 'x', valid_until = public.stockholm_today() + 100
    WHERE system_id = sys AND requirement_id = r[6];
  UPDATE public.system_compliance_records SET status = 'Ej uppfyllt', valid_until = public.stockholm_today() + 100
    WHERE system_id = sys AND requirement_id = r[7];
  UPDATE public.system_compliance_records SET status = 'Uppfyllt', evidence = 'x', valid_until = public.stockholm_today() + 100,
         out_of_scope_since = now()
    WHERE system_id = sys AND requirement_id = r[8];
  -- r[1] och r[9]: Ej påbörjad
  -- Allmänna krav som också träffar systemet tas bort så att bara testkraven räknas
  DELETE FROM public.system_compliance_records WHERE system_id = sys AND NOT (requirement_id = ANY (r));

  SELECT * INTO v FROM public.compliance_object_metrics WHERE object_type = 'system' AND object_id = sys;
  IF v.total = 8 AND v.assessed = 5 AND v.not_applicable = 1 AND v.fulfilled = 1 AND v.expired = 1
     AND v.out_of_scope = 1 AND v.coverage = 63 AND v.compliance = 25
    THEN n_ok := n_ok + 1;
    ELSE fails := fails || ('M1 mått: ' || row_to_json(v)::text); END IF;

  BEGIN
    UPDATE public.system_compliance_records SET status = NULL WHERE system_id = sys AND requirement_id = r[1];
    fails := fails || text 'M2 tom status tilläts';
  EXCEPTION WHEN not_null_violation THEN n_ok := n_ok + 1;
  END;

  ------------------------------------------------------------------
  -- K. Systemets klass
  ------------------------------------------------------------------
  INSERT INTO public.facilities (name, type, classification_level) VALUES ('TEST K2', 'Vägtunnel', 2) RETURNING id INTO f2;
  INSERT INTO public.facilities (name, type, classification_level) VALUES ('TEST K4', 'Vägtunnel', 4) RETURNING id INTO f4;
  INSERT INTO public.facilities (name, type, classification_level, is_critical_entity) VALUES ('TEST K5', 'Vägtunnel', 5, true) RETURNING id INTO f5;

  -- Egen klass utan anläggning
  INSERT INTO public.information_systems (name, system_type, system_category, classification_source, own_classification_level)
    VALUES ('TEST egen klass', 'SCADA', 'tunnel_traffic_ot', 'own', 3) RETURNING id INTO own_sys;
  SELECT * INTO v FROM public.system_classification WHERE system_id = own_sys;
  IF v.effective_level = 3 AND NOT v.is_missing AND v.linked_facilities = 0 THEN n_ok := n_ok + 1;
  ELSE fails := fails || ('K1 egen klass: ' || row_to_json(v)::text); END IF;

  -- Ärvd från flera anläggningar: högsta styr, även om primär är lägre
  INSERT INTO public.information_systems (name, system_type, system_category, classification_source)
    VALUES ('TEST flera', 'SCADA', 'tunnel_traffic_ot', 'inherited') RETURNING id INTO multi;
  INSERT INTO public.facility_systems (facility_id, system_id, relation_type, criticality, is_primary) VALUES (f2, multi, 'styr', 'critical', true);
  INSERT INTO public.facility_systems (facility_id, system_id, relation_type, criticality) VALUES (f5, multi, 'styr', 'critical');
  SELECT * INTO v FROM public.system_classification WHERE system_id = multi;
  IF v.effective_level = 5 AND v.inherited_level = 5 AND v.driving_facility_id = f5 AND v.linked_facilities = 2
    THEN n_ok := n_ok + 1;
    ELSE fails := fails || ('K2 flera anläggningar: ' || row_to_json(v)::text); END IF;

  -- Saknad klass markeras
  INSERT INTO public.information_systems (name, system_type, system_category, classification_source)
    VALUES ('TEST ingen klass', 'SCADA', 'tunnel_traffic_ot', 'inherited') RETURNING id INTO rec;
  IF (SELECT is_missing AND effective_level = 1 FROM public.system_classification WHERE system_id = rec)
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'K3 saknad klass markeras inte'; END IF;

  -- Avvikelse uppåt stoppas, mot ärvd klass (högsta), inte primär
  INSERT INTO public.information_systems (name, system_type, system_category, classification_source)
    VALUES ('TEST avvikelse', 'SCADA', 'tunnel_traffic_ot', 'inherited') RETURNING id INTO ovr;
  INSERT INTO public.facility_systems (facility_id, system_id, relation_type, criticality, is_primary) VALUES (f2, ovr, 'styr', 'critical', true);
  INSERT INTO public.facility_systems (facility_id, system_id, relation_type, criticality) VALUES (f4, ovr, 'styr', 'critical');
  BEGIN
    UPDATE public.information_systems SET classification_source = 'overridden', facility_class_override = 3,
      override_reason = 'Isolerat nät, motiverat i riskanalys' WHERE id = ovr;
    n_ok := n_ok + 1;  -- 3 <= ärvd 4 (primär är 2) ska vara tillåtet
  EXCEPTION WHEN raise_exception THEN fails := fails || text 'K4 avvikelse under ärvd klass stoppades felaktigt';
  END;
  BEGIN
    UPDATE public.information_systems SET facility_class_override = 5 WHERE id = ovr;
    fails := fails || text 'K5 avvikelse uppåt tilläts';
  EXCEPTION WHEN raise_exception THEN n_ok := n_ok + 1;
  END;
  BEGIN
    UPDATE public.information_systems SET facility_class_override = 2, override_reason = 'kort' WHERE id = ovr;
    fails := fails || text 'K6 avvikelse utan motivering tilläts';
  EXCEPTION WHEN raise_exception THEN n_ok := n_ok + 1;
  END;
  IF public.effective_system_class(ovr) = 3 THEN n_ok := n_ok + 1; ELSE fails := fails || text 'K7 avvikande klass används inte'; END IF;

  ------------------------------------------------------------------
  -- A. Kraven följer med automatiskt
  ------------------------------------------------------------------
  INSERT INTO public.requirements (source_id, chapter_section, description, target_type, sl_capability, is_general_advice)
    VALUES (src, 'TEST SL3', 'kräver SL3', 'system', 3, false) RETURNING id INTO r_sl3;
  -- multi är klass 5 -> fick kravet direkt när kravet skapades
  IF EXISTS (SELECT 1 FROM public.system_compliance_records WHERE system_id = multi AND requirement_id = r_sl3)
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'A2 nytt krav lades inte till på befintligt system'; END IF;

  -- System kopplat till klass 2 saknar SL3; höj anläggningen -> läggs till
  INSERT INTO public.information_systems (name, system_type, system_category, classification_source)
    VALUES ('TEST omklass', 'SCADA', 'tunnel_traffic_ot', 'inherited') RETURNING id INTO rec;
  INSERT INTO public.facility_systems (facility_id, system_id, relation_type, criticality, is_primary) VALUES (f2, rec, 'styr', 'critical', true);
  IF NOT EXISTS (SELECT 1 FROM public.system_compliance_records WHERE system_id = rec AND requirement_id = r_sl3)
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'A3 SL3 på klass 2'; END IF;
  UPDATE public.facilities SET classification_level = 5 WHERE id = f2;
  IF EXISTS (SELECT 1 FROM public.system_compliance_records WHERE system_id = rec AND requirement_id = r_sl3)
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'A4 omklassning av anläggning lade inte till krav'; END IF;

  -- Arbete registreras, anläggningen sänks: inget tas bort automatiskt
  UPDATE public.system_compliance_records SET status = 'Pågående', evidence = 'FAT-protokoll 3'
    WHERE system_id = rec AND requirement_id = r_sl3;
  UPDATE public.facilities SET classification_level = 2 WHERE id = f2;
  SELECT * INTO v FROM public.requirement_sync_pending('system', rec);
  IF EXISTS (SELECT 1 FROM public.system_compliance_records WHERE system_id = rec AND requirement_id = r_sl3 AND out_of_scope_since IS NULL)
     AND v.deactivations >= 1
    THEN n_ok := n_ok + 1; ELSE fails := fails || ('A5 sänkning: väntande=' || row_to_json(v)::text); END IF;

  -- Granskad synk: utanför omfattning, bedömningen orörd, räknas inte
  PERFORM public.sync_requirements('system', rec, 'full');
  SELECT status::text || '|' || coalesce(evidence, '') || '|' || (out_of_scope_since IS NOT NULL)::text INTO v_txt
    FROM public.system_compliance_records WHERE system_id = rec AND requirement_id = r_sl3;
  IF v_txt = 'Pågående|FAT-protokoll 3|true' THEN n_ok := n_ok + 1; ELSE fails := fails || ('A6 utanför omfattning: ' || coalesce(v_txt, 'RADERAD')); END IF;
  SELECT out_of_scope INTO v_int FROM public.compliance_object_metrics WHERE object_type = 'system' AND object_id = rec;
  IF v_int = 1 THEN n_ok := n_ok + 1; ELSE fails := fails || ('A7 utanför omfattning i måtten: ' || coalesce(v_int::text, 'null')); END IF;

  -- Höj igen: posten återaktiveras automatiskt med sin bedömning
  UPDATE public.facilities SET classification_level = 5 WHERE id = f2;
  SELECT status::text || '|' || (out_of_scope_since IS NULL)::text INTO v_txt
    FROM public.system_compliance_records WHERE system_id = rec AND requirement_id = r_sl3;
  IF v_txt = 'Pågående|true' THEN n_ok := n_ok + 1; ELSE fails := fails || ('A8 återaktivering: ' || coalesce(v_txt, 'saknas')); END IF;

  -- Ändrade villkor på ett krav följer med
  INSERT INTO public.requirements (source_id, chapter_section, description, target_type, trigger_logic, is_general_advice)
    VALUES (src, 'TEST villkor', 'bara samhällsviktiga kopplingar', 'system', '{"linked_to_critical_facility":true,"system_type":"NÅGOT ANNAT"}', false)
    RETURNING id INTO r_new;
  IF NOT EXISTS (SELECT 1 FROM public.system_compliance_records WHERE system_id = multi AND requirement_id = r_new)
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'A9 villkor ignorerades'; END IF;
  UPDATE public.requirements SET trigger_logic = '{"linked_to_critical_facility":true}' WHERE id = r_new;
  IF EXISTS (SELECT 1 FROM public.system_compliance_records WHERE system_id = multi AND requirement_id = r_new)
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'A10 ändrat villkor lade inte till kravet'; END IF;

  ------------------------------------------------------------------
  IF cardinality(fails) = 0 THEN
    RAISE EXCEPTION 'ALLA TESTER GODKÄNDA (% st). Rullas tillbaka.', n_ok;
  ELSE
    RAISE EXCEPTION 'TESTFEL (% godkända, % fel): %', n_ok, cardinality(fails), array_to_string(fails, ' || ');
  END IF;
END
$test$;
