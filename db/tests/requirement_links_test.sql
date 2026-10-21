-- =====================================================================
-- Tester: regelverkens nivå och kravlänkar (migration 20261006140000).
-- Skapar egna regelverk och krav. Rullas alltid tillbaka.
-- =====================================================================
DO $test$
DECLARE
  fails text[] := ARRAY[]::text[];
  n_ok int := 0;
  usr uuid;
  s_lag uuid; s_fs uuid; s_std uuid; s_none uuid;
  r_lag uuid; r_lag2 uuid; r_fs uuid; r_std uuid; r_std2 uuid; r_none uuid;
  l1 uuid; l2 uuid; l3 uuid; l_tmp uuid;
  v_txt text;
  v_int int;
  v_exp record;
  v_pkg jsonb;
  v_content text;
  v_res jsonb;
  v_last int;
BEGIN
  SELECT p.id INTO usr FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'admin' WHERE p.approved LIMIT 1;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', usr, 'role', 'authenticated')::text, true);

  -- Testdata: ett regelverk per nivå och ett utan nivå
  INSERT INTO public.requirement_sources (document_name, category, source_level)
    VALUES ('TEST Cybersäkerhetslagen', 'Informationssäkerhet', 'lag') RETURNING id INTO s_lag;
  INSERT INTO public.requirement_sources (document_name, category, source_level)
    VALUES ('TEST MCFFS 2026:11', 'Informationssäkerhet', 'föreskrift') RETURNING id INTO s_fs;
  INSERT INTO public.requirement_sources (document_name, category, source_level)
    VALUES ('TEST IEC 62443-3-3', 'Informationssäkerhet', 'standard') RETURNING id INTO s_std;
  INSERT INTO public.requirement_sources (document_name, category)
    VALUES ('TEST okänt dokument', 'Informationssäkerhet') RETURNING id INTO s_none;

  INSERT INTO public.requirements (source_id, chapter_section, description, target_type)
    VALUES (s_lag, 'TEST § 1', 'Lämpliga åtgärder för att skydda nätverks- och informationssystem', 'facility') RETURNING id INTO r_lag;
  INSERT INTO public.requirements (source_id, chapter_section, description, target_type)
    VALUES (s_lag, 'TEST § 2', 'Rapportera betydande incidenter', 'facility') RETURNING id INTO r_lag2;
  INSERT INTO public.requirements (source_id, chapter_section, description, target_type)
    VALUES (s_fs, 'TEST 3 kap. 1 §', 'Åtkomstkontroll', 'facility') RETURNING id INTO r_fs;
  INSERT INTO public.requirements (source_id, chapter_section, description, target_type, sl_capability)
    VALUES (s_std, 'TEST SR 1.1', 'Unik identifiering av användare', 'system', 2) RETURNING id INTO r_std;
  INSERT INTO public.requirements (source_id, chapter_section, description, target_type, sl_capability)
    VALUES (s_std, 'TEST SR 1.2', 'Identifiering av processer', 'system', 2) RETURNING id INTO r_std2;
  INSERT INTO public.requirements (source_id, chapter_section, description, target_type)
    VALUES (s_none, 'TEST X', 'Krav i regelverk utan nivå', 'facility') RETURNING id INTO r_none;

  -- L1: lag → föreskrift blir "preciseras_av" och väntar på beslut
  l1 := public.suggest_requirement_link(r_lag, r_fs, 'full', 'Föreskriften preciserar åtgärderna');
  IF (SELECT link_type = 'preciseras_av' AND status = 'pending' AND decided_at IS NULL
             AND suggested_by = public._current_email() FROM public.requirement_links WHERE id = l1)
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'L1 lag→föreskrift'; END IF;

  -- L2: föreskrift → standard blir "omsätts_av" även om anroparen anger annat
  INSERT INTO public.requirement_links (parent_requirement_id, child_requirement_id, link_type, suggested_by, confidence)
    VALUES (r_fs, r_std, 'preciseras_av', 'AI (test)', 'hög') RETURNING id INTO l2;
  IF (SELECT link_type FROM public.requirement_links WHERE id = l2) = 'omsätts_av'
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'L2 länktyp sätts av nivån'; END IF;

  -- L3: länk uppåt i kedjan stoppas
  BEGIN
    PERFORM public.suggest_requirement_link(r_std, r_lag);
    fails := fails || text 'L3 länk uppåt tilläts';
  EXCEPTION WHEN check_violation THEN n_ok := n_ok + 1;
  END;

  -- L4: länk inom samma nivå stoppas
  BEGIN
    PERFORM public.suggest_requirement_link(r_std, r_std2);
    fails := fails || text 'L4 länk inom samma nivå tilläts';
  EXCEPTION WHEN check_violation THEN n_ok := n_ok + 1;
  END;

  -- L5: regelverk utan nivå kan inte länkas
  BEGIN
    PERFORM public.suggest_requirement_link(r_none, r_std);
    fails := fails || text 'L5 regelverk utan nivå tilläts';
  EXCEPTION WHEN check_violation THEN n_ok := n_ok + 1;
  END;

  -- L6: samma par kan inte föreslås två gånger …
  BEGIN
    PERFORM public.suggest_requirement_link(r_lag, r_fs);
    fails := fails || text 'L6 dubblettförslag tilläts';
  EXCEPTION WHEN unique_violation THEN n_ok := n_ok + 1;
  END;

  -- L7: … men ett avvisat förslag kan föreslås igen
  l3 := public.suggest_requirement_link(r_lag, r_std2, 'delvis');
  PERFORM public.decide_requirement_links(ARRAY[l3], false);
  l_tmp := public.suggest_requirement_link(r_lag, r_std2, 'delvis');
  IF (SELECT status FROM public.requirement_links WHERE id = l3) = 'rejected' AND l_tmp IS NOT NULL
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'L7 nytt förslag efter avvisning'; END IF;
  PERFORM public.decide_requirement_links(ARRAY[l_tmp], false);

  -- L8: godkännande sätter beslutsfält, kan justera täckningen och syns i vyn
  v_int := public.decide_requirement_links(ARRAY[l1, l2], true);
  UPDATE public.requirement_links SET coverage = 'full' WHERE id = l1; -- oförändrat, ska inte loggas
  IF v_int = 2
     AND (SELECT count(*) FROM public.requirement_links WHERE id IN (l1, l2)
          AND status = 'approved' AND decided_by IS NOT NULL AND decided_at IS NOT NULL) = 2
     AND (SELECT count(*) FROM public.requirement_link_details WHERE id IN (l1, l2)) = 2
     AND (SELECT parent_level = 'föreskrift' AND child_level = 'standard'
          FROM public.requirement_link_details WHERE id = l2)
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'L8 godkännande'; END IF;

  l_tmp := public.suggest_requirement_link(r_lag2, r_std);
  PERFORM public.decide_requirement_links(ARRAY[l_tmp], true, 'delvis');
  IF (SELECT coverage FROM public.requirement_links WHERE id = l_tmp) = 'delvis'
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'L8b täckning vid godkännande'; END IF;

  -- L9: bara administratörer beslutar
  DELETE FROM public.user_roles WHERE user_id = usr AND role = 'admin';
  BEGIN
    PERFORM public.decide_requirement_links(ARRAY[l3], true);
    fails := fails || text 'L9 icke-admin kunde besluta';
  EXCEPTION WHEN insufficient_privilege THEN n_ok := n_ok + 1;
  END;
  INSERT INTO public.user_roles (user_id, role) VALUES (usr, 'admin');

  -- L10: inloggad men ej godkänd användare kan inte föreslå
  PERFORM set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
  BEGIN
    PERFORM public.suggest_requirement_link(r_lag2, r_fs);
    fails := fails || text 'L10 ej godkänd användare kunde föreslå';
  EXCEPTION WHEN insufficient_privilege THEN n_ok := n_ok + 1;
  END;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', usr, 'role', 'authenticated')::text, true);

  -- L11: med rollen authenticated går det inte att skriva in en godkänd länk direkt
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
    INSERT INTO public.requirement_links (parent_requirement_id, child_requirement_id, suggested_by, status, decided_at, decided_by)
      VALUES (r_lag2, r_fs, 'test', 'approved', now(), 'test');
    fails := fails || text 'L11 godkänd länk kunde skrivas direkt';
  EXCEPTION WHEN insufficient_privilege THEN n_ok := n_ok + 1;
  END;
  -- … men ett förslag går bra, och uppdatering är inte tillåten
  BEGIN
    INSERT INTO public.requirement_links (parent_requirement_id, child_requirement_id, suggested_by)
      VALUES (r_lag2, r_fs, 'test') RETURNING id INTO l_tmp;
    UPDATE public.requirement_links SET status = 'approved' WHERE id = l_tmp;
    fails := fails || text 'L11b uppdatering tilläts';
  EXCEPTION WHEN insufficient_privilege THEN n_ok := n_ok + 1;
  END;
  EXECUTE 'RESET ROLE';

  -- L12: nivåbyte som skulle vända en godkänd länk stoppas
  BEGIN
    UPDATE public.requirement_sources SET source_level = 'standard' WHERE id = s_lag;
    fails := fails || text 'L12 nivåbyte vände länk';
  EXCEPTION WHEN check_violation THEN n_ok := n_ok + 1;
  END;
  -- medan ett nivåbyte som behåller riktningen går bra
  UPDATE public.requirement_sources SET source_level = 'förordning' WHERE id = s_fs;
  IF (SELECT source_level FROM public.requirement_sources WHERE id = s_fs) = 'förordning'
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'L12b tillåtet nivåbyte'; END IF;
  UPDATE public.requirement_sources SET source_level = 'föreskrift' WHERE id = s_fs;

  -- L13: förslag och beslut loggas i revisionskedjan
  IF EXISTS (SELECT 1 FROM public.activity_log WHERE action = 'requirement_link_created' AND entity_id = l1
               AND entity_label = 'TEST § 1 → TEST 3 kap. 1 §')
     AND EXISTS (SELECT 1 FROM public.activity_log WHERE action = 'requirement_link_updated' AND entity_id = l1
               AND metadata -> 'ändringar' ? 'status')
     AND (SELECT count(*) FROM public.activity_log WHERE action = 'requirement_link_updated' AND entity_id = l1) = 1
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'L13 loggning'; END IF;

  -- L14: tillbakadragning kräver motivering och lämnar raden kvar som avvisad
  BEGIN
    PERFORM public.withdraw_requirement_link(l_tmp, '  ');
    fails := fails || text 'L14 tillbakadragning utan motivering';
  EXCEPTION WHEN raise_exception THEN n_ok := n_ok + 1;
  END;
  SELECT id INTO l_tmp FROM public.requirement_links WHERE parent_requirement_id = r_lag2 AND child_requirement_id = r_std;
  PERFORM public.withdraw_requirement_link(l_tmp, 'Ny tolkning av incidentkravet');
  IF (SELECT status = 'rejected' AND rationale LIKE '%Ny tolkning%' FROM public.requirement_links WHERE id = l_tmp)
     AND NOT EXISTS (SELECT 1 FROM public.requirement_link_details WHERE id = l_tmp)
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'L14b tillbakadragning'; END IF;

  -- L15: upphävt krav kan inte länkas, och dess godkända länkar försvinner ur vyn
  UPDATE public.requirements SET repealed_at = now() WHERE id = r_std2;
  BEGIN
    PERFORM public.suggest_requirement_link(r_fs, r_std2);
    fails := fails || text 'L15 upphävt krav länkades';
  EXCEPTION WHEN check_violation THEN n_ok := n_ok + 1;
  END;
  UPDATE public.requirements SET repealed_at = NULL WHERE id = r_std2;

  -- Kravpaket: säkerställ att övriga krav har giltiga villkor (testdata i
  -- äldre miljöer kan ha det) så att importen inte stoppas av annat
  UPDATE public.requirements r SET trigger_logic = NULL
  WHERE cardinality(public.trigger_logic_problems(r.trigger_logic, r.target_type)) > 0;
  UPDATE public.installation_settings SET role = 'combined', trusted_key_id = NULL, trusted_public_key = NULL WHERE id = 1;

  -- L16: exporten innehåller nivå och godkända länkar, inte förslag eller avvisade
  SELECT * INTO v_exp FROM public.export_requirement_catalog('TEST kravlänkar');
  v_pkg := v_exp.content::jsonb;
  IF (SELECT x ->> 'source_level' FROM jsonb_array_elements(v_pkg -> 'sources') x WHERE x ->> 'id' = s_lag::text) = 'lag'
     AND (SELECT count(*) FROM jsonb_array_elements(v_pkg -> 'links') x WHERE (x ->> 'id')::uuid IN (l1, l2)) = 2
     AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_pkg -> 'links') x WHERE (x ->> 'id')::uuid IN (l3, l_tmp))
     AND (SELECT (counts ->> 'kravlänkar')::int FROM public.requirement_catalog_releases
          WHERE direction = 'export' AND version = v_exp.version) = jsonb_array_length(v_pkg -> 'links')
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'L16 export'; END IF;

  -- L17: import återställer en borttagen kataloglänk och tar bort en som inte finns i paketet
  SELECT coalesce(max(version), 0) INTO v_last FROM public.requirement_catalog_releases WHERE direction = 'import';
  DELETE FROM public.requirement_links WHERE id = l1;
  -- förslaget från L11 (samma par) skulle annars krocka
  DELETE FROM public.requirement_links WHERE parent_requirement_id = r_lag2 AND child_requirement_id = r_fs AND status = 'pending';
  INSERT INTO public.requirement_links (parent_requirement_id, child_requirement_id, suggested_by, status, decided_by, decided_at)
    VALUES (r_lag2, r_fs, 'test', 'approved', 'test', now()) RETURNING id INTO l_tmp;
  v_content := (v_pkg || jsonb_build_object('version', v_last + 1))::text;
  v_res := public.import_requirement_catalog(v_content, encode(extensions.digest(v_content, 'sha256'), 'hex'));
  IF (SELECT status = 'approved' AND NOT is_local AND suggested_by = 'kravpaket' FROM public.requirement_links WHERE id = l1)
     AND NOT EXISTS (SELECT 1 FROM public.requirement_links WHERE id = l_tmp)
     AND (v_res ->> 'kravlänkar_ändrade')::int = 1
     AND (v_res ->> 'kravlänkar_borttagna')::int = 1
    THEN n_ok := n_ok + 1; ELSE fails := fails || text ('L17 import: ' || v_res::text); END IF;

  -- L18: äldre paket utan länkar och nivåer lämnar båda orörda
  v_content := ((v_pkg - 'links')
                || jsonb_build_object('version', v_last + 2,
                     'sources', (SELECT jsonb_agg(x - 'source_level') FROM jsonb_array_elements(v_pkg -> 'sources') x)))::text;
  v_res := public.import_requirement_catalog(v_content, encode(extensions.digest(v_content, 'sha256'), 'hex'));
  IF EXISTS (SELECT 1 FROM public.requirement_links WHERE id = l1 AND status = 'approved')
     AND (SELECT source_level FROM public.requirement_sources WHERE id = s_lag) = 'lag'
     AND (v_res ->> 'kravlänkar_ändrade')::int = 0
    THEN n_ok := n_ok + 1; ELSE fails := fails || text ('L18 äldre paket: ' || v_res::text); END IF;

  -- L19: i driftmiljön märks nya länkar som lokala och kommer inte med i export
  UPDATE public.installation_settings SET role = 'operations' WHERE id = 1;
  l_tmp := public.suggest_requirement_link(r_lag2, r_fs);
  IF (SELECT is_local FROM public.requirement_links WHERE id = l_tmp)
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'L19 lokal länk'; END IF;
  UPDATE public.installation_settings SET role = 'combined' WHERE id = 1;

  -- L20: nivån gissas utifrån namnet, även för regelverk som läses in senare
  IF public.guess_source_level('Cybersäkerhetslag (2025:1506)') = 'lag'
     AND public.guess_source_level('Cybersäkerhetsförordning (2025:1507)') = 'förordning'
     AND public.guess_source_level('MCFFS 2026:11') = 'föreskrift'
     AND public.guess_source_level('ptsfs-2021-3-allmanna-rad-om-sakerhetsatg-for-samhallsvikt-tjanst') = 'föreskrift'
     AND public.guess_source_level('IEC 62443-3-3:2013 - System security requirements and security levels') = 'standard'
     AND public.guess_source_level('Riktlinjer för lagring av loggar') IS NULL
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'L20 gissad nivå'; END IF;
  INSERT INTO public.requirement_sources (document_name, category)
    VALUES ('TEST MCFFS 2026:99', 'Informationssäkerhet') RETURNING id INTO l_tmp;
  IF (SELECT source_level FROM public.requirement_sources WHERE id = l_tmp) = 'föreskrift'
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'L20b nivå vid ny inläsning'; END IF;

  IF cardinality(fails) = 0 THEN
    RAISE EXCEPTION 'ALLA TESTER GODKÄNDA (% st). Rullas tillbaka.', n_ok;
  ELSE
    RAISE EXCEPTION 'TESTFEL (% godkända, % fel): %', n_ok, cardinality(fails), array_to_string(fails, ' || ');
  END IF;
END
$test$;
