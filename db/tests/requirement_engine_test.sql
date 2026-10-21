-- =====================================================================
-- Testsvit för kravmotorn (get_applicable_requirements, sync_requirements,
-- validering av villkor). Kör hela filen mot databasen, t.ex. i SQL-editorn.
--
-- Allt körs i en transaktion som ALLTID rullas tillbaka: blocket avslutas
-- med ett undantag som innehåller resultatet. "ALLA TESTER GODKÄNDA" = ok.
-- Inga data ändras.
-- =====================================================================
DO $test$
DECLARE
  fails  text[] := ARRAY[]::text[];
  n_ok   int := 0;
  admin  uuid;
  f1 uuid; f5 uuid; s uuid; src uuid;
  r_all uuid; r_sl3 uuid; r_cls4 uuid; r_link uuid; r_fac uuid; r_both_bad uuid;
  rec_cls4 uuid;
  v_cnt int;
  v_txt text;
  v_rows jsonb;

  -- hjälpare skrivs inline: ok/fel registreras i arrays
BEGIN
  -- Kör som en godkänd användare (krävs av sync_requirements)
  SELECT p.id INTO admin FROM public.profiles p WHERE p.approved LIMIT 1;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', admin, 'role', 'authenticated')::text, true);

  ------------------------------------------------------------------
  -- D. Befintlig data: motorn ska inte vilja ändra något som redan
  --    är synkat (körs före testfixturerna)
  ------------------------------------------------------------------
  SELECT count(*) INTO v_cnt FROM public.information_systems x
    WHERE (SELECT count(*) FROM public.sync_requirements('system', x.id, 'preview')) > 0;
  IF v_cnt = 0 THEN n_ok := n_ok + 1; ELSE fails := fails || ('D1 befintliga system som inte är i synk: ' || v_cnt); END IF;
  SELECT count(*) INTO v_cnt FROM public.facilities x
    WHERE (SELECT count(*) FROM public.sync_requirements('facility', x.id, 'preview')) > 0;
  IF v_cnt = 0 THEN n_ok := n_ok + 1; ELSE fails := fails || ('D2 befintliga anläggningar som inte är i synk: ' || v_cnt); END IF;

  ------------------------------------------------------------------
  -- A. Rena matchningsfunktioner
  ------------------------------------------------------------------
  IF public.trigger_matches_facility(NULL, '{"type":"Bro"}') THEN n_ok := n_ok + 1; ELSE fails := fails || text 'A1 null-villkor ska matcha'; END IF;
  IF public.trigger_matches_facility('{"type":"Vägtunnel"}', '{"type":"Vägtunnel"}') THEN n_ok := n_ok + 1; ELSE fails := fails || text 'A2 typ ska matcha'; END IF;
  IF NOT public.trigger_matches_facility('{"type":"Vägtunnel"}', '{"type":"Bro"}') THEN n_ok := n_ok + 1; ELSE fails := fails || text 'A3 fel typ ska inte matcha'; END IF;
  IF public.trigger_matches_facility('{"type":["Bro","Vägtunnel"]}', '{"type":"Vägtunnel"}') THEN n_ok := n_ok + 1; ELSE fails := fails || text 'A4 typlista ska matcha'; END IF;
  IF NOT public.trigger_matches_facility('{"type":""}', '{"type":"Vägtunnel"}') THEN n_ok := n_ok + 1; ELSE fails := fails || text 'A5 tom typ ska INTE matcha (fail closed)'; END IF;
  IF NOT public.trigger_matches_facility('{"construction_type":[]}', '{"construction_type":"Berg"}') THEN n_ok := n_ok + 1; ELSE fails := fails || text 'A6 tom lista ska INTE matcha'; END IF;
  IF public.trigger_matches_facility('{"is_critical_entity":false}', '{"is_critical_entity":null}') THEN n_ok := n_ok + 1; ELSE fails := fails || text 'A7 null-attribut räknas som false'; END IF;
  IF NOT public.trigger_matches_facility('{"is_critical_entity":false}', '{"is_critical_entity":true}') THEN n_ok := n_ok + 1; ELSE fails := fails || text 'A8 bool ska jämföras'; END IF;
  IF NOT public.trigger_matches_facility('{"length_gt":500}', '{"length_meters":500}') THEN n_ok := n_ok + 1; ELSE fails := fails || text 'A9 length_gt är strikt >'; END IF;
  IF public.trigger_matches_facility('{"length_gt":500}', '{"length_meters":501}') THEN n_ok := n_ok + 1; ELSE fails := fails || text 'A10 length_gt 501 > 500'; END IF;
  IF NOT public.trigger_matches_facility('{"length_gt":500}', '{"length_meters":null}') THEN n_ok := n_ok + 1; ELSE fails := fails || text 'A11 okänd längd ska inte matcha tröskel'; END IF;
  IF NOT public.trigger_matches_facility('{"system_is_central":true}', '{"type":"Vägtunnel"}') THEN n_ok := n_ok + 1; ELSE fails := fails || text 'A12 okänd nyckel ska INTE matcha (anläggning)'; END IF;
  IF NOT public.trigger_matches_system('{"system_is_central":true}', '{"is_central_system":true}') THEN n_ok := n_ok + 1; ELSE fails := fails || text 'A13 okänd nyckel ska INTE matcha (system)'; END IF;
  IF NOT public.trigger_matches_system('{"system_category":""}', '{"system_category":"tunnel_traffic_ot"}') THEN n_ok := n_ok + 1; ELSE fails := fails || text 'A14 tom kategori ska INTE matcha'; END IF;
  IF public.trigger_matches_system('{"system_type":["SCADA","PLC"]}', '{"system_type":"PLC"}') THEN n_ok := n_ok + 1; ELSE fails := fails || text 'A15 systemtyp-lista ska matcha'; END IF;
  IF NOT public.trigger_matches_system('{"owner_type":""}', '{"owner_type":""}') THEN n_ok := n_ok + 1; ELSE fails := fails || text 'A16 tom ägartyp ska INTE matcha'; END IF;
  IF public.trigger_matches_system('{"linked_to_critical_facility":true}', '{}') THEN n_ok := n_ok + 1; ELSE fails := fails || text 'A17 linked_*-nycklar hindrar inte systemets egna villkor'; END IF;
  IF NOT public.trigger_matches_system('{"type":"Vägtunnel"}', '{}') THEN n_ok := n_ok + 1; ELSE fails := fails || text 'A18 anläggningsnyckel på system ska INTE matcha'; END IF;

  ------------------------------------------------------------------
  -- B. Validering
  ------------------------------------------------------------------
  IF cardinality(public.trigger_logic_problems('{"type":"Vägtunnel","length_gt":100}', 'facility')) = 0 THEN n_ok := n_ok + 1; ELSE fails := fails || text 'B1 giltiga villkor underkändes'; END IF;
  IF cardinality(public.trigger_logic_problems('{"foo":1}', 'facility')) > 0 THEN n_ok := n_ok + 1; ELSE fails := fails || text 'B2 okänd nyckel godkändes'; END IF;
  IF cardinality(public.trigger_logic_problems('{"type":"Vägtunel"}', 'facility')) > 0 THEN n_ok := n_ok + 1; ELSE fails := fails || text 'B3 felstavad typ godkändes'; END IF;
  IF cardinality(public.trigger_logic_problems('{"length_gt":"500"}', 'facility')) > 0 THEN n_ok := n_ok + 1; ELSE fails := fails || text 'B4 tal som text godkändes'; END IF;
  IF cardinality(public.trigger_logic_problems('{"is_critical_entity":"true"}', 'system')) > 0 THEN n_ok := n_ok + 1; ELSE fails := fails || text 'B5 bool som text godkändes'; END IF;
  IF cardinality(public.trigger_logic_problems('{"system_type":""}', 'system')) > 0 THEN n_ok := n_ok + 1; ELSE fails := fails || text 'B6 tomt värde godkändes'; END IF;
  IF cardinality(public.trigger_logic_problems('{"type":"Vägtunnel"}', 'system')) > 0 THEN n_ok := n_ok + 1; ELSE fails := fails || text 'B7 anläggningsnyckel på systemkrav godkändes'; END IF;
  IF cardinality(public.trigger_logic_problems('{"linked_to_facility_type":"Vägtunnel"}', 'both')) = 0 THEN n_ok := n_ok + 1; ELSE fails := fails || text 'B8 both ska använda systemnycklar'; END IF;

  INSERT INTO public.requirement_sources (document_name, category)
    VALUES ('TEST motor', (SELECT category FROM public.requirement_sources LIMIT 1))
    RETURNING id INTO src;

  BEGIN
    INSERT INTO public.requirements (source_id, chapter_section, description, target_type, trigger_logic, is_general_advice)
      VALUES (src, 'TEST bad', 'x', 'system', '{"system_is_central":true}', false);
    fails := fails || text 'B9 trigger släppte igenom okänd nyckel';
  EXCEPTION WHEN check_violation THEN n_ok := n_ok + 1;
  END;

  INSERT INTO public.requirements (source_id, chapter_section, description, target_type, trigger_logic, is_general_advice)
    VALUES (src, 'TEST empty', 'x', 'system', '{}', false) RETURNING id INTO r_both_bad;
  IF (SELECT trigger_logic FROM public.requirements WHERE id = r_both_bad) IS NULL THEN n_ok := n_ok + 1; ELSE fails := fails || text 'B10 {} ska sparas som NULL'; END IF;
  DELETE FROM public.requirements WHERE id = r_both_bad;

  ------------------------------------------------------------------
  -- C. Motor + synk, hela flödet
  ------------------------------------------------------------------
  INSERT INTO public.facilities (name, type, classification_level, is_critical_entity, length_meters)
    VALUES ('TEST F1', 'Vägtunnel', 1, false, 200) RETURNING id INTO f1;
  INSERT INTO public.facilities (name, type, classification_level, is_critical_entity, length_meters)
    VALUES ('TEST F5', 'Vägtunnel', 5, true, 3000) RETURNING id INTO f5;

  INSERT INTO public.requirements (source_id, chapter_section, description, target_type, min_classification_level, is_general_advice)
    VALUES (src, 'TEST all', 'gäller alla system', 'system', 1, false) RETURNING id INTO r_all;
  INSERT INTO public.requirements (source_id, chapter_section, description, target_type, sl_capability, is_general_advice)
    VALUES (src, 'TEST sl3', 'kräver SL3', 'system', 3, false) RETURNING id INTO r_sl3;
  INSERT INTO public.requirements (source_id, chapter_section, description, target_type, min_classification_level, is_general_advice)
    VALUES (src, 'TEST cls4', 'kräver klass 4', 'system', 4, false) RETURNING id INTO r_cls4;
  INSERT INTO public.requirements (source_id, chapter_section, description, target_type, trigger_logic, is_general_advice)
    VALUES (src, 'TEST link', 'ärvs från samhällsviktig', 'system', '{"linked_to_critical_facility":true}', false) RETURNING id INTO r_link;
  INSERT INTO public.requirements (source_id, chapter_section, description, target_type, trigger_logic, is_general_advice)
    VALUES (src, 'TEST fac', 'tunnel > 100 m', 'facility', '{"type":"Vägtunnel","length_gt":100}', false) RETURNING id INTO r_fac;

  -- System kopplat till klass 1-anläggning
  INSERT INTO public.information_systems (name, system_type, system_category, classification_source)
    VALUES ('TEST S', 'SCADA', 'tunnel_traffic_ot', 'inherited') RETURNING id INTO s;
  INSERT INTO public.facility_systems (facility_id, system_id, relation_type, criticality, is_primary)
    VALUES (f1, s, 'styr', 'critical', true);

  PERFORM public.sync_requirements('system', s, 'add');

  -- Punkt 5: klass 1 får inte SL3- eller klass 4-krav
  IF EXISTS (SELECT 1 FROM public.system_compliance_records WHERE system_id = s AND requirement_id = r_all) THEN n_ok := n_ok + 1; ELSE fails := fails || text 'C1 basKrav saknas'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.system_compliance_records WHERE system_id = s AND requirement_id = r_sl3) THEN n_ok := n_ok + 1; ELSE fails := fails || text 'C2 SL3-krav på klass 1-system (punkt 5)'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.system_compliance_records WHERE system_id = s AND requirement_id = r_cls4) THEN n_ok := n_ok + 1; ELSE fails := fails || text 'C3 klass 4-krav på klass 1-system (punkt 5)'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.system_compliance_records WHERE system_id = s AND requirement_id = r_link) THEN n_ok := n_ok + 1; ELSE fails := fails || text 'C4 ärvt krav utan samhällsviktig anläggning'; END IF;

  -- Idempotent: andra add ger inget nytt
  SELECT count(*) INTO v_cnt FROM public.sync_requirements('system', s, 'add');
  IF v_cnt = 0 THEN n_ok := n_ok + 1; ELSE fails := fails || ('C5 add är inte idempotent (' || v_cnt || ')'); END IF;

  -- Koppla klass 5, samhällsviktig anläggning: klassen höjs och kravet ärvs
  INSERT INTO public.facility_systems (facility_id, system_id, relation_type, criticality)
    VALUES (f5, s, 'styr', 'critical');
  PERFORM public.sync_requirements('system', s, 'add');
  IF EXISTS (SELECT 1 FROM public.system_compliance_records WHERE system_id = s AND requirement_id = r_sl3) THEN n_ok := n_ok + 1; ELSE fails := fails || text 'C6 SL3-krav saknas efter koppling till klass 5'; END IF;
  IF EXISTS (SELECT 1 FROM public.system_compliance_records WHERE system_id = s AND requirement_id = r_cls4) THEN n_ok := n_ok + 1; ELSE fails := fails || text 'C7 klass 4-krav saknas efter koppling'; END IF;
  SELECT notes INTO v_txt FROM public.system_compliance_records WHERE system_id = s AND requirement_id = r_link;
  IF v_txt = 'Ärvt från: TEST F5' THEN n_ok := n_ok + 1; ELSE fails := fails || ('C8 ärvt krav/anteckning: ' || coalesce(v_txt, 'saknas')); END IF;

  -- Arbete registreras på klass 4-kravet
  UPDATE public.system_compliance_records SET status = 'Pågående', evidence = 'Protokoll FAT-12'
    WHERE system_id = s AND requirement_id = r_cls4 RETURNING id INTO rec_cls4;

  -- Förhandsvisning efter att klass 5 kopplats bort ändrar inget
  DELETE FROM public.facility_systems WHERE facility_id = f5 AND system_id = s;
  SELECT jsonb_object_agg(requirement_id::text, action) INTO v_rows FROM public.sync_requirements('system', s, 'preview');
  IF v_rows ->> r_sl3::text = 'remove' AND v_rows ->> r_cls4::text = 'deactivate' AND v_rows ->> r_link::text = 'remove'
    THEN n_ok := n_ok + 1; ELSE fails := fails || ('C9 plan fel: ' || coalesce(v_rows::text, 'tom')); END IF;
  IF EXISTS (SELECT 1 FROM public.system_compliance_records WHERE system_id = s AND requirement_id = r_sl3) THEN n_ok := n_ok + 1; ELSE fails := fails || text 'C10 preview ändrade data'; END IF;

  -- Full synk: orört tas bort, arbete bevaras och markeras utanför omfattningen
  SELECT jsonb_object_agg(requirement_id::text, action) INTO v_rows FROM public.sync_requirements('system', s, 'full');
  IF NOT EXISTS (SELECT 1 FROM public.system_compliance_records WHERE system_id = s AND requirement_id = r_sl3) THEN n_ok := n_ok + 1; ELSE fails := fails || text 'C11 orörd post togs inte bort'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.system_compliance_records WHERE system_id = s AND requirement_id = r_link) THEN n_ok := n_ok + 1; ELSE fails := fails || text 'C12 orörd ärvd post togs inte bort'; END IF;
  -- Status och arbete orörda, posten markeras utanför omfattningen med motivering
  SELECT status::text || '|' || evidence || '|' || (out_of_scope_since IS NOT NULL AND length(out_of_scope_reason) >= 15)::text INTO v_txt
    FROM public.system_compliance_records WHERE id = rec_cls4;
  IF v_txt = 'Pågående|Protokoll FAT-12|true' THEN n_ok := n_ok + 1; ELSE fails := fails || ('C13 post med arbete: ' || coalesce(v_txt, 'RADERAD!')); END IF;
  SELECT count(*) INTO v_cnt FROM public.sync_requirements('system', s, 'full');
  IF v_cnt = 0 THEN n_ok := n_ok + 1; ELSE fails := fails || ('C14 full synk är inte idempotent (' || v_cnt || ')'); END IF;
  -- Hela borttagningen ska synas som EN loggrad med rätt antal
  IF (SELECT count(*) FROM public.activity_log WHERE action = 'requirements_removed' AND entity_id = s) = 1
     AND (SELECT (metadata ->> 'antal')::int FROM public.activity_log WHERE action = 'requirements_removed' AND entity_id = s)
         = (SELECT count(*) FROM jsonb_each_text(v_rows) WHERE value = 'remove')
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'C14b borttagningen loggades inte som en rad'; END IF;

  -- Anläggning: villkor + simulering + matchningsvy
  PERFORM public.sync_requirements('facility', f1, 'add');
  IF EXISTS (SELECT 1 FROM public.compliance_records WHERE facility_id = f1 AND requirement_id = r_fac) THEN n_ok := n_ok + 1; ELSE fails := fails || text 'C15 anläggningskrav saknas'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.simulate_facility_requirements(f1, '{"length_meters":50}') a WHERE a = r_fac) THEN n_ok := n_ok + 1; ELSE fails := fails || text 'C16 simulering ignorerar ändrad längd'; END IF;
  IF EXISTS (SELECT 1 FROM public.get_requirement_matches(r_fac) m WHERE m.object_id = f1) THEN n_ok := n_ok + 1; ELSE fails := fails || text 'C17 matchningsvyn saknar anläggningen'; END IF;
  IF EXISTS (SELECT 1 FROM public.get_requirement_matches(r_all) m WHERE m.object_id = s AND m.object_type = 'system') THEN n_ok := n_ok + 1; ELSE fails := fails || text 'C18 matchningsvyn saknar systemet'; END IF;

  -- Determinism: två körningar ger identiskt resultat
  IF (SELECT array_agg(requirement_id ORDER BY requirement_id) FROM public.get_applicable_requirements('system', s))
     = (SELECT array_agg(requirement_id ORDER BY requirement_id) FROM public.get_applicable_requirements('system', s))
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'C19 olika svar vid två körningar'; END IF;

  -- Upphävda krav (kravpaket) gäller inga objekt och syns som granskning
  UPDATE public.requirements SET repealed_at = now() WHERE id = r_fac;
  IF NOT EXISTS (SELECT 1 FROM public.get_requirement_matches(r_fac)) THEN n_ok := n_ok + 1; ELSE fails := fails || text 'R1 upphävt krav matchar fortfarande'; END IF;
  IF (SELECT removals + deactivations FROM public.requirement_sync_pending('facility', f1)) >= 1
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'R2 upphävt krav syns inte som granskning'; END IF;

  ------------------------------------------------------------------
  IF cardinality(fails) = 0 THEN
    RAISE EXCEPTION 'ALLA TESTER GODKÄNDA (% st). Rullas tillbaka.', n_ok;
  ELSE
    RAISE EXCEPTION 'TESTFEL (% godkända, % fel): %', n_ok, cardinality(fails), array_to_string(fails, ' || ');
  END IF;
END
$test$;
