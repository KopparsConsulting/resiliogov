-- =====================================================================
-- Tester: import av mappningsark som länkförslag (migration 20261007090000).
-- Skapar egna regelverk och krav. Rullas alltid tillbaka.
-- =====================================================================
DO $test$
DECLARE
  fails text[] := ARRAY[]::text[];
  n_ok int := 0;
  usr uuid;
  s_lag uuid; s_fs uuid; s_std uuid; s_none uuid;
  r_lag1 uuid; r_lag2 uuid; r_lag12 uuid; r_lag3 uuid;
  r_fs1 uuid; r_fs2 uuid;
  r_sr11 uuid; r_sr12 uuid; r_sr21 uuid; r_sr11re uuid;
  v jsonb;
  v_rows jsonb;
  v_before int;
  v_row jsonb;
BEGIN
  SELECT p.id INTO usr FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'admin' WHERE p.approved LIMIT 1;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', usr, 'role', 'authenticated')::text, true);

  INSERT INTO public.requirement_sources (document_name, category, source_level)
    VALUES ('TEST Cybersäkerhetslagen', 'Informationssäkerhet', 'lag') RETURNING id INTO s_lag;
  INSERT INTO public.requirement_sources (document_name, category, source_level)
    VALUES ('TEST MCFFS 2026:11', 'Informationssäkerhet', 'föreskrift') RETURNING id INTO s_fs;
  INSERT INTO public.requirement_sources (document_name, category, source_level)
    VALUES ('TEST IEC 62443-3-3', 'Informationssäkerhet', 'standard') RETURNING id INTO s_std;
  INSERT INTO public.requirement_sources (document_name, category)
    VALUES ('TEST utan nivå', 'Informationssäkerhet') RETURNING id INTO s_none;

  INSERT INTO public.requirements (source_id, chapter_section, description, target_type) VALUES
    (s_lag, '3 kap. 1 §', 'Säkerhetsåtgärder', 'facility') RETURNING id INTO r_lag1;
  INSERT INTO public.requirements (source_id, chapter_section, description, target_type) VALUES
    (s_lag, '2 §', 'Incidentrapportering', 'facility') RETURNING id INTO r_lag2;
  INSERT INTO public.requirements (source_id, chapter_section, description, target_type) VALUES
    (s_lag, '12 §', 'Ledningens ansvar', 'facility') RETURNING id INTO r_lag12;
  INSERT INTO public.requirements (source_id, chapter_section, description, target_type) VALUES
    (s_lag, '4 kap. 1 §', 'Registrering', 'facility') RETURNING id INTO r_lag3;
  INSERT INTO public.requirements (source_id, chapter_section, description, target_type) VALUES
    (s_fs, '3 kap. 1 §', 'Åtkomstkontroll', 'facility') RETURNING id INTO r_fs1;
  INSERT INTO public.requirements (source_id, chapter_section, description, target_type) VALUES
    (s_fs, '5 kap. 2 §', 'Incidentrutin', 'facility') RETURNING id INTO r_fs2;
  INSERT INTO public.requirements (source_id, chapter_section, description, target_type, sl_capability) VALUES
    (s_std, 'SR 1.1', 'Identifiering av användare', 'system', 1) RETURNING id INTO r_sr11;
  INSERT INTO public.requirements (source_id, chapter_section, description, target_type, sl_capability) VALUES
    (s_std, 'SR 1.2', 'Identifiering av processer', 'system', 2) RETURNING id INTO r_sr12;
  INSERT INTO public.requirements (source_id, chapter_section, description, target_type, sl_capability) VALUES
    (s_std, 'SR 2.1', 'Behörighetskontroll', 'system', 1) RETURNING id INTO r_sr21;
  INSERT INTO public.requirements (source_id, chapter_section, description, target_type, sl_capability) VALUES
    (s_std, 'SR 1.1 RE(1)', 'Tvåfaktor', 'system', 2) RETURNING id INTO r_sr11re;

  -- M1: matchning – exakt, med prefix och utan falska träffar på slutet
  IF public.match_requirement_ref(s_std, 'sr 1.1') ->> 'id' = r_sr11::text
     AND public.match_requirement_ref(s_std, '5.1 SR 1.1') ->> 'id' = r_sr11::text
     AND public.match_requirement_ref(s_std, 'IEC 62443-3-3 SR 1.1') ->> 'id' = r_sr11::text
     AND public.match_requirement_ref(s_std, 'SR 1.1 RE(1)') ->> 'id' = r_sr11re::text
     AND public.match_requirement_ref(s_std, 'SR 1.1 RE 1') ->> 'id' = r_sr11re::text
     AND public.match_requirement_ref(s_std, 'SR 11') ->> 'status' = 'saknas'
     AND public.match_requirement_ref(s_lag, '3 kap 1 §') ->> 'id' = r_lag1::text
     AND public.match_requirement_ref(s_lag, '12 §') ->> 'id' = r_lag12::text
     AND public.match_requirement_ref(s_lag, '22 §') ->> 'status' = 'saknas'
     AND public.match_requirement_ref(s_lag, '') ->> 'status' = 'saknas'
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'M1 matchning'; END IF;

  -- M2: tvetydigt krav-ID redovisas, väljs inte på måfå
  INSERT INTO public.requirements (source_id, chapter_section, description, target_type) VALUES
    (s_lag, '3 kap.1 §', 'Dubblett med annan stavning', 'facility');
  IF public.match_requirement_ref(s_lag, '3 kap. 1 §') ->> 'status' = 'tvetydig'
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'M2 tvetydig'; END IF;
  DELETE FROM public.requirements WHERE source_id = s_lag AND chapter_section = '3 kap.1 §';

  v_rows := jsonb_build_array(
    -- R1: full kedja med två IEC-krav
    jsonb_build_object('ref', 'R1', 'law', '3 kap. 1 §', 'regulation', '3 kap. 1 §',
                       'standard', 'SR 1.1; 5.1 SR 1.2', 'coverage', 'Full', 'comment', 'Åtkomst'),
    -- R2: lucka – lagkrav utan teknisk omsättning
    jsonb_build_object('ref', 'R2', 'law', '2 §', 'regulation', '5 kap. 2 §', 'standard', '—', 'coverage', 'Saknas'),
    -- R3: lag direkt till standard, delvis
    jsonb_build_object('ref', 'R3', 'law', '12 §', 'standard', 'SR 2.1', 'coverage', 'delvis'),
    -- R4: okänt krav-ID ger fel och inga länkar
    jsonb_build_object('ref', 'R4', 'law', '4 kap. 1 §', 'regulation', '9 kap. 9 §', 'standard', 'SR 2.1'),
    -- R5: samma par som R1 (fs1 → SR 1.1) men delvis → ihopslaget som delvis
    jsonb_build_object('ref', 'R5', 'law', '3 kap. 1 §', 'regulation', '3 kap. 1 §', 'standard', 'SR 1.1',
                       'coverage', 'Delvis', 'comment', 'Gäller bara fjärråtkomst'),
    -- tom rad hoppas över
    jsonb_build_object('ref', 'R6', 'law', '', 'regulation', ' ', 'standard', null),
    -- R7: okänd täckning ger varning men länkar
    jsonb_build_object('ref', 'R7', 'law', '4 kap. 1 §', 'standard', 'SR 1.1 RE(1)', 'coverage', 'kanske'));

  -- I1: förhandsgranskning skriver ingenting
  SELECT count(*) INTO v_before FROM public.requirement_links;
  v := public.import_requirement_link_rows(s_lag, s_fs, s_std, v_rows, 'mappning.xlsx', false);
  IF (SELECT count(*) FROM public.requirement_links) = v_before
     AND (v -> 'sammanfattning' ->> 'importerad')::boolean = false
     AND (v -> 'sammanfattning' ->> 'skapade')::int = 0
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'I1 förhandsgranskning skrev'; END IF;

  -- I2: sammanfattningen stämmer
  -- par: lag1→fs1, fs1→sr11, fs1→sr12, lag2→fs2, lag12→sr21, lag3→sr11re = 6
  IF (v -> 'sammanfattning' ->> 'rader')::int = 6
     AND (v -> 'sammanfattning' ->> 'rader_med_fel')::int = 1
     AND (v -> 'sammanfattning' ->> 'luckor')::int = 1
     AND (v -> 'sammanfattning' ->> 'nya_förslag')::int = 6
    THEN n_ok := n_ok + 1; ELSE fails := fails || ('I2 sammanfattning: ' || (v -> 'sammanfattning')::text); END IF;

  -- I3: felraden pekar ut vad som är fel
  SELECT x INTO v_row FROM jsonb_array_elements(v -> 'rader') x WHERE x ->> 'ref' = 'R4';
  IF v_row ->> 'status' = 'fel' AND jsonb_array_length(v_row -> 'länkar') = 0
     AND (v_row -> 'meddelanden') ->> 0 LIKE '%9 kap. 9 §%'
    THEN n_ok := n_ok + 1; ELSE fails := fails || ('I3 felrad: ' || coalesce(v_row::text, 'saknas')); END IF;

  -- I4: luckraden är ok, redovisas som lucka och ger bara lag → föreskrift
  SELECT x INTO v_row FROM jsonb_array_elements(v -> 'rader') x WHERE x ->> 'ref' = 'R2';
  IF v_row ->> 'status' = 'ok' AND (v_row ->> 'lucka')::boolean
     AND jsonb_array_length(v_row -> 'länkar') = 1
     AND v_row -> 'länkar' -> 0 ->> 'coverage' = 'full'
    THEN n_ok := n_ok + 1; ELSE fails := fails || ('I4 lucka: ' || coalesce(v_row::text, 'saknas')); END IF;

  -- I5: okänd täckning ger varning
  SELECT x INTO v_row FROM jsonb_array_elements(v -> 'rader') x WHERE x ->> 'ref' = 'R7';
  IF v_row ->> 'status' = 'varning' AND jsonb_array_length(v_row -> 'länkar') = 1
    THEN n_ok := n_ok + 1; ELSE fails := fails || ('I5 varning: ' || coalesce(v_row::text, 'saknas')); END IF;

  -- I6: import skapar väntande förslag med rätt täckning, typ och motivering
  v := public.import_requirement_link_rows(s_lag, s_fs, s_std, v_rows, 'mappning.xlsx', true);
  IF (v -> 'sammanfattning' ->> 'skapade')::int = 6
     AND (SELECT count(*) FROM public.requirement_links
          WHERE status = 'pending' AND suggested_by LIKE 'Mappningsark mappning.xlsx (%'
            AND parent_requirement_id IN (r_lag1, r_lag2, r_lag12, r_lag3, r_fs1, r_fs2)) = 6
     AND (SELECT coverage FROM public.requirement_links WHERE parent_requirement_id = r_fs1 AND child_requirement_id = r_sr11) = 'delvis'
     AND (SELECT coverage FROM public.requirement_links WHERE parent_requirement_id = r_fs1 AND child_requirement_id = r_sr12) = 'full'
     AND (SELECT coverage FROM public.requirement_links WHERE parent_requirement_id = r_lag12 AND child_requirement_id = r_sr21) = 'delvis'
     AND (SELECT link_type FROM public.requirement_links WHERE parent_requirement_id = r_lag1 AND child_requirement_id = r_fs1) = 'preciseras_av'
     AND (SELECT link_type FROM public.requirement_links WHERE parent_requirement_id = r_lag12 AND child_requirement_id = r_sr21) = 'omsätts_av'
     AND (SELECT rationale FROM public.requirement_links WHERE parent_requirement_id = r_fs1 AND child_requirement_id = r_sr11)
         LIKE 'Från mappningsarket, rader R1, R5%Gäller bara fjärråtkomst%'
    THEN n_ok := n_ok + 1; ELSE fails := fails || ('I6 import: ' || (v -> 'sammanfattning')::text); END IF;

  -- I7: importen loggas
  IF EXISTS (SELECT 1 FROM public.activity_log WHERE action = 'requirement_links_imported'
               AND entity_label = 'Mappningsark mappning.xlsx' AND (metadata ->> 'skapade')::int = 6)
     AND (SELECT count(*) FROM public.activity_log WHERE action = 'requirement_link_created'
            AND entity_id IN (SELECT id FROM public.requirement_links WHERE suggested_by LIKE 'Mappningsark%')) = 6
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'I7 loggning'; END IF;

  -- I8: samma ark igen skapar inga dubbletter; godkända och väntande redovisas
  PERFORM public.decide_requirement_links(
    ARRAY(SELECT id FROM public.requirement_links WHERE parent_requirement_id = r_lag1 AND child_requirement_id = r_fs1), true);
  v := public.import_requirement_link_rows(s_lag, s_fs, s_std, v_rows, 'mappning.xlsx', true);
  IF (v -> 'sammanfattning' ->> 'skapade')::int = 0
     AND (v -> 'sammanfattning' ->> 'redan_godkända')::int = 1
     AND (v -> 'sammanfattning' ->> 'väntar_redan')::int = 5
    THEN n_ok := n_ok + 1; ELSE fails := fails || ('I8 dubbletter: ' || (v -> 'sammanfattning')::text); END IF;

  -- I9: regelverk i fel ordning stoppas
  BEGIN
    PERFORM public.import_requirement_link_rows(s_std, s_fs, s_lag, v_rows, NULL, false);
    fails := fails || text 'I9 fel ordning tilläts';
  EXCEPTION WHEN raise_exception THEN n_ok := n_ok + 1;
  END;

  -- I10: regelverk utan nivå stoppas
  BEGIN
    PERFORM public.import_requirement_link_rows(s_none, s_fs, s_std, v_rows, NULL, false);
    fails := fails || text 'I10 regelverk utan nivå tilläts';
  EXCEPTION WHEN raise_exception THEN n_ok := n_ok + 1;
  END;

  -- I11: standardkrav utan valt standardregelverk är fel på raden, inte en tyst lucka
  v := public.import_requirement_link_rows(s_lag, s_fs, NULL,
         jsonb_build_array(jsonb_build_object('ref', 'X', 'law', '2 §', 'regulation', '5 kap. 2 §', 'standard', 'SR 1.1')),
         NULL, false);
  IF v -> 'rader' -> 0 ->> 'status' = 'fel'
    THEN n_ok := n_ok + 1; ELSE fails := fails || ('I11: ' || v::text); END IF;

  -- I12: ej godkänd användare får inte importera
  PERFORM set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
  BEGIN
    PERFORM public.import_requirement_link_rows(s_lag, s_fs, s_std, v_rows, NULL, true);
    fails := fails || text 'I12 ej godkänd användare kunde importera';
  EXCEPTION WHEN insufficient_privilege THEN n_ok := n_ok + 1;
  END;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', usr, 'role', 'authenticated')::text, true);

  IF cardinality(fails) = 0 THEN
    RAISE EXCEPTION 'ALLA TESTER GODKÄNDA (% st). Rullas tillbaka.', n_ok;
  ELSE
    RAISE EXCEPTION 'TESTFEL (% godkända, % fel): %', n_ok, cardinality(fails), array_to_string(fails, ' || ');
  END IF;
END
$test$;
