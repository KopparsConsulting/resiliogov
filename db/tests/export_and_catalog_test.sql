-- =====================================================================
-- Tester: spårbar export och kravpaket (migration 20261005130000)
-- Körs som ett block och rullas alltid tillbaka (RAISE EXCEPTION i slutet).
-- =====================================================================
DO $test$
DECLARE
  fails text[] := ARRAY[]::text[];
  n_ok int := 0;
  usr uuid;
  src uuid;
  r_keep uuid;
  r_change uuid;
  r_drop uuid;
  r_local uuid;
  r_new uuid := gen_random_uuid();
  sys uuid;
  rec uuid;
  v_pkg record;
  v_json jsonb;
  v_content text;
  v_sha text;
  v_res jsonb;
  v_txt text;
  v_int int;
  v_diff jsonb;
BEGIN
  SELECT p.id INTO usr FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'admin'
  WHERE p.approved LIMIT 1;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', usr, 'role', 'authenticated')::text, true);

  -- ---------------- Export av efterlevnadsdata ----------------
  -- E1: exporthistoriken kan inte raderas eller ändras
  BEGIN
    DELETE FROM public.export_history WHERE id = (SELECT id FROM public.export_history LIMIT 1);
    IF EXISTS (SELECT 1 FROM public.export_history) THEN fails := fails || text 'E1 historik kunde raderas'; ELSE n_ok := n_ok + 1; END IF;
  EXCEPTION WHEN insufficient_privilege THEN n_ok := n_ok + 1;
  END;

  -- E2: en export registreras, med användare, och loggas i revisionskedjan
  PERFORM public.record_compliance_export('TEST-EXP-1', 'TEST_paket.zip', '{"facilityIds":["x"]}', '{"facilities":1}');
  IF EXISTS (SELECT 1 FROM public.export_history WHERE export_id = 'TEST-EXP-1' AND user_email IS NOT NULL AND requirements_snapshot IS NOT NULL)
     AND EXISTS (SELECT 1 FROM public.activity_log WHERE action = 'compliance_exported' AND metadata ->> 'export_id' = 'TEST-EXP-1')
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'E2 exporten registrerades/loggades inte'; END IF;

  -- E3: direkt efter en export finns inga ändringar mot samma urval
  v_diff := public.export_requirement_diff('{"facilityIds":["annat"]}');
  IF (v_diff -> 'summary' ->> 'added')::int = 0 AND (v_diff -> 'summary' ->> 'removed')::int = 0
     AND (v_diff -> 'summary' ->> 'changed')::int = 0
    THEN n_ok := n_ok + 1; ELSE fails := fails || ('E3 diff efter export: ' || coalesce(v_diff -> 'summary', 'null')::text); END IF;

  -- E4: urval jämförs bara med samma urval
  INSERT INTO public.requirement_sources (document_name, category)
    VALUES ('TEST katalog', (SELECT category FROM public.requirement_sources LIMIT 1)) RETURNING id INTO src;
  IF public.export_requirement_diff(jsonb_build_object('sourceIds', jsonb_build_array(src))) IS NULL
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'E4 diff jämförde mot annat urval'; END IF;

  -- E5: bara administratörer får exportera
  DELETE FROM public.user_roles WHERE user_id = usr AND role = 'admin';
  BEGIN
    PERFORM public.record_compliance_export('TEST-EXP-2', 'TEST.zip', '{}', '{}');
    fails := fails || text 'E5 icke-admin kunde exportera';
  EXCEPTION WHEN insufficient_privilege THEN n_ok := n_ok + 1;
  END;
  INSERT INTO public.user_roles (user_id, role) VALUES (usr, 'admin');

  -- ---------------- Kravpaket ----------------
  INSERT INTO public.requirements (source_id, chapter_section, description, target_type, is_general_advice)
    VALUES (src, 'TEST K1', 'behålls', 'system', false) RETURNING id INTO r_keep;
  INSERT INTO public.requirements (source_id, chapter_section, description, target_type, is_general_advice)
    VALUES (src, 'TEST K2', 'ursprunglig text', 'system', false) RETURNING id INTO r_change;
  INSERT INTO public.requirements (source_id, chapter_section, description, target_type, is_general_advice)
    VALUES (src, 'TEST K3', 'upphävs', 'system', false) RETURNING id INTO r_drop;
  INSERT INTO public.requirements (source_id, chapter_section, description, target_type, is_general_advice, is_local)
    VALUES (src, 'TEST L1', 'lokalt krav', 'system', false, true) RETURNING id INTO r_local;

  INSERT INTO public.information_systems (name, system_type, system_category, classification_source, own_classification_level)
    VALUES ('TEST paketsystem', 'SCADA', 'tunnel_traffic_ot', 'own', 2) RETURNING id INTO sys;
  UPDATE public.system_compliance_records
    SET status = 'Uppfyllt', evidence = 'FAT 1', valid_until = public.stockholm_today() + 100, assessed_at = now() - interval '1 day'
    WHERE system_id = sys AND requirement_id IN (r_change, r_drop);

  -- K1: export ger version och kontrollsumma som stämmer med innehållet
  SELECT * INTO v_pkg FROM public.export_requirement_catalog('Testrelease');
  IF v_pkg.sha256 = encode(extensions.digest(v_pkg.content, 'sha256'), 'hex') AND v_pkg.version >= 1
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'K1 kontrollsumma'; END IF;

  -- K2: lokala krav följer inte med, katalogkrav gör det
  v_json := v_pkg.content::jsonb;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_json -> 'requirements') e WHERE (e ->> 'id')::uuid = r_keep)
     AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_json -> 'requirements') e WHERE (e ->> 'id')::uuid = r_local)
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'K2 urval i paketet'; END IF;

  -- Nytt paket: K2 ändrad text, K3 borttagen, nytt krav tillagt
  v_json := jsonb_set(v_json, '{version}', to_jsonb(1));
  v_json := jsonb_set(v_json, '{requirements}', (
    SELECT jsonb_agg(CASE WHEN (e ->> 'id')::uuid = r_change THEN jsonb_set(e, '{description}', '"ny lydelse"') ELSE e END)
    FROM jsonb_array_elements(v_json -> 'requirements') e WHERE (e ->> 'id')::uuid <> r_drop)
    || jsonb_build_array(jsonb_build_object('id', r_new, 'source_id', src, 'chapter_section', 'TEST K4',
         'description', 'nytt krav', 'target_type', 'system', 'is_general_advice', false)));
  v_content := v_json::text;
  v_sha := encode(extensions.digest(v_content, 'sha256'), 'hex');

  -- K3: fel kontrollsumma stoppas
  BEGIN
    PERFORM public.import_requirement_catalog(v_content, repeat('0', 64));
    fails := fails || text 'K3 fel kontrollsumma släpptes igenom';
  EXCEPTION WHEN raise_exception THEN n_ok := n_ok + 1;
  END;

  -- K4: förhandsvisningen visar effekten men ändrar inget
  v_res := public.preview_requirement_catalog_import(v_content, v_sha);
  IF (v_res ->> 'nya')::int = 1 AND (v_res ->> 'ändrade')::int = 1 AND (v_res ->> 'upphävda')::int = 1
     AND (v_res ->> 'preview')::boolean
     AND (SELECT description FROM public.requirements WHERE id = r_change) = 'ursprunglig text'
     AND (SELECT repealed_at FROM public.requirements WHERE id = r_drop) IS NULL
     AND NOT EXISTS (SELECT 1 FROM public.requirements WHERE id = r_new)
     AND NOT EXISTS (SELECT 1 FROM public.requirement_catalog_releases WHERE direction = 'import')
    THEN n_ok := n_ok + 1; ELSE fails := fails || ('K4 förhandsvisning: ' || coalesce(v_res - 'added_list' - 'changed_list' - 'repealed_list', 'null')::text); END IF;

  -- K5: importen
  v_res := public.import_requirement_catalog(v_content, v_sha);
  IF (SELECT description FROM public.requirements WHERE id = r_change) = 'ny lydelse'
     AND (SELECT content_changed_at > now() - interval '1 minute' FROM public.requirements WHERE id = r_change)
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'K5 ändrad text infördes inte'; END IF;
  -- K6: borttaget krav upphävs, raderas inte, bedömningen finns kvar
  IF (SELECT repealed_at IS NOT NULL FROM public.requirements WHERE id = r_drop)
     AND EXISTS (SELECT 1 FROM public.system_compliance_records WHERE system_id = sys AND requirement_id = r_drop AND status = 'Uppfyllt')
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'K6 upphävt krav'; END IF;
  -- K7: nytt krav läggs automatiskt på systemen
  IF EXISTS (SELECT 1 FROM public.system_compliance_records WHERE system_id = sys AND requirement_id = r_new)
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'K7 nytt krav lades inte på systemet'; END IF;
  -- K8: lokalt krav rörs inte
  IF (SELECT repealed_at IS NULL AND is_local FROM public.requirements WHERE id = r_local)
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'K8 lokalt krav påverkades'; END IF;
  -- K9: det upphävda kravet väntar på granskning, utan att tas bort automatiskt
  SELECT deactivations INTO v_int FROM public.requirement_sync_pending('system', sys);
  IF v_int >= 1 THEN n_ok := n_ok + 1; ELSE fails := fails || ('K9 granskning: ' || coalesce(v_int::text, 'null')); END IF;
  -- K10: bedömningen gjordes före ändringen och kan flaggas
  SELECT (c.assessed_at < r.content_changed_at)::text INTO v_txt
  FROM public.system_compliance_records c JOIN public.requirements r ON r.id = c.requirement_id
  WHERE c.system_id = sys AND c.requirement_id = r_change;
  IF v_txt = 'true' THEN n_ok := n_ok + 1; ELSE fails := fails || ('K10 ändrad efter bedömning: ' || coalesce(v_txt, 'null')); END IF;
  -- K11: importen registreras och loggas
  IF EXISTS (SELECT 1 FROM public.requirement_catalog_releases WHERE direction = 'import' AND version = 1 AND sha256 = v_sha)
     AND EXISTS (SELECT 1 FROM public.activity_log WHERE action = 'requirement_catalog_imported' AND metadata ->> 'sha256' = v_sha)
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'K11 importen registrerades inte'; END IF;
  -- K12: samma version kan inte importeras igen
  BEGIN
    PERFORM public.import_requirement_catalog(v_content, v_sha);
    fails := fails || text 'K12 samma version importerades två gånger';
  EXCEPTION WHEN raise_exception THEN n_ok := n_ok + 1;
  END;
  -- K13: importlogg kan inte ändras
  BEGIN
    DELETE FROM public.requirement_catalog_releases WHERE direction = 'import';
    fails := fails || text 'K13 importlogg kunde raderas';
  EXCEPTION WHEN insufficient_privilege THEN n_ok := n_ok + 1;
  END;

  -- K14: med betrodd nyckel krävs verifierad signatur
  UPDATE public.installation_settings SET trusted_key_id = 'testnyckel', trusted_public_key = 'AAAA' WHERE id = 1;
  v_json := jsonb_set(v_json, '{version}', to_jsonb(2));
  v_content := v_json::text;
  v_sha := encode(extensions.digest(v_content, 'sha256'), 'hex');
  BEGIN
    PERFORM public.import_requirement_catalog(v_content, v_sha, NULL, false);
    fails := fails || text 'K14 osignerat paket släpptes igenom';
  EXCEPTION WHEN raise_exception THEN n_ok := n_ok + 1;
  END;
  -- K15: rätt nyckel och verifierad signatur godtas
  v_res := public.import_requirement_catalog(v_content, v_sha, 'testnyckel', true);
  IF (v_res ->> 'version')::int = 2 THEN n_ok := n_ok + 1; ELSE fails := fails || text 'K15 signerat paket avvisades'; END IF;
  -- K16: ändrade inställningar loggas
  IF EXISTS (SELECT 1 FROM public.activity_log WHERE action = 'installation_settings_updated')
    THEN n_ok := n_ok + 1; ELSE fails := fails || text 'K16 inställningsändring loggades inte'; END IF;

  -- K17: driftmiljön skapar inte paket, och nya krav där blir lokala
  UPDATE public.installation_settings SET role = 'operations' WHERE id = 1;
  BEGIN
    PERFORM public.export_requirement_catalog(NULL);
    fails := fails || text 'K17 driftmiljön kunde skapa kravpaket';
  EXCEPTION WHEN raise_exception THEN n_ok := n_ok + 1;
  END;
  INSERT INTO public.requirements (source_id, chapter_section, description, target_type, is_general_advice)
    VALUES (src, 'TEST L2', 'lokalt i drift', 'system', false) RETURNING id INTO rec;
  IF (SELECT is_local FROM public.requirements WHERE id = rec) THEN n_ok := n_ok + 1; ELSE fails := fails || text 'K18 krav i driftmiljön blev inte lokalt'; END IF;

  IF cardinality(fails) = 0 THEN
    RAISE EXCEPTION 'ALLA TESTER GODKÄNDA (% st). Rullas tillbaka.', n_ok;
  ELSE
    RAISE EXCEPTION 'TESTFEL (% godkända, % fel): %', n_ok, cardinality(fails), array_to_string(fails, ' || ');
  END IF;
END
$test$;
