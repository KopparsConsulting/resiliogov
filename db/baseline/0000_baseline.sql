-- Resiliogov 2 – baseline för databasschemat.
-- Framtagen från prototypen (KopparsConsulting/compliancemanager2, alla 52
-- migreringar i kronologisk ordning) och verifierad identisk mot produktion
-- 2026-10-21. Ändras aldrig – nya ändringar läggs i db/migrations/.
SET check_function_bodies = off;

--
-- PostgreSQL database dump
--




--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auth;


--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA extensions;


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'user'
);


--
-- Name: asset_criticality; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.asset_criticality AS ENUM (
    'critical',
    'important',
    'supporting'
);


--
-- Name: classification_source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.classification_source AS ENUM (
    'inherited',
    'own',
    'overridden'
);


--
-- Name: compensating_measure_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.compensating_measure_status AS ENUM (
    'proposed',
    'accepted',
    'rejected'
);


--
-- Name: compensating_measure_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.compensating_measure_type AS ENUM (
    'technical',
    'physical',
    'organizational'
);


--
-- Name: compliance_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.compliance_status AS ENUM (
    'Ej påbörjad',
    'Pågående',
    'Uppfyllt',
    'Ej tillämpligt',
    'Delvis uppfyllt',
    'Ej uppfyllt'
);


--
-- Name: construction_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.construction_type AS ENUM (
    'Berg',
    'Betong',
    'Sänktunnel',
    'Överdäckning'
);


--
-- Name: control_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.control_category AS ENUM (
    'network_security',
    'access_control',
    'patch_management',
    'logging',
    'encryption'
);


--
-- Name: facility_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.facility_type AS ENUM (
    'Vägtunnel',
    'Bro',
    'IT-System',
    'Ledningscentral',
    'Järnvägstunnel',
    'Trafikledningscentral',
    'Datacenter',
    'Spåranläggning',
    'Signalanläggning',
    'Elkraftsanläggning',
    'Terminal',
    'Trafikplats'
);


--
-- Name: measure_scale; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.measure_scale AS ENUM (
    'security_level',
    'maturity_level',
    'none'
);


--
-- Name: project_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.project_status AS ENUM (
    'planning',
    'tender_ready',
    'evaluation',
    'awarded',
    'ongoing',
    'closed'
);


--
-- Name: requirement_addressee; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.requirement_addressee AS ENUM (
    'asset',
    'supplier',
    'asset_owner'
);


--
-- Name: requirement_applicability; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.requirement_applicability AS ENUM (
    'preliminary',
    'not_applicable',
    'supplier_assessment',
    'applicable',
    'compensated'
);


--
-- Name: requirement_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.requirement_category AS ENUM (
    'Fysisk Säkerhet',
    'Informationssäkerhet',
    'Krisberedskap'
);


--
-- Name: requirement_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.requirement_level AS ENUM (
    'strategic',
    'mandatory',
    'recommended'
);


--
-- Name: responsible_org; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.responsible_org AS ENUM (
    'supplier',
    'client',
    'joint'
);


--
-- Name: review_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.review_status AS ENUM (
    'pending',
    'approved',
    'flagged'
);


--
-- Name: source_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.source_level AS ENUM (
    'lag',
    'förordning',
    'föreskrift',
    'standard'
);


--
-- Name: system_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.system_category AS ENUM (
    'tunnel_traffic_ot',
    'it_infrastructure',
    'physical_security',
    'communication_crisis'
);


--
-- Name: system_criticality; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.system_criticality AS ENUM (
    'critical',
    'important',
    'supporting'
);


--
-- Name: system_relation_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.system_relation_type AS ENUM (
    'styr',
    'övervakar',
    'betjänar',
    'stödjer'
);


--
-- Name: test_phase; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.test_phase AS ENUM (
    'FAT1',
    'FAT2',
    'FAT3',
    'SAT',
    'OSAT'
);


--
-- Name: test_result_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.test_result_status AS ENUM (
    'not_tested',
    'passed',
    'passed_with_remarks',
    'failed'
);


--
-- Name: test_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.test_type AS ENUM (
    'document_review',
    'functional_test',
    'penetration_test',
    'configuration_test',
    'risk_analysis_review',
    'other'
);


--
-- Name: testability; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.testability AS ENUM (
    'yes',
    'no',
    'partial'
);


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  SELECT jsonb_build_object(
    'sub', current_setting('app.user_id', true),
    'email', (SELECT email FROM auth.users WHERE id = auth.uid()),
    'role', auth.role()
  )
$$;


--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.role', true), ''),
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    'anon')
$$;


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.user_id', true), '')::uuid,
    (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
  )
$$;


--
-- Name: digest(bytea, text); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.digest(data bytea, type text) RETURNS bytea
    LANGUAGE sql IMMUTABLE STRICT
    AS $$ SELECT public.digest(data, type) $$;


--
-- Name: digest(text, text); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.digest(data text, type text) RETURNS bytea
    LANGUAGE sql IMMUTABLE STRICT
    AS $$ SELECT public.digest(data, type) $$;


--
-- Name: _current_email(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._current_email() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL THEN (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())
    ELSE 'system (' || coalesce(nullif(auth.jwt() ->> 'role', ''), 'databas') || ')'
  END
$$;


--
-- Name: activity_row_hash(bigint, timestamp with time zone, uuid, text, text, text, uuid, text, jsonb, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.activity_row_hash(_seq bigint, _created_at timestamp with time zone, _user_id uuid, _user_email text, _action text, _entity_type text, _entity_id uuid, _entity_label text, _metadata jsonb, _source text, _prev_hash text) RETURNS text
    LANGUAGE sql IMMUTABLE
    SET search_path TO 'public', 'extensions'
    AS $$
  SELECT encode(extensions.digest(convert_to(
    _seq::text
    || '|' || (extract(epoch FROM _created_at) * 1000000)::bigint::text
    || '|' || coalesce(_user_id::text, '')
    || '|' || coalesce(_user_email, '')
    || '|' || coalesce(_action, '')
    || '|' || coalesce(_entity_type, '')
    || '|' || coalesce(_entity_id::text, '')
    || '|' || coalesce(_entity_label, '')
    || '|' || coalesce(_metadata, '{}'::jsonb)::text
    || '|' || coalesce(_source, '')
    || '|' || coalesce(_prev_hash, ''),
    'UTF8'), 'sha256'), 'hex')
$$;


--
-- Name: applicable_requirements_for_facility_attrs(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.applicable_requirements_for_facility_attrs(_attrs jsonb) RETURNS SETOF uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT r.id FROM public.requirements r
  WHERE (auth.uid() IS NULL OR public.is_approved())
    AND r.repealed_at IS NULL
    AND (r.target_type IS NULL OR r.target_type = 'facility')
    AND public.requirement_addresses_asset(r.source_id, r.target_type)
    AND public.requirement_passes_level(r.sl_capability, r.min_classification_level, coalesce((_attrs ->> 'classification_level')::smallint, 1::smallint))
    AND public.trigger_matches_facility(r.trigger_logic, _attrs)
$$;


--
-- Name: apply_profile_to_project(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.apply_profile_to_project(_profile_id uuid, _project_id uuid) RETURNS integer
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE v_count integer;
BEGIN
  IF NOT public.is_approved() THEN RAISE EXCEPTION 'Behörighet saknas'; END IF;
  WITH ins AS (
    INSERT INTO public.project_requirements (project_id, requirement_id, applicability, justification)
    SELECT _project_id, i.requirement_id, i.applicability, i.justification
    FROM public.requirement_profile_items i WHERE i.profile_id = _profile_id
    ON CONFLICT (project_id, requirement_id) DO NOTHING
    RETURNING id, requirement_id
  ), copied AS (
    INSERT INTO public.compensating_measures
      (project_requirement_id, description, measure_type, system_id, asset_id, facility_id, proposed_by, status)
    SELECT ins.id, m.description, m.measure_type, m.system_id, m.asset_id, m.facility_id, m.proposed_by, 'proposed'
    FROM ins
    JOIN public.requirement_profile_items i ON i.profile_id = _profile_id AND i.requirement_id = ins.requirement_id
    JOIN public.compensating_measures m ON m.profile_item_id = i.id
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM ins;
  RETURN v_count;
END;
$$;


--
-- Name: auto_add_requirements(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_add_requirements() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  r record;
BEGIN
  IF TG_TABLE_NAME = 'facilities' THEN
    PERFORM public.sync_requirements('facility', NEW.id, 'add');
    FOR r IN SELECT DISTINCT system_id FROM public.facility_systems WHERE facility_id = NEW.id LOOP
      PERFORM public.sync_requirements('system', r.system_id, 'add');
    END LOOP;
  ELSIF TG_TABLE_NAME = 'information_systems' THEN
    PERFORM public.sync_requirements('system', NEW.id, 'add');
  ELSIF TG_TABLE_NAME = 'facility_systems' THEN
    PERFORM public.sync_requirements('system', NEW.system_id, 'add');
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: auto_add_requirements_all(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_add_requirements_all() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM public.facilities LOOP
    PERFORM public.sync_requirements('facility', r.id, 'add');
  END LOOP;
  FOR r IN SELECT id FROM public.information_systems LOOP
    PERFORM public.sync_requirements('system', r.id, 'add');
  END LOOP;
  RETURN NULL;
END;
$$;


--
-- Name: auto_approve_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_approve_admin() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if new.email = 'anders.runhem@gmail.com' then
    update public.profiles set approved = true where id = new.id;
    insert into public.user_roles (user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  return new;
end;
$$;


--
-- Name: check_compensated_has_measure(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_compensated_has_measure() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_id uuid; v_app text;
BEGIN
  IF TG_TABLE_NAME = 'compensating_measures' THEN
    IF OLD.project_requirement_id IS NOT NULL THEN
      v_id := OLD.project_requirement_id;
      SELECT applicability::text INTO v_app FROM public.project_requirements WHERE id = v_id;
      IF v_app = 'compensated' AND NOT EXISTS (SELECT 1 FROM public.compensating_measures WHERE project_requirement_id = v_id) THEN
        RAISE EXCEPTION 'Ett kompenserat krav måste ha minst en kompenserande åtgärd – ändra tillämpligheten först';
      END IF;
    ELSE
      v_id := OLD.profile_item_id;
      SELECT applicability::text INTO v_app FROM public.requirement_profile_items WHERE id = v_id;
      IF v_app = 'compensated' AND NOT EXISTS (SELECT 1 FROM public.compensating_measures WHERE profile_item_id = v_id) THEN
        RAISE EXCEPTION 'Ett kompenserat krav måste ha minst en kompenserande åtgärd – ändra tillämpligheten först';
      END IF;
    END IF;
    RETURN NULL;
  END IF;

  IF NEW.applicability::text <> 'compensated' THEN RETURN NULL; END IF;
  IF TG_TABLE_NAME = 'project_requirements' THEN
    SELECT applicability::text INTO v_app FROM public.project_requirements WHERE id = NEW.id;
    IF v_app = 'compensated' AND NOT EXISTS (SELECT 1 FROM public.compensating_measures WHERE project_requirement_id = NEW.id) THEN
      RAISE EXCEPTION 'Lägg till minst en kompenserande åtgärd innan kravet markeras som kompenserat';
    END IF;
  ELSE
    SELECT applicability::text INTO v_app FROM public.requirement_profile_items WHERE id = NEW.id;
    IF v_app = 'compensated' AND NOT EXISTS (SELECT 1 FROM public.compensating_measures WHERE profile_item_id = NEW.id) THEN
      RAISE EXCEPTION 'Lägg till minst en kompenserande åtgärd innan kravet markeras som kompenserat';
    END IF;
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: clean_sheet_value(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.clean_sheet_value(_v text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT CASE WHEN btrim(coalesce(_v, '')) IN ('', '-', '–', '—', 'n/a', 'N/A', 'ej tillämpligt')
              THEN NULL ELSE btrim(_v) END
$$;


--
-- Name: compliance_record_is_untouched(public.compliance_status, text, text, text, text, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.compliance_record_is_untouched(_status public.compliance_status, _evidence text, _evidence_url text, _evidence_file_name text, _justification text, _verified_by uuid, _notes text) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT coalesce(_status::text, 'Ej påbörjad') = 'Ej påbörjad'
     AND coalesce(btrim(_evidence), '') = ''
     AND coalesce(btrim(_evidence_url), '') = ''
     AND coalesce(btrim(_evidence_file_name), '') = ''
     AND coalesce(btrim(_justification), '') = ''
     AND _verified_by IS NULL
     AND (coalesce(btrim(_notes), '') = '' OR btrim(_notes) LIKE 'Ärvt från%')
$$;




--
-- Name: component_compliance_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.component_compliance_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_id uuid NOT NULL,
    requirement_id uuid NOT NULL,
    profile_id uuid,
    profile_item_id uuid,
    status public.compliance_status DEFAULT 'Ej påbörjad'::public.compliance_status NOT NULL,
    evidence text,
    evidence_url text,
    evidence_file_name text,
    justification text,
    inherited_justification text,
    notes text,
    assessed_by text,
    assessed_at timestamp with time zone,
    valid_until date,
    verified_by_test_mapping_id uuid,
    out_of_scope_since timestamp with time zone,
    out_of_scope_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: component_record_is_untouched(public.component_compliance_records); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.component_record_is_untouched(c public.component_compliance_records) RETURNS boolean
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  SELECT coalesce(btrim(c.evidence), '') = '' AND coalesce(btrim(c.evidence_url), '') = ''
     AND coalesce(btrim(c.evidence_file_name), '') = '' AND c.verified_by_test_mapping_id IS NULL
     AND coalesce(btrim(c.notes), '') = ''
     AND (
       (c.status = 'Ej påbörjad' AND coalesce(btrim(c.justification), '') = '')
       OR (c.status = 'Ej tillämpligt' AND c.inherited_justification IS NOT NULL AND c.justification = c.inherited_justification)
     )
$$;


--
-- Name: copy_requirement_profile(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.copy_requirement_profile(_profile_id uuid, _name text) RETURNS uuid
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE v_new uuid; r record; v_item uuid;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_approved() THEN RAISE EXCEPTION 'Kontot är inte godkänt' USING ERRCODE = 'insufficient_privilege'; END IF;
  INSERT INTO public.requirement_profiles (name, description, component_type_id, target_sl, is_default)
  SELECT btrim(_name), description, component_type_id, target_sl, false FROM public.requirement_profiles WHERE id = _profile_id
  RETURNING id INTO v_new;
  IF v_new IS NULL THEN RAISE EXCEPTION 'Profilen finns inte'; END IF;
  FOR r IN SELECT * FROM public.requirement_profile_items WHERE profile_id = _profile_id LOOP
    INSERT INTO public.requirement_profile_items (profile_id, requirement_id, applicability, justification)
    VALUES (v_new, r.requirement_id, r.applicability, r.justification) RETURNING id INTO v_item;
    INSERT INTO public.compensating_measures (profile_item_id, description, measure_type, system_id, asset_id, facility_id, proposed_by, status, decided_by, decided_at)
    SELECT v_item, description, measure_type, system_id, asset_id, facility_id, proposed_by, status, decided_by, decided_at
    FROM public.compensating_measures WHERE profile_item_id = r.id;
  END LOOP;
  RETURN v_new;
END $$;


--
-- Name: review_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.review_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_no text NOT NULL,
    requirement_ids uuid[] NOT NULL,
    filters jsonb,
    created_by text NOT NULL,
    actor_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: create_review_batch(uuid[], jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_review_batch(_requirement_ids uuid[], _filters jsonb DEFAULT NULL::jsonb) RETURNS public.review_batches
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_row public.review_batches;
  v_ids uuid[];
  v_base text := to_char(now() AT TIME ZONE 'Europe/Stockholm', 'YYYYMMDD-HH24MI');
  v_no text;
  v_n int := 1;
BEGIN
  IF NOT public.is_approved() THEN
    RAISE EXCEPTION 'Inte behörig' USING ERRCODE = 'insufficient_privilege';
  END IF;
  -- Behåll ordningen, ta bort dubbletter och okända krav
  SELECT array_agg(id ORDER BY ord) INTO v_ids FROM (
    SELECT DISTINCT ON (u.id) u.id, u.ord
    FROM unnest(_requirement_ids) WITH ORDINALITY AS u(id, ord)
    JOIN public.requirements r ON r.id = u.id
    ORDER BY u.id, u.ord) s;
  IF v_ids IS NULL OR cardinality(v_ids) = 0 THEN
    RAISE EXCEPTION 'Utskriften innehåller inga krav';
  END IF;
  v_no := v_base;
  WHILE EXISTS (SELECT 1 FROM public.review_batches WHERE batch_no = v_no) LOOP
    v_n := v_n + 1;
    v_no := v_base || '-' || v_n;
  END LOOP;
  INSERT INTO public.review_batches (batch_no, requirement_ids, filters, created_by, actor_user_id)
  VALUES (v_no, v_ids, _filters, public._current_email(), auth.uid())
  RETURNING * INTO v_row;
  INSERT INTO public.activity_log (action, entity_type, entity_id, entity_label, metadata)
  VALUES ('review_batch_created', 'review_batch', v_row.id, 'Granskningsutskrift ' || v_no,
          jsonb_build_object('nummer', v_no, 'antal', cardinality(v_ids)));
  RETURN v_row;
END;
$$;


--
-- Name: decide_domain_suggestions(uuid[], boolean, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.decide_domain_suggestions(_suggestion_ids uuid[], _approve boolean, _domain_id uuid DEFAULT NULL::uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_count integer;
BEGIN
  PERFORM public.require_admin();
  IF _approve THEN
    UPDATE public.requirements r
    SET domain_id = coalesce(_domain_id, s.domain_id)
    FROM public.requirement_domain_suggestions s
    WHERE s.id = ANY (_suggestion_ids) AND s.status = 'pending' AND r.id = s.requirement_id
      AND r.domain_id IS DISTINCT FROM coalesce(_domain_id, s.domain_id);
  END IF;
  UPDATE public.requirement_domain_suggestions s
  SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
      decided_domain_id = CASE WHEN _approve THEN coalesce(_domain_id, s.domain_id) END,
      decided_by = public._current_email(),
      decided_at = now()
  WHERE s.id = ANY (_suggestion_ids) AND s.status = 'pending';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


--
-- Name: decide_requirement_links(uuid[], boolean, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.decide_requirement_links(_link_ids uuid[], _approve boolean, _coverage text DEFAULT NULL::text) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_count integer;
BEGIN
  PERFORM public.require_admin();
  IF _coverage IS NOT NULL AND _coverage NOT IN ('full', 'delvis') THEN
    RAISE EXCEPTION 'Okänd täckning: % (full eller delvis)', _coverage;
  END IF;
  IF _approve AND EXISTS (
    SELECT 1 FROM public.requirement_links l
    JOIN public.requirements r ON r.id IN (l.parent_requirement_id, l.child_requirement_id)
    WHERE l.id = ANY (_link_ids) AND l.status = 'pending' AND r.repealed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Minst en länk rör ett upphävt krav och kan inte godkännas';
  END IF;
  UPDATE public.requirement_links l
  SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
      coverage = CASE WHEN _approve THEN coalesce(_coverage, l.coverage) ELSE l.coverage END,
      decided_by = public._current_email(),
      decided_at = now()
  WHERE l.id = ANY (_link_ids) AND l.status = 'pending';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


--
-- Name: effective_system_class(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.effective_system_class(_system_id uuid) RETURNS smallint
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT CASE
    WHEN s.classification_source = 'overridden' AND s.facility_class_override IS NOT NULL
      THEN s.facility_class_override
    WHEN s.classification_source = 'own'
      THEN coalesce(GREATEST(s.own_classification_level, public.inherited_system_class(s.id)), 1::smallint)
    ELSE coalesce(public.inherited_system_class(s.id), 1::smallint)
  END
  FROM public.information_systems s
  WHERE s.id = _system_id
$$;


--
-- Name: export_requirement_catalog(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.export_requirement_catalog(_notes text DEFAULT NULL::text) RETURNS TABLE(version integer, sha256 text, content text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
#variable_conflict use_column
DECLARE
  v_version integer;
  v_content text;
  v_sha text;
  v_role text;
  v_orphans integer;
  v_counts jsonb;
  v_now timestamptz := now();
BEGIN
  PERFORM public.require_admin();
  SELECT s.role INTO v_role FROM public.installation_settings s WHERE s.id = 1;
  IF v_role = 'operations' THEN
    RAISE EXCEPTION 'Kravpaket skapas i katalogmiljön, inte i driftmiljön';
  END IF;

  SELECT count(*) INTO v_orphans
  FROM public.requirements r JOIN public.requirement_sources s ON s.id = r.source_id
  WHERE NOT r.is_local AND r.repealed_at IS NULL AND s.is_local;
  IF v_orphans > 0 THEN
    RAISE EXCEPTION '% krav i katalogen hör till ett lokalt regelverk – flytta dem eller markera regelverket som katalog', v_orphans;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('requirement_catalog_export'));
  SELECT coalesce(max(x.version), 0) + 1 INTO v_version
  FROM public.requirement_catalog_releases x WHERE x.direction = 'export';

  v_content := jsonb_build_object(
    'format', 'resiliogov-kravpaket',
    'format_version', 1,
    'version', v_version,
    'created_at', v_now,
    'notes', nullif(btrim(coalesce(_notes, '')), ''),
    'sources', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', s.id, 'document_name', s.document_name, 'category', s.category,
        'description', s.description, 'document_url', s.document_url,
        'source_level', s.source_level, 'addressee', s.addressee, 'measure_scale', s.measure_scale) ORDER BY s.id)
      FROM public.requirement_sources s WHERE NOT s.is_local), '[]'::jsonb),
    'domains', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'slug', d.slug, 'name', d.name, 'description', d.description,
        'priority_order', d.priority_order, 'icon', d.icon, 'color', d.color) ORDER BY d.slug)
      FROM public.security_domains d WHERE NOT d.is_local), '[]'::jsonb),
    'requirements', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', r.id, 'source_id', r.source_id,
        'domain_slug', CASE WHEN d.is_local THEN NULL ELSE d.slug END,
        'chapter_section', r.chapter_section, 'description', r.description,
        'requirement_level', r.requirement_level, 'target_type', r.target_type,
        'trigger_logic', nullif(r.trigger_logic, '{}'::jsonb), 'is_general_advice', r.is_general_advice,
        'min_classification_level', r.min_classification_level, 'sl_capability', r.sl_capability, 'ml_capability', r.ml_capability,
        'source_page', r.source_page, 'source_excerpt', r.source_excerpt) ORDER BY r.id)
      FROM public.requirements r
      LEFT JOIN public.security_domains d ON d.id = r.domain_id
      WHERE NOT r.is_local AND r.repealed_at IS NULL), '[]'::jsonb),
    'links', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', l.id, 'parent_requirement_id', l.parent_requirement_id,
        'child_requirement_id', l.child_requirement_id, 'coverage', l.coverage,
        'rationale', l.rationale, 'decided_by', l.decided_by, 'decided_at', l.decided_at) ORDER BY l.id)
      FROM public.requirement_links l
      JOIN public.requirements rp ON rp.id = l.parent_requirement_id
      JOIN public.requirements rc ON rc.id = l.child_requirement_id
      WHERE l.status = 'approved' AND NOT l.is_local
        AND NOT rp.is_local AND rp.repealed_at IS NULL
        AND NOT rc.is_local AND rc.repealed_at IS NULL), '[]'::jsonb)
  )::text;

  v_sha := encode(extensions.digest(v_content, 'sha256'), 'hex');
  v_counts := jsonb_build_object(
    'regelverk', jsonb_array_length((v_content::jsonb) -> 'sources'),
    'domäner', jsonb_array_length((v_content::jsonb) -> 'domains'),
    'krav', jsonb_array_length((v_content::jsonb) -> 'requirements'),
    'kravlänkar', jsonb_array_length((v_content::jsonb) -> 'links'));

  INSERT INTO public.requirement_catalog_releases
    (direction, version, sha256, notes, counts, package_created_at, created_by)
  VALUES ('export', v_version, v_sha, nullif(btrim(coalesce(_notes, '')), ''), v_counts, v_now, public._current_email());

  INSERT INTO public.activity_log (action, entity_type, entity_id, entity_label, metadata)
  VALUES ('requirement_catalog_exported', 'requirement_catalog', NULL, 'Kravpaket version ' || v_version,
          jsonb_build_object('version', v_version, 'sha256', v_sha, 'antal', v_counts));

  RETURN QUERY SELECT v_version, v_sha, v_content;
END;
$$;


--
-- Name: export_requirement_diff(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.export_requirement_diff(_filters jsonb) RETURNS jsonb
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  v_scope jsonb := public.export_scope_key(coalesce(_filters, '{}'::jsonb));
  v_prev_snap jsonb;
  v_prev_at timestamptz;
  v_curr jsonb;
BEGIN
  SELECT e.requirements_snapshot, e.created_at INTO v_prev_snap, v_prev_at
  FROM public.export_history e
  WHERE e.requirements_snapshot IS NOT NULL AND e.scope_key = v_scope
  ORDER BY e.created_at DESC
  LIMIT 1;
  IF v_prev_snap IS NULL THEN RETURN NULL; END IF;

  v_curr := public.requirement_snapshot(v_scope);

  RETURN (
    WITH prev AS (SELECT e ->> 'id' AS id, e FROM jsonb_array_elements(v_prev_snap) e),
    curr AS (SELECT e ->> 'id' AS id, e FROM jsonb_array_elements(v_curr) e),
    added AS (
      SELECT c.e || jsonb_build_object('change_type', 'Nytt krav') AS x
      FROM curr c WHERE NOT EXISTS (SELECT 1 FROM prev p WHERE p.id = c.id)
    ),
    removed AS (
      SELECT p.e || jsonb_build_object('change_type', 'Borttaget krav') AS x
      FROM prev p WHERE NOT EXISTS (SELECT 1 FROM curr c WHERE c.id = p.id)
    ),
    changed AS (
      SELECT c.e || jsonb_build_object('change_type', 'Ändrat', 'prev', p.e, 'changed_fields', f.fields) AS x
      FROM curr c
      JOIN prev p ON p.id = c.id
      CROSS JOIN LATERAL (
        SELECT string_agg(v.label, ', ' ORDER BY v.ord) AS fields
        FROM (VALUES
          (1, 'Kravtext', 'description'), (2, 'Kravnummer', 'chapter_section'),
          (3, 'Nivå', 'requirement_level'), (4, 'Regelverk', 'source_id'), (5, 'Domän', 'domain_id'),
          (6, 'Villkor', 'trigger_logic'), (7, 'Klassgräns', 'min_classification_level'),
          (8, 'SL-krav', 'sl_capability'), (9, 'Upphävt', 'repealed')
        ) AS v(ord, label, key)
        -- Äldre ögonblicksbilder saknar de nya fälten: jämför bara fält som fanns
        WHERE p.e ? v.key AND (c.e -> v.key) IS DISTINCT FROM (p.e -> v.key)
      ) f
      WHERE f.fields IS NOT NULL
    )
    SELECT jsonb_build_object(
      'previousExportDate', v_prev_at,
      'added', coalesce((SELECT jsonb_agg(x) FROM added), '[]'::jsonb),
      'removed', coalesce((SELECT jsonb_agg(x) FROM removed), '[]'::jsonb),
      'changed', coalesce((SELECT jsonb_agg(x) FROM changed), '[]'::jsonb),
      'summary', jsonb_build_object(
        'added', (SELECT count(*) FROM added),
        'removed', (SELECT count(*) FROM removed),
        'changed', (SELECT count(*) FROM changed)))
  );
END;
$$;


--
-- Name: export_scope_key(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.export_scope_key(_filters jsonb) RETURNS jsonb
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT jsonb_build_object(
    'sourceIds', CASE WHEN jsonb_typeof(_filters -> 'sourceIds') = 'array'
                      THEN coalesce((SELECT jsonb_agg(x ORDER BY x) FROM jsonb_array_elements_text(_filters -> 'sourceIds') x), '[]'::jsonb)
                      ELSE '[]'::jsonb END,
    'domainIds', CASE WHEN jsonb_typeof(_filters -> 'domainIds') = 'array'
                      THEN coalesce((SELECT jsonb_agg(x ORDER BY x) FROM jsonb_array_elements_text(_filters -> 'domainIds') x), '[]'::jsonb)
                      ELSE '[]'::jsonb END)
$$;


--
-- Name: forbid_log_modification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.forbid_log_modification() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'Loggen % går bara att lägga till i – rader kan inte ändras eller raderas', TG_TABLE_NAME
    USING ERRCODE = 'insufficient_privilege';
END;
$$;


--
-- Name: get_applicable_requirements(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_applicable_requirements(object_type text, object_id uuid) RETURNS TABLE(requirement_id uuid, inherited boolean, inherited_from_facility_id uuid)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_level smallint; v_sys jsonb; v_fac jsonb;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_approved() THEN RETURN; END IF;
  IF object_type = 'facility' THEN
    SELECT to_jsonb(f) INTO v_fac FROM public.facilities f WHERE f.id = object_id;
    IF v_fac IS NULL THEN RETURN; END IF;
    RETURN QUERY SELECT a, false, NULL::uuid FROM public.applicable_requirements_for_facility_attrs(v_fac) a;
    RETURN;
  END IF;
  IF object_type = 'system' THEN
    SELECT to_jsonb(s) INTO v_sys FROM public.information_systems s WHERE s.id = object_id;
    IF v_sys IS NULL THEN RETURN; END IF;
    v_level := public.effective_system_class(object_id);
    RETURN QUERY
    WITH candidates AS (
      SELECT r.id, r.trigger_logic FROM public.requirements r
      WHERE r.repealed_at IS NULL
        AND (r.target_type IS NULL OR r.target_type IN ('system', 'both'))
        AND public.requirement_addresses_asset(r.source_id, r.target_type)
        AND public.requirement_passes_level(r.sl_capability, r.min_classification_level, v_level)
        AND public.trigger_matches_system(r.trigger_logic, v_sys)
    ),
    linked AS (
      SELECT f.id, to_jsonb(f) AS attrs FROM public.facility_systems fs
      JOIN public.facilities f ON f.id = fs.facility_id WHERE fs.system_id = object_id
    )
    SELECT c.id, false, NULL::uuid FROM candidates c WHERE NOT public.trigger_has_linked_conditions(c.trigger_logic)
    UNION ALL
    SELECT c.id, true, (SELECT l.id FROM linked l WHERE public.trigger_matches_linked_facility(c.trigger_logic, l.attrs) ORDER BY l.id LIMIT 1)
    FROM candidates c
    WHERE public.trigger_has_linked_conditions(c.trigger_logic)
      AND EXISTS (SELECT 1 FROM linked l WHERE public.trigger_matches_linked_facility(c.trigger_logic, l.attrs));
    RETURN;
  END IF;
  RETURN;
END;
$$;


--
-- Name: get_requirement_matches(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_requirement_matches(_requirement_id uuid) RETURNS TABLE(object_type text, object_id uuid, inherited_from_facility_id uuid)
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  SELECT 'facility'::text, f.id, NULL::uuid
  FROM public.facilities f
  WHERE EXISTS (SELECT 1 FROM public.get_applicable_requirements('facility', f.id) a
                WHERE a.requirement_id = _requirement_id)
  UNION ALL
  SELECT 'system'::text, s.id, a.inherited_from_facility_id
  FROM public.information_systems s
  CROSS JOIN LATERAL public.get_applicable_requirements('system', s.id) a
  WHERE a.requirement_id = _requirement_id
$$;


--
-- Name: guess_source_level(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.guess_source_level(_name text) RETURNS public.source_level
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT CASE
    WHEN _name ~* '^\s*(IEC|ISO|SS[- ]EN|EN)\y'              THEN 'standard'::public.source_level
    WHEN _name ~* '[a-zåäö]{2,}fs[\s_-]*\d{4}[:_-]\d+'      THEN 'föreskrift'::public.source_level
    WHEN _name ~* 'förordning'                               THEN 'förordning'::public.source_level
    WHEN _name ~* 'lag(en)?\y'                               THEN 'lag'::public.source_level
  END
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, approved)
  VALUES (
    NEW.id,
    NEW.email,
    coalesce(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.email_confirmed_at IS NOT NULL AND lower(NEW.email) LIKE '%@addcontext.se'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;


--
-- Name: handle_user_email_confirmed(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_user_email_confirmed() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL
     AND lower(NEW.email) LIKE '%@addcontext.se' THEN
    UPDATE public.profiles SET approved = true WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;


--
-- Name: import_requirement_catalog(text, text, text, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.import_requirement_catalog(_content text, _sha256 text, _signature_key_id text DEFAULT NULL::text, _signature_verified boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_sha text;
  v_pkg jsonb;
  v_version integer;
  v_last integer;
  v_role text;
  v_key_id text;
  v_src integer;
  v_dom integer;
  v_added integer;
  v_updated integer;
  v_reinstated integer;
  v_repealed integer;
  v_added_list jsonb;
  v_changed_list jsonb;
  v_repealed_list jsonb;
  v_records_before bigint;
  v_records_after bigint;
  v_to_review integer;
  v_links_changed integer := 0;
  v_links_removed integer := 0;
  v_result jsonb;
  v_src_has_scale boolean;
BEGIN
  PERFORM public.require_admin();
  SELECT s.role, s.trusted_key_id INTO v_role, v_key_id FROM public.installation_settings s WHERE s.id = 1;
  IF v_role = 'catalog' THEN
    RAISE EXCEPTION 'Katalogmiljön importerar inte kravpaket – den skapar dem';
  END IF;

  v_sha := encode(extensions.digest(coalesce(_content, ''), 'sha256'), 'hex');
  IF v_sha <> lower(btrim(coalesce(_sha256, ''))) THEN
    RAISE EXCEPTION 'Kontrollsumman stämmer inte – paketet är skadat eller har ändrats efter att det skapades';
  END IF;

  BEGIN
    v_pkg := _content::jsonb;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'Paketet är inte giltig JSON';
  END;
  IF v_pkg ->> 'format' IS DISTINCT FROM 'resiliogov-kravpaket'
     OR (v_pkg ->> 'format_version') IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION 'Okänt paketformat (väntade resiliogov-kravpaket version 1)';
  END IF;
  IF jsonb_typeof(v_pkg -> 'requirements') <> 'array' OR jsonb_typeof(v_pkg -> 'sources') <> 'array'
     OR jsonb_typeof(v_pkg -> 'domains') <> 'array' THEN
    RAISE EXCEPTION 'Paketet saknar regelverk, domäner eller krav';
  END IF;

  v_version := (v_pkg ->> 'version')::integer;
  PERFORM pg_advisory_xact_lock(hashtext('requirement_catalog_import'));
  SELECT coalesce(max(x.version), 0) INTO v_last
  FROM public.requirement_catalog_releases x WHERE x.direction = 'import';
  IF v_version IS NULL OR v_version <= v_last THEN
    RAISE EXCEPTION 'Paket version % är redan importerat eller äldre än det senast importerade (version %)', v_version, v_last;
  END IF;

  IF v_key_id IS NOT NULL
     AND (NOT coalesce(_signature_verified, false) OR _signature_key_id IS DISTINCT FROM v_key_id) THEN
    RAISE EXCEPTION 'Paketet måste vara signerat med den betrodda nyckeln (%)', v_key_id;
  END IF;

  PERFORM set_config('app.catalog_import', 'on', true);
  SELECT (SELECT count(*) FROM public.compliance_records) + (SELECT count(*) FROM public.system_compliance_records)
    INTO v_records_before;

  -- Regelverk (matchas på id)
  v_src_has_scale := EXISTS (SELECT 1 FROM jsonb_array_elements(v_pkg -> 'sources') e WHERE e ? 'addressee');
  WITH src AS (
    SELECT * FROM jsonb_to_recordset(v_pkg -> 'sources')
      AS x(id uuid, document_name text, category public.requirement_category, description text, document_url text,
           source_level public.source_level, addressee public.requirement_addressee, measure_scale public.measure_scale)
  ), up AS (
    INSERT INTO public.requirement_sources AS t (id, document_name, category, description, document_url, source_level, is_local, addressee, measure_scale)
    SELECT id, document_name, category, description, document_url, source_level, false, coalesce(addressee, 'asset'), coalesce(measure_scale, 'none') FROM src
    ON CONFLICT (id) DO UPDATE SET
      document_name = EXCLUDED.document_name, category = EXCLUDED.category,
      description = EXCLUDED.description, document_url = EXCLUDED.document_url,
      -- äldre paket utan nivå lämnar befintlig nivå orörd
      source_level = coalesce(EXCLUDED.source_level, t.source_level), is_local = false,
      addressee = CASE WHEN v_src_has_scale THEN EXCLUDED.addressee ELSE t.addressee END,
      measure_scale = CASE WHEN v_src_has_scale THEN EXCLUDED.measure_scale ELSE t.measure_scale END
    WHERE (t.document_name, t.category, t.description, t.document_url, t.source_level, t.is_local, t.addressee, t.measure_scale)
          IS DISTINCT FROM (EXCLUDED.document_name, EXCLUDED.category, EXCLUDED.description, EXCLUDED.document_url,
                            coalesce(EXCLUDED.source_level, t.source_level), false,
 CASE WHEN v_src_has_scale THEN EXCLUDED.addressee ELSE t.addressee END, CASE WHEN v_src_has_scale THEN EXCLUDED.measure_scale ELSE t.measure_scale END)
    RETURNING 1
  )
  SELECT count(*) INTO v_src FROM up;

  -- Domäner (matchas på slug – id:n skiljer sig mellan installationer)
  WITH dom AS (
    SELECT * FROM jsonb_to_recordset(v_pkg -> 'domains')
      AS x(slug text, name text, description text, priority_order integer, icon text, color text)
  ), up AS (
    INSERT INTO public.security_domains AS t (slug, name, description, priority_order, icon, color, is_local)
    SELECT slug, name, description, priority_order, icon, color, false FROM dom
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name, description = EXCLUDED.description, priority_order = EXCLUDED.priority_order,
      icon = EXCLUDED.icon, color = EXCLUDED.color, is_local = false
    WHERE (t.name, t.description, t.priority_order, t.icon, t.color, t.is_local)
          IS DISTINCT FROM (EXCLUDED.name, EXCLUDED.description, EXCLUDED.priority_order, EXCLUDED.icon, EXCLUDED.color, false)
    RETURNING 1
  )
  SELECT count(*) INTO v_dom FROM up;

  -- Kraven i paketet
  DROP TABLE IF EXISTS _pkg_req;
  CREATE TEMP TABLE _pkg_req ON COMMIT DROP AS
  SELECT x.id, x.source_id, d.id AS domain_id, x.chapter_section, x.description,
         coalesce(x.requirement_level, 'mandatory'::public.requirement_level) AS requirement_level,
         x.target_type, nullif(x.trigger_logic, '{}'::jsonb) AS trigger_logic,
         coalesce(x.is_general_advice, false) AS is_general_advice,
         coalesce(x.min_classification_level, 1::smallint) AS min_classification_level,
         x.sl_capability, x.ml_capability, x.source_page, x.source_excerpt
  FROM jsonb_to_recordset(v_pkg -> 'requirements') AS x(
    id uuid, source_id uuid, domain_slug text, chapter_section text, description text,
    requirement_level public.requirement_level, target_type text, trigger_logic jsonb,
    is_general_advice boolean, min_classification_level smallint, sl_capability smallint, ml_capability smallint,
    source_page integer, source_excerpt text)
  LEFT JOIN public.security_domains d ON d.slug = x.domain_slug;

  IF EXISTS (SELECT 1 FROM _pkg_req WHERE id IS NULL OR source_id IS NULL) THEN
    RAISE EXCEPTION 'Paketet innehåller krav utan id eller regelverk';
  END IF;

  -- Vad som kommer att ändras (för sammanfattningen)
  SELECT
    count(*) FILTER (WHERE r.id IS NULL),
    count(*) FILTER (WHERE r.id IS NOT NULL AND r.repealed_at IS NOT NULL),
    count(*) FILTER (WHERE r.id IS NOT NULL AND
      (r.source_id, r.domain_id, r.chapter_section, r.description, r.requirement_level, r.target_type,
       nullif(r.trigger_logic, '{}'::jsonb), r.is_general_advice, r.min_classification_level, r.sl_capability, r.ml_capability)
      IS DISTINCT FROM
      (p.source_id, p.domain_id, p.chapter_section, p.description, p.requirement_level, p.target_type,
       p.trigger_logic, p.is_general_advice, p.min_classification_level, p.sl_capability, p.ml_capability)),
    coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'chapter_section', p.chapter_section,
                                          'description', left(p.description, 160)) ORDER BY p.chapter_section)
             FILTER (WHERE r.id IS NULL), '[]'::jsonb),
    coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'chapter_section', p.chapter_section,
                                          'description', left(p.description, 160),
                                          'previous_description', left(r.description, 160),
                                          'text_changed', r.description IS DISTINCT FROM p.description,
                                          'reinstated', r.repealed_at IS NOT NULL) ORDER BY p.chapter_section)
             FILTER (WHERE r.id IS NOT NULL AND (r.repealed_at IS NOT NULL OR
               (r.source_id, r.domain_id, r.chapter_section, r.description, r.requirement_level, r.target_type,
                nullif(r.trigger_logic, '{}'::jsonb), r.is_general_advice, r.min_classification_level, r.sl_capability, r.ml_capability)
               IS DISTINCT FROM
               (p.source_id, p.domain_id, p.chapter_section, p.description, p.requirement_level, p.target_type,
                p.trigger_logic, p.is_general_advice, p.min_classification_level, p.sl_capability, p.ml_capability))), '[]'::jsonb)
  INTO v_added, v_reinstated, v_updated, v_added_list, v_changed_list
  FROM _pkg_req p LEFT JOIN public.requirements r ON r.id = p.id;

  -- Skriv kraven (bara rader som faktiskt ändras räknas och loggas)
  INSERT INTO public.requirements AS t (
    id, source_id, domain_id, chapter_section, description, requirement_level, target_type, trigger_logic,
    is_general_advice, min_classification_level, sl_capability, ml_capability, source_page, source_excerpt, is_local, repealed_at)
  SELECT id, source_id, domain_id, chapter_section, description, requirement_level, target_type, trigger_logic,
         is_general_advice, min_classification_level, sl_capability, ml_capability, source_page, source_excerpt, false, NULL
  FROM _pkg_req
  ON CONFLICT (id) DO UPDATE SET
    source_id = EXCLUDED.source_id, domain_id = EXCLUDED.domain_id, chapter_section = EXCLUDED.chapter_section,
    description = EXCLUDED.description, requirement_level = EXCLUDED.requirement_level,
    target_type = EXCLUDED.target_type, trigger_logic = EXCLUDED.trigger_logic,
    is_general_advice = EXCLUDED.is_general_advice, min_classification_level = EXCLUDED.min_classification_level,
    sl_capability = EXCLUDED.sl_capability, ml_capability = EXCLUDED.ml_capability, source_page = EXCLUDED.source_page,
    source_excerpt = EXCLUDED.source_excerpt, is_local = false, repealed_at = NULL
  WHERE (t.source_id, t.domain_id, t.chapter_section, t.description, t.requirement_level, t.target_type,
         nullif(t.trigger_logic, '{}'::jsonb), t.is_general_advice, t.min_classification_level, t.sl_capability, t.ml_capability,
         t.source_page, t.source_excerpt, t.is_local, t.repealed_at)
        IS DISTINCT FROM
        (EXCLUDED.source_id, EXCLUDED.domain_id, EXCLUDED.chapter_section, EXCLUDED.description,
         EXCLUDED.requirement_level, EXCLUDED.target_type, EXCLUDED.trigger_logic, EXCLUDED.is_general_advice,
         EXCLUDED.min_classification_level, EXCLUDED.sl_capability, EXCLUDED.ml_capability, EXCLUDED.source_page,
         EXCLUDED.source_excerpt, false, NULL::timestamptz);

  -- Katalogkrav som inte finns i paketet är upphävda (raderas aldrig)
  WITH rep AS (
    UPDATE public.requirements r SET repealed_at = now()
    WHERE NOT r.is_local AND r.repealed_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM _pkg_req p WHERE p.id = r.id)
    RETURNING r.id, r.chapter_section, r.description
  )
  SELECT count(*), coalesce(jsonb_agg(jsonb_build_object('id', id, 'chapter_section', chapter_section,
                                                         'description', left(description, 160)) ORDER BY chapter_section), '[]'::jsonb)
  INTO v_repealed, v_repealed_list FROM rep;

  -- Kravlänkar (bara paket som innehåller länkar; äldre paket rör dem inte)
  IF v_pkg ? 'links' THEN
    IF jsonb_typeof(v_pkg -> 'links') <> 'array' THEN
      RAISE EXCEPTION 'Paketets kravlänkar har fel format';
    END IF;
    DROP TABLE IF EXISTS _pkg_link;
    CREATE TEMP TABLE _pkg_link ON COMMIT DROP AS
    SELECT * FROM jsonb_to_recordset(v_pkg -> 'links') AS x(
      id uuid, parent_requirement_id uuid, child_requirement_id uuid, coverage text,
      rationale text, decided_by text, decided_at timestamptz);
    IF EXISTS (SELECT 1 FROM _pkg_link WHERE id IS NULL OR parent_requirement_id IS NULL OR child_requirement_id IS NULL) THEN
      RAISE EXCEPTION 'Paketet innehåller kravlänkar utan id';
    END IF;

    -- Katalogens godkända länkar som inte längre finns i paketet tas bort
    -- (loggas). Förslag och avvisade länkar lämnas kvar som historik.
    WITH del AS (
      DELETE FROM public.requirement_links l
      WHERE NOT l.is_local AND l.status = 'approved'
        AND NOT EXISTS (SELECT 1 FROM _pkg_link p WHERE p.id = l.id)
      RETURNING 1
    )
    SELECT count(*) INTO v_links_removed FROM del;

    -- En lokal länk mellan samma krav ersätts av katalogens
    UPDATE public.requirement_links l
    SET status = 'rejected', decided_by = 'kravpaket', decided_at = now(),
        rationale = concat_ws(E'\n', l.rationale, 'Ersatt av kravpaketets länk')
    FROM _pkg_link p
    WHERE l.is_local AND l.status <> 'rejected'
      AND l.parent_requirement_id = p.parent_requirement_id AND l.child_requirement_id = p.child_requirement_id;

    WITH up AS (
      INSERT INTO public.requirement_links AS t (
        id, parent_requirement_id, child_requirement_id, coverage, rationale,
        suggested_by, status, decided_by, decided_at, is_local)
      SELECT id, parent_requirement_id, child_requirement_id, coalesce(coverage, 'full'), rationale,
             'kravpaket', 'approved', coalesce(decided_by, 'kravpaket'), coalesce(decided_at, now()), false
      FROM _pkg_link
      ON CONFLICT (id) DO UPDATE SET
        parent_requirement_id = EXCLUDED.parent_requirement_id, child_requirement_id = EXCLUDED.child_requirement_id,
        coverage = EXCLUDED.coverage, rationale = EXCLUDED.rationale, status = 'approved',
        decided_by = EXCLUDED.decided_by, decided_at = EXCLUDED.decided_at, is_local = false
      WHERE (t.parent_requirement_id, t.child_requirement_id, t.coverage, t.rationale, t.status,
             t.decided_by, t.decided_at, t.is_local)
            IS DISTINCT FROM
            (EXCLUDED.parent_requirement_id, EXCLUDED.child_requirement_id, EXCLUDED.coverage, EXCLUDED.rationale,
             'approved', EXCLUDED.decided_by, EXCLUDED.decided_at, false)
      RETURNING 1
    )
    SELECT count(*) INTO v_links_changed FROM up;
  END IF;

  SELECT (SELECT count(*) FROM public.compliance_records) + (SELECT count(*) FROM public.system_compliance_records)
    INTO v_records_after;

  -- Objekt där krav nu ska granskas (upphävda eller inte längre tillämpliga)
  SELECT
    (SELECT count(*) FROM public.facilities f WHERE EXISTS (
       SELECT 1 FROM public.sync_requirements('facility', f.id, 'preview') p WHERE p.action IN ('remove', 'deactivate')))
  + (SELECT count(*) FROM public.information_systems s WHERE EXISTS (
       SELECT 1 FROM public.sync_requirements('system', s.id, 'preview') p WHERE p.action IN ('remove', 'deactivate')))
  INTO v_to_review;

  v_result := jsonb_build_object(
    'version', v_version,
    'sha256', v_sha,
    'package_created_at', v_pkg ->> 'created_at',
    'notes', v_pkg ->> 'notes',
    'krav_i_paketet', (SELECT count(*) FROM _pkg_req),
    'nya', v_added,
    'ändrade', v_updated,
    'återinförda', v_reinstated,
    'upphävda', v_repealed,
    'regelverk_ändrade', v_src,
    'domäner_ändrade', v_dom,
    'kravlänkar_ändrade', v_links_changed,
    'kravlänkar_borttagna', v_links_removed,
    'nya_poster', v_records_after - v_records_before,
    'objekt_att_granska', v_to_review,
    'signatur_verifierad', coalesce(_signature_verified, false),
    'signaturnyckel', _signature_key_id);

  INSERT INTO public.requirement_catalog_releases
    (direction, version, sha256, notes, counts, signature_key_id, signature_verified, package_created_at, created_by)
  VALUES ('import', v_version, v_sha, v_pkg ->> 'notes', v_result - 'notes' - 'sha256' - 'version',
          _signature_key_id, coalesce(_signature_verified, false),
          (v_pkg ->> 'created_at')::timestamptz, public._current_email());

  PERFORM set_config('app.catalog_import', 'off', true);

  INSERT INTO public.activity_log (action, entity_type, entity_id, entity_label, metadata)
  VALUES ('requirement_catalog_imported', 'requirement_catalog', NULL, 'Kravpaket version ' || v_version, v_result);

  RETURN v_result || jsonb_build_object(
    'added_list', v_added_list, 'changed_list', v_changed_list, 'repealed_list', v_repealed_list);
END;
$$;


--
-- Name: import_requirement_link_rows(uuid, uuid, uuid, jsonb, text, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.import_requirement_link_rows(_law_source_id uuid, _regulation_source_id uuid, _standard_source_id uuid, _rows jsonb, _file_name text DEFAULT NULL::text, _apply boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_law_level public.source_level;
  v_reg_level public.source_level;
  v_std_level public.source_level;
  v_row jsonb;
  v_idx integer := 0;
  v_ref text;
  v_law text; v_reg text; v_std text; v_cov_raw text; v_cov text; v_comment text;
  v_msgs text[];
  v_status text;
  v_law_m jsonb; v_reg_m jsonb; v_std_m jsonb;
  v_std_ids uuid[];
  v_std_part text;
  v_links jsonb;
  v_parent uuid;
  v_child uuid;
  v_link_cov text;
  v_is_gap boolean;
  v_by text;
  v_created integer := 0;
  v_result jsonb;
  v_summary jsonb;
BEGIN
  IF NOT public.is_approved() THEN
    RAISE EXCEPTION 'Inte behörig' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF _rows IS NULL OR jsonb_typeof(_rows) <> 'array' THEN
    RAISE EXCEPTION 'Raderna måste vara en lista';
  END IF;
  IF jsonb_array_length(_rows) > 5000 THEN
    RAISE EXCEPTION 'För många rader (högst 5000 per import)';
  END IF;

  -- Regelverken: lagen krävs, minst ett av de andra, och nivåerna måste
  -- ligga i rätt ordning
  IF _law_source_id IS NULL THEN
    RAISE EXCEPTION 'Välj lagens regelverk';
  END IF;
  IF _regulation_source_id IS NULL AND _standard_source_id IS NULL THEN
    RAISE EXCEPTION 'Välj föreskriftens eller standardens regelverk (eller båda)';
  END IF;
  SELECT source_level INTO v_law_level FROM public.requirement_sources WHERE id = _law_source_id;
  SELECT source_level INTO v_reg_level FROM public.requirement_sources WHERE id = _regulation_source_id;
  SELECT source_level INTO v_std_level FROM public.requirement_sources WHERE id = _standard_source_id;
  IF v_law_level IS NULL
     OR (_regulation_source_id IS NOT NULL AND v_reg_level IS NULL)
     OR (_standard_source_id IS NOT NULL AND v_std_level IS NULL) THEN
    RAISE EXCEPTION 'Alla valda regelverk måste finnas och ha en nivå (lag, förordning, föreskrift eller standard)';
  END IF;
  IF (_regulation_source_id IS NOT NULL
      AND public.source_level_rank(v_law_level) >= public.source_level_rank(v_reg_level))
     OR (_standard_source_id IS NOT NULL
      AND public.source_level_rank(coalesce(v_reg_level, v_law_level)) >= public.source_level_rank(v_std_level)) THEN
    RAISE EXCEPTION 'Regelverken måste väljas uppifrån och ned: lag (%), föreskrift (%), standard (%)',
      v_law_level, coalesce(v_reg_level::text, '–'), coalesce(v_std_level::text, '–');
  END IF;

  DROP TABLE IF EXISTS _lnk_rows;
  CREATE TEMP TABLE _lnk_rows (
    idx integer PRIMARY KEY, ref text, status text, messages text[], is_gap boolean, links jsonb
  ) ON COMMIT DROP;
  DROP TABLE IF EXISTS _lnk_pairs;
  CREATE TEMP TABLE _lnk_pairs (
    parent_id uuid, child_id uuid, coverage text, refs text[], comments text[], state text,
    PRIMARY KEY (parent_id, child_id)
  ) ON COMMIT DROP;

  FOR v_row IN SELECT value FROM jsonb_array_elements(_rows) LOOP
    v_idx := v_idx + 1;
    v_msgs := ARRAY[]::text[];
    v_links := '[]'::jsonb;
    v_is_gap := false;
    v_ref := coalesce(public.clean_sheet_value(v_row ->> 'ref'), 'Rad ' || v_idx);
    v_law := public.clean_sheet_value(v_row ->> 'law');
    v_reg := public.clean_sheet_value(v_row ->> 'regulation');
    v_std := public.clean_sheet_value(v_row ->> 'standard');
    v_comment := public.clean_sheet_value(v_row ->> 'comment');
    v_cov_raw := lower(coalesce(public.clean_sheet_value(v_row ->> 'coverage'), ''));
    v_cov := CASE
      WHEN v_cov_raw IN ('', 'full', 'fullt', 'ja') THEN 'full'
      WHEN v_cov_raw IN ('delvis', 'del', 'partial') THEN 'delvis'
      WHEN v_cov_raw IN ('saknas', 'ingen', 'nej', 'lucka') THEN 'saknas'
    END;
    IF v_cov IS NULL THEN
      v_msgs := v_msgs || format('Okänd täckning "%s" – räknas som Full', v_row ->> 'coverage');
      v_cov := 'full';
    END IF;

    -- Hela raden tom: hoppa över tyst
    IF v_law IS NULL AND v_reg IS NULL AND v_std IS NULL THEN
      CONTINUE;
    END IF;

    -- Matcha lagen
    IF v_law IS NULL THEN
      v_msgs := v_msgs || text 'Lagparagraf saknas';
    ELSE
      v_law_m := public.match_requirement_ref(_law_source_id, v_law);
      IF v_law_m ->> 'status' = 'saknas' THEN
        v_msgs := v_msgs || format('Lagparagrafen "%s" finns inte i det valda regelverket', v_law);
      ELSIF v_law_m ->> 'status' = 'tvetydig' THEN
        v_msgs := v_msgs || format('Lagparagrafen "%s" matchar flera krav: %s', v_law,
          (SELECT string_agg(c ->> 'section', ', ') FROM jsonb_array_elements(v_law_m -> 'candidates') c));
      END IF;
    END IF;

    -- Matcha föreskriften
    v_reg_m := NULL;
    IF v_reg IS NOT NULL THEN
      IF _regulation_source_id IS NULL THEN
        v_msgs := v_msgs || format('Föreskriftspunkt "%s" angiven men inget föreskriftsregelverk valt', v_reg);
      ELSE
        v_reg_m := public.match_requirement_ref(_regulation_source_id, v_reg);
        IF v_reg_m ->> 'status' = 'saknas' THEN
          v_msgs := v_msgs || format('Föreskriftspunkten "%s" finns inte i det valda regelverket', v_reg);
        ELSIF v_reg_m ->> 'status' = 'tvetydig' THEN
          v_msgs := v_msgs || format('Föreskriftspunkten "%s" matchar flera krav: %s', v_reg,
            (SELECT string_agg(c ->> 'section', ', ') FROM jsonb_array_elements(v_reg_m -> 'candidates') c));
        END IF;
      END IF;
    END IF;

    -- Matcha standardens krav (ett eller flera)
    v_std_ids := ARRAY[]::uuid[];
    IF v_std IS NOT NULL THEN
      IF _standard_source_id IS NULL THEN
        v_msgs := v_msgs || format('Standardkrav "%s" angivet men inget standardregelverk valt', v_std);
      ELSE
        FOR v_std_part IN
          SELECT btrim(p) FROM regexp_split_to_table(v_std, '[,;\n]+') p WHERE public.clean_sheet_value(p) IS NOT NULL
        LOOP
          v_std_m := public.match_requirement_ref(_standard_source_id, v_std_part);
          IF v_std_m ->> 'status' = 'saknas' THEN
            v_msgs := v_msgs || format('Standardkravet "%s" finns inte i det valda regelverket', v_std_part);
          ELSIF v_std_m ->> 'status' = 'tvetydig' THEN
            v_msgs := v_msgs || format('Standardkravet "%s" matchar flera krav: %s', v_std_part,
              (SELECT string_agg(c ->> 'section', ', ') FROM jsonb_array_elements(v_std_m -> 'candidates') c));
          ELSIF NOT ((v_std_m ->> 'id')::uuid = ANY (v_std_ids)) THEN
            v_std_ids := v_std_ids || (v_std_m ->> 'id')::uuid;
          END IF;
        END LOOP;
      END IF;
    END IF;

    -- Fel på raden: inga länkar alls
    IF EXISTS (SELECT 1 FROM unnest(v_msgs) m
               WHERE m NOT LIKE 'Okänd täckning%') THEN
      INSERT INTO _lnk_rows VALUES (v_idx, v_ref, 'fel', v_msgs, false, '[]'::jsonb);
      CONTINUE;
    END IF;

    -- Bygg radens länkar
    IF v_cov = 'saknas' AND cardinality(v_std_ids) > 0 THEN
      v_msgs := v_msgs || text 'Täckning "Saknas" men standardkrav angivna – föreslås som delvis täckning';
      v_cov := 'delvis';
    END IF;

    IF v_reg_m IS NOT NULL THEN
      v_link_cov := CASE WHEN cardinality(v_std_ids) > 0 OR v_cov = 'saknas' THEN 'full' ELSE v_cov END;
      v_links := v_links || jsonb_build_object('parent', v_law_m -> 'id', 'child', v_reg_m -> 'id', 'coverage', v_link_cov);
    END IF;
    FOREACH v_child IN ARRAY v_std_ids LOOP
      v_parent := coalesce((v_reg_m ->> 'id')::uuid, (v_law_m ->> 'id')::uuid);
      v_links := v_links || jsonb_build_object('parent', v_parent, 'child', v_child, 'coverage', v_cov);
    END LOOP;

    IF cardinality(v_std_ids) = 0 AND _standard_source_id IS NOT NULL THEN
      v_is_gap := true;
      v_msgs := v_msgs || CASE WHEN v_cov = 'saknas'
        THEN text 'Lucka: lagkravet saknar teknisk omsättning i standarden'
        ELSE text 'Inget standardkrav angivet – raden redovisas som lucka' END;
    END IF;

    IF jsonb_array_length(v_links) = 0 AND NOT v_is_gap THEN
      v_msgs := v_msgs || text 'Raden ger ingen länk (bara lagparagraf)';
    END IF;

    INSERT INTO _lnk_rows VALUES (
      v_idx, v_ref,
      CASE WHEN cardinality(v_msgs) = 0 OR (v_is_gap AND cardinality(v_msgs) = 1) THEN 'ok' ELSE 'varning' END,
      v_msgs, v_is_gap, v_links);

    -- Samla unika par; samma par på flera rader slås ihop
    INSERT INTO _lnk_pairs (parent_id, child_id, coverage, refs, comments)
    SELECT (l ->> 'parent')::uuid, (l ->> 'child')::uuid, l ->> 'coverage', ARRAY[v_ref],
           CASE WHEN v_comment IS NULL THEN ARRAY[]::text[] ELSE ARRAY[v_comment] END
    FROM jsonb_array_elements(v_links) l
    ON CONFLICT (parent_id, child_id) DO UPDATE SET
      -- olika täckning på olika rader → försiktigast (delvis)
      coverage = CASE WHEN _lnk_pairs.coverage = EXCLUDED.coverage THEN _lnk_pairs.coverage ELSE 'delvis' END,
      refs = _lnk_pairs.refs || EXCLUDED.refs,
      comments = _lnk_pairs.comments || EXCLUDED.comments;
  END LOOP;

  -- Vilka par finns redan som förslag eller godkänd länk?
  UPDATE _lnk_pairs p SET state = CASE
    WHEN EXISTS (SELECT 1 FROM public.requirement_links l
                 WHERE l.parent_requirement_id = p.parent_id AND l.child_requirement_id = p.child_id
                   AND l.status = 'approved') THEN 'godkänd'
    WHEN EXISTS (SELECT 1 FROM public.requirement_links l
                 WHERE l.parent_requirement_id = p.parent_id AND l.child_requirement_id = p.child_id
                   AND l.status = 'pending') THEN 'väntar'
    ELSE 'ny' END;

  -- Skapa förslagen
  IF _apply THEN
    v_by := 'Mappningsark' || coalesce(' ' || nullif(btrim(coalesce(_file_name, '')), ''), '')
            || ' (' || public._current_email() || ')';
    WITH ins AS (
      INSERT INTO public.requirement_links
        (parent_requirement_id, child_requirement_id, coverage, rationale, suggested_by)
      SELECT p.parent_id, p.child_id, p.coverage,
             concat_ws(E'\n',
               'Från mappningsarket, ' || CASE WHEN cardinality(p.refs) = 1 THEN 'rad ' ELSE 'rader ' END
                 || array_to_string(p.refs, ', '),
               nullif(array_to_string(ARRAY(SELECT DISTINCT unnest(p.comments)), E'\n'), '')),
             v_by
      FROM _lnk_pairs p
      WHERE p.state = 'ny'
      ORDER BY p.refs[1]
      RETURNING 1
    )
    SELECT count(*) INTO v_created FROM ins;
  END IF;

  SELECT jsonb_build_object(
    'rader', count(*),
    'rader_ok', count(*) FILTER (WHERE status = 'ok'),
    'rader_med_varning', count(*) FILTER (WHERE status = 'varning'),
    'rader_med_fel', count(*) FILTER (WHERE status = 'fel'),
    'luckor', count(*) FILTER (WHERE is_gap),
    'nya_förslag', (SELECT count(*) FROM _lnk_pairs WHERE state = 'ny'),
    'väntar_redan', (SELECT count(*) FROM _lnk_pairs WHERE state = 'väntar'),
    'redan_godkända', (SELECT count(*) FROM _lnk_pairs WHERE state = 'godkänd'),
    'skapade', v_created,
    'importerad', _apply)
  INTO v_summary FROM _lnk_rows;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'ref', r.ref, 'status', r.status, 'lucka', r.is_gap, 'meddelanden', to_jsonb(r.messages),
      'länkar', coalesce((
        SELECT jsonb_agg(jsonb_build_object(
          'parent_section', rp.chapter_section, 'child_section', rc.chapter_section,
          'child_source', sc.document_name, 'coverage', p.coverage, 'state', p.state)
          ORDER BY rc.chapter_section)
        FROM jsonb_array_elements(r.links) l
        JOIN _lnk_pairs p ON p.parent_id = (l ->> 'parent')::uuid AND p.child_id = (l ->> 'child')::uuid
        JOIN public.requirements rp ON rp.id = p.parent_id
        JOIN public.requirements rc ON rc.id = p.child_id
        JOIN public.requirement_sources sc ON sc.id = rc.source_id), '[]'::jsonb))
    ORDER BY r.idx), '[]'::jsonb)
  INTO v_result FROM _lnk_rows r;

  IF _apply THEN
    INSERT INTO public.activity_log (action, entity_type, entity_id, entity_label, metadata)
    VALUES ('requirement_links_imported', 'requirement_link', NULL,
            'Mappningsark' || coalesce(' ' || nullif(btrim(coalesce(_file_name, '')), ''), ''),
            v_summary || jsonb_build_object(
              'lag', _law_source_id, 'föreskrift', _regulation_source_id, 'standard', _standard_source_id));
  END IF;

  RETURN jsonb_build_object('sammanfattning', v_summary, 'rader', v_result);
END;
$$;


--
-- Name: inherited_system_class(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.inherited_system_class(_system_id uuid) RETURNS smallint
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT max(f.classification_level)
  FROM public.facility_systems fs
  JOIN public.facilities f ON f.id = fs.facility_id
  WHERE fs.system_id = _system_id
$$;


--
-- Name: is_approved(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_approved() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND approved = true
  ) OR public.has_role(auth.uid(), 'admin');
$$;


--
-- Name: jsonb_bool(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.jsonb_bool(v jsonb) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT CASE WHEN jsonb_typeof(v) = 'boolean' THEN (v #>> '{}')::boolean END
$$;


--
-- Name: jsonb_changes(jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.jsonb_changes(_old jsonb, _new jsonb) RETURNS jsonb
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT coalesce(jsonb_object_agg(k, jsonb_build_object('från', _old -> k, 'till', _new -> k)), '{}'::jsonb)
  FROM (SELECT jsonb_object_keys(_old) AS k UNION SELECT jsonb_object_keys(_new)) keys
  WHERE k NOT IN ('updated_at', 'created_at')
    AND (_old -> k) IS DISTINCT FROM (_new -> k)
$$;


--
-- Name: jsonb_has_text(jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.jsonb_has_text(v jsonb, t text) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT CASE
    WHEN v IS NULL OR jsonb_typeof(v) = 'null' THEN false
    WHEN jsonb_typeof(v) = 'array' THEN EXISTS (SELECT 1 FROM jsonb_array_elements_text(v) e WHERE e = t)
    ELSE (v #>> '{}') = t
  END
$$;


--
-- Name: jsonb_num(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.jsonb_num(v jsonb) RETURNS numeric
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT CASE WHEN jsonb_typeof(v) = 'number' THEN (v #>> '{}')::numeric END
$$;


--
-- Name: log_app_event(text, text, uuid, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_app_event(_action text, _entity_type text DEFAULT NULL::text, _entity_id uuid DEFAULT NULL::uuid, _entity_label text DEFAULT NULL::text, _metadata jsonb DEFAULT '{}'::jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Inloggning krävs' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF _action <> 'login' AND NOT public.is_approved() THEN
    RAISE EXCEPTION 'Kontot är inte godkänt' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF _action NOT IN ('login', 'test_import', 'test_export', 'approve_test_suggestion',
                     'dismiss_test_suggestion', 'restore_test_suggestion') THEN
    RAISE EXCEPTION 'Okänd app-händelse: %', _action;
  END IF;
  IF length(coalesce(_metadata, '{}'::jsonb)::text) > 20000 THEN
    RAISE EXCEPTION 'För stor metadata';
  END IF;

  INSERT INTO public.activity_log (action, entity_type, entity_id, entity_label, metadata, source)
  VALUES (_action,
          CASE WHEN _action = 'login' THEN 'auth' ELSE left(_entity_type, 100) END,
          _entity_id,
          CASE WHEN _action = 'login' THEN public._current_email() ELSE left(_entity_label, 300) END,
          coalesce(_metadata, '{}'::jsonb),
          'app');
END;
$$;


--
-- Name: log_compliance_set_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_compliance_set_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_is_system boolean := TG_TABLE_NAME = 'system_compliance_records';
  v_action    text := CASE TG_OP WHEN 'INSERT' THEN 'requirements_added' ELSE 'requirements_removed' END;
BEGIN
  IF v_is_system THEN
    INSERT INTO public.activity_log (action, entity_type, entity_id, entity_label, metadata)
    SELECT v_action, 'system', g.object_id, s.name,
           jsonb_build_object('antal', g.n, 'krav', g.reqs)
    FROM (
      SELECT t.system_id AS object_id, count(*) AS n,
             jsonb_agg(jsonb_build_object('id', t.requirement_id, 'paragraf', r.chapter_section,
                                          'status', t.status) ORDER BY r.chapter_section) AS reqs
      FROM changed_rows t LEFT JOIN public.requirements r ON r.id = t.requirement_id
      GROUP BY t.system_id
    ) g
    LEFT JOIN public.information_systems s ON s.id = g.object_id;
  ELSE
    INSERT INTO public.activity_log (action, entity_type, entity_id, entity_label, metadata)
    SELECT v_action, 'facility', g.object_id, f.name,
           jsonb_build_object('antal', g.n, 'krav', g.reqs)
    FROM (
      SELECT t.facility_id AS object_id, count(*) AS n,
             jsonb_agg(jsonb_build_object('id', t.requirement_id, 'paragraf', r.chapter_section,
                                          'status', t.status) ORDER BY r.chapter_section) AS reqs
      FROM changed_rows t LEFT JOIN public.requirements r ON r.id = t.requirement_id
      GROUP BY t.facility_id
    ) g
    LEFT JOIN public.facilities f ON f.id = g.object_id;
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: log_compliance_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_compliance_update() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_changes jsonb := public.jsonb_changes(to_jsonb(OLD), to_jsonb(NEW));
  v_object  text;
  v_label   text;
BEGIN
  IF v_changes = '{}'::jsonb THEN
    RETURN NEW;
  END IF;
  IF TG_TABLE_NAME = 'system_compliance_records' THEN
    SELECT name INTO v_object FROM public.information_systems WHERE id = NEW.system_id;
  ELSE
    SELECT name INTO v_object FROM public.facilities WHERE id = NEW.facility_id;
  END IF;
  SELECT chapter_section INTO v_label FROM public.requirements WHERE id = NEW.requirement_id;

  INSERT INTO public.activity_log (action, entity_type, entity_id, entity_label, metadata)
  VALUES ('compliance_updated',
          CASE TG_TABLE_NAME WHEN 'system_compliance_records' THEN 'system_compliance_record' ELSE 'compliance_record' END,
          NEW.id,
          concat_ws(' · ', v_label, v_object),
          jsonb_build_object('ändringar', v_changes, 'krav_id', NEW.requirement_id));
  RETURN NEW;
END;
$$;


--
-- Name: log_component_sync(uuid, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_component_sync(_asset_id uuid, _label text, _metadata jsonb) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  INSERT INTO public.activity_log (action, entity_type, entity_id, entity_label, metadata)
  VALUES ('component_requirements_synced', 'system_asset', _asset_id, _label, _metadata);
$$;


--
-- Name: log_entity_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_entity_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_type    text := TG_ARGV[0];
  v_labelf  text := TG_ARGV[1];
  v_row     jsonb := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  v_label   text;
  v_meta    jsonb := '{}'::jsonb;
  v_changes jsonb;
BEGIN
  IF v_labelf = '@requirement' THEN
    SELECT chapter_section INTO v_label FROM public.requirements
      WHERE id = (v_row ->> 'requirement_id')::uuid;
  ELSE
    v_label := v_row ->> v_labelf;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_changes := public.jsonb_changes(to_jsonb(OLD), to_jsonb(NEW));
    IF v_changes = '{}'::jsonb THEN
      RETURN NEW;  -- inget faktiskt ändrat
    END IF;
    v_meta := jsonb_build_object('ändringar', v_changes);
  ELSIF TG_OP = 'DELETE' THEN
    v_meta := jsonb_build_object('borttagen_rad', to_jsonb(OLD));
  END IF;

  INSERT INTO public.activity_log (action, entity_type, entity_id, entity_label, metadata)
  VALUES (v_type || CASE TG_OP WHEN 'INSERT' THEN '_created' WHEN 'UPDATE' THEN '_updated' ELSE '_deleted' END,
          v_type, (v_row ->> 'id')::uuid, v_label, v_meta);
  RETURN coalesce(NEW, OLD);
END;
$$;


--
-- Name: log_facility_link(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_facility_link() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_link  jsonb := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  v_sys   text;
  v_fac   text;
  v_class smallint;
BEGIN
  SELECT name INTO v_sys FROM public.information_systems WHERE id = (v_link ->> 'system_id')::uuid;
  SELECT name, classification_level INTO v_fac, v_class FROM public.facilities WHERE id = (v_link ->> 'facility_id')::uuid;

  INSERT INTO public.activity_log (action, entity_type, entity_id, entity_label, metadata)
  VALUES (CASE TG_OP WHEN 'INSERT' THEN 'facility_linked' WHEN 'DELETE' THEN 'facility_unlinked' ELSE 'facility_link_updated' END,
          'system', (v_link ->> 'system_id')::uuid, v_sys,
          jsonb_build_object('anläggning', v_fac, 'anläggning_id', v_link ->> 'facility_id',
                             'anläggningens_klass', v_class,
                             'systemets_klass_efter', public.effective_system_class((v_link ->> 'system_id')::uuid))
          || CASE WHEN TG_OP = 'UPDATE'
                  THEN jsonb_build_object('ändringar', public.jsonb_changes(to_jsonb(OLD), to_jsonb(NEW)))
                  ELSE '{}'::jsonb END);
  RETURN coalesce(NEW, OLD);
END;
$$;


--
-- Name: log_installation_settings(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_installation_settings() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_changes jsonb := public.jsonb_changes(to_jsonb(OLD), to_jsonb(NEW)) - 'updated_at';
BEGIN
  NEW.updated_at := now();
  IF v_changes <> '{}'::jsonb THEN
    INSERT INTO public.activity_log (action, entity_type, entity_id, entity_label, metadata)
    VALUES ('installation_settings_updated', 'settings', NULL, 'Installationsinställningar',
            jsonb_build_object('ändringar', v_changes));
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: log_requirement_audit_entry(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_requirement_audit_entry() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.action LIKE 'review\_%' AND NEW.action <> 'review_comment' THEN
    RETURN NEW;
  END IF;
  IF NEW.action = 'trigger_logic_updated' THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.activity_log (action, entity_type, entity_id, entity_label, metadata)
  VALUES ('requirement_' || NEW.action, 'requirement', NEW.requirement_id,
          (SELECT chapter_section FROM public.requirements WHERE id = NEW.requirement_id),
          jsonb_build_object('value', NEW.new_value));
  RETURN NEW;
END;
$$;


--
-- Name: log_requirement_link_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_requirement_link_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_row     public.requirement_links := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  v_label   text;
  v_meta    jsonb;
  v_changes jsonb;
BEGIN
  SELECT concat_ws(' → ', rp.chapter_section, rc.chapter_section) INTO v_label
  FROM public.requirements rp, public.requirements rc
  WHERE rp.id = v_row.parent_requirement_id AND rc.id = v_row.child_requirement_id;

  IF TG_OP = 'UPDATE' THEN
    v_changes := public.jsonb_changes(to_jsonb(OLD), to_jsonb(NEW));
    IF v_changes = '{}'::jsonb THEN
      RETURN NEW;
    END IF;
    v_meta := jsonb_build_object('ändringar', v_changes);
  ELSIF TG_OP = 'DELETE' THEN
    v_meta := jsonb_build_object('borttagen_rad', to_jsonb(OLD));
  ELSE
    v_meta := jsonb_build_object(
      'överordnat_krav', v_row.parent_requirement_id, 'underordnat_krav', v_row.child_requirement_id,
      'täckning', v_row.coverage, 'status', v_row.status, 'föreslagen_av', v_row.suggested_by);
  END IF;

  INSERT INTO public.activity_log (action, entity_type, entity_id, entity_label, metadata)
  VALUES ('requirement_link' || CASE TG_OP WHEN 'INSERT' THEN '_created' WHEN 'UPDATE' THEN '_updated' ELSE '_deleted' END,
          'requirement_link', v_row.id, v_label, v_meta);
  RETURN coalesce(NEW, OLD);
END;
$$;


--
-- Name: log_review_activity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_review_activity() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_label TEXT;
BEGIN
  SELECT chapter_section INTO v_label FROM public.requirements WHERE id = NEW.requirement_id;
  INSERT INTO public.activity_log (user_id, user_email, action, entity_type, entity_id, entity_label, metadata)
  VALUES (auth.uid(), public._current_email(),
    'requirement_reviewed', 'requirement', NEW.requirement_id, v_label,
    jsonb_build_object('status', NEW.status, 'comment', NEW.comment));
  RETURN NEW;
END;$$;


--
-- Name: mark_local_on_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_local_on_insert() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF current_setting('app.catalog_import', true) IS DISTINCT FROM 'on'
     AND (SELECT role FROM public.installation_settings WHERE id = 1) = 'operations' THEN
    NEW.is_local := true;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: match_requirement_ref(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_requirement_ref(_source_id uuid, _ref text) RETURNS jsonb
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  v text := public.normalize_section_ref(_ref);
  m jsonb;
BEGIN
  IF v IS NULL THEN
    RETURN jsonb_build_object('status', 'saknas');
  END IF;

  WITH c AS (
    SELECT r.id, r.chapter_section, public.normalize_section_ref(r.chapter_section) AS n
    FROM public.requirements r
    WHERE r.source_id = _source_id AND r.repealed_at IS NULL
  ), exact AS (
    SELECT id, chapter_section, n FROM c WHERE n = v
  ), suffix AS (
    SELECT id, chapter_section, n FROM c
    WHERE n ~ '^[[:alpha:]]' AND length(v) > length(n)
      AND right(v, length(n)) = n
      AND substr(v, length(v) - length(n), 1) !~ '[[:alpha:]]'
  ), best AS (
    SELECT * FROM exact
    UNION ALL
    SELECT * FROM suffix
    WHERE NOT EXISTS (SELECT 1 FROM exact)
      AND length(n) = (SELECT max(length(n)) FROM suffix)
  )
  SELECT jsonb_agg(jsonb_build_object('id', id, 'section', chapter_section) ORDER BY chapter_section)
    INTO m FROM best;

  IF m IS NULL THEN
    RETURN jsonb_build_object('status', 'saknas');
  ELSIF jsonb_array_length(m) > 1 THEN
    RETURN jsonb_build_object('status', 'tvetydig', 'candidates', m);
  END IF;
  RETURN jsonb_build_object('status', 'ok', 'id', m -> 0 -> 'id', 'section', m -> 0 ->> 'section');
END;
$$;


--
-- Name: metric_compliance(bigint, bigint, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.metric_compliance(_fulfilled bigint, _assessed bigint, _not_applicable bigint) RETURNS integer
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT CASE WHEN _assessed - _not_applicable > 0
              THEN round(_fulfilled * 100.0 / (_assessed - _not_applicable))::integer END
$$;


--
-- Name: metric_coverage(bigint, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.metric_coverage(_assessed bigint, _total bigint) RETURNS integer
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT CASE WHEN _total > 0 THEN round(_assessed * 100.0 / _total)::integer ELSE 0 END
$$;


--
-- Name: normalize_section_ref(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.normalize_section_ref(_ref text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT nullif(
    regexp_replace(
      regexp_replace(lower(btrim(coalesce(_ref, ''))), '[\s()]+', '', 'g'),
      '(?<![0-9])\.|\.(?![0-9])', '', 'g'),
    '')
$$;


--
-- Name: prevent_delete_assessed_requirement(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_delete_assessed_requirement() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_work integer := public.requirement_work_count(OLD.id);
BEGIN
  IF v_work > 0 THEN
    RAISE EXCEPTION 'Kravet % har % bedömningar eller testresultat och kan inte raderas. Upphäv kravet i stället – då finns bedömningarna kvar för granskning.',
      OLD.chapter_section, v_work
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN OLD;
END;
$$;


--
-- Name: prevent_delete_assessed_source(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_delete_assessed_source() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_reqs integer;
BEGIN
  SELECT count(*) INTO v_reqs FROM public.requirements r
  WHERE r.source_id = OLD.id AND public.requirement_work_count(r.id) > 0;
  IF v_reqs > 0 THEN
    RAISE EXCEPTION 'Regelverket "%" har % krav med bedömningar eller testresultat och kan inte raderas. Upphäv kraven i stället.',
      OLD.document_name, v_reqs
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN OLD;
END;
$$;


--
-- Name: preview_requirement_catalog_import(text, text, text, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.preview_requirement_catalog_import(_content text, _sha256 text, _signature_key_id text DEFAULT NULL::text, _signature_verified boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v jsonb;
BEGIN
  BEGIN
    v := public.import_requirement_catalog(_content, _sha256, _signature_key_id, _signature_verified);
    RAISE EXCEPTION USING ERRCODE = 'P0099', MESSAGE = v::text;
  EXCEPTION WHEN SQLSTATE 'P0099' THEN
    RETURN SQLERRM::jsonb || jsonb_build_object('preview', true);
  END;
END;
$$;


--
-- Name: profile_na_justification(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.profile_na_justification(_text text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT CASE WHEN length(btrim(coalesce(_text, ''))) >= 15 THEN btrim(_text)
              ELSE 'Ej tillämpligt enligt profil: ' || coalesce(nullif(btrim(_text), ''), 'motivering saknas') END
$$;


--
-- Name: protect_profile_fields(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_profile_fields() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- auth.uid() är NULL för backend (auth-tjänsten, service role, migrationer).
  -- pg_trigger_depth() > 1 = ändringen görs av en annan databastrigger
  -- (t.ex. autogodkännande vid bekräftad e-post), inte direkt av användaren.
  IF auth.uid() IS NOT NULL
     AND pg_trigger_depth() = 1
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.id       := OLD.id;
    NEW.approved := OLD.approved;
    NEW.email    := OLD.email;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: record_compliance_export(text, text, jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_compliance_export(_export_id text, _file_name text, _filters jsonb, _row_counts jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_filters jsonb := coalesce(_filters, '{}'::jsonb);
  v_scope jsonb := public.export_scope_key(coalesce(_filters, '{}'::jsonb));
  v_diff jsonb;
BEGIN
  PERFORM public.require_admin();
  IF coalesce(btrim(_export_id), '') = '' OR coalesce(btrim(_file_name), '') = '' THEN
    RAISE EXCEPTION 'Export-ID och filnamn krävs';
  END IF;

  v_diff := public.export_requirement_diff(v_filters);

  INSERT INTO public.export_history
    (export_id, file_name, filters, row_counts, requirements_snapshot, scope_key, user_id, user_email)
  VALUES
    (_export_id, _file_name, v_filters, coalesce(_row_counts, '{}'::jsonb),
     public.requirement_snapshot(v_scope), v_scope, auth.uid(), public._current_email());

  INSERT INTO public.activity_log (action, entity_type, entity_id, entity_label, metadata)
  VALUES ('compliance_exported', 'export', NULL, left(_file_name, 300),
          jsonb_build_object('export_id', _export_id, 'filter', v_filters,
                             'antal', coalesce(_row_counts, '{}'::jsonb)));
  RETURN v_diff;
END;
$$;


--
-- Name: repeal_requirement(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.repeal_requirement(_requirement_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  PERFORM public.require_admin();
  UPDATE public.requirements SET repealed_at = now()
  WHERE id = _requirement_id AND repealed_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kravet finns inte eller är redan upphävt';
  END IF;
END;
$$;


--
-- Name: require_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.require_admin() RETURNS void
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_approved()
     OR NOT public.has_role(_user_id => auth.uid(), _role => 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Kräver administratörsbehörighet' USING ERRCODE = 'insufficient_privilege';
  END IF;
END;
$$;


--
-- Name: requirement_addresses_asset(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.requirement_addresses_asset(_source_id uuid, _target_type text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT coalesce(_target_type, '') NOT IN ('supplier', 'asset_owner')
     AND NOT EXISTS (SELECT 1 FROM public.requirement_sources s
                     WHERE s.id = _source_id AND s.addressee <> 'asset')
$$;


--
-- Name: requirement_content_hash(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.requirement_content_hash(_requirement_id uuid) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT encode(extensions.digest(
           jsonb_build_array(r.chapter_section, r.description, nullif(r.trigger_logic, '{}'::jsonb),
                             r.min_classification_level, r.sl_capability, r.target_type,
                             r.requirement_level, r.is_general_advice)::text,
           'sha256'), 'hex')
  FROM public.requirements r
  WHERE r.id = _requirement_id
$$;


--
-- Name: requirement_passes_level(smallint, smallint, smallint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.requirement_passes_level(_sl_capability smallint, _min_classification_level smallint, _level smallint) RETURNS boolean
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  SELECT CASE
    WHEN _sl_capability IS NOT NULL
      THEN public.target_sl_for_class(coalesce(_level, 1::smallint)) >= _sl_capability
    ELSE coalesce(_level, 1::smallint) >= coalesce(_min_classification_level, 1::smallint)
  END
$$;


--
-- Name: requirement_snapshot(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.requirement_snapshot(_scope jsonb) RETURNS jsonb
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', r.id, 'chapter_section', r.chapter_section, 'description', r.description,
      'requirement_level', r.requirement_level, 'source_id', r.source_id, 'domain_id', r.domain_id,
      'source_name', s.document_name, 'domain_name', d.name,
      'trigger_logic', r.trigger_logic, 'min_classification_level', r.min_classification_level,
      'sl_capability', r.sl_capability, 'repealed', r.repealed_at IS NOT NULL
    ) ORDER BY r.id), '[]'::jsonb)
  FROM public.requirements r
  LEFT JOIN public.requirement_sources s ON s.id = r.source_id
  LEFT JOIN public.security_domains d ON d.id = r.domain_id
  WHERE (jsonb_array_length(_scope -> 'sourceIds') = 0
         OR r.source_id::text IN (SELECT jsonb_array_elements_text(_scope -> 'sourceIds')))
    AND (jsonb_array_length(_scope -> 'domainIds') = 0
         OR r.domain_id::text IN (SELECT jsonb_array_elements_text(_scope -> 'domainIds')))
$$;


--
-- Name: requirement_sync_pending(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.requirement_sync_pending(_object_type text, _object_id uuid) RETURNS TABLE(additions integer, removals integer, deactivations integer, reactivations integer)
    LANGUAGE sql
    SET search_path TO 'public'
    AS $$
  SELECT count(*) FILTER (WHERE p.action = 'add')::integer,
         count(*) FILTER (WHERE p.action = 'remove')::integer,
         count(*) FILTER (WHERE p.action = 'deactivate')::integer,
         count(*) FILTER (WHERE p.action = 'reactivate')::integer
  FROM public.sync_requirements(_object_type, _object_id, 'preview') p
$$;


--
-- Name: requirement_work_count(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.requirement_work_count(_requirement_id uuid) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT
    (SELECT count(*) FROM public.compliance_records c
      WHERE c.requirement_id = _requirement_id
        AND NOT public.compliance_record_is_untouched(c.status, c.evidence, c.evidence_url, c.evidence_file_name,
                                                      c.justification, c.verified_by_test_mapping_id, c.notes))::integer
  + (SELECT count(*) FROM public.system_compliance_records c
      WHERE c.requirement_id = _requirement_id
        AND NOT public.compliance_record_is_untouched(c.status, c.evidence, c.evidence_url, c.evidence_file_name,
                                                      c.justification, c.verified_by_test_mapping_id, c.notes))::integer
  + (SELECT count(*) FROM public.component_compliance_records c
      WHERE c.requirement_id = _requirement_id AND NOT public.component_record_is_untouched(c))::integer
  + (SELECT count(*) FROM public.requirement_test_mappings m
      WHERE m.requirement_id = _requirement_id
        AND (m.result_status IS NOT NULL OR m.tested_at IS NOT NULL OR m.evidence IS NOT NULL
             OR m.evidence_url IS NOT NULL OR m.deviation IS NOT NULL))::integer
$$;


--
-- Name: save_project_as_profile(uuid, text, text, uuid, smallint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.save_project_as_profile(_project_id uuid, _name text, _description text, _component_type_id uuid, _target_sl smallint) RETURNS uuid
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE v_profile uuid;
BEGIN
  IF NOT public.is_approved() THEN RAISE EXCEPTION 'Behörighet saknas'; END IF;
  INSERT INTO public.requirement_profiles (name, description, component_type_id, target_sl)
  VALUES (_name, nullif(btrim(coalesce(_description, '')), ''), _component_type_id, _target_sl)
  RETURNING id INTO v_profile;
  WITH ins AS (
    INSERT INTO public.requirement_profile_items (profile_id, requirement_id, applicability, justification)
    SELECT v_profile, p.requirement_id, p.applicability, p.justification
    FROM public.project_requirements p WHERE p.project_id = _project_id
    RETURNING id, requirement_id
  )
  INSERT INTO public.compensating_measures
    (profile_item_id, description, measure_type, system_id, asset_id, facility_id, proposed_by, status)
  SELECT ins.id, m.description, m.measure_type, m.system_id, m.asset_id, m.facility_id, m.proposed_by, 'proposed'
  FROM ins
  JOIN public.project_requirements p ON p.project_id = _project_id AND p.requirement_id = ins.requirement_id
  JOIN public.compensating_measures m ON m.project_requirement_id = p.id;
  RETURN v_profile;
END;
$$;


--
-- Name: seal_activity_log(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.seal_activity_log() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_seq  bigint;
  v_prev text;
BEGIN
  NEW.created_at := now();
  NEW.user_id    := auth.uid();
  NEW.user_email := public._current_email();
  NEW.source     := CASE WHEN NEW.source = 'app' THEN 'app' ELSE 'databas' END;
  NEW.metadata   := coalesce(NEW.metadata, '{}'::jsonb);

  -- Raden i audit_chain_head låses av UPDATE, så samtidiga skrivningar
  -- köas och kedjan blir alltid linjär.
  UPDATE public.audit_chain_head SET seq = seq + 1 WHERE id
    RETURNING seq, hash INTO v_seq, v_prev;

  NEW.seq       := v_seq;
  NEW.prev_hash := v_prev;
  NEW.row_hash  := public.activity_row_hash(NEW.seq, NEW.created_at, NEW.user_id, NEW.user_email,
                     NEW.action, NEW.entity_type, NEW.entity_id, NEW.entity_label,
                     NEW.metadata, NEW.source, NEW.prev_hash);

  UPDATE public.audit_chain_head SET hash = NEW.row_hash WHERE id;
  RETURN NEW;
END;
$$;


--
-- Name: set_source_level_on_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_source_level_on_insert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.source_level := coalesce(NEW.source_level, public.guess_source_level(NEW.document_name));
  RETURN NEW;
END;
$$;


--
-- Name: simulate_facility_requirements(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.simulate_facility_requirements(_facility_id uuid, _overrides jsonb) RETURNS SETOF uuid
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  SELECT a
  FROM public.facilities f
  CROSS JOIN LATERAL public.applicable_requirements_for_facility_attrs(
    to_jsonb(f) || coalesce(_overrides, '{}'::jsonb)) a
  WHERE f.id = _facility_id
$$;


--
-- Name: source_level_rank(public.source_level); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.source_level_rank(_level public.source_level) RETURNS smallint
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT CASE _level
    WHEN 'lag' THEN 1 WHEN 'förordning' THEN 2
    WHEN 'föreskrift' THEN 3 WHEN 'standard' THEN 4
  END::smallint
$$;


--
-- Name: stamp_compensating_measure(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.stamp_compensating_measure() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at := now();
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'proposed' THEN
      NEW.decided_by := NULL; NEW.decided_at := NULL;
    ELSE
      NEW.decided_by := coalesce(public._current_email(), NEW.decided_by);
      NEW.decided_at := now();
    END IF;
  ELSE
    NEW.decided_by := OLD.decided_by; NEW.decided_at := OLD.decided_at;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: stamp_requirement_audit_actor(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.stamp_requirement_audit_actor() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.created_at    := now();
  NEW.actor_user_id := auth.uid();
  NEW.changed_by    := public._current_email();
  RETURN NEW;
END;
$$;


--
-- Name: stamp_requirement_link_author(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.stamp_requirement_link_author() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND current_user = 'authenticated' THEN
    NEW.suggested_by := public._current_email();
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: stamp_requirement_review_actor(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.stamp_requirement_review_actor() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- clock_timestamp: flera beslut i samma transaktion får rätt ordning
  NEW.created_at    := clock_timestamp();
  NEW.actor_user_id := auth.uid();
  NEW.reviewed_by   := public._current_email();
  NEW.content_hash  := public.requirement_content_hash(NEW.requirement_id);
  RETURN NEW;
END;
$$;


--
-- Name: stockholm_today(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.stockholm_today() RETURNS date
    LANGUAGE sql STABLE
    AS $$ SELECT (now() AT TIME ZONE 'Europe/Stockholm')::date $$;


--
-- Name: submit_requirement_reviews(jsonb, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.submit_requirement_reviews(_items jsonb, _batch_id uuid DEFAULT NULL::uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_item jsonb;
  v_req uuid;
  v_status text;
  v_comment text;
  v_batch_no text;
  v_count int := 0;
BEGIN
  IF NOT public.is_approved() THEN
    RAISE EXCEPTION 'Inte behörig' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF _batch_id IS NOT NULL THEN
    SELECT batch_no INTO v_batch_no FROM public.review_batches WHERE id = _batch_id;
    IF v_batch_no IS NULL THEN RAISE EXCEPTION 'Utskriften finns inte'; END IF;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(coalesce(_items, '[]'::jsonb)) LOOP
    v_req := (v_item->>'requirement_id')::uuid;
    v_status := v_item->>'status';
    v_comment := nullif(btrim(v_item->>'comment'), '');
    IF v_status NOT IN ('approved', 'flagged', 'pending') THEN
      RAISE EXCEPTION 'Okänt beslut: %', v_status;
    END IF;
    IF v_status = 'flagged' AND v_comment IS NULL THEN
      RAISE EXCEPTION 'Skriv vad som ska ändras för att flagga ett krav';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.requirements WHERE id = v_req) THEN
      RAISE EXCEPTION 'Kravet finns inte';
    END IF;

    INSERT INTO public.requirement_reviews (requirement_id, status, comment, batch_id, reviewed_by)
    VALUES (v_req, v_status::public.review_status, v_comment, _batch_id, '');

    INSERT INTO public.requirement_audit_log (requirement_id, action, changed_by, new_value)
    VALUES (v_req,
            CASE v_status WHEN 'approved' THEN 'review_approved'
                          WHEN 'flagged' THEN 'review_flagged' ELSE 'review_reset' END,
            '',
            jsonb_strip_nulls(jsonb_build_object('status', v_status, 'comment', v_comment,
                                                 'print_batch', v_batch_no,
                                                 'content_hash', public.requirement_content_hash(v_req))));
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;


--
-- Name: suggest_requirement_link(uuid, uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.suggest_requirement_link(_parent_requirement_id uuid, _child_requirement_id uuid, _coverage text DEFAULT 'full'::text, _rationale text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.is_approved() THEN
    RAISE EXCEPTION 'Inte behörig' USING ERRCODE = 'insufficient_privilege';
  END IF;
  INSERT INTO public.requirement_links
    (parent_requirement_id, child_requirement_id, coverage, rationale, suggested_by)
  VALUES (_parent_requirement_id, _child_requirement_id, coalesce(_coverage, 'full'),
          nullif(btrim(coalesce(_rationale, '')), ''), public._current_email())
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;


--
-- Name: sync_component_requirements(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_component_requirements(_asset_id uuid, _mode text DEFAULT 'full'::text) RETURNS TABLE(action text, requirement_id uuid, record_id uuid)
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
#variable_conflict use_column
DECLARE v_type uuid; v_profile uuid; v_profile_name text; v_name text; v_reason text;
  v_added int := 0; v_removed int := 0; v_deactivated int := 0; v_refreshed int := 0; v_reactivated int := 0;
BEGIN
  IF _mode NOT IN ('preview', 'full') THEN RAISE EXCEPTION 'Okänt läge: %', _mode; END IF;
  IF auth.uid() IS NOT NULL AND NOT public.is_approved() THEN RAISE EXCEPTION 'Kontot är inte godkänt' USING ERRCODE = 'insufficient_privilege'; END IF;
  SELECT component_type_id, name INTO v_type, v_name FROM public.system_assets WHERE id = _asset_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Komponenten finns inte'; END IF;
  SELECT id, name INTO v_profile, v_profile_name FROM public.requirement_profiles WHERE is_default AND component_type_id = v_type;
  v_reason := format('Kravet ingår inte längre i komponentens standardprofil (synk %s). Bedömning och historik bevarade.',
    to_char(now() AT TIME ZONE 'Europe/Stockholm', 'YYYY-MM-DD'));

  CREATE TEMP TABLE IF NOT EXISTS _csync_target (requirement_id uuid PRIMARY KEY, item_id uuid, applicability public.requirement_applicability, na_text text) ON COMMIT DROP;
  TRUNCATE _csync_target;
  IF v_profile IS NOT NULL THEN
    INSERT INTO _csync_target SELECT i.requirement_id, i.id, i.applicability,
      CASE WHEN i.applicability = 'not_applicable' THEN public.profile_na_justification(i.justification) END
    FROM public.requirement_profile_items i JOIN public.requirements r ON r.id = i.requirement_id
    WHERE i.profile_id = v_profile AND r.repealed_at IS NULL;
  END IF;

  IF _mode = 'preview' THEN
    RETURN QUERY SELECT 'add'::text, t.requirement_id, NULL::uuid FROM _csync_target t
      WHERE NOT EXISTS (SELECT 1 FROM public.component_compliance_records c WHERE c.asset_id = _asset_id AND c.requirement_id = t.requirement_id);
    RETURN QUERY SELECT CASE WHEN public.component_record_is_untouched(c) THEN 'remove' ELSE 'deactivate' END, c.requirement_id, c.id
      FROM public.component_compliance_records c WHERE c.asset_id = _asset_id AND c.out_of_scope_since IS NULL
       AND NOT EXISTS (SELECT 1 FROM _csync_target t WHERE t.requirement_id = c.requirement_id);
    RETURN;
  END IF;

  PERFORM 1 FROM public.system_assets WHERE id = _asset_id FOR UPDATE;

  -- Återaktivera
  RETURN QUERY WITH re AS (
    UPDATE public.component_compliance_records c SET out_of_scope_since = NULL, out_of_scope_reason = NULL
    FROM _csync_target t WHERE c.asset_id = _asset_id AND c.requirement_id = t.requirement_id AND c.out_of_scope_since IS NOT NULL
    RETURNING c.requirement_id, c.id)
  SELECT 'reactivate'::text, re.requirement_id, re.id FROM re;
  GET DIAGNOSTICS v_reactivated = ROW_COUNT;

  -- Uppdatera orörda poster så att de följer profilens tillämplighet
  RETURN QUERY WITH up AS (
    UPDATE public.component_compliance_records c SET
      status = CASE WHEN t.applicability = 'not_applicable' THEN 'Ej tillämpligt'::public.compliance_status ELSE 'Ej påbörjad'::public.compliance_status END,
      justification = t.na_text, inherited_justification = t.na_text,
      assessed_at = CASE WHEN t.applicability = 'not_applicable' THEN c.assessed_at END,
      assessed_by = CASE WHEN t.applicability = 'not_applicable' THEN c.assessed_by END,
      valid_until = CASE WHEN t.applicability = 'not_applicable' THEN c.valid_until END,
      profile_id = v_profile, profile_item_id = t.item_id
    FROM _csync_target t
    WHERE c.asset_id = _asset_id AND c.requirement_id = t.requirement_id AND public.component_record_is_untouched(c)
      AND (c.justification IS DISTINCT FROM t.na_text OR c.profile_item_id IS DISTINCT FROM t.item_id)
    RETURNING c.requirement_id, c.id)
  SELECT 'refresh'::text, up.requirement_id, up.id FROM up;
  GET DIAGNOSTICS v_refreshed = ROW_COUNT;

  -- Behåll koppling till profilrad även för bedömda poster
  UPDATE public.component_compliance_records c SET profile_id = v_profile, profile_item_id = t.item_id
    FROM _csync_target t WHERE c.asset_id = _asset_id AND c.requirement_id = t.requirement_id
      AND c.profile_item_id IS DISTINCT FROM t.item_id;

  -- Lägg till
  RETURN QUERY WITH ins AS (
    INSERT INTO public.component_compliance_records (asset_id, requirement_id, profile_id, profile_item_id, status, justification, inherited_justification)
    SELECT _asset_id, t.requirement_id, v_profile, t.item_id,
      CASE WHEN t.applicability = 'not_applicable' THEN 'Ej tillämpligt'::public.compliance_status ELSE 'Ej påbörjad'::public.compliance_status END,
      t.na_text, t.na_text
    FROM _csync_target t
    WHERE NOT EXISTS (SELECT 1 FROM public.component_compliance_records c WHERE c.asset_id = _asset_id AND c.requirement_id = t.requirement_id)
    ON CONFLICT (asset_id, requirement_id) DO NOTHING
    RETURNING component_compliance_records.requirement_id, component_compliance_records.id)
  SELECT 'add'::text, ins.requirement_id, ins.id FROM ins;
  GET DIAGNOSTICS v_added = ROW_COUNT;

  -- Ta bort orörda / markera bedömda som utanför omfattning
  RETURN QUERY WITH del AS (
    DELETE FROM public.component_compliance_records c
    WHERE c.asset_id = _asset_id AND NOT EXISTS (SELECT 1 FROM _csync_target t WHERE t.requirement_id = c.requirement_id)
      AND public.component_record_is_untouched(c)
    RETURNING c.requirement_id, c.id)
  SELECT 'remove'::text, del.requirement_id, del.id FROM del;
  GET DIAGNOSTICS v_removed = ROW_COUNT;

  RETURN QUERY WITH oos AS (
    UPDATE public.component_compliance_records c SET out_of_scope_since = now(), out_of_scope_reason = v_reason
    WHERE c.asset_id = _asset_id AND c.out_of_scope_since IS NULL
      AND NOT EXISTS (SELECT 1 FROM _csync_target t WHERE t.requirement_id = c.requirement_id)
    RETURNING c.requirement_id, c.id)
  SELECT 'deactivate'::text, oos.requirement_id, oos.id FROM oos;
  GET DIAGNOSTICS v_deactivated = ROW_COUNT;

  IF v_added + v_removed + v_deactivated + v_refreshed + v_reactivated > 0 THEN
    PERFORM public.log_component_sync(_asset_id, v_name,
      jsonb_build_object('profil', v_profile_name, 'tillagda', v_added, 'borttagna', v_removed,
        'utanför_omfattning', v_deactivated, 'uppdaterade', v_refreshed, 'återaktiverade', v_reactivated));
  END IF;
END $$;


--
-- Name: sync_components_of_types(uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_components_of_types(_type_ids uuid[]) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE v_asset uuid;
BEGIN
  FOR v_asset IN SELECT id FROM public.system_assets WHERE component_type_id = ANY(_type_ids) LOOP
    PERFORM public.sync_component_requirements(v_asset, 'full');
  END LOOP;
END $$;


--
-- Name: sync_requirements(text, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_requirements(_object_type text, _object_id uuid, _mode text DEFAULT 'preview'::text) RETURNS TABLE(action text, requirement_id uuid, record_id uuid, chapter_section text, description text, min_classification_level smallint, inherited_from_facility_id uuid)
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
#variable_conflict use_column
DECLARE
  v_level  smallint;
  v_reason text;
  v_label  text;
  v_names  jsonb;
BEGIN
  IF _object_type NOT IN ('facility', 'system') THEN RAISE EXCEPTION 'Okänd objekttyp: %', _object_type; END IF;
  IF _mode NOT IN ('preview', 'add', 'full') THEN RAISE EXCEPTION 'Okänt läge: %', _mode; END IF;
  -- Inloggade användare måste vara godkända. Backend (utan inloggning, t.ex.
  -- databastriggers i migrationer) får köra synken.
  IF auth.uid() IS NOT NULL AND NOT public.is_approved() THEN
    RAISE EXCEPTION 'Kontot är inte godkänt' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Lås objektet så att två synkar av samma objekt inte kan gå samtidigt
  IF _object_type = 'facility' THEN
    IF _mode = 'preview' THEN PERFORM 1 FROM public.facilities WHERE id = _object_id;
    ELSE PERFORM 1 FROM public.facilities WHERE id = _object_id FOR UPDATE; END IF;
    IF NOT FOUND THEN RAISE EXCEPTION 'Anläggningen finns inte'; END IF;
    SELECT coalesce(classification_level, 1) INTO v_level FROM public.facilities WHERE id = _object_id;
    v_label := 'anläggningens';
  ELSE
    IF _mode = 'preview' THEN PERFORM 1 FROM public.information_systems WHERE id = _object_id;
    ELSE PERFORM 1 FROM public.information_systems WHERE id = _object_id FOR UPDATE; END IF;
    IF NOT FOUND THEN RAISE EXCEPTION 'Systemet finns inte'; END IF;
    v_level := public.effective_system_class(_object_id);
    v_label := 'systemets';
    SELECT jsonb_object_agg(f.id::text, f.name) INTO v_names
    FROM public.facility_systems fs JOIN public.facilities f ON f.id = fs.facility_id
    WHERE fs.system_id = _object_id;
  END IF;

  v_reason := format('Kravet gäller inte längre (%s klass %s, synk %s). Bedömning och historik bevarade.',
                     v_label, v_level, to_char(now() AT TIME ZONE 'Europe/Stockholm', 'YYYY-MM-DD'));

  CREATE TEMP TABLE IF NOT EXISTS _sync_applicable (requirement_id uuid PRIMARY KEY, inherited_from_facility_id uuid) ON COMMIT DROP;
  CREATE TEMP TABLE IF NOT EXISTS _sync_existing (
    id uuid PRIMARY KEY, requirement_id uuid, status public.compliance_status, evidence text, evidence_url text,
    evidence_file_name text, justification text, verified_by_test_mapping_id uuid, notes text,
    out_of_scope_since timestamptz) ON COMMIT DROP;
  CREATE TEMP TABLE IF NOT EXISTS _sync_added (id uuid, requirement_id uuid) ON COMMIT DROP;
  CREATE TEMP TABLE IF NOT EXISTS _sync_deleted (id uuid) ON COMMIT DROP;
  CREATE TEMP TABLE IF NOT EXISTS _sync_reactivated (id uuid, requirement_id uuid) ON COMMIT DROP;
  TRUNCATE _sync_applicable, _sync_existing, _sync_added, _sync_deleted, _sync_reactivated;

  INSERT INTO _sync_applicable
    SELECT a.requirement_id, a.inherited_from_facility_id
    FROM public.get_applicable_requirements(_object_type, _object_id) a
  ON CONFLICT DO NOTHING;

  IF _object_type = 'facility' THEN
    INSERT INTO _sync_existing
      SELECT id, requirement_id, status, evidence, evidence_url, evidence_file_name,
             justification, verified_by_test_mapping_id, notes, out_of_scope_since
      FROM public.compliance_records WHERE facility_id = _object_id;
  ELSE
    INSERT INTO _sync_existing
      SELECT id, requirement_id, status, evidence, evidence_url, evidence_file_name,
             justification, verified_by_test_mapping_id, notes, out_of_scope_since
      FROM public.system_compliance_records WHERE system_id = _object_id;
  END IF;

  -- ---- Återaktiveras: utanför omfattning men tillämpligt igen ----
  IF _mode <> 'preview' THEN
    IF _object_type = 'facility' THEN
      WITH re AS (
        UPDATE public.compliance_records c
        SET out_of_scope_since = NULL, out_of_scope_reason = NULL
        FROM _sync_existing e
        WHERE c.id = e.id AND e.out_of_scope_since IS NOT NULL
          AND EXISTS (SELECT 1 FROM _sync_applicable ap WHERE ap.requirement_id = e.requirement_id)
        RETURNING c.id, c.requirement_id)
      INSERT INTO _sync_reactivated SELECT id, requirement_id FROM re;
    ELSE
      WITH re AS (
        UPDATE public.system_compliance_records c
        SET out_of_scope_since = NULL, out_of_scope_reason = NULL
        FROM _sync_existing e
        WHERE c.id = e.id AND e.out_of_scope_since IS NOT NULL
          AND EXISTS (SELECT 1 FROM _sync_applicable ap WHERE ap.requirement_id = e.requirement_id)
        RETURNING c.id, c.requirement_id)
      INSERT INTO _sync_reactivated SELECT id, requirement_id FROM re;
    END IF;
  ELSE
    INSERT INTO _sync_reactivated
      SELECT e.id, e.requirement_id FROM _sync_existing e
      WHERE e.out_of_scope_since IS NOT NULL
        AND EXISTS (SELECT 1 FROM _sync_applicable ap WHERE ap.requirement_id = e.requirement_id);
  END IF;

  RETURN QUERY
    SELECT 'reactivate'::text, x.requirement_id, x.id, r.chapter_section, r.description,
           r.min_classification_level, ap.inherited_from_facility_id
    FROM _sync_reactivated x
    JOIN public.requirements r ON r.id = x.requirement_id
    JOIN _sync_applicable ap ON ap.requirement_id = x.requirement_id
    ORDER BY r.chapter_section;

  -- ---- Tillkommer: en sats ----
  IF _mode <> 'preview' THEN
    IF _object_type = 'facility' THEN
      WITH ins AS (
        INSERT INTO public.compliance_records (facility_id, requirement_id, status)
        SELECT _object_id, ap.requirement_id, 'Ej påbörjad'
        FROM _sync_applicable ap
        WHERE NOT EXISTS (SELECT 1 FROM _sync_existing e WHERE e.requirement_id = ap.requirement_id)
        ON CONFLICT (facility_id, requirement_id) DO NOTHING
        RETURNING id, requirement_id)
      INSERT INTO _sync_added SELECT id, requirement_id FROM ins;
    ELSE
      WITH ins AS (
        INSERT INTO public.system_compliance_records (system_id, requirement_id, status, notes)
        SELECT _object_id, ap.requirement_id, 'Ej påbörjad',
               CASE WHEN ap.inherited_from_facility_id IS NOT NULL
                    THEN 'Ärvt från: ' || coalesce(v_names ->> ap.inherited_from_facility_id::text, 'kopplad anläggning') END
        FROM _sync_applicable ap
        WHERE NOT EXISTS (SELECT 1 FROM _sync_existing e WHERE e.requirement_id = ap.requirement_id)
        ON CONFLICT (system_id, requirement_id) DO NOTHING
        RETURNING id, requirement_id)
      INSERT INTO _sync_added SELECT id, requirement_id FROM ins;
    END IF;

    RETURN QUERY
      SELECT 'add'::text, ad.requirement_id, ad.id, r.chapter_section, r.description,
             r.min_classification_level, ap.inherited_from_facility_id
      FROM _sync_added ad
      JOIN public.requirements r ON r.id = ad.requirement_id
      JOIN _sync_applicable ap ON ap.requirement_id = ad.requirement_id
      ORDER BY r.chapter_section;
  ELSE
    RETURN QUERY
      SELECT 'add'::text, ap.requirement_id, NULL::uuid, r.chapter_section, r.description,
             r.min_classification_level, ap.inherited_from_facility_id
      FROM _sync_applicable ap
      JOIN public.requirements r ON r.id = ap.requirement_id
      WHERE NOT EXISTS (SELECT 1 FROM _sync_existing e WHERE e.requirement_id = ap.requirement_id)
      ORDER BY r.chapter_section;
  END IF;

  IF _mode = 'add' THEN
    RETURN;
  END IF;

  -- ---- Gäller inte längre ----
  -- Kvar i _sync_existing: poster som inte är tillämpliga och inte redan utanför
  DELETE FROM _sync_existing e
  WHERE EXISTS (SELECT 1 FROM _sync_applicable ap WHERE ap.requirement_id = e.requirement_id)
     OR e.out_of_scope_since IS NOT NULL;

  IF _mode = 'full' THEN
    IF _object_type = 'facility' THEN
      WITH del AS (
        DELETE FROM public.compliance_records c
        USING _sync_existing e
        WHERE c.id = e.id
          AND public.compliance_record_is_untouched(c.status, c.evidence, c.evidence_url,
                c.evidence_file_name, c.justification, c.verified_by_test_mapping_id, c.notes)
        RETURNING c.id)
      INSERT INTO _sync_deleted SELECT id FROM del;

      UPDATE public.compliance_records c
      SET out_of_scope_since = now(), out_of_scope_reason = v_reason
      FROM _sync_existing e
      WHERE c.id = e.id AND NOT EXISTS (SELECT 1 FROM _sync_deleted d WHERE d.id = e.id);
    ELSE
      WITH del AS (
        DELETE FROM public.system_compliance_records c
        USING _sync_existing e
        WHERE c.id = e.id
          AND public.compliance_record_is_untouched(c.status, c.evidence, c.evidence_url,
                c.evidence_file_name, c.justification, c.verified_by_test_mapping_id, c.notes)
        RETURNING c.id)
      INSERT INTO _sync_deleted SELECT id FROM del;

      UPDATE public.system_compliance_records c
      SET out_of_scope_since = now(), out_of_scope_reason = v_reason
      FROM _sync_existing e
      WHERE c.id = e.id AND NOT EXISTS (SELECT 1 FROM _sync_deleted d WHERE d.id = e.id);
    END IF;

    RETURN QUERY
      SELECT CASE WHEN EXISTS (SELECT 1 FROM _sync_deleted d WHERE d.id = e.id) THEN 'remove' ELSE 'deactivate' END,
             e.requirement_id, e.id, r.chapter_section, r.description, r.min_classification_level, NULL::uuid
      FROM _sync_existing e JOIN public.requirements r ON r.id = e.requirement_id
      ORDER BY r.chapter_section;
  ELSE
    RETURN QUERY
      SELECT CASE WHEN public.compliance_record_is_untouched(e.status, e.evidence, e.evidence_url,
                    e.evidence_file_name, e.justification, e.verified_by_test_mapping_id, e.notes)
                  THEN 'remove' ELSE 'deactivate' END,
             e.requirement_id, e.id, r.chapter_section, r.description, r.min_classification_level, NULL::uuid
      FROM _sync_existing e JOIN public.requirements r ON r.id = e.requirement_id
      ORDER BY r.chapter_section;
  END IF;
END;
$$;


--
-- Name: target_sl_for_class(smallint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.target_sl_for_class(_level smallint) RETURNS smallint
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT COALESCE((SELECT target_sl FROM public.class_sl_mapping WHERE classification_level = COALESCE(_level, 1)), 0)
$$;


--
-- Name: track_requirement_content_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.track_requirement_content_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.content_changed_at := coalesce(NEW.content_changed_at, now());
  ELSIF (NEW.description, NEW.chapter_section, NEW.trigger_logic, NEW.min_classification_level,
         NEW.sl_capability, NEW.target_type, NEW.requirement_level, NEW.is_general_advice)
        IS DISTINCT FROM
        (OLD.description, OLD.chapter_section, OLD.trigger_logic, OLD.min_classification_level,
         OLD.sl_capability, OLD.target_type, OLD.requirement_level, OLD.is_general_advice) THEN
    NEW.content_changed_at := now();
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: trg_asset_component_type_sync(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_asset_component_type_sync() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.component_type_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.component_type_id IS NOT DISTINCT FROM OLD.component_type_id THEN RETURN NEW; END IF;
  PERFORM public.sync_component_requirements(NEW.id, 'full');
  RETURN NEW;
END $$;


--
-- Name: trg_profile_default_sync(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_profile_default_sync() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE v_types uuid[] := '{}';
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.is_default THEN v_types := v_types || OLD.component_type_id; END IF;
  IF TG_OP IN ('UPDATE', 'INSERT') AND NEW.is_default THEN v_types := v_types || NEW.component_type_id; END IF;
  IF TG_OP = 'UPDATE' AND OLD.is_default = NEW.is_default AND OLD.component_type_id IS NOT DISTINCT FROM NEW.component_type_id THEN
    RETURN NEW;
  END IF;
  IF array_length(v_types, 1) > 0 THEN PERFORM public.sync_components_of_types(v_types); END IF;
  RETURN coalesce(NEW, OLD);
END $$;


--
-- Name: trg_profile_items_sync(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_profile_items_sync() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE v_types uuid[];
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT array_agg(DISTINCT p.component_type_id) INTO v_types FROM old_rows o JOIN public.requirement_profiles p ON p.id = o.profile_id WHERE p.is_default;
  ELSE
    SELECT array_agg(DISTINCT p.component_type_id) INTO v_types FROM new_rows n JOIN public.requirement_profiles p ON p.id = n.profile_id WHERE p.is_default;
  END IF;
  IF v_types IS NOT NULL THEN PERFORM public.sync_components_of_types(v_types); END IF;
  RETURN NULL;
END $$;


--
-- Name: trigger_has_linked_conditions(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_has_linked_conditions(_logic jsonb) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT coalesce(jsonb_typeof(_logic) = 'object'
    AND _logic ?| ARRAY['linked_to_facility_type', 'linked_to_critical_facility',
                        'linked_to_dangerous_goods_facility'], false)
$$;


--
-- Name: trigger_logic_keys(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_logic_keys(_target text) RETURNS text[]
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT CASE _target
    WHEN 'facility' THEN ARRAY[
      'type', 'length_gt', 'traffic_flow_gt', 'construction_type',
      'is_critical_entity', 'has_dangerous_goods', 'owner_type']
    WHEN 'system' THEN ARRAY[
      'is_critical_entity', 'is_central_system', 'is_externally_accessible',
      'owner_type', 'system_category', 'system_type',
      'linked_to_facility_type', 'linked_to_critical_facility',
      'linked_to_dangerous_goods_facility']
    ELSE ARRAY[]::text[]
  END
$$;


--
-- Name: trigger_logic_problems(jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_logic_problems(_logic jsonb, _target_type text) RETURNS text[]
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  problems text[] := ARRAY[]::text[];
  allowed  text[];
  k        text;
  v        jsonb;
  elem     text;
  facility_types text[] := ARRAY(SELECT unnest(enum_range(NULL::public.facility_type))::text);
  construction_types text[] := ARRAY(SELECT unnest(enum_range(NULL::public.construction_type))::text);
  system_categories text[] := ARRAY(SELECT unnest(enum_range(NULL::public.system_category))::text);
  vals text[];
BEGIN
  IF _logic IS NULL OR jsonb_typeof(_logic) = 'null' THEN
    RETURN problems;
  END IF;
  IF jsonb_typeof(_logic) <> 'object' THEN
    RETURN ARRAY['villkoren måste vara ett JSON-objekt'];
  END IF;

  -- target_type 'both' utvärderas av systemmotorn; NULL av båda
  allowed := CASE
    WHEN _target_type = 'facility' THEN public.trigger_logic_keys('facility')
    WHEN _target_type IN ('system', 'both') THEN public.trigger_logic_keys('system')
    ELSE public.trigger_logic_keys('facility') || public.trigger_logic_keys('system')
  END;

  FOR k, v IN SELECT * FROM jsonb_each(_logic) LOOP
    IF NOT (k = ANY (allowed)) THEN
      problems := problems || format('okänd villkorsnyckel "%s" för målgrupp %s', k, coalesce(_target_type, 'ospecificerad'));
      CONTINUE;
    END IF;

    -- Booleska villkor
    IF k IN ('is_critical_entity', 'has_dangerous_goods', 'is_central_system',
             'is_externally_accessible', 'linked_to_critical_facility',
             'linked_to_dangerous_goods_facility') THEN
      IF jsonb_typeof(v) <> 'boolean' THEN
        problems := problems || format('"%s" måste vara true eller false', k);
      END IF;

    -- Numeriska trösklar
    ELSIF k IN ('length_gt', 'traffic_flow_gt') THEN
      IF jsonb_typeof(v) <> 'number' THEN
        problems := problems || format('"%s" måste vara ett tal >= 0', k);
      ELSIF (v #>> '{}')::numeric < 0 THEN
        problems := problems || format('"%s" måste vara ett tal >= 0', k);
      END IF;

    -- Text
    ELSIF k = 'owner_type' THEN
      IF jsonb_typeof(v) <> 'string' OR btrim(v #>> '{}') = '' THEN
        problems := problems || format('"%s" får inte vara tom', k);
      END IF;

    -- Text eller lista med text
    ELSE
      IF jsonb_typeof(v) = 'string' THEN
        vals := ARRAY[v #>> '{}'];
      ELSIF jsonb_typeof(v) = 'array' THEN
        IF EXISTS (SELECT 1 FROM jsonb_array_elements(v) e WHERE jsonb_typeof(e) <> 'string') THEN
          problems := problems || format('"%s" får bara innehålla text', k);
          CONTINUE;
        END IF;
        vals := ARRAY(SELECT jsonb_array_elements_text(v));
      ELSE
        problems := problems || format('"%s" måste vara text eller en lista med text', k);
        CONTINUE;
      END IF;

      IF coalesce(array_length(vals, 1), 0) = 0
         OR EXISTS (SELECT 1 FROM unnest(vals) x WHERE btrim(x) = '') THEN
        problems := problems || format('"%s" får inte vara tom', k);
        CONTINUE;
      END IF;

      FOREACH elem IN ARRAY vals LOOP
        IF k IN ('type', 'linked_to_facility_type') AND NOT (elem = ANY (facility_types)) THEN
          problems := problems || format('"%s": okänd anläggningstyp "%s"', k, elem);
        ELSIF k = 'construction_type' AND NOT (elem = ANY (construction_types)) THEN
          problems := problems || format('"%s": okänd konstruktionstyp "%s"', k, elem);
        ELSIF k = 'system_category' AND NOT (elem = ANY (system_categories)) THEN
          problems := problems || format('"%s": okänd systemkategori "%s"', k, elem);
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  RETURN problems;
END;
$$;


--
-- Name: trigger_matches_facility(jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_matches_facility(_logic jsonb, f jsonb) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    SET search_path TO 'public'
    AS $$
  SELECT CASE
    WHEN _logic IS NULL OR jsonb_typeof(_logic) = 'null' THEN true
    WHEN jsonb_typeof(_logic) <> 'object' THEN false
    -- okänd nyckel => ingen träff
    WHEN EXISTS (SELECT 1 FROM jsonb_object_keys(_logic) k
                 WHERE NOT (k = ANY (public.trigger_logic_keys('facility')))) THEN false
    ELSE coalesce(
          (NOT (_logic ? 'type') OR public.jsonb_has_text(_logic -> 'type', f ->> 'type'))
      AND (NOT (_logic ? 'length_gt')
           OR coalesce((f ->> 'length_meters')::numeric, 0) > public.jsonb_num(_logic -> 'length_gt'))
      AND (NOT (_logic ? 'traffic_flow_gt')
           OR coalesce((f ->> 'traffic_flow_adt')::numeric, 0) > public.jsonb_num(_logic -> 'traffic_flow_gt'))
      AND (NOT (_logic ? 'construction_type')
           OR public.jsonb_has_text(_logic -> 'construction_type', f ->> 'construction_type'))
      AND (NOT (_logic ? 'is_critical_entity')
           OR coalesce((f ->> 'is_critical_entity')::boolean, false) = public.jsonb_bool(_logic -> 'is_critical_entity'))
      AND (NOT (_logic ? 'has_dangerous_goods')
           OR coalesce((f ->> 'has_dangerous_goods')::boolean, false) = public.jsonb_bool(_logic -> 'has_dangerous_goods'))
      AND (NOT (_logic ? 'owner_type')
           OR (jsonb_typeof(_logic -> 'owner_type') = 'string'
               AND btrim(_logic ->> 'owner_type') <> ''
               AND f ->> 'owner_type' = _logic ->> 'owner_type'))
    , false)
  END
$$;


--
-- Name: trigger_matches_linked_facility(jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_matches_linked_facility(_logic jsonb, f jsonb) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    SET search_path TO 'public'
    AS $$
  SELECT coalesce(
        (NOT (_logic ? 'linked_to_facility_type')
         OR public.jsonb_has_text(_logic -> 'linked_to_facility_type', f ->> 'type'))
    AND (NOT (_logic ? 'linked_to_critical_facility')
         OR coalesce((f ->> 'is_critical_entity')::boolean, false) = public.jsonb_bool(_logic -> 'linked_to_critical_facility'))
    AND (NOT (_logic ? 'linked_to_dangerous_goods_facility')
         OR coalesce((f ->> 'has_dangerous_goods')::boolean, false) = public.jsonb_bool(_logic -> 'linked_to_dangerous_goods_facility'))
  , false)
$$;


--
-- Name: trigger_matches_system(jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_matches_system(_logic jsonb, s jsonb) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    SET search_path TO 'public'
    AS $$
  SELECT CASE
    WHEN _logic IS NULL OR jsonb_typeof(_logic) = 'null' THEN true
    WHEN jsonb_typeof(_logic) <> 'object' THEN false
    WHEN EXISTS (SELECT 1 FROM jsonb_object_keys(_logic) k
                 WHERE NOT (k = ANY (public.trigger_logic_keys('system')))) THEN false
    ELSE coalesce(
          (NOT (_logic ? 'is_critical_entity')
           OR coalesce((s ->> 'is_critical_entity')::boolean, false) = public.jsonb_bool(_logic -> 'is_critical_entity'))
      AND (NOT (_logic ? 'is_central_system')
           OR coalesce((s ->> 'is_central_system')::boolean, false) = public.jsonb_bool(_logic -> 'is_central_system'))
      AND (NOT (_logic ? 'is_externally_accessible')
           OR coalesce((s ->> 'is_externally_accessible')::boolean, false) = public.jsonb_bool(_logic -> 'is_externally_accessible'))
      AND (NOT (_logic ? 'owner_type')
           OR (jsonb_typeof(_logic -> 'owner_type') = 'string'
               AND btrim(_logic ->> 'owner_type') <> ''
               AND s ->> 'owner_type' = _logic ->> 'owner_type'))
      AND (NOT (_logic ? 'system_category')
           OR public.jsonb_has_text(_logic -> 'system_category', s ->> 'system_category'))
      AND (NOT (_logic ? 'system_type')
           OR public.jsonb_has_text(_logic -> 'system_type', s ->> 'system_type'))
    , false)
  END
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: validate_compliance_assessment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_compliance_assessment() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.status = 'Ej tillämpligt' AND coalesce(length(btrim(NEW.justification)), 0) < 15 THEN
    RAISE EXCEPTION 'Motivering på minst 15 tecken krävs för status Ej tillämpligt';
  END IF;

  IF NEW.status IN ('Uppfyllt', 'Delvis uppfyllt')
     AND coalesce(btrim(NEW.evidence), '') = ''
     AND coalesce(btrim(NEW.evidence_url), '') = ''
     AND coalesce(btrim(NEW.evidence_file_name), '') = ''
     AND NEW.verified_by_test_mapping_id IS NULL THEN
    RAISE EXCEPTION 'Minst ett verifikat krävs för status % (länk, dokument eller godkänd testmappning)', NEW.status;
  END IF;

  IF NEW.status <> 'Ej påbörjad' AND (TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status) THEN
    NEW.assessed_at := coalesce(NEW.assessed_at, now());
    NEW.assessed_by := coalesce(NEW.assessed_by, public._current_email());
    NEW.valid_until := coalesce(NEW.valid_until, (current_date + interval '12 months')::date);
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: validate_default_profile(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_default_profile() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.is_default AND NEW.component_type_id IS NULL THEN
    RAISE EXCEPTION 'En standardprofil måste ha en komponenttyp';
  END IF;
  RETURN NEW;
END $$;


--
-- Name: validate_project_requirement(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_project_requirement() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.applicability = 'not_applicable'
     AND coalesce(length(btrim(NEW.justification)), 0) < 15 THEN
    RAISE EXCEPTION 'Motivering på minst 15 tecken krävs för Ej tillämpligt';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: validate_requirement_applicability(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_requirement_applicability() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.applicability = 'not_applicable'
     AND coalesce(length(btrim(NEW.justification)), 0) < 15 THEN
    RAISE EXCEPTION 'Motivering på minst 15 tecken krävs för Ej tillämpligt' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: validate_requirement_link(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_requirement_link() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  p_level public.source_level; p_name text; p_section text; p_repealed timestamptz;
  c_level public.source_level; c_name text; c_section text; c_repealed timestamptz;
BEGIN
  SELECT s.source_level, s.document_name, r.chapter_section, r.repealed_at
    INTO p_level, p_name, p_section, p_repealed
  FROM public.requirements r LEFT JOIN public.requirement_sources s ON s.id = r.source_id
  WHERE r.id = NEW.parent_requirement_id;
  SELECT s.source_level, s.document_name, r.chapter_section, r.repealed_at
    INTO c_level, c_name, c_section, c_repealed
  FROM public.requirements r LEFT JOIN public.requirement_sources s ON s.id = r.source_id
  WHERE r.id = NEW.child_requirement_id;

  IF p_level IS NULL OR c_level IS NULL THEN
    RAISE EXCEPTION 'Regelverket % saknar nivå – ange lag, förordning, föreskrift eller standard innan krav länkas',
      CASE WHEN p_level IS NULL THEN coalesce(p_name, '(okänt)') ELSE coalesce(c_name, '(okänt)') END
      USING ERRCODE = 'check_violation';
  END IF;
  IF public.source_level_rank(p_level) >= public.source_level_rank(c_level) THEN
    RAISE EXCEPTION 'En länk måste peka nedåt i kedjan: % (%) kan inte preciseras av % (%)',
      p_section, p_level, c_section, c_level
      USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'INSERT' AND (p_repealed IS NOT NULL OR c_repealed IS NOT NULL) THEN
    RAISE EXCEPTION 'Upphävda krav kan inte länkas'
      USING ERRCODE = 'check_violation';
  END IF;

  NEW.link_type := CASE WHEN c_level = 'standard' THEN 'omsätts_av' ELSE 'preciseras_av' END;
  RETURN NEW;
END;
$$;


--
-- Name: validate_requirement_trigger_logic(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_requirement_trigger_logic() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  problems text[];
BEGIN
  IF NEW.trigger_logic IS NOT NULL
     AND (jsonb_typeof(NEW.trigger_logic) = 'null' OR NEW.trigger_logic = '{}'::jsonb) THEN
    NEW.trigger_logic := NULL;
  END IF;

  problems := public.trigger_logic_problems(NEW.trigger_logic, NEW.target_type);
  IF coalesce(array_length(problems, 1), 0) > 0 THEN
    RAISE EXCEPTION 'Ogiltiga villkor för krav %: %',
      coalesce(NEW.chapter_section, NEW.id::text), array_to_string(problems, '; ')
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: validate_source_level_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_source_level_change() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE v_bad integer;
BEGIN
  IF NEW.source_level IS NOT DISTINCT FROM OLD.source_level THEN
    RETURN NEW;
  END IF;
  SELECT count(*) INTO v_bad
  FROM public.requirement_links l
  JOIN public.requirements rp ON rp.id = l.parent_requirement_id
  JOIN public.requirement_sources sp ON sp.id = rp.source_id
  JOIN public.requirements rc ON rc.id = l.child_requirement_id
  JOIN public.requirement_sources sc ON sc.id = rc.source_id
  WHERE l.status <> 'rejected'
    AND (sp.id = NEW.id OR sc.id = NEW.id)
    AND (CASE WHEN sp.id = NEW.id THEN NEW.source_level ELSE sp.source_level END IS NULL
         OR CASE WHEN sc.id = NEW.id THEN NEW.source_level ELSE sc.source_level END IS NULL
         OR public.source_level_rank(CASE WHEN sp.id = NEW.id THEN NEW.source_level ELSE sp.source_level END)
            >= public.source_level_rank(CASE WHEN sc.id = NEW.id THEN NEW.source_level ELSE sc.source_level END));
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'Nivån kan inte ändras: % kravlänk(ar) skulle då peka åt fel håll. Avvisa eller ta bort dem först.', v_bad
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: validate_system_class_override(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_system_class_override() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_inherited smallint;
BEGIN
  IF NEW.classification_source = 'overridden' THEN
    IF NEW.facility_class_override IS NULL THEN
      RAISE EXCEPTION 'En avvikande klassificering kräver en klass';
    END IF;
    IF length(btrim(coalesce(NEW.override_reason, ''))) < 15 THEN
      RAISE EXCEPTION 'En avvikande klassificering kräver en motivering på minst 15 tecken';
    END IF;
    v_inherited := public.inherited_system_class(NEW.id);
    IF v_inherited IS NOT NULL AND NEW.facility_class_override > v_inherited THEN
      RAISE EXCEPTION 'Avvikande klass (%) får inte vara högre än den ärvda klassen (%)',
        NEW.facility_class_override, v_inherited;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: verify_activity_chain(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_activity_chain() RETURNS TABLE(intact boolean, checked bigint, first_broken_seq bigint, problem text, head_seq bigint, head_hash text)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  r       record;
  v_prev  text := 'genesis';
  v_next  bigint := 1;
  v_n     bigint := 0;
  v_hash  text;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_approved() THEN
    RAISE EXCEPTION 'Kontot är inte godkänt' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT h.seq, h.hash INTO head_seq, head_hash FROM public.audit_chain_head h;

  FOR r IN SELECT * FROM public.activity_log ORDER BY seq LOOP
    v_n := v_n + 1;
    IF r.seq <> v_next THEN
      intact := false; checked := v_n; first_broken_seq := v_next;
      problem := format('rad %s saknas (nästa rad har nummer %s)', v_next, r.seq);
      RETURN NEXT; RETURN;
    END IF;
    IF r.prev_hash IS DISTINCT FROM v_prev THEN
      intact := false; checked := v_n; first_broken_seq := r.seq;
      problem := format('rad %s pekar inte på föregående rad', r.seq);
      RETURN NEXT; RETURN;
    END IF;
    v_hash := public.activity_row_hash(r.seq, r.created_at, r.user_id, r.user_email, r.action,
      r.entity_type, r.entity_id, r.entity_label, r.metadata, r.source, r.prev_hash);
    IF v_hash <> r.row_hash THEN
      intact := false; checked := v_n; first_broken_seq := r.seq;
      problem := format('innehållet i rad %s har ändrats', r.seq);
      RETURN NEXT; RETURN;
    END IF;
    v_prev := r.row_hash;
    v_next := v_next + 1;
  END LOOP;

  IF v_prev IS DISTINCT FROM head_hash OR (v_next - 1) IS DISTINCT FROM head_seq THEN
    intact := false; checked := v_n; first_broken_seq := v_next;
    problem := 'kedjans slut stämmer inte med sparat huvud (rader i slutet saknas)';
    RETURN NEXT; RETURN;
  END IF;

  intact := true; checked := v_n; first_broken_seq := NULL; problem := NULL;
  RETURN NEXT;
END;
$$;


--
-- Name: withdraw_requirement_link(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.withdraw_requirement_link(_link_id uuid, _reason text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  PERFORM public.require_admin();
  IF nullif(btrim(coalesce(_reason, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Ange varför länken dras tillbaka';
  END IF;
  UPDATE public.requirement_links
  SET status = 'rejected', decided_by = public._current_email(), decided_at = now(),
      rationale = concat_ws(E'\n', rationale, 'Tillbakadragen: ' || btrim(_reason))
  WHERE id = _link_id AND status = 'approved';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ingen godkänd länk med det id:t';
  END IF;
END;
$$;


--
-- Name: users; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text,
    email_confirmed_at timestamp with time zone,
    raw_user_meta_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    external_subject text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_sign_in_at timestamp with time zone
);


--
-- Name: activity_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid,
    user_email text,
    action text NOT NULL,
    entity_type text,
    entity_id uuid,
    entity_label text,
    metadata jsonb DEFAULT '{}'::jsonb,
    seq bigint NOT NULL,
    source text,
    prev_hash text,
    row_hash text NOT NULL
);


--
-- Name: asset_compliance_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asset_compliance_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_id uuid NOT NULL,
    control_id uuid NOT NULL,
    status public.compliance_status DEFAULT 'Ej påbörjad'::public.compliance_status NOT NULL,
    evidence text,
    verified_at timestamp with time zone,
    verified_by text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    justification text,
    assessed_by text,
    assessed_at timestamp with time zone,
    valid_until date,
    evidence_url text,
    evidence_file_name text,
    verified_by_test_mapping_id uuid
);


--
-- Name: asset_controls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asset_controls (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    control_category public.control_category NOT NULL,
    asset_type_filter text[] DEFAULT '{}'::text[],
    asset_model_filter text[] DEFAULT '{}'::text[],
    source_requirement_id uuid,
    is_automated_check boolean DEFAULT false,
    check_logic jsonb,
    trigger_logic jsonb,
    priority integer DEFAULT 100,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: audit_chain_head; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_chain_head (
    id boolean DEFAULT true NOT NULL,
    seq bigint NOT NULL,
    hash text NOT NULL,
    CONSTRAINT audit_chain_head_id_check CHECK (id)
);


--
-- Name: class_sl_mapping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.class_sl_mapping (
    classification_level smallint NOT NULL,
    target_sl smallint NOT NULL,
    label text NOT NULL,
    description text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT class_sl_mapping_classification_level_check CHECK (((classification_level >= 1) AND (classification_level <= 5))),
    CONSTRAINT class_sl_mapping_target_sl_check CHECK (((target_sl >= 0) AND (target_sl <= 4)))
);


--
-- Name: compensating_measures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compensating_measures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_item_id uuid,
    project_requirement_id uuid,
    description text NOT NULL,
    measure_type public.compensating_measure_type NOT NULL,
    system_id uuid,
    asset_id uuid,
    facility_id uuid,
    proposed_by public.responsible_org DEFAULT 'client'::public.responsible_org NOT NULL,
    status public.compensating_measure_status DEFAULT 'proposed'::public.compensating_measure_status NOT NULL,
    decided_by text,
    decided_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT compensating_measures_description_present CHECK ((btrim(description) <> ''::text)),
    CONSTRAINT compensating_measures_one_carrier CHECK ((num_nonnulls(system_id, asset_id, facility_id) <= 1)),
    CONSTRAINT compensating_measures_one_parent CHECK ((num_nonnulls(profile_item_id, project_requirement_id) = 1)),
    CONSTRAINT compensating_measures_technical_carrier CHECK (((measure_type <> 'technical'::public.compensating_measure_type) OR (num_nonnulls(system_id, asset_id, facility_id) = 1)))
);


--
-- Name: compliance_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compliance_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    facility_id uuid,
    requirement_id uuid,
    status public.compliance_status DEFAULT 'Ej påbörjad'::public.compliance_status NOT NULL,
    evidence text,
    assigned_role text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    justification text,
    assessed_by text,
    assessed_at timestamp with time zone,
    valid_until date,
    evidence_url text,
    evidence_file_name text,
    verified_by_test_mapping_id uuid,
    out_of_scope_since timestamp with time zone,
    out_of_scope_reason text
);


--
-- Name: requirements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requirements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_id uuid,
    chapter_section text NOT NULL,
    description text NOT NULL,
    trigger_logic jsonb,
    is_general_advice boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    domain_id uuid,
    requirement_level public.requirement_level DEFAULT 'mandatory'::public.requirement_level,
    target_type text DEFAULT 'facility'::text,
    source_page integer,
    min_classification_level smallint DEFAULT 1 NOT NULL,
    source_excerpt text,
    sl_capability smallint,
    is_local boolean DEFAULT false NOT NULL,
    repealed_at timestamp with time zone,
    content_changed_at timestamp with time zone DEFAULT now() NOT NULL,
    ml_capability smallint,
    CONSTRAINT requirements_min_classification_level_check CHECK (((min_classification_level >= 1) AND (min_classification_level <= 5))),
    CONSTRAINT requirements_ml_capability_check CHECK (((ml_capability IS NULL) OR ((ml_capability >= 1) AND (ml_capability <= 4)))),
    CONSTRAINT requirements_sl_capability_check CHECK (((sl_capability IS NULL) OR ((sl_capability >= 1) AND (sl_capability <= 4)))),
    CONSTRAINT requirements_target_type_check CHECK (((target_type IS NULL) OR (target_type = ANY (ARRAY['facility'::text, 'system'::text, 'both'::text, 'component'::text, 'supplier'::text, 'asset_owner'::text]))))
);


--
-- Name: COLUMN requirements.sl_capability; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requirements.sl_capability IS 'Lowest IEC 62443-3-3 Security Level at which this SR/RE is required (Annex B, Table B.1). NULL for non-IEC requirements.';


--
-- Name: system_compliance_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_compliance_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    system_id uuid NOT NULL,
    requirement_id uuid NOT NULL,
    status public.compliance_status DEFAULT 'Ej påbörjad'::public.compliance_status NOT NULL,
    evidence text,
    assigned_role text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    justification text,
    assessed_by text,
    assessed_at timestamp with time zone,
    valid_until date,
    evidence_url text,
    evidence_file_name text,
    verified_by_test_mapping_id uuid,
    out_of_scope_since timestamp with time zone,
    out_of_scope_reason text
);


--
-- Name: compliance_record_scope; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.compliance_record_scope WITH (security_invoker='true') AS
 WITH base AS (
         SELECT 'facility'::text AS object_type,
            c.facility_id AS object_id,
            c.id AS record_id,
            c.requirement_id,
            r.domain_id,
            c.status,
            c.valid_until,
            c.out_of_scope_since
           FROM (public.compliance_records c
             LEFT JOIN public.requirements r ON ((r.id = c.requirement_id)))
        UNION ALL
         SELECT 'system'::text AS text,
            c.system_id,
            c.id,
            c.requirement_id,
            r.domain_id,
            c.status,
            c.valid_until,
            c.out_of_scope_since
           FROM (public.system_compliance_records c
             LEFT JOIN public.requirements r ON ((r.id = c.requirement_id)))
        )
 SELECT object_type,
    object_id,
    record_id,
    requirement_id,
    domain_id,
    status,
    valid_until,
    out_of_scope_since,
    (out_of_scope_since IS NULL) AS in_scope,
    (status <> ALL (ARRAY['Ej påbörjad'::public.compliance_status, 'Pågående'::public.compliance_status])) AS is_assessed,
    (status = 'Ej tillämpligt'::public.compliance_status) AS is_not_applicable,
    ((status <> ALL (ARRAY['Ej påbörjad'::public.compliance_status, 'Pågående'::public.compliance_status])) AND (valid_until IS NOT NULL) AND (valid_until < public.stockholm_today())) AS is_expired,
    ((status = 'Uppfyllt'::public.compliance_status) AND (NOT ((valid_until IS NOT NULL) AND (valid_until < public.stockholm_today())))) AS is_fulfilled
   FROM base b;


--
-- Name: compliance_domain_metrics; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.compliance_domain_metrics WITH (security_invoker='true') AS
 SELECT object_type,
    object_id,
    domain_id,
    count(*) FILTER (WHERE in_scope) AS total,
    count(*) FILTER (WHERE (in_scope AND is_assessed)) AS assessed,
    count(*) FILTER (WHERE (in_scope AND is_not_applicable)) AS not_applicable,
    count(*) FILTER (WHERE (in_scope AND is_fulfilled)) AS fulfilled,
    count(*) FILTER (WHERE (in_scope AND is_expired)) AS expired,
    public.metric_coverage(count(*) FILTER (WHERE (in_scope AND is_assessed)), count(*) FILTER (WHERE in_scope)) AS coverage,
    public.metric_compliance(count(*) FILTER (WHERE (in_scope AND is_fulfilled)), count(*) FILTER (WHERE (in_scope AND is_assessed)), count(*) FILTER (WHERE (in_scope AND is_not_applicable))) AS compliance
   FROM public.compliance_record_scope
  GROUP BY object_type, object_id, domain_id;


--
-- Name: compliance_object_metrics; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.compliance_object_metrics WITH (security_invoker='true') AS
 SELECT object_type,
    object_id,
    count(*) FILTER (WHERE in_scope) AS total,
    count(*) FILTER (WHERE (in_scope AND is_assessed)) AS assessed,
    count(*) FILTER (WHERE (in_scope AND is_not_applicable)) AS not_applicable,
    count(*) FILTER (WHERE (in_scope AND is_fulfilled)) AS fulfilled,
    count(*) FILTER (WHERE (in_scope AND is_expired)) AS expired,
    count(*) FILTER (WHERE (in_scope AND (status = 'Ej påbörjad'::public.compliance_status))) AS not_started,
    count(*) FILTER (WHERE (in_scope AND (status = 'Pågående'::public.compliance_status))) AS in_progress,
    count(*) FILTER (WHERE (in_scope AND (status = 'Delvis uppfyllt'::public.compliance_status))) AS partially_fulfilled,
    count(*) FILTER (WHERE (in_scope AND (status = 'Ej uppfyllt'::public.compliance_status))) AS not_fulfilled,
    count(*) FILTER (WHERE (NOT in_scope)) AS out_of_scope,
    public.metric_coverage(count(*) FILTER (WHERE (in_scope AND is_assessed)), count(*) FILTER (WHERE in_scope)) AS coverage,
    public.metric_compliance(count(*) FILTER (WHERE (in_scope AND is_fulfilled)), count(*) FILTER (WHERE (in_scope AND is_assessed)), count(*) FILTER (WHERE (in_scope AND is_not_applicable))) AS compliance,
    count(*) FILTER (WHERE (in_scope AND ((NOT is_assessed) OR (status = ANY (ARRAY['Delvis uppfyllt'::public.compliance_status, 'Ej uppfyllt'::public.compliance_status])) OR is_expired))) AS needs_action
   FROM public.compliance_record_scope
  GROUP BY object_type, object_id;


--
-- Name: system_assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    system_id uuid NOT NULL,
    name text NOT NULL,
    asset_type text NOT NULL,
    manufacturer text,
    model text,
    version text,
    location text,
    is_vendor_managed boolean DEFAULT false,
    last_patched_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    firmware_version text,
    eol_date date,
    eos_date date,
    network_zone text,
    criticality public.asset_criticality DEFAULT 'supporting'::public.asset_criticality,
    component_type_id uuid
);


--
-- Name: component_requirement_metrics; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.component_requirement_metrics WITH (security_invoker='true') AS
 WITH s AS (
         SELECT a.system_id,
            c.asset_id,
            c.status,
            (c.out_of_scope_since IS NULL) AS in_scope,
            (c.status <> ALL (ARRAY['Ej påbörjad'::public.compliance_status, 'Pågående'::public.compliance_status])) AS is_assessed,
            (c.status = 'Ej tillämpligt'::public.compliance_status) AS is_not_applicable,
            ((c.status <> ALL (ARRAY['Ej påbörjad'::public.compliance_status, 'Pågående'::public.compliance_status])) AND (c.valid_until IS NOT NULL) AND (c.valid_until < public.stockholm_today())) AS is_expired,
            ((c.status = 'Uppfyllt'::public.compliance_status) AND (NOT ((c.valid_until IS NOT NULL) AND (c.valid_until < public.stockholm_today())))) AS is_fulfilled
           FROM (public.component_compliance_records c
             JOIN public.system_assets a ON ((a.id = c.asset_id)))
        )
 SELECT system_id,
    count(DISTINCT asset_id) AS component_count,
    count(*) FILTER (WHERE in_scope) AS total,
    count(*) FILTER (WHERE (in_scope AND is_assessed)) AS assessed,
    count(*) FILTER (WHERE (in_scope AND is_not_applicable)) AS not_applicable,
    count(*) FILTER (WHERE (in_scope AND is_fulfilled)) AS fulfilled,
    count(*) FILTER (WHERE (in_scope AND is_expired)) AS expired,
    count(*) FILTER (WHERE (NOT in_scope)) AS out_of_scope,
    public.metric_coverage(count(*) FILTER (WHERE (in_scope AND is_assessed)), count(*) FILTER (WHERE in_scope)) AS coverage,
    public.metric_compliance(count(*) FILTER (WHERE (in_scope AND is_fulfilled)), count(*) FILTER (WHERE (in_scope AND is_assessed)), count(*) FILTER (WHERE (in_scope AND is_not_applicable))) AS compliance
   FROM s
  GROUP BY system_id;


--
-- Name: component_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.component_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    system_id uuid,
    name text NOT NULL,
    description text,
    manufacturer text,
    model text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: domain_checklists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.domain_checklists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    domain_id uuid,
    title text NOT NULL,
    description text,
    action_items jsonb,
    priority integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: export_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.export_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    export_id text NOT NULL,
    file_name text NOT NULL,
    filters jsonb DEFAULT '{}'::jsonb,
    row_counts jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    requirements_snapshot jsonb,
    user_id uuid,
    user_email text,
    scope_key jsonb
);


--
-- Name: facilities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facilities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    type public.facility_type NOT NULL,
    length_meters integer,
    traffic_flow_adt integer,
    is_critical_entity boolean DEFAULT false,
    has_dangerous_goods boolean DEFAULT false,
    construction_type public.construction_type,
    owner_type text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    classification_level smallint,
    CONSTRAINT facilities_classification_level_check CHECK (((classification_level IS NULL) OR ((classification_level >= 1) AND (classification_level <= 5))))
);


--
-- Name: facility_systems; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facility_systems (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    facility_id uuid NOT NULL,
    system_id uuid NOT NULL,
    relation_type public.system_relation_type DEFAULT 'betjänar'::public.system_relation_type NOT NULL,
    criticality public.system_criticality DEFAULT 'important'::public.system_criticality NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    is_primary boolean DEFAULT false NOT NULL
);


--
-- Name: facility_rollup_metrics; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.facility_rollup_metrics WITH (security_invoker='true') AS
 WITH r AS (
         SELECT s.object_id AS facility_id,
            s.object_id AS source_object_id,
            false AS from_system,
            s.in_scope,
            s.is_assessed,
            s.is_not_applicable,
            s.is_expired,
            s.is_fulfilled,
            s.status
           FROM public.compliance_record_scope s
          WHERE (s.object_type = 'facility'::text)
        UNION ALL
         SELECT fs.facility_id,
            s.object_id,
            true,
            s.in_scope,
            s.is_assessed,
            s.is_not_applicable,
            s.is_expired,
            s.is_fulfilled,
            s.status
           FROM (public.facility_systems fs
             JOIN public.compliance_record_scope s ON (((s.object_type = 'system'::text) AND (s.object_id = fs.system_id))))
        )
 SELECT facility_id,
    count(*) FILTER (WHERE in_scope) AS total,
    count(*) FILTER (WHERE (in_scope AND is_assessed)) AS assessed,
    count(*) FILTER (WHERE (in_scope AND is_not_applicable)) AS not_applicable,
    count(*) FILTER (WHERE (in_scope AND is_fulfilled)) AS fulfilled,
    count(*) FILTER (WHERE (in_scope AND is_expired)) AS expired,
    count(*) FILTER (WHERE (NOT in_scope)) AS out_of_scope,
    public.metric_coverage(count(*) FILTER (WHERE (in_scope AND is_assessed)), count(*) FILTER (WHERE in_scope)) AS coverage,
    public.metric_compliance(count(*) FILTER (WHERE (in_scope AND is_fulfilled)), count(*) FILTER (WHERE (in_scope AND is_assessed)), count(*) FILTER (WHERE (in_scope AND is_not_applicable))) AS compliance,
    count(*) FILTER (WHERE (in_scope AND ((NOT is_assessed) OR (status = ANY (ARRAY['Delvis uppfyllt'::public.compliance_status, 'Ej uppfyllt'::public.compliance_status])) OR is_expired))) AS needs_action,
    count(*) FILTER (WHERE (in_scope AND (NOT from_system))) AS own_total,
    count(*) FILTER (WHERE (in_scope AND from_system)) AS systems_total,
    count(DISTINCT source_object_id) FILTER (WHERE from_system) AS linked_systems
   FROM r
  GROUP BY facility_id;


--
-- Name: information_systems; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.information_systems (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    system_type text NOT NULL,
    system_owner text,
    is_critical_entity boolean DEFAULT false,
    is_externally_accessible boolean DEFAULT false,
    is_central_system boolean DEFAULT false,
    owner_type text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    system_category public.system_category,
    classification_source public.classification_source DEFAULT 'own'::public.classification_source NOT NULL,
    facility_class_override smallint,
    override_reason text,
    own_classification_level smallint,
    CONSTRAINT information_systems_override_range CHECK (((facility_class_override IS NULL) OR ((facility_class_override >= 1) AND (facility_class_override <= 5)))),
    CONSTRAINT information_systems_override_requires_reason CHECK (((classification_source <> 'overridden'::public.classification_source) OR ((facility_class_override IS NOT NULL) AND (COALESCE(btrim(override_reason), ''::text) <> ''::text)))),
    CONSTRAINT information_systems_own_class_range CHECK (((own_classification_level >= 1) AND (own_classification_level <= 5)))
);


--
-- Name: installation_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.installation_settings (
    id smallint DEFAULT 1 NOT NULL,
    role text DEFAULT 'combined'::text NOT NULL,
    trusted_key_id text,
    trusted_public_key text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    ai_compliance_analysis boolean DEFAULT false NOT NULL,
    CONSTRAINT installation_settings_check CHECK (((trusted_key_id IS NULL) = (trusted_public_key IS NULL))),
    CONSTRAINT installation_settings_id_check CHECK ((id = 1)),
    CONSTRAINT installation_settings_role_check CHECK ((role = ANY (ARRAY['combined'::text, 'catalog'::text, 'operations'::text])))
);


--
-- Name: procurement_projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.procurement_projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    facility_id uuid,
    system_id uuid,
    component_type_id uuid,
    unit_count integer,
    target_sl smallint,
    owner_name text,
    supplier_name text,
    status public.project_status DEFAULT 'planning'::public.project_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text,
    approved boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: project_requirements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_requirements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    requirement_id uuid NOT NULL,
    applicability public.requirement_applicability DEFAULT 'preliminary'::public.requirement_applicability NOT NULL,
    justification text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: requirement_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requirement_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    requirement_id uuid NOT NULL,
    action text NOT NULL,
    changed_by text NOT NULL,
    old_value jsonb,
    new_value jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    actor_user_id uuid
);


--
-- Name: requirement_catalog_releases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requirement_catalog_releases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    direction text NOT NULL,
    version integer NOT NULL,
    sha256 text NOT NULL,
    notes text,
    counts jsonb DEFAULT '{}'::jsonb NOT NULL,
    signature_key_id text,
    signature_verified boolean,
    package_created_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by text,
    CONSTRAINT requirement_catalog_releases_direction_check CHECK ((direction = ANY (ARRAY['export'::text, 'import'::text]))),
    CONSTRAINT requirement_catalog_releases_version_check CHECK ((version > 0))
);


--
-- Name: requirement_domain_suggestions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requirement_domain_suggestions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    requirement_id uuid NOT NULL,
    domain_id uuid NOT NULL,
    confidence text NOT NULL,
    rationale text,
    suggested_by text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    decided_domain_id uuid,
    decided_by text,
    decided_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT requirement_domain_suggestions_confidence_check CHECK ((confidence = ANY (ARRAY['hög'::text, 'medel'::text, 'låg'::text]))),
    CONSTRAINT requirement_domain_suggestions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: requirement_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requirement_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    parent_requirement_id uuid NOT NULL,
    child_requirement_id uuid NOT NULL,
    link_type text DEFAULT 'preciseras_av'::text NOT NULL,
    coverage text DEFAULT 'full'::text NOT NULL,
    rationale text,
    confidence text,
    suggested_by text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    decided_by text,
    decided_at timestamp with time zone,
    is_local boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT requirement_links_check CHECK ((parent_requirement_id <> child_requirement_id)),
    CONSTRAINT requirement_links_check1 CHECK (((status = 'pending'::text) = (decided_at IS NULL))),
    CONSTRAINT requirement_links_confidence_check CHECK ((confidence = ANY (ARRAY['hög'::text, 'medel'::text, 'låg'::text]))),
    CONSTRAINT requirement_links_coverage_check CHECK ((coverage = ANY (ARRAY['full'::text, 'delvis'::text]))),
    CONSTRAINT requirement_links_link_type_check CHECK ((link_type = ANY (ARRAY['preciseras_av'::text, 'omsätts_av'::text]))),
    CONSTRAINT requirement_links_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: TABLE requirement_links; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.requirement_links IS 'Länk från ett överordnat krav (t.ex. lag) till ett underordnat (föreskrift eller standard). Gäller först när status = approved.';


--
-- Name: requirement_sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requirement_sources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_name text NOT NULL,
    category public.requirement_category NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    document_url text,
    is_local boolean DEFAULT false NOT NULL,
    source_level public.source_level,
    addressee public.requirement_addressee DEFAULT 'asset'::public.requirement_addressee NOT NULL,
    measure_scale public.measure_scale DEFAULT 'none'::public.measure_scale NOT NULL
);


--
-- Name: COLUMN requirement_sources.source_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requirement_sources.source_level IS 'Nivå i kravkedjan: lag → förordning → föreskrift → standard. Styr åt vilket håll kravlänkar får peka.';


--
-- Name: requirement_link_details; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.requirement_link_details WITH (security_invoker='true') AS
 SELECT l.id,
    l.link_type,
    l.coverage,
    l.rationale,
    l.decided_by,
    l.decided_at,
    l.parent_requirement_id,
    rp.chapter_section AS parent_section,
    sp.document_name AS parent_source,
    sp.source_level AS parent_level,
    l.child_requirement_id,
    rc.chapter_section AS child_section,
    sc.document_name AS child_source,
    sc.source_level AS child_level
   FROM ((((public.requirement_links l
     JOIN public.requirements rp ON ((rp.id = l.parent_requirement_id)))
     JOIN public.requirement_sources sp ON ((sp.id = rp.source_id)))
     JOIN public.requirements rc ON ((rc.id = l.child_requirement_id)))
     JOIN public.requirement_sources sc ON ((sc.id = rc.source_id)))
  WHERE ((l.status = 'approved'::text) AND (rp.repealed_at IS NULL) AND (rc.repealed_at IS NULL));


--
-- Name: requirement_profile_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requirement_profile_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    requirement_id uuid NOT NULL,
    applicability public.requirement_applicability DEFAULT 'preliminary'::public.requirement_applicability NOT NULL,
    justification text
);


--
-- Name: requirement_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requirement_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    component_type_id uuid,
    target_sl smallint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_default boolean DEFAULT false NOT NULL
);


--
-- Name: requirement_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requirement_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    requirement_id uuid NOT NULL,
    status public.review_status DEFAULT 'pending'::public.review_status NOT NULL,
    reviewed_by text NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    actor_user_id uuid,
    content_hash text,
    batch_id uuid
);


--
-- Name: requirement_review_status; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.requirement_review_status WITH (security_invoker='true') AS
 SELECT r.id AS requirement_id,
        CASE
            WHEN ((l.status IS NULL) OR (l.status = 'pending'::public.review_status)) THEN 'pending'::text
            WHEN (l.status = 'flagged'::public.review_status) THEN 'flagged'::text
            WHEN (NOT (l.content_hash IS DISTINCT FROM public.requirement_content_hash(r.id))) THEN 'approved'::text
            ELSE 'changed'::text
        END AS review_state,
    (l.status)::text AS last_status,
    l.reviewed_by,
    l.created_at AS reviewed_at,
    l.comment,
    l.batch_id
   FROM (public.requirements r
     LEFT JOIN LATERAL ( SELECT rv.status,
            rv.reviewed_by,
            rv.created_at,
            rv.comment,
            rv.content_hash,
            rv.batch_id
           FROM public.requirement_reviews rv
          WHERE (rv.requirement_id = r.id)
          ORDER BY rv.created_at DESC, rv.id DESC
         LIMIT 1) l ON (true))
  WHERE (r.repealed_at IS NULL);


--
-- Name: requirement_test_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requirement_test_mappings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    requirement_id uuid NOT NULL,
    system_id uuid,
    asset_id uuid,
    is_applicable boolean,
    testability public.testability,
    test_phase public.test_phase,
    test_type public.test_type,
    responsible_party text,
    evidence text,
    comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    result_status public.test_result_status DEFAULT 'not_tested'::public.test_result_status NOT NULL,
    tested_at date,
    tested_by text,
    deviation text,
    evidence_url text,
    evidence_file_name text,
    project_id uuid,
    acceptance_criteria text,
    test_method text,
    responsible_org public.responsible_org,
    suggestion_dismissed_at timestamp with time zone,
    suggestion_dismissed_by text,
    suggestion_dismiss_reason text
);


--
-- Name: scoring_thresholds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scoring_thresholds (
    key text NOT NULL,
    value numeric NOT NULL,
    label text NOT NULL,
    description text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: security_domains; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.security_domains (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    priority_order integer,
    icon text,
    color text,
    created_at timestamp with time zone DEFAULT now(),
    is_local boolean DEFAULT false NOT NULL
);


--
-- Name: system_classification; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.system_classification WITH (security_invoker='true') AS
 SELECT s.id AS system_id,
    s.classification_source AS source,
    drv.classification_level AS inherited_level,
    drv.facility_id AS driving_facility_id,
    drv.facility_name AS driving_facility_name,
    COALESCE(drv.linked_count, (0)::bigint) AS linked_facilities,
    s.own_classification_level AS own_level,
    s.facility_class_override AS override_level,
    s.override_reason,
    public.effective_system_class(s.id) AS effective_level,
    public.target_sl_for_class(public.effective_system_class(s.id)) AS target_sl,
    ((s.classification_source = 'overridden'::public.classification_source) AND (s.facility_class_override IS NOT NULL)) AS is_deviation,
        CASE
            WHEN ((s.classification_source = 'overridden'::public.classification_source) AND (s.facility_class_override IS NOT NULL)) THEN false
            WHEN (s.classification_source = 'own'::public.classification_source) THEN ((s.own_classification_level IS NULL) AND (drv.classification_level IS NULL))
            ELSE (drv.classification_level IS NULL)
        END AS is_missing
   FROM (public.information_systems s
     LEFT JOIN LATERAL ( SELECT f.id AS facility_id,
            f.name AS facility_name,
            f.classification_level,
            count(*) OVER () AS linked_count
           FROM (public.facility_systems fs
             JOIN public.facilities f ON ((f.id = fs.facility_id)))
          WHERE (fs.system_id = s.id)
          ORDER BY f.classification_level DESC NULLS LAST, fs.is_primary DESC, f.name
         LIMIT 1) drv ON (true));


--
-- Name: test_mapping_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_mapping_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mapping_id uuid NOT NULL,
    note text NOT NULL,
    author_email text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL
);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_external_subject_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_external_subject_key UNIQUE (external_subject);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: activity_log activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_pkey PRIMARY KEY (id);


--
-- Name: asset_compliance_records asset_compliance_records_asset_id_control_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_compliance_records
    ADD CONSTRAINT asset_compliance_records_asset_id_control_id_key UNIQUE (asset_id, control_id);


--
-- Name: asset_compliance_records asset_compliance_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_compliance_records
    ADD CONSTRAINT asset_compliance_records_pkey PRIMARY KEY (id);


--
-- Name: asset_controls asset_controls_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_controls
    ADD CONSTRAINT asset_controls_pkey PRIMARY KEY (id);


--
-- Name: audit_chain_head audit_chain_head_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_chain_head
    ADD CONSTRAINT audit_chain_head_pkey PRIMARY KEY (id);


--
-- Name: class_sl_mapping class_sl_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_sl_mapping
    ADD CONSTRAINT class_sl_mapping_pkey PRIMARY KEY (classification_level);


--
-- Name: compensating_measures compensating_measures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compensating_measures
    ADD CONSTRAINT compensating_measures_pkey PRIMARY KEY (id);


--
-- Name: compliance_records compliance_records_facility_id_requirement_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_records
    ADD CONSTRAINT compliance_records_facility_id_requirement_id_key UNIQUE (facility_id, requirement_id);


--
-- Name: compliance_records compliance_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_records
    ADD CONSTRAINT compliance_records_pkey PRIMARY KEY (id);


--
-- Name: component_compliance_records component_compliance_records_asset_id_requirement_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.component_compliance_records
    ADD CONSTRAINT component_compliance_records_asset_id_requirement_id_key UNIQUE (asset_id, requirement_id);


--
-- Name: component_compliance_records component_compliance_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.component_compliance_records
    ADD CONSTRAINT component_compliance_records_pkey PRIMARY KEY (id);


--
-- Name: component_types component_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.component_types
    ADD CONSTRAINT component_types_pkey PRIMARY KEY (id);


--
-- Name: domain_checklists domain_checklists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domain_checklists
    ADD CONSTRAINT domain_checklists_pkey PRIMARY KEY (id);


--
-- Name: export_history export_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.export_history
    ADD CONSTRAINT export_history_pkey PRIMARY KEY (id);


--
-- Name: facilities facilities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facilities
    ADD CONSTRAINT facilities_pkey PRIMARY KEY (id);


--
-- Name: facility_systems facility_systems_facility_id_system_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_systems
    ADD CONSTRAINT facility_systems_facility_id_system_id_key UNIQUE (facility_id, system_id);


--
-- Name: facility_systems facility_systems_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_systems
    ADD CONSTRAINT facility_systems_pkey PRIMARY KEY (id);


--
-- Name: information_systems information_systems_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.information_systems
    ADD CONSTRAINT information_systems_pkey PRIMARY KEY (id);


--
-- Name: installation_settings installation_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installation_settings
    ADD CONSTRAINT installation_settings_pkey PRIMARY KEY (id);


--
-- Name: procurement_projects procurement_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procurement_projects
    ADD CONSTRAINT procurement_projects_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: project_requirements project_requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_requirements
    ADD CONSTRAINT project_requirements_pkey PRIMARY KEY (id);


--
-- Name: project_requirements project_requirements_project_id_requirement_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_requirements
    ADD CONSTRAINT project_requirements_project_id_requirement_id_key UNIQUE (project_id, requirement_id);


--
-- Name: requirement_audit_log requirement_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_audit_log
    ADD CONSTRAINT requirement_audit_log_pkey PRIMARY KEY (id);


--
-- Name: requirement_catalog_releases requirement_catalog_releases_direction_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_catalog_releases
    ADD CONSTRAINT requirement_catalog_releases_direction_version_key UNIQUE (direction, version);


--
-- Name: requirement_catalog_releases requirement_catalog_releases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_catalog_releases
    ADD CONSTRAINT requirement_catalog_releases_pkey PRIMARY KEY (id);


--
-- Name: requirement_domain_suggestions requirement_domain_suggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_domain_suggestions
    ADD CONSTRAINT requirement_domain_suggestions_pkey PRIMARY KEY (id);


--
-- Name: requirement_links requirement_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_links
    ADD CONSTRAINT requirement_links_pkey PRIMARY KEY (id);


--
-- Name: requirement_profile_items requirement_profile_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_profile_items
    ADD CONSTRAINT requirement_profile_items_pkey PRIMARY KEY (id);


--
-- Name: requirement_profile_items requirement_profile_items_profile_id_requirement_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_profile_items
    ADD CONSTRAINT requirement_profile_items_profile_id_requirement_id_key UNIQUE (profile_id, requirement_id);


--
-- Name: requirement_profiles requirement_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_profiles
    ADD CONSTRAINT requirement_profiles_pkey PRIMARY KEY (id);


--
-- Name: requirement_reviews requirement_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_reviews
    ADD CONSTRAINT requirement_reviews_pkey PRIMARY KEY (id);


--
-- Name: requirement_sources requirement_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_sources
    ADD CONSTRAINT requirement_sources_pkey PRIMARY KEY (id);


--
-- Name: requirement_test_mappings requirement_test_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_test_mappings
    ADD CONSTRAINT requirement_test_mappings_pkey PRIMARY KEY (id);


--
-- Name: requirements requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirements
    ADD CONSTRAINT requirements_pkey PRIMARY KEY (id);


--
-- Name: review_batches review_batches_batch_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_batches
    ADD CONSTRAINT review_batches_batch_no_key UNIQUE (batch_no);


--
-- Name: review_batches review_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_batches
    ADD CONSTRAINT review_batches_pkey PRIMARY KEY (id);


--
-- Name: scoring_thresholds scoring_thresholds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scoring_thresholds
    ADD CONSTRAINT scoring_thresholds_pkey PRIMARY KEY (key);


--
-- Name: security_domains security_domains_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_domains
    ADD CONSTRAINT security_domains_pkey PRIMARY KEY (id);


--
-- Name: security_domains security_domains_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_domains
    ADD CONSTRAINT security_domains_slug_key UNIQUE (slug);


--
-- Name: system_assets system_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_assets
    ADD CONSTRAINT system_assets_pkey PRIMARY KEY (id);


--
-- Name: system_compliance_records system_compliance_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_compliance_records
    ADD CONSTRAINT system_compliance_records_pkey PRIMARY KEY (id);


--
-- Name: system_compliance_records system_compliance_records_system_id_requirement_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_compliance_records
    ADD CONSTRAINT system_compliance_records_system_id_requirement_id_key UNIQUE (system_id, requirement_id);


--
-- Name: test_mapping_notes test_mapping_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_mapping_notes
    ADD CONSTRAINT test_mapping_notes_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: activity_log_seq_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX activity_log_seq_key ON public.activity_log USING btree (seq);


--
-- Name: compensating_measures_asset_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX compensating_measures_asset_idx ON public.compensating_measures USING btree (asset_id);


--
-- Name: compensating_measures_facility_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX compensating_measures_facility_idx ON public.compensating_measures USING btree (facility_id);


--
-- Name: compensating_measures_profile_item_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX compensating_measures_profile_item_idx ON public.compensating_measures USING btree (profile_item_id);


--
-- Name: compensating_measures_project_requirement_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX compensating_measures_project_requirement_idx ON public.compensating_measures USING btree (project_requirement_id);


--
-- Name: compensating_measures_system_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX compensating_measures_system_idx ON public.compensating_measures USING btree (system_id);


--
-- Name: component_compliance_records_asset_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX component_compliance_records_asset_idx ON public.component_compliance_records USING btree (asset_id);


--
-- Name: component_compliance_records_requirement_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX component_compliance_records_requirement_idx ON public.component_compliance_records USING btree (requirement_id);


--
-- Name: facility_systems_one_primary_per_system; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX facility_systems_one_primary_per_system ON public.facility_systems USING btree (system_id) WHERE is_primary;


--
-- Name: idx_activity_log_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_log_action ON public.activity_log USING btree (action);


--
-- Name: idx_activity_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_log_created_at ON public.activity_log USING btree (created_at DESC);


--
-- Name: idx_activity_log_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_log_entity ON public.activity_log USING btree (entity_type, entity_id);


--
-- Name: idx_activity_log_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_log_user_id ON public.activity_log USING btree (user_id);


--
-- Name: idx_requirement_audit_log_req_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requirement_audit_log_req_id ON public.requirement_audit_log USING btree (requirement_id);


--
-- Name: idx_requirement_reviews_req_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requirement_reviews_req_id ON public.requirement_reviews USING btree (requirement_id);


--
-- Name: idx_test_mapping_notes_mapping; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_mapping_notes_mapping ON public.test_mapping_notes USING btree (mapping_id, created_at DESC);


--
-- Name: idx_test_mappings_asset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_mappings_asset ON public.requirement_test_mappings USING btree (asset_id);


--
-- Name: idx_test_mappings_requirement; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_mappings_requirement ON public.requirement_test_mappings USING btree (requirement_id);


--
-- Name: idx_test_mappings_system; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_mappings_system ON public.requirement_test_mappings USING btree (system_id);


--
-- Name: requirement_domain_suggestions_one_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX requirement_domain_suggestions_one_pending ON public.requirement_domain_suggestions USING btree (requirement_id) WHERE (status = 'pending'::text);


--
-- Name: requirement_links_child; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX requirement_links_child ON public.requirement_links USING btree (child_requirement_id);


--
-- Name: requirement_links_one_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX requirement_links_one_active ON public.requirement_links USING btree (parent_requirement_id, child_requirement_id) WHERE (status <> 'rejected'::text);


--
-- Name: requirement_profiles_one_default_per_type; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX requirement_profiles_one_default_per_type ON public.requirement_profiles USING btree (component_type_id) WHERE is_default;


--
-- Name: uq_test_mapping; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_test_mapping ON public.requirement_test_mappings USING btree (requirement_id, COALESCE(system_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(asset_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(project_id, '00000000-0000-0000-0000-000000000000'::uuid), test_phase);


--
-- Name: users on_auth_user_created; Type: TRIGGER; Schema: auth; Owner: -
--

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


--
-- Name: users on_auth_user_email_confirmed; Type: TRIGGER; Schema: auth; Owner: -
--

CREATE TRIGGER on_auth_user_email_confirmed AFTER UPDATE OF email_confirmed_at ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_confirmed();


--
-- Name: profiles on_profile_created; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_profile_created AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.auto_approve_admin();


--
-- Name: profiles protect_profile_fields; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER protect_profile_fields BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();


--
-- Name: activity_log trg_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_append_only BEFORE DELETE OR UPDATE ON public.activity_log FOR EACH ROW EXECUTE FUNCTION public.forbid_log_modification();


--
-- Name: export_history trg_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_append_only BEFORE DELETE OR UPDATE ON public.export_history FOR EACH ROW EXECUTE FUNCTION public.forbid_log_modification();


--
-- Name: requirement_audit_log trg_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_append_only BEFORE DELETE OR UPDATE ON public.requirement_audit_log FOR EACH ROW EXECUTE FUNCTION public.forbid_log_modification();


--
-- Name: requirement_catalog_releases trg_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_append_only BEFORE DELETE OR UPDATE ON public.requirement_catalog_releases FOR EACH ROW EXECUTE FUNCTION public.forbid_log_modification();


--
-- Name: requirement_reviews trg_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_append_only BEFORE DELETE OR UPDATE ON public.requirement_reviews FOR EACH ROW EXECUTE FUNCTION public.forbid_log_modification();


--
-- Name: review_batches trg_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_append_only BEFORE DELETE OR UPDATE ON public.review_batches FOR EACH ROW EXECUTE FUNCTION public.forbid_log_modification();


--
-- Name: activity_log trg_append_only_truncate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_append_only_truncate BEFORE TRUNCATE ON public.activity_log FOR EACH STATEMENT EXECUTE FUNCTION public.forbid_log_modification();


--
-- Name: export_history trg_append_only_truncate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_append_only_truncate BEFORE TRUNCATE ON public.export_history FOR EACH STATEMENT EXECUTE FUNCTION public.forbid_log_modification();


--
-- Name: requirement_audit_log trg_append_only_truncate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_append_only_truncate BEFORE TRUNCATE ON public.requirement_audit_log FOR EACH STATEMENT EXECUTE FUNCTION public.forbid_log_modification();


--
-- Name: requirement_catalog_releases trg_append_only_truncate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_append_only_truncate BEFORE TRUNCATE ON public.requirement_catalog_releases FOR EACH STATEMENT EXECUTE FUNCTION public.forbid_log_modification();


--
-- Name: requirement_reviews trg_append_only_truncate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_append_only_truncate BEFORE TRUNCATE ON public.requirement_reviews FOR EACH STATEMENT EXECUTE FUNCTION public.forbid_log_modification();


--
-- Name: system_assets trg_asset_component_type_sync; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_asset_component_type_sync AFTER INSERT OR UPDATE OF component_type_id ON public.system_assets FOR EACH ROW EXECUTE FUNCTION public.trg_asset_component_type_sync();


--
-- Name: facilities trg_auto_add_requirements; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auto_add_requirements AFTER INSERT OR UPDATE OF type, length_meters, traffic_flow_adt, construction_type, is_critical_entity, has_dangerous_goods, owner_type, classification_level ON public.facilities FOR EACH ROW EXECUTE FUNCTION public.auto_add_requirements();


--
-- Name: facility_systems trg_auto_add_requirements; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auto_add_requirements AFTER INSERT ON public.facility_systems FOR EACH ROW EXECUTE FUNCTION public.auto_add_requirements();


--
-- Name: information_systems trg_auto_add_requirements; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auto_add_requirements AFTER INSERT OR UPDATE OF classification_source, facility_class_override, own_classification_level, is_critical_entity, is_central_system, is_externally_accessible, owner_type, system_category, system_type ON public.information_systems FOR EACH ROW EXECUTE FUNCTION public.auto_add_requirements();


--
-- Name: requirements trg_auto_add_requirements_ins; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auto_add_requirements_ins AFTER INSERT ON public.requirements FOR EACH STATEMENT EXECUTE FUNCTION public.auto_add_requirements_all();


--
-- Name: requirement_sources trg_auto_add_requirements_src; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auto_add_requirements_src AFTER UPDATE OF addressee ON public.requirement_sources FOR EACH STATEMENT EXECUTE FUNCTION public.auto_add_requirements_all();


--
-- Name: requirements trg_auto_add_requirements_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auto_add_requirements_upd AFTER UPDATE OF trigger_logic, target_type, min_classification_level, sl_capability ON public.requirements FOR EACH STATEMENT EXECUTE FUNCTION public.auto_add_requirements_all();


--
-- Name: compensating_measures trg_compensated_has_measure; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER trg_compensated_has_measure AFTER DELETE ON public.compensating_measures DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.check_compensated_has_measure();


--
-- Name: project_requirements trg_compensated_has_measure; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER trg_compensated_has_measure AFTER INSERT OR UPDATE ON public.project_requirements DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.check_compensated_has_measure();


--
-- Name: requirement_profile_items trg_compensated_has_measure; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER trg_compensated_has_measure AFTER INSERT OR UPDATE ON public.requirement_profile_items DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.check_compensated_has_measure();


--
-- Name: requirement_audit_log trg_log_audit_entries; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_log_audit_entries AFTER INSERT ON public.requirement_audit_log FOR EACH ROW EXECUTE FUNCTION public.log_requirement_audit_entry();


--
-- Name: compensating_measures trg_log_compensating_measures; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_log_compensating_measures AFTER INSERT OR DELETE OR UPDATE ON public.compensating_measures FOR EACH ROW EXECUTE FUNCTION public.log_entity_change('compensating_measure', 'description');


--
-- Name: compliance_records trg_log_compliance_added; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_log_compliance_added AFTER INSERT ON public.compliance_records REFERENCING NEW TABLE AS changed_rows FOR EACH STATEMENT EXECUTE FUNCTION public.log_compliance_set_change();


--
-- Name: system_compliance_records trg_log_compliance_added; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_log_compliance_added AFTER INSERT ON public.system_compliance_records REFERENCING NEW TABLE AS changed_rows FOR EACH STATEMENT EXECUTE FUNCTION public.log_compliance_set_change();


--
-- Name: compliance_records trg_log_compliance_removed; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_log_compliance_removed AFTER DELETE ON public.compliance_records REFERENCING OLD TABLE AS changed_rows FOR EACH STATEMENT EXECUTE FUNCTION public.log_compliance_set_change();


--
-- Name: system_compliance_records trg_log_compliance_removed; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_log_compliance_removed AFTER DELETE ON public.system_compliance_records REFERENCING OLD TABLE AS changed_rows FOR EACH STATEMENT EXECUTE FUNCTION public.log_compliance_set_change();


--
-- Name: compliance_records trg_log_compliance_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_log_compliance_update AFTER UPDATE ON public.compliance_records FOR EACH ROW EXECUTE FUNCTION public.log_compliance_update();


--
-- Name: system_compliance_records trg_log_compliance_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_log_compliance_update AFTER UPDATE ON public.system_compliance_records FOR EACH ROW EXECUTE FUNCTION public.log_compliance_update();


--
-- Name: component_compliance_records trg_log_component_compliance; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_log_component_compliance AFTER UPDATE ON public.component_compliance_records FOR EACH ROW EXECUTE FUNCTION public.log_entity_change('component_compliance_record', '@requirement');


--
-- Name: facilities trg_log_facilities; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_log_facilities AFTER INSERT OR DELETE OR UPDATE ON public.facilities FOR EACH ROW EXECUTE FUNCTION public.log_entity_change('facility', 'name');


--
-- Name: facility_systems trg_log_facility_links; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_log_facility_links AFTER INSERT OR DELETE OR UPDATE ON public.facility_systems FOR EACH ROW EXECUTE FUNCTION public.log_facility_link();


--
-- Name: installation_settings trg_log_installation_settings; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_log_installation_settings BEFORE UPDATE ON public.installation_settings FOR EACH ROW EXECUTE FUNCTION public.log_installation_settings();


--
-- Name: requirement_profile_items trg_log_profile_items; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_log_profile_items AFTER INSERT OR DELETE OR UPDATE ON public.requirement_profile_items FOR EACH ROW EXECUTE FUNCTION public.log_entity_change('profile_requirement', '@requirement');


--
-- Name: project_requirements trg_log_project_requirements; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_log_project_requirements AFTER INSERT OR DELETE OR UPDATE ON public.project_requirements FOR EACH ROW EXECUTE FUNCTION public.log_entity_change('project_requirement', '@requirement');


--
-- Name: procurement_projects trg_log_projects; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_log_projects AFTER INSERT OR DELETE OR UPDATE ON public.procurement_projects FOR EACH ROW EXECUTE FUNCTION public.log_entity_change('project', 'name');


--
-- Name: requirement_links trg_log_requirement_links; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_log_requirement_links AFTER INSERT OR DELETE OR UPDATE ON public.requirement_links FOR EACH ROW EXECUTE FUNCTION public.log_requirement_link_change();


--
-- Name: requirement_profiles trg_log_requirement_profiles; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_log_requirement_profiles AFTER INSERT OR DELETE OR UPDATE ON public.requirement_profiles FOR EACH ROW EXECUTE FUNCTION public.log_entity_change('requirement_profile', 'name');


--
-- Name: requirements trg_log_requirements; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_log_requirements AFTER INSERT OR DELETE OR UPDATE ON public.requirements FOR EACH ROW EXECUTE FUNCTION public.log_entity_change('requirement', 'chapter_section');


--
-- Name: requirement_reviews trg_log_reviews; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_log_reviews AFTER INSERT ON public.requirement_reviews FOR EACH ROW EXECUTE FUNCTION public.log_review_activity();


--
-- Name: requirement_sources trg_log_sources; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_log_sources AFTER INSERT OR DELETE OR UPDATE ON public.requirement_sources FOR EACH ROW EXECUTE FUNCTION public.log_entity_change('source', 'document_name');


--
-- Name: information_systems trg_log_systems; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_log_systems AFTER INSERT OR DELETE OR UPDATE ON public.information_systems FOR EACH ROW EXECUTE FUNCTION public.log_entity_change('system', 'name');


--
-- Name: requirement_test_mappings trg_log_test_mappings; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_log_test_mappings AFTER INSERT OR DELETE OR UPDATE ON public.requirement_test_mappings FOR EACH ROW EXECUTE FUNCTION public.log_entity_change('test_mapping', '@requirement');


--
-- Name: requirement_links trg_mark_local; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_mark_local BEFORE INSERT ON public.requirement_links FOR EACH ROW EXECUTE FUNCTION public.mark_local_on_insert();


--
-- Name: requirement_sources trg_mark_local; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_mark_local BEFORE INSERT ON public.requirement_sources FOR EACH ROW EXECUTE FUNCTION public.mark_local_on_insert();


--
-- Name: requirements trg_mark_local; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_mark_local BEFORE INSERT ON public.requirements FOR EACH ROW EXECUTE FUNCTION public.mark_local_on_insert();


--
-- Name: security_domains trg_mark_local; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_mark_local BEFORE INSERT ON public.security_domains FOR EACH ROW EXECUTE FUNCTION public.mark_local_on_insert();


--
-- Name: requirement_sources trg_prevent_delete_assessed; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_prevent_delete_assessed BEFORE DELETE ON public.requirement_sources FOR EACH ROW EXECUTE FUNCTION public.prevent_delete_assessed_source();


--
-- Name: requirements trg_prevent_delete_assessed; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_prevent_delete_assessed BEFORE DELETE ON public.requirements FOR EACH ROW EXECUTE FUNCTION public.prevent_delete_assessed_requirement();


--
-- Name: requirement_profiles trg_profile_default_sync; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_profile_default_sync AFTER INSERT OR DELETE OR UPDATE ON public.requirement_profiles FOR EACH ROW EXECUTE FUNCTION public.trg_profile_default_sync();


--
-- Name: requirement_profile_items trg_profile_items_sync_del; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_profile_items_sync_del AFTER DELETE ON public.requirement_profile_items REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION public.trg_profile_items_sync();


--
-- Name: requirement_profile_items trg_profile_items_sync_ins; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_profile_items_sync_ins AFTER INSERT ON public.requirement_profile_items REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.trg_profile_items_sync();


--
-- Name: requirement_profile_items trg_profile_items_sync_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_profile_items_sync_upd AFTER UPDATE ON public.requirement_profile_items REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.trg_profile_items_sync();


--
-- Name: activity_log trg_seal_activity_log; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_seal_activity_log BEFORE INSERT ON public.activity_log FOR EACH ROW EXECUTE FUNCTION public.seal_activity_log();


--
-- Name: requirement_sources trg_set_source_level; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_source_level BEFORE INSERT ON public.requirement_sources FOR EACH ROW EXECUTE FUNCTION public.set_source_level_on_insert();


--
-- Name: requirement_audit_log trg_stamp_actor; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_stamp_actor BEFORE INSERT ON public.requirement_audit_log FOR EACH ROW EXECUTE FUNCTION public.stamp_requirement_audit_actor();


--
-- Name: requirement_reviews trg_stamp_actor; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_stamp_actor BEFORE INSERT ON public.requirement_reviews FOR EACH ROW EXECUTE FUNCTION public.stamp_requirement_review_actor();


--
-- Name: compensating_measures trg_stamp_compensating_measure; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_stamp_compensating_measure BEFORE INSERT OR UPDATE ON public.compensating_measures FOR EACH ROW EXECUTE FUNCTION public.stamp_compensating_measure();


--
-- Name: requirement_links trg_stamp_link_author; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_stamp_link_author BEFORE INSERT ON public.requirement_links FOR EACH ROW EXECUTE FUNCTION public.stamp_requirement_link_author();


--
-- Name: requirements trg_track_content_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_track_content_change BEFORE INSERT OR UPDATE ON public.requirements FOR EACH ROW EXECUTE FUNCTION public.track_requirement_content_change();


--
-- Name: project_requirements trg_validate_applicability; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_applicability BEFORE INSERT OR UPDATE ON public.project_requirements FOR EACH ROW EXECUTE FUNCTION public.validate_requirement_applicability();


--
-- Name: requirement_profile_items trg_validate_applicability; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_applicability BEFORE INSERT OR UPDATE ON public.requirement_profile_items FOR EACH ROW EXECUTE FUNCTION public.validate_requirement_applicability();


--
-- Name: requirement_profiles trg_validate_default_profile; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_default_profile BEFORE INSERT OR UPDATE ON public.requirement_profiles FOR EACH ROW EXECUTE FUNCTION public.validate_default_profile();


--
-- Name: requirement_links trg_validate_requirement_link; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_requirement_link BEFORE INSERT OR UPDATE OF parent_requirement_id, child_requirement_id ON public.requirement_links FOR EACH ROW EXECUTE FUNCTION public.validate_requirement_link();


--
-- Name: requirements trg_validate_requirement_trigger_logic; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_requirement_trigger_logic BEFORE INSERT OR UPDATE OF trigger_logic, target_type ON public.requirements FOR EACH ROW EXECUTE FUNCTION public.validate_requirement_trigger_logic();


--
-- Name: requirement_sources trg_validate_source_level_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_source_level_change BEFORE UPDATE OF source_level ON public.requirement_sources FOR EACH ROW EXECUTE FUNCTION public.validate_source_level_change();


--
-- Name: information_systems trg_validate_system_class_override; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_system_class_override BEFORE INSERT OR UPDATE ON public.information_systems FOR EACH ROW EXECUTE FUNCTION public.validate_system_class_override();


--
-- Name: asset_compliance_records update_asset_compliance_records_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_asset_compliance_records_updated_at BEFORE UPDATE ON public.asset_compliance_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: compliance_records update_compliance_records_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_compliance_records_updated_at BEFORE UPDATE ON public.compliance_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: component_compliance_records update_component_compliance_records_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_component_compliance_records_updated_at BEFORE UPDATE ON public.component_compliance_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: facilities update_facilities_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_facilities_updated_at BEFORE UPDATE ON public.facilities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: information_systems update_information_systems_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_information_systems_updated_at BEFORE UPDATE ON public.information_systems FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: procurement_projects update_procurement_projects_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_procurement_projects_updated_at BEFORE UPDATE ON public.procurement_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: system_assets update_system_assets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_system_assets_updated_at BEFORE UPDATE ON public.system_assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: system_compliance_records update_system_compliance_records_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_system_compliance_records_updated_at BEFORE UPDATE ON public.system_compliance_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: requirement_test_mappings update_test_mappings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_test_mappings_updated_at BEFORE UPDATE ON public.requirement_test_mappings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: asset_compliance_records validate_assessment; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER validate_assessment BEFORE INSERT OR UPDATE ON public.asset_compliance_records FOR EACH ROW EXECUTE FUNCTION public.validate_compliance_assessment();


--
-- Name: compliance_records validate_assessment; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER validate_assessment BEFORE INSERT OR UPDATE ON public.compliance_records FOR EACH ROW EXECUTE FUNCTION public.validate_compliance_assessment();


--
-- Name: component_compliance_records validate_assessment; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER validate_assessment BEFORE INSERT OR UPDATE ON public.component_compliance_records FOR EACH ROW EXECUTE FUNCTION public.validate_compliance_assessment();


--
-- Name: system_compliance_records validate_assessment; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER validate_assessment BEFORE INSERT OR UPDATE ON public.system_compliance_records FOR EACH ROW EXECUTE FUNCTION public.validate_compliance_assessment();


--
-- Name: asset_compliance_records asset_compliance_records_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_compliance_records
    ADD CONSTRAINT asset_compliance_records_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.system_assets(id) ON DELETE CASCADE;


--
-- Name: asset_compliance_records asset_compliance_records_control_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_compliance_records
    ADD CONSTRAINT asset_compliance_records_control_id_fkey FOREIGN KEY (control_id) REFERENCES public.asset_controls(id) ON DELETE CASCADE;


--
-- Name: asset_compliance_records asset_compliance_records_verified_by_test_mapping_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_compliance_records
    ADD CONSTRAINT asset_compliance_records_verified_by_test_mapping_id_fkey FOREIGN KEY (verified_by_test_mapping_id) REFERENCES public.requirement_test_mappings(id) ON DELETE SET NULL;


--
-- Name: asset_controls asset_controls_source_requirement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_controls
    ADD CONSTRAINT asset_controls_source_requirement_id_fkey FOREIGN KEY (source_requirement_id) REFERENCES public.requirements(id);


--
-- Name: compensating_measures compensating_measures_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compensating_measures
    ADD CONSTRAINT compensating_measures_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.system_assets(id) ON DELETE RESTRICT;


--
-- Name: compensating_measures compensating_measures_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compensating_measures
    ADD CONSTRAINT compensating_measures_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id) ON DELETE RESTRICT;


--
-- Name: compensating_measures compensating_measures_profile_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compensating_measures
    ADD CONSTRAINT compensating_measures_profile_item_id_fkey FOREIGN KEY (profile_item_id) REFERENCES public.requirement_profile_items(id) ON DELETE CASCADE;


--
-- Name: compensating_measures compensating_measures_project_requirement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compensating_measures
    ADD CONSTRAINT compensating_measures_project_requirement_id_fkey FOREIGN KEY (project_requirement_id) REFERENCES public.project_requirements(id) ON DELETE CASCADE;


--
-- Name: compensating_measures compensating_measures_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compensating_measures
    ADD CONSTRAINT compensating_measures_system_id_fkey FOREIGN KEY (system_id) REFERENCES public.information_systems(id) ON DELETE RESTRICT;


--
-- Name: compliance_records compliance_records_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_records
    ADD CONSTRAINT compliance_records_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id) ON DELETE CASCADE;


--
-- Name: compliance_records compliance_records_requirement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_records
    ADD CONSTRAINT compliance_records_requirement_id_fkey FOREIGN KEY (requirement_id) REFERENCES public.requirements(id) ON DELETE CASCADE;


--
-- Name: compliance_records compliance_records_verified_by_test_mapping_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_records
    ADD CONSTRAINT compliance_records_verified_by_test_mapping_id_fkey FOREIGN KEY (verified_by_test_mapping_id) REFERENCES public.requirement_test_mappings(id) ON DELETE SET NULL;


--
-- Name: component_compliance_records component_compliance_records_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.component_compliance_records
    ADD CONSTRAINT component_compliance_records_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.system_assets(id) ON DELETE CASCADE;


--
-- Name: component_compliance_records component_compliance_records_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.component_compliance_records
    ADD CONSTRAINT component_compliance_records_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.requirement_profiles(id) ON DELETE SET NULL;


--
-- Name: component_compliance_records component_compliance_records_profile_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.component_compliance_records
    ADD CONSTRAINT component_compliance_records_profile_item_id_fkey FOREIGN KEY (profile_item_id) REFERENCES public.requirement_profile_items(id) ON DELETE SET NULL;


--
-- Name: component_compliance_records component_compliance_records_requirement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.component_compliance_records
    ADD CONSTRAINT component_compliance_records_requirement_id_fkey FOREIGN KEY (requirement_id) REFERENCES public.requirements(id) ON DELETE CASCADE;


--
-- Name: component_compliance_records component_compliance_records_verified_by_test_mapping_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.component_compliance_records
    ADD CONSTRAINT component_compliance_records_verified_by_test_mapping_id_fkey FOREIGN KEY (verified_by_test_mapping_id) REFERENCES public.requirement_test_mappings(id) ON DELETE SET NULL;


--
-- Name: component_types component_types_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.component_types
    ADD CONSTRAINT component_types_system_id_fkey FOREIGN KEY (system_id) REFERENCES public.information_systems(id) ON DELETE SET NULL;


--
-- Name: domain_checklists domain_checklists_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domain_checklists
    ADD CONSTRAINT domain_checklists_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.security_domains(id) ON DELETE CASCADE;


--
-- Name: facility_systems facility_systems_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_systems
    ADD CONSTRAINT facility_systems_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id) ON DELETE CASCADE;


--
-- Name: facility_systems facility_systems_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_systems
    ADD CONSTRAINT facility_systems_system_id_fkey FOREIGN KEY (system_id) REFERENCES public.information_systems(id) ON DELETE CASCADE;


--
-- Name: procurement_projects procurement_projects_component_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procurement_projects
    ADD CONSTRAINT procurement_projects_component_type_id_fkey FOREIGN KEY (component_type_id) REFERENCES public.component_types(id) ON DELETE SET NULL;


--
-- Name: procurement_projects procurement_projects_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procurement_projects
    ADD CONSTRAINT procurement_projects_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id) ON DELETE SET NULL;


--
-- Name: procurement_projects procurement_projects_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procurement_projects
    ADD CONSTRAINT procurement_projects_system_id_fkey FOREIGN KEY (system_id) REFERENCES public.information_systems(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: project_requirements project_requirements_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_requirements
    ADD CONSTRAINT project_requirements_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.procurement_projects(id) ON DELETE CASCADE;


--
-- Name: project_requirements project_requirements_requirement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_requirements
    ADD CONSTRAINT project_requirements_requirement_id_fkey FOREIGN KEY (requirement_id) REFERENCES public.requirements(id) ON DELETE CASCADE;


--
-- Name: requirement_domain_suggestions requirement_domain_suggestions_decided_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_domain_suggestions
    ADD CONSTRAINT requirement_domain_suggestions_decided_domain_id_fkey FOREIGN KEY (decided_domain_id) REFERENCES public.security_domains(id);


--
-- Name: requirement_domain_suggestions requirement_domain_suggestions_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_domain_suggestions
    ADD CONSTRAINT requirement_domain_suggestions_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.security_domains(id) ON DELETE CASCADE;


--
-- Name: requirement_domain_suggestions requirement_domain_suggestions_requirement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_domain_suggestions
    ADD CONSTRAINT requirement_domain_suggestions_requirement_id_fkey FOREIGN KEY (requirement_id) REFERENCES public.requirements(id) ON DELETE CASCADE;


--
-- Name: requirement_links requirement_links_child_requirement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_links
    ADD CONSTRAINT requirement_links_child_requirement_id_fkey FOREIGN KEY (child_requirement_id) REFERENCES public.requirements(id) ON DELETE CASCADE;


--
-- Name: requirement_links requirement_links_parent_requirement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_links
    ADD CONSTRAINT requirement_links_parent_requirement_id_fkey FOREIGN KEY (parent_requirement_id) REFERENCES public.requirements(id) ON DELETE CASCADE;


--
-- Name: requirement_profile_items requirement_profile_items_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_profile_items
    ADD CONSTRAINT requirement_profile_items_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.requirement_profiles(id) ON DELETE CASCADE;


--
-- Name: requirement_profile_items requirement_profile_items_requirement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_profile_items
    ADD CONSTRAINT requirement_profile_items_requirement_id_fkey FOREIGN KEY (requirement_id) REFERENCES public.requirements(id) ON DELETE CASCADE;


--
-- Name: requirement_profiles requirement_profiles_component_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_profiles
    ADD CONSTRAINT requirement_profiles_component_type_id_fkey FOREIGN KEY (component_type_id) REFERENCES public.component_types(id) ON DELETE SET NULL;


--
-- Name: requirement_reviews requirement_reviews_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_reviews
    ADD CONSTRAINT requirement_reviews_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.review_batches(id);


--
-- Name: requirement_test_mappings requirement_test_mappings_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_test_mappings
    ADD CONSTRAINT requirement_test_mappings_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.system_assets(id) ON DELETE SET NULL;


--
-- Name: requirement_test_mappings requirement_test_mappings_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_test_mappings
    ADD CONSTRAINT requirement_test_mappings_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.procurement_projects(id) ON DELETE SET NULL;


--
-- Name: requirement_test_mappings requirement_test_mappings_requirement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_test_mappings
    ADD CONSTRAINT requirement_test_mappings_requirement_id_fkey FOREIGN KEY (requirement_id) REFERENCES public.requirements(id) ON DELETE CASCADE;


--
-- Name: requirement_test_mappings requirement_test_mappings_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_test_mappings
    ADD CONSTRAINT requirement_test_mappings_system_id_fkey FOREIGN KEY (system_id) REFERENCES public.information_systems(id) ON DELETE SET NULL;


--
-- Name: requirements requirements_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirements
    ADD CONSTRAINT requirements_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.security_domains(id);


--
-- Name: requirements requirements_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirements
    ADD CONSTRAINT requirements_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.requirement_sources(id) ON DELETE CASCADE;


--
-- Name: system_assets system_assets_component_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_assets
    ADD CONSTRAINT system_assets_component_type_id_fkey FOREIGN KEY (component_type_id) REFERENCES public.component_types(id) ON DELETE SET NULL;


--
-- Name: system_assets system_assets_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_assets
    ADD CONSTRAINT system_assets_system_id_fkey FOREIGN KEY (system_id) REFERENCES public.information_systems(id) ON DELETE CASCADE;


--
-- Name: system_compliance_records system_compliance_records_requirement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_compliance_records
    ADD CONSTRAINT system_compliance_records_requirement_id_fkey FOREIGN KEY (requirement_id) REFERENCES public.requirements(id) ON DELETE CASCADE;


--
-- Name: system_compliance_records system_compliance_records_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_compliance_records
    ADD CONSTRAINT system_compliance_records_system_id_fkey FOREIGN KEY (system_id) REFERENCES public.information_systems(id) ON DELETE CASCADE;


--
-- Name: system_compliance_records system_compliance_records_verified_by_test_mapping_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_compliance_records
    ADD CONSTRAINT system_compliance_records_verified_by_test_mapping_id_fkey FOREIGN KEY (verified_by_test_mapping_id) REFERENCES public.requirement_test_mappings(id) ON DELETE SET NULL;


--
-- Name: test_mapping_notes test_mapping_notes_mapping_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_mapping_notes
    ADD CONSTRAINT test_mapping_notes_mapping_id_fkey FOREIGN KEY (mapping_id) REFERENCES public.requirement_test_mappings(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: scoring_thresholds Admin kan uppdatera tröskelvärden; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin kan uppdatera tröskelvärden" ON public.scoring_thresholds FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: class_sl_mapping Admins can change class sl mapping; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can change class sl mapping" ON public.class_sl_mapping FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: test_mapping_notes Admins can delete notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete notes" ON public.test_mapping_notes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: activity_log Admins can view all activity; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all activity" ON public.activity_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins read all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins read roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: installation_settings Admins update installation_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins update installation_settings" ON public.installation_settings FOR UPDATE TO authenticated USING ((public.is_approved() AND public.has_role(_user_id => auth.uid(), _role => 'admin'::public.app_role))) WITH CHECK ((public.is_approved() AND public.has_role(_user_id => auth.uid(), _role => 'admin'::public.app_role)));


--
-- Name: profiles Admins update profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins update profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: security_domains Admins update security_domains; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins update security_domains" ON public.security_domains FOR UPDATE TO authenticated USING ((public.is_approved() AND public.has_role(_user_id => auth.uid(), _role => 'admin'::public.app_role))) WITH CHECK ((public.is_approved() AND public.has_role(_user_id => auth.uid(), _role => 'admin'::public.app_role)));


--
-- Name: scoring_thresholds Alla kan läsa tröskelvärden; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Alla kan läsa tröskelvärden" ON public.scoring_thresholds FOR SELECT USING (true);


--
-- Name: class_sl_mapping Anyone can read class sl mapping; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read class sl mapping" ON public.class_sl_mapping FOR SELECT USING (true);


--
-- Name: test_mapping_notes Approved users can add notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users can add notes" ON public.test_mapping_notes FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND p.approved))));


--
-- Name: test_mapping_notes Approved users can read notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users can read notes" ON public.test_mapping_notes FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND p.approved))));


--
-- Name: asset_compliance_records Approved users delete asset_compliance_records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users delete asset_compliance_records" ON public.asset_compliance_records FOR DELETE TO authenticated USING (public.is_approved());


--
-- Name: compensating_measures Approved users delete compensating_measures; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users delete compensating_measures" ON public.compensating_measures FOR DELETE TO authenticated USING (public.is_approved());


--
-- Name: compliance_records Approved users delete compliance_records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users delete compliance_records" ON public.compliance_records FOR DELETE TO authenticated USING (public.is_approved());


--
-- Name: component_compliance_records Approved users delete component_compliance_records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users delete component_compliance_records" ON public.component_compliance_records FOR DELETE TO authenticated USING (public.is_approved());


--
-- Name: component_types Approved users delete component_types; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users delete component_types" ON public.component_types FOR DELETE TO authenticated USING (public.is_approved());


--
-- Name: facilities Approved users delete facilities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users delete facilities" ON public.facilities FOR DELETE TO authenticated USING (public.is_approved());


--
-- Name: facility_systems Approved users delete facility_systems; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users delete facility_systems" ON public.facility_systems FOR DELETE TO authenticated USING (public.is_approved());


--
-- Name: information_systems Approved users delete information_systems; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users delete information_systems" ON public.information_systems FOR DELETE TO authenticated USING (public.is_approved());


--
-- Name: procurement_projects Approved users delete procurement_projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users delete procurement_projects" ON public.procurement_projects FOR DELETE TO authenticated USING (public.is_approved());


--
-- Name: project_requirements Approved users delete project_requirements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users delete project_requirements" ON public.project_requirements FOR DELETE TO authenticated USING (public.is_approved());


--
-- Name: requirement_profile_items Approved users delete requirement_profile_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users delete requirement_profile_items" ON public.requirement_profile_items FOR DELETE TO authenticated USING (public.is_approved());


--
-- Name: requirement_profiles Approved users delete requirement_profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users delete requirement_profiles" ON public.requirement_profiles FOR DELETE TO authenticated USING (public.is_approved());


--
-- Name: requirement_sources Approved users delete requirement_sources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users delete requirement_sources" ON public.requirement_sources FOR DELETE TO authenticated USING (public.is_approved());


--
-- Name: requirement_test_mappings Approved users delete requirement_test_mappings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users delete requirement_test_mappings" ON public.requirement_test_mappings FOR DELETE TO authenticated USING (public.is_approved());


--
-- Name: requirements Approved users delete requirements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users delete requirements" ON public.requirements FOR DELETE TO authenticated USING (public.is_approved());


--
-- Name: system_assets Approved users delete system_assets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users delete system_assets" ON public.system_assets FOR DELETE TO authenticated USING (public.is_approved());


--
-- Name: system_compliance_records Approved users delete system_compliance_records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users delete system_compliance_records" ON public.system_compliance_records FOR DELETE TO authenticated USING (public.is_approved());


--
-- Name: asset_compliance_records Approved users insert asset_compliance_records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users insert asset_compliance_records" ON public.asset_compliance_records FOR INSERT TO authenticated WITH CHECK (public.is_approved());


--
-- Name: asset_controls Approved users insert asset_controls; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users insert asset_controls" ON public.asset_controls FOR INSERT TO authenticated WITH CHECK (public.is_approved());


--
-- Name: compensating_measures Approved users insert compensating_measures; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users insert compensating_measures" ON public.compensating_measures FOR INSERT TO authenticated WITH CHECK (public.is_approved());


--
-- Name: compliance_records Approved users insert compliance_records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users insert compliance_records" ON public.compliance_records FOR INSERT TO authenticated WITH CHECK (public.is_approved());


--
-- Name: component_compliance_records Approved users insert component_compliance_records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users insert component_compliance_records" ON public.component_compliance_records FOR INSERT TO authenticated WITH CHECK (public.is_approved());


--
-- Name: component_types Approved users insert component_types; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users insert component_types" ON public.component_types FOR INSERT TO authenticated WITH CHECK (public.is_approved());


--
-- Name: domain_checklists Approved users insert domain_checklists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users insert domain_checklists" ON public.domain_checklists FOR INSERT TO authenticated WITH CHECK (public.is_approved());


--
-- Name: facilities Approved users insert facilities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users insert facilities" ON public.facilities FOR INSERT TO authenticated WITH CHECK (public.is_approved());


--
-- Name: facility_systems Approved users insert facility_systems; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users insert facility_systems" ON public.facility_systems FOR INSERT TO authenticated WITH CHECK (public.is_approved());


--
-- Name: information_systems Approved users insert information_systems; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users insert information_systems" ON public.information_systems FOR INSERT TO authenticated WITH CHECK (public.is_approved());


--
-- Name: procurement_projects Approved users insert procurement_projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users insert procurement_projects" ON public.procurement_projects FOR INSERT TO authenticated WITH CHECK (public.is_approved());


--
-- Name: project_requirements Approved users insert project_requirements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users insert project_requirements" ON public.project_requirements FOR INSERT TO authenticated WITH CHECK (public.is_approved());


--
-- Name: requirement_audit_log Approved users insert requirement_audit_log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users insert requirement_audit_log" ON public.requirement_audit_log FOR INSERT TO authenticated WITH CHECK (public.is_approved());


--
-- Name: requirement_profile_items Approved users insert requirement_profile_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users insert requirement_profile_items" ON public.requirement_profile_items FOR INSERT TO authenticated WITH CHECK (public.is_approved());


--
-- Name: requirement_profiles Approved users insert requirement_profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users insert requirement_profiles" ON public.requirement_profiles FOR INSERT TO authenticated WITH CHECK (public.is_approved());


--
-- Name: requirement_reviews Approved users insert requirement_reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users insert requirement_reviews" ON public.requirement_reviews FOR INSERT TO authenticated WITH CHECK (public.is_approved());


--
-- Name: requirement_sources Approved users insert requirement_sources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users insert requirement_sources" ON public.requirement_sources FOR INSERT TO authenticated WITH CHECK (public.is_approved());


--
-- Name: requirement_test_mappings Approved users insert requirement_test_mappings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users insert requirement_test_mappings" ON public.requirement_test_mappings FOR INSERT TO authenticated WITH CHECK (public.is_approved());


--
-- Name: requirements Approved users insert requirements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users insert requirements" ON public.requirements FOR INSERT TO authenticated WITH CHECK (public.is_approved());


--
-- Name: security_domains Approved users insert security_domains; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users insert security_domains" ON public.security_domains FOR INSERT TO authenticated WITH CHECK (public.is_approved());


--
-- Name: system_assets Approved users insert system_assets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users insert system_assets" ON public.system_assets FOR INSERT TO authenticated WITH CHECK (public.is_approved());


--
-- Name: system_compliance_records Approved users insert system_compliance_records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users insert system_compliance_records" ON public.system_compliance_records FOR INSERT TO authenticated WITH CHECK (public.is_approved());


--
-- Name: asset_compliance_records Approved users read asset_compliance_records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users read asset_compliance_records" ON public.asset_compliance_records FOR SELECT TO authenticated USING (public.is_approved());


--
-- Name: asset_controls Approved users read asset_controls; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users read asset_controls" ON public.asset_controls FOR SELECT TO authenticated USING (public.is_approved());


--
-- Name: compensating_measures Approved users read compensating_measures; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users read compensating_measures" ON public.compensating_measures FOR SELECT TO authenticated USING (public.is_approved());


--
-- Name: compliance_records Approved users read compliance_records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users read compliance_records" ON public.compliance_records FOR SELECT TO authenticated USING (public.is_approved());


--
-- Name: component_compliance_records Approved users read component_compliance_records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users read component_compliance_records" ON public.component_compliance_records FOR SELECT TO authenticated USING (public.is_approved());


--
-- Name: component_types Approved users read component_types; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users read component_types" ON public.component_types FOR SELECT TO authenticated USING (public.is_approved());


--
-- Name: domain_checklists Approved users read domain_checklists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users read domain_checklists" ON public.domain_checklists FOR SELECT TO authenticated USING (public.is_approved());


--
-- Name: export_history Approved users read export_history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users read export_history" ON public.export_history FOR SELECT TO authenticated USING (public.is_approved());


--
-- Name: facilities Approved users read facilities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users read facilities" ON public.facilities FOR SELECT TO authenticated USING (public.is_approved());


--
-- Name: facility_systems Approved users read facility_systems; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users read facility_systems" ON public.facility_systems FOR SELECT TO authenticated USING (public.is_approved());


--
-- Name: information_systems Approved users read information_systems; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users read information_systems" ON public.information_systems FOR SELECT TO authenticated USING (public.is_approved());


--
-- Name: installation_settings Approved users read installation_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users read installation_settings" ON public.installation_settings FOR SELECT TO authenticated USING (public.is_approved());


--
-- Name: procurement_projects Approved users read procurement_projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users read procurement_projects" ON public.procurement_projects FOR SELECT TO authenticated USING (public.is_approved());


--
-- Name: project_requirements Approved users read project_requirements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users read project_requirements" ON public.project_requirements FOR SELECT TO authenticated USING (public.is_approved());


--
-- Name: requirement_audit_log Approved users read requirement_audit_log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users read requirement_audit_log" ON public.requirement_audit_log FOR SELECT TO authenticated USING (public.is_approved());


--
-- Name: requirement_catalog_releases Approved users read requirement_catalog_releases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users read requirement_catalog_releases" ON public.requirement_catalog_releases FOR SELECT TO authenticated USING (public.is_approved());


--
-- Name: requirement_domain_suggestions Approved users read requirement_domain_suggestions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users read requirement_domain_suggestions" ON public.requirement_domain_suggestions FOR SELECT TO authenticated USING (public.is_approved());


--
-- Name: requirement_links Approved users read requirement_links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users read requirement_links" ON public.requirement_links FOR SELECT TO authenticated USING (public.is_approved());


--
-- Name: requirement_profile_items Approved users read requirement_profile_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users read requirement_profile_items" ON public.requirement_profile_items FOR SELECT TO authenticated USING (public.is_approved());


--
-- Name: requirement_profiles Approved users read requirement_profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users read requirement_profiles" ON public.requirement_profiles FOR SELECT TO authenticated USING (public.is_approved());


--
-- Name: requirement_reviews Approved users read requirement_reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users read requirement_reviews" ON public.requirement_reviews FOR SELECT TO authenticated USING (public.is_approved());


--
-- Name: requirement_sources Approved users read requirement_sources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users read requirement_sources" ON public.requirement_sources FOR SELECT TO authenticated USING (public.is_approved());


--
-- Name: requirement_test_mappings Approved users read requirement_test_mappings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users read requirement_test_mappings" ON public.requirement_test_mappings FOR SELECT TO authenticated USING (public.is_approved());


--
-- Name: requirements Approved users read requirements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users read requirements" ON public.requirements FOR SELECT TO authenticated USING (public.is_approved());


--
-- Name: review_batches Approved users read review_batches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users read review_batches" ON public.review_batches FOR SELECT TO authenticated USING (public.is_approved());


--
-- Name: security_domains Approved users read security_domains; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users read security_domains" ON public.security_domains FOR SELECT TO authenticated USING (public.is_approved());


--
-- Name: system_assets Approved users read system_assets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users read system_assets" ON public.system_assets FOR SELECT TO authenticated USING (public.is_approved());


--
-- Name: system_compliance_records Approved users read system_compliance_records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users read system_compliance_records" ON public.system_compliance_records FOR SELECT TO authenticated USING (public.is_approved());


--
-- Name: requirement_links Approved users suggest requirement_links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users suggest requirement_links" ON public.requirement_links FOR INSERT TO authenticated WITH CHECK ((public.is_approved() AND (status = 'pending'::text) AND (decided_at IS NULL) AND (decided_by IS NULL)));


--
-- Name: asset_compliance_records Approved users update asset_compliance_records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users update asset_compliance_records" ON public.asset_compliance_records FOR UPDATE TO authenticated USING (public.is_approved()) WITH CHECK (public.is_approved());


--
-- Name: asset_controls Approved users update asset_controls; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users update asset_controls" ON public.asset_controls FOR UPDATE TO authenticated USING (public.is_approved()) WITH CHECK (public.is_approved());


--
-- Name: compensating_measures Approved users update compensating_measures; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users update compensating_measures" ON public.compensating_measures FOR UPDATE TO authenticated USING (public.is_approved()) WITH CHECK (public.is_approved());


--
-- Name: compliance_records Approved users update compliance_records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users update compliance_records" ON public.compliance_records FOR UPDATE TO authenticated USING (public.is_approved()) WITH CHECK (public.is_approved());


--
-- Name: component_compliance_records Approved users update component_compliance_records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users update component_compliance_records" ON public.component_compliance_records FOR UPDATE TO authenticated USING (public.is_approved()) WITH CHECK (public.is_approved());


--
-- Name: component_types Approved users update component_types; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users update component_types" ON public.component_types FOR UPDATE TO authenticated USING (public.is_approved()) WITH CHECK (public.is_approved());


--
-- Name: domain_checklists Approved users update domain_checklists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users update domain_checklists" ON public.domain_checklists FOR UPDATE TO authenticated USING (public.is_approved()) WITH CHECK (public.is_approved());


--
-- Name: facilities Approved users update facilities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users update facilities" ON public.facilities FOR UPDATE TO authenticated USING (public.is_approved()) WITH CHECK (public.is_approved());


--
-- Name: facility_systems Approved users update facility_systems; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users update facility_systems" ON public.facility_systems FOR UPDATE TO authenticated USING (public.is_approved()) WITH CHECK (public.is_approved());


--
-- Name: information_systems Approved users update information_systems; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users update information_systems" ON public.information_systems FOR UPDATE TO authenticated USING (public.is_approved()) WITH CHECK (public.is_approved());


--
-- Name: procurement_projects Approved users update procurement_projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users update procurement_projects" ON public.procurement_projects FOR UPDATE TO authenticated USING (public.is_approved()) WITH CHECK (public.is_approved());


--
-- Name: project_requirements Approved users update project_requirements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users update project_requirements" ON public.project_requirements FOR UPDATE TO authenticated USING (public.is_approved()) WITH CHECK (public.is_approved());


--
-- Name: requirement_profile_items Approved users update requirement_profile_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users update requirement_profile_items" ON public.requirement_profile_items FOR UPDATE TO authenticated USING (public.is_approved()) WITH CHECK (public.is_approved());


--
-- Name: requirement_profiles Approved users update requirement_profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users update requirement_profiles" ON public.requirement_profiles FOR UPDATE TO authenticated USING (public.is_approved()) WITH CHECK (public.is_approved());


--
-- Name: requirement_sources Approved users update requirement_sources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users update requirement_sources" ON public.requirement_sources FOR UPDATE TO authenticated USING (public.is_approved()) WITH CHECK (public.is_approved());


--
-- Name: requirement_test_mappings Approved users update requirement_test_mappings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users update requirement_test_mappings" ON public.requirement_test_mappings FOR UPDATE TO authenticated USING (public.is_approved()) WITH CHECK (public.is_approved());


--
-- Name: requirements Approved users update requirements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users update requirements" ON public.requirements FOR UPDATE TO authenticated USING (public.is_approved()) WITH CHECK (public.is_approved());


--
-- Name: system_assets Approved users update system_assets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users update system_assets" ON public.system_assets FOR UPDATE TO authenticated USING (public.is_approved()) WITH CHECK (public.is_approved());


--
-- Name: system_compliance_records Approved users update system_compliance_records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users update system_compliance_records" ON public.system_compliance_records FOR UPDATE TO authenticated USING (public.is_approved()) WITH CHECK (public.is_approved());


--
-- Name: activity_log Users can view their own activity; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own activity" ON public.activity_log FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: profiles Users read own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));


--
-- Name: user_roles Users read own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: profiles Users update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id));


--
-- Name: activity_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

--
-- Name: asset_compliance_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.asset_compliance_records ENABLE ROW LEVEL SECURITY;

--
-- Name: asset_controls; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.asset_controls ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_chain_head; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_chain_head ENABLE ROW LEVEL SECURITY;

--
-- Name: class_sl_mapping; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.class_sl_mapping ENABLE ROW LEVEL SECURITY;

--
-- Name: compensating_measures; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.compensating_measures ENABLE ROW LEVEL SECURITY;

--
-- Name: compliance_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.compliance_records ENABLE ROW LEVEL SECURITY;

--
-- Name: component_compliance_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.component_compliance_records ENABLE ROW LEVEL SECURITY;

--
-- Name: component_types; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.component_types ENABLE ROW LEVEL SECURITY;

--
-- Name: domain_checklists; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.domain_checklists ENABLE ROW LEVEL SECURITY;

--
-- Name: export_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.export_history ENABLE ROW LEVEL SECURITY;

--
-- Name: facilities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;

--
-- Name: facility_systems; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.facility_systems ENABLE ROW LEVEL SECURITY;

--
-- Name: information_systems; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.information_systems ENABLE ROW LEVEL SECURITY;

--
-- Name: installation_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.installation_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: procurement_projects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.procurement_projects ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: project_requirements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_requirements ENABLE ROW LEVEL SECURITY;

--
-- Name: requirement_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.requirement_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: requirement_catalog_releases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.requirement_catalog_releases ENABLE ROW LEVEL SECURITY;

--
-- Name: requirement_domain_suggestions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.requirement_domain_suggestions ENABLE ROW LEVEL SECURITY;

--
-- Name: requirement_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.requirement_links ENABLE ROW LEVEL SECURITY;

--
-- Name: requirement_profile_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.requirement_profile_items ENABLE ROW LEVEL SECURITY;

--
-- Name: requirement_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.requirement_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: requirement_reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.requirement_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: requirement_sources; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.requirement_sources ENABLE ROW LEVEL SECURITY;

--
-- Name: requirement_test_mappings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.requirement_test_mappings ENABLE ROW LEVEL SECURITY;

--
-- Name: requirements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.requirements ENABLE ROW LEVEL SECURITY;

--
-- Name: review_batches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.review_batches ENABLE ROW LEVEL SECURITY;

--
-- Name: scoring_thresholds; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scoring_thresholds ENABLE ROW LEVEL SECURITY;

--
-- Name: security_domains; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.security_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: system_assets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_assets ENABLE ROW LEVEL SECURITY;

--
-- Name: system_compliance_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_compliance_records ENABLE ROW LEVEL SECURITY;

--
-- Name: test_mapping_notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_mapping_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA auth; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA auth TO anon;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT USAGE ON SCHEMA auth TO service_role;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION jwt(); Type: ACL; Schema: auth; Owner: -
--

GRANT ALL ON FUNCTION auth.jwt() TO anon;
GRANT ALL ON FUNCTION auth.jwt() TO authenticated;
GRANT ALL ON FUNCTION auth.jwt() TO service_role;


--
-- Name: FUNCTION role(); Type: ACL; Schema: auth; Owner: -
--

GRANT ALL ON FUNCTION auth.role() TO anon;
GRANT ALL ON FUNCTION auth.role() TO authenticated;
GRANT ALL ON FUNCTION auth.role() TO service_role;


--
-- Name: FUNCTION uid(); Type: ACL; Schema: auth; Owner: -
--

GRANT ALL ON FUNCTION auth.uid() TO anon;
GRANT ALL ON FUNCTION auth.uid() TO authenticated;
GRANT ALL ON FUNCTION auth.uid() TO service_role;


--
-- Name: FUNCTION _current_email(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public._current_email() FROM PUBLIC;
GRANT ALL ON FUNCTION public._current_email() TO authenticated;
GRANT ALL ON FUNCTION public._current_email() TO service_role;


--
-- Name: FUNCTION activity_row_hash(_seq bigint, _created_at timestamp with time zone, _user_id uuid, _user_email text, _action text, _entity_type text, _entity_id uuid, _entity_label text, _metadata jsonb, _source text, _prev_hash text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.activity_row_hash(_seq bigint, _created_at timestamp with time zone, _user_id uuid, _user_email text, _action text, _entity_type text, _entity_id uuid, _entity_label text, _metadata jsonb, _source text, _prev_hash text) TO anon;
GRANT ALL ON FUNCTION public.activity_row_hash(_seq bigint, _created_at timestamp with time zone, _user_id uuid, _user_email text, _action text, _entity_type text, _entity_id uuid, _entity_label text, _metadata jsonb, _source text, _prev_hash text) TO authenticated;
GRANT ALL ON FUNCTION public.activity_row_hash(_seq bigint, _created_at timestamp with time zone, _user_id uuid, _user_email text, _action text, _entity_type text, _entity_id uuid, _entity_label text, _metadata jsonb, _source text, _prev_hash text) TO service_role;


--
-- Name: FUNCTION applicable_requirements_for_facility_attrs(_attrs jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.applicable_requirements_for_facility_attrs(_attrs jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.applicable_requirements_for_facility_attrs(_attrs jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.applicable_requirements_for_facility_attrs(_attrs jsonb) TO service_role;


--
-- Name: FUNCTION apply_profile_to_project(_profile_id uuid, _project_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.apply_profile_to_project(_profile_id uuid, _project_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.apply_profile_to_project(_profile_id uuid, _project_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.apply_profile_to_project(_profile_id uuid, _project_id uuid) TO service_role;


--
-- Name: FUNCTION auto_add_requirements(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.auto_add_requirements() FROM PUBLIC;
GRANT ALL ON FUNCTION public.auto_add_requirements() TO authenticated;
GRANT ALL ON FUNCTION public.auto_add_requirements() TO service_role;


--
-- Name: FUNCTION auto_add_requirements_all(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.auto_add_requirements_all() FROM PUBLIC;
GRANT ALL ON FUNCTION public.auto_add_requirements_all() TO authenticated;
GRANT ALL ON FUNCTION public.auto_add_requirements_all() TO service_role;


--
-- Name: FUNCTION auto_approve_admin(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.auto_approve_admin() TO anon;
GRANT ALL ON FUNCTION public.auto_approve_admin() TO authenticated;
GRANT ALL ON FUNCTION public.auto_approve_admin() TO service_role;


--
-- Name: FUNCTION check_compensated_has_measure(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.check_compensated_has_measure() TO anon;
GRANT ALL ON FUNCTION public.check_compensated_has_measure() TO authenticated;
GRANT ALL ON FUNCTION public.check_compensated_has_measure() TO service_role;


--
-- Name: FUNCTION clean_sheet_value(_v text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.clean_sheet_value(_v text) TO anon;
GRANT ALL ON FUNCTION public.clean_sheet_value(_v text) TO authenticated;
GRANT ALL ON FUNCTION public.clean_sheet_value(_v text) TO service_role;


--
-- Name: FUNCTION compliance_record_is_untouched(_status public.compliance_status, _evidence text, _evidence_url text, _evidence_file_name text, _justification text, _verified_by uuid, _notes text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.compliance_record_is_untouched(_status public.compliance_status, _evidence text, _evidence_url text, _evidence_file_name text, _justification text, _verified_by uuid, _notes text) TO anon;
GRANT ALL ON FUNCTION public.compliance_record_is_untouched(_status public.compliance_status, _evidence text, _evidence_url text, _evidence_file_name text, _justification text, _verified_by uuid, _notes text) TO authenticated;
GRANT ALL ON FUNCTION public.compliance_record_is_untouched(_status public.compliance_status, _evidence text, _evidence_url text, _evidence_file_name text, _justification text, _verified_by uuid, _notes text) TO service_role;


--
-- Name: TABLE component_compliance_records; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.component_compliance_records TO authenticated;
GRANT ALL ON TABLE public.component_compliance_records TO service_role;


--
-- Name: FUNCTION component_record_is_untouched(c public.component_compliance_records); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.component_record_is_untouched(c public.component_compliance_records) TO anon;
GRANT ALL ON FUNCTION public.component_record_is_untouched(c public.component_compliance_records) TO authenticated;
GRANT ALL ON FUNCTION public.component_record_is_untouched(c public.component_compliance_records) TO service_role;


--
-- Name: FUNCTION copy_requirement_profile(_profile_id uuid, _name text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.copy_requirement_profile(_profile_id uuid, _name text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.copy_requirement_profile(_profile_id uuid, _name text) TO authenticated;
GRANT ALL ON FUNCTION public.copy_requirement_profile(_profile_id uuid, _name text) TO service_role;


--
-- Name: TABLE review_batches; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.review_batches TO service_role;
GRANT SELECT ON TABLE public.review_batches TO authenticated;


--
-- Name: FUNCTION create_review_batch(_requirement_ids uuid[], _filters jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.create_review_batch(_requirement_ids uuid[], _filters jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.create_review_batch(_requirement_ids uuid[], _filters jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.create_review_batch(_requirement_ids uuid[], _filters jsonb) TO service_role;


--
-- Name: FUNCTION decide_domain_suggestions(_suggestion_ids uuid[], _approve boolean, _domain_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.decide_domain_suggestions(_suggestion_ids uuid[], _approve boolean, _domain_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.decide_domain_suggestions(_suggestion_ids uuid[], _approve boolean, _domain_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.decide_domain_suggestions(_suggestion_ids uuid[], _approve boolean, _domain_id uuid) TO service_role;


--
-- Name: FUNCTION decide_requirement_links(_link_ids uuid[], _approve boolean, _coverage text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.decide_requirement_links(_link_ids uuid[], _approve boolean, _coverage text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.decide_requirement_links(_link_ids uuid[], _approve boolean, _coverage text) TO authenticated;
GRANT ALL ON FUNCTION public.decide_requirement_links(_link_ids uuid[], _approve boolean, _coverage text) TO service_role;


--
-- Name: FUNCTION effective_system_class(_system_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.effective_system_class(_system_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.effective_system_class(_system_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.effective_system_class(_system_id uuid) TO service_role;


--
-- Name: FUNCTION export_requirement_catalog(_notes text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.export_requirement_catalog(_notes text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.export_requirement_catalog(_notes text) TO authenticated;
GRANT ALL ON FUNCTION public.export_requirement_catalog(_notes text) TO service_role;


--
-- Name: FUNCTION export_requirement_diff(_filters jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.export_requirement_diff(_filters jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.export_requirement_diff(_filters jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.export_requirement_diff(_filters jsonb) TO service_role;


--
-- Name: FUNCTION export_scope_key(_filters jsonb); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.export_scope_key(_filters jsonb) TO anon;
GRANT ALL ON FUNCTION public.export_scope_key(_filters jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.export_scope_key(_filters jsonb) TO service_role;


--
-- Name: FUNCTION forbid_log_modification(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.forbid_log_modification() TO anon;
GRANT ALL ON FUNCTION public.forbid_log_modification() TO authenticated;
GRANT ALL ON FUNCTION public.forbid_log_modification() TO service_role;


--
-- Name: FUNCTION get_applicable_requirements(object_type text, object_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_applicable_requirements(object_type text, object_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_applicable_requirements(object_type text, object_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_applicable_requirements(object_type text, object_id uuid) TO service_role;


--
-- Name: FUNCTION get_requirement_matches(_requirement_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_requirement_matches(_requirement_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_requirement_matches(_requirement_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_requirement_matches(_requirement_id uuid) TO service_role;


--
-- Name: FUNCTION guess_source_level(_name text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.guess_source_level(_name text) TO anon;
GRANT ALL ON FUNCTION public.guess_source_level(_name text) TO authenticated;
GRANT ALL ON FUNCTION public.guess_source_level(_name text) TO service_role;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;


--
-- Name: FUNCTION handle_user_email_confirmed(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_user_email_confirmed() TO anon;
GRANT ALL ON FUNCTION public.handle_user_email_confirmed() TO authenticated;
GRANT ALL ON FUNCTION public.handle_user_email_confirmed() TO service_role;


--
-- Name: FUNCTION has_role(_user_id uuid, _role public.app_role); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) FROM PUBLIC;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO authenticated;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO service_role;


--
-- Name: FUNCTION import_requirement_catalog(_content text, _sha256 text, _signature_key_id text, _signature_verified boolean); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.import_requirement_catalog(_content text, _sha256 text, _signature_key_id text, _signature_verified boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.import_requirement_catalog(_content text, _sha256 text, _signature_key_id text, _signature_verified boolean) TO authenticated;
GRANT ALL ON FUNCTION public.import_requirement_catalog(_content text, _sha256 text, _signature_key_id text, _signature_verified boolean) TO service_role;


--
-- Name: FUNCTION import_requirement_link_rows(_law_source_id uuid, _regulation_source_id uuid, _standard_source_id uuid, _rows jsonb, _file_name text, _apply boolean); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.import_requirement_link_rows(_law_source_id uuid, _regulation_source_id uuid, _standard_source_id uuid, _rows jsonb, _file_name text, _apply boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.import_requirement_link_rows(_law_source_id uuid, _regulation_source_id uuid, _standard_source_id uuid, _rows jsonb, _file_name text, _apply boolean) TO authenticated;
GRANT ALL ON FUNCTION public.import_requirement_link_rows(_law_source_id uuid, _regulation_source_id uuid, _standard_source_id uuid, _rows jsonb, _file_name text, _apply boolean) TO service_role;


--
-- Name: FUNCTION inherited_system_class(_system_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.inherited_system_class(_system_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.inherited_system_class(_system_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.inherited_system_class(_system_id uuid) TO service_role;


--
-- Name: FUNCTION is_approved(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.is_approved() FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_approved() TO authenticated;
GRANT ALL ON FUNCTION public.is_approved() TO service_role;


--
-- Name: FUNCTION jsonb_bool(v jsonb); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.jsonb_bool(v jsonb) TO anon;
GRANT ALL ON FUNCTION public.jsonb_bool(v jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.jsonb_bool(v jsonb) TO service_role;


--
-- Name: FUNCTION jsonb_changes(_old jsonb, _new jsonb); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.jsonb_changes(_old jsonb, _new jsonb) TO anon;
GRANT ALL ON FUNCTION public.jsonb_changes(_old jsonb, _new jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.jsonb_changes(_old jsonb, _new jsonb) TO service_role;


--
-- Name: FUNCTION jsonb_has_text(v jsonb, t text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.jsonb_has_text(v jsonb, t text) TO anon;
GRANT ALL ON FUNCTION public.jsonb_has_text(v jsonb, t text) TO authenticated;
GRANT ALL ON FUNCTION public.jsonb_has_text(v jsonb, t text) TO service_role;


--
-- Name: FUNCTION jsonb_num(v jsonb); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.jsonb_num(v jsonb) TO anon;
GRANT ALL ON FUNCTION public.jsonb_num(v jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.jsonb_num(v jsonb) TO service_role;


--
-- Name: FUNCTION log_app_event(_action text, _entity_type text, _entity_id uuid, _entity_label text, _metadata jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.log_app_event(_action text, _entity_type text, _entity_id uuid, _entity_label text, _metadata jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.log_app_event(_action text, _entity_type text, _entity_id uuid, _entity_label text, _metadata jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.log_app_event(_action text, _entity_type text, _entity_id uuid, _entity_label text, _metadata jsonb) TO service_role;


--
-- Name: FUNCTION log_compliance_set_change(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.log_compliance_set_change() TO anon;
GRANT ALL ON FUNCTION public.log_compliance_set_change() TO authenticated;
GRANT ALL ON FUNCTION public.log_compliance_set_change() TO service_role;


--
-- Name: FUNCTION log_compliance_update(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.log_compliance_update() TO anon;
GRANT ALL ON FUNCTION public.log_compliance_update() TO authenticated;
GRANT ALL ON FUNCTION public.log_compliance_update() TO service_role;


--
-- Name: FUNCTION log_component_sync(_asset_id uuid, _label text, _metadata jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.log_component_sync(_asset_id uuid, _label text, _metadata jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.log_component_sync(_asset_id uuid, _label text, _metadata jsonb) TO service_role;
GRANT ALL ON FUNCTION public.log_component_sync(_asset_id uuid, _label text, _metadata jsonb) TO authenticated;


--
-- Name: FUNCTION log_entity_change(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.log_entity_change() TO anon;
GRANT ALL ON FUNCTION public.log_entity_change() TO authenticated;
GRANT ALL ON FUNCTION public.log_entity_change() TO service_role;


--
-- Name: FUNCTION log_facility_link(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.log_facility_link() TO anon;
GRANT ALL ON FUNCTION public.log_facility_link() TO authenticated;
GRANT ALL ON FUNCTION public.log_facility_link() TO service_role;


--
-- Name: FUNCTION log_installation_settings(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.log_installation_settings() TO anon;
GRANT ALL ON FUNCTION public.log_installation_settings() TO authenticated;
GRANT ALL ON FUNCTION public.log_installation_settings() TO service_role;


--
-- Name: FUNCTION log_requirement_audit_entry(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.log_requirement_audit_entry() TO anon;
GRANT ALL ON FUNCTION public.log_requirement_audit_entry() TO authenticated;
GRANT ALL ON FUNCTION public.log_requirement_audit_entry() TO service_role;


--
-- Name: FUNCTION log_requirement_link_change(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.log_requirement_link_change() TO anon;
GRANT ALL ON FUNCTION public.log_requirement_link_change() TO authenticated;
GRANT ALL ON FUNCTION public.log_requirement_link_change() TO service_role;


--
-- Name: FUNCTION log_review_activity(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.log_review_activity() TO anon;
GRANT ALL ON FUNCTION public.log_review_activity() TO authenticated;
GRANT ALL ON FUNCTION public.log_review_activity() TO service_role;


--
-- Name: FUNCTION mark_local_on_insert(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.mark_local_on_insert() TO anon;
GRANT ALL ON FUNCTION public.mark_local_on_insert() TO authenticated;
GRANT ALL ON FUNCTION public.mark_local_on_insert() TO service_role;


--
-- Name: FUNCTION match_requirement_ref(_source_id uuid, _ref text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.match_requirement_ref(_source_id uuid, _ref text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.match_requirement_ref(_source_id uuid, _ref text) TO authenticated;
GRANT ALL ON FUNCTION public.match_requirement_ref(_source_id uuid, _ref text) TO service_role;


--
-- Name: FUNCTION metric_compliance(_fulfilled bigint, _assessed bigint, _not_applicable bigint); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.metric_compliance(_fulfilled bigint, _assessed bigint, _not_applicable bigint) TO anon;
GRANT ALL ON FUNCTION public.metric_compliance(_fulfilled bigint, _assessed bigint, _not_applicable bigint) TO authenticated;
GRANT ALL ON FUNCTION public.metric_compliance(_fulfilled bigint, _assessed bigint, _not_applicable bigint) TO service_role;


--
-- Name: FUNCTION metric_coverage(_assessed bigint, _total bigint); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.metric_coverage(_assessed bigint, _total bigint) TO anon;
GRANT ALL ON FUNCTION public.metric_coverage(_assessed bigint, _total bigint) TO authenticated;
GRANT ALL ON FUNCTION public.metric_coverage(_assessed bigint, _total bigint) TO service_role;


--
-- Name: FUNCTION normalize_section_ref(_ref text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.normalize_section_ref(_ref text) TO anon;
GRANT ALL ON FUNCTION public.normalize_section_ref(_ref text) TO authenticated;
GRANT ALL ON FUNCTION public.normalize_section_ref(_ref text) TO service_role;


--
-- Name: FUNCTION prevent_delete_assessed_requirement(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.prevent_delete_assessed_requirement() TO anon;
GRANT ALL ON FUNCTION public.prevent_delete_assessed_requirement() TO authenticated;
GRANT ALL ON FUNCTION public.prevent_delete_assessed_requirement() TO service_role;


--
-- Name: FUNCTION prevent_delete_assessed_source(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.prevent_delete_assessed_source() TO anon;
GRANT ALL ON FUNCTION public.prevent_delete_assessed_source() TO authenticated;
GRANT ALL ON FUNCTION public.prevent_delete_assessed_source() TO service_role;


--
-- Name: FUNCTION preview_requirement_catalog_import(_content text, _sha256 text, _signature_key_id text, _signature_verified boolean); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.preview_requirement_catalog_import(_content text, _sha256 text, _signature_key_id text, _signature_verified boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.preview_requirement_catalog_import(_content text, _sha256 text, _signature_key_id text, _signature_verified boolean) TO authenticated;
GRANT ALL ON FUNCTION public.preview_requirement_catalog_import(_content text, _sha256 text, _signature_key_id text, _signature_verified boolean) TO service_role;


--
-- Name: FUNCTION profile_na_justification(_text text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.profile_na_justification(_text text) TO anon;
GRANT ALL ON FUNCTION public.profile_na_justification(_text text) TO authenticated;
GRANT ALL ON FUNCTION public.profile_na_justification(_text text) TO service_role;


--
-- Name: FUNCTION protect_profile_fields(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.protect_profile_fields() TO anon;
GRANT ALL ON FUNCTION public.protect_profile_fields() TO authenticated;
GRANT ALL ON FUNCTION public.protect_profile_fields() TO service_role;


--
-- Name: FUNCTION record_compliance_export(_export_id text, _file_name text, _filters jsonb, _row_counts jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.record_compliance_export(_export_id text, _file_name text, _filters jsonb, _row_counts jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.record_compliance_export(_export_id text, _file_name text, _filters jsonb, _row_counts jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.record_compliance_export(_export_id text, _file_name text, _filters jsonb, _row_counts jsonb) TO service_role;


--
-- Name: FUNCTION repeal_requirement(_requirement_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.repeal_requirement(_requirement_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.repeal_requirement(_requirement_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.repeal_requirement(_requirement_id uuid) TO service_role;


--
-- Name: FUNCTION require_admin(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.require_admin() FROM PUBLIC;
GRANT ALL ON FUNCTION public.require_admin() TO authenticated;
GRANT ALL ON FUNCTION public.require_admin() TO service_role;


--
-- Name: FUNCTION requirement_addresses_asset(_source_id uuid, _target_type text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.requirement_addresses_asset(_source_id uuid, _target_type text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.requirement_addresses_asset(_source_id uuid, _target_type text) TO authenticated;
GRANT ALL ON FUNCTION public.requirement_addresses_asset(_source_id uuid, _target_type text) TO service_role;


--
-- Name: FUNCTION requirement_content_hash(_requirement_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.requirement_content_hash(_requirement_id uuid) TO anon;
GRANT ALL ON FUNCTION public.requirement_content_hash(_requirement_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.requirement_content_hash(_requirement_id uuid) TO service_role;


--
-- Name: FUNCTION requirement_passes_level(_sl_capability smallint, _min_classification_level smallint, _level smallint); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.requirement_passes_level(_sl_capability smallint, _min_classification_level smallint, _level smallint) TO anon;
GRANT ALL ON FUNCTION public.requirement_passes_level(_sl_capability smallint, _min_classification_level smallint, _level smallint) TO authenticated;
GRANT ALL ON FUNCTION public.requirement_passes_level(_sl_capability smallint, _min_classification_level smallint, _level smallint) TO service_role;


--
-- Name: FUNCTION requirement_snapshot(_scope jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.requirement_snapshot(_scope jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.requirement_snapshot(_scope jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.requirement_snapshot(_scope jsonb) TO service_role;


--
-- Name: FUNCTION requirement_sync_pending(_object_type text, _object_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.requirement_sync_pending(_object_type text, _object_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.requirement_sync_pending(_object_type text, _object_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.requirement_sync_pending(_object_type text, _object_id uuid) TO service_role;


--
-- Name: FUNCTION requirement_work_count(_requirement_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.requirement_work_count(_requirement_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.requirement_work_count(_requirement_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.requirement_work_count(_requirement_id uuid) TO service_role;


--
-- Name: FUNCTION save_project_as_profile(_project_id uuid, _name text, _description text, _component_type_id uuid, _target_sl smallint); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.save_project_as_profile(_project_id uuid, _name text, _description text, _component_type_id uuid, _target_sl smallint) FROM PUBLIC;
GRANT ALL ON FUNCTION public.save_project_as_profile(_project_id uuid, _name text, _description text, _component_type_id uuid, _target_sl smallint) TO authenticated;
GRANT ALL ON FUNCTION public.save_project_as_profile(_project_id uuid, _name text, _description text, _component_type_id uuid, _target_sl smallint) TO service_role;


--
-- Name: FUNCTION seal_activity_log(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.seal_activity_log() TO anon;
GRANT ALL ON FUNCTION public.seal_activity_log() TO authenticated;
GRANT ALL ON FUNCTION public.seal_activity_log() TO service_role;


--
-- Name: FUNCTION set_source_level_on_insert(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_source_level_on_insert() TO anon;
GRANT ALL ON FUNCTION public.set_source_level_on_insert() TO authenticated;
GRANT ALL ON FUNCTION public.set_source_level_on_insert() TO service_role;


--
-- Name: FUNCTION simulate_facility_requirements(_facility_id uuid, _overrides jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.simulate_facility_requirements(_facility_id uuid, _overrides jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.simulate_facility_requirements(_facility_id uuid, _overrides jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.simulate_facility_requirements(_facility_id uuid, _overrides jsonb) TO service_role;


--
-- Name: FUNCTION source_level_rank(_level public.source_level); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.source_level_rank(_level public.source_level) TO anon;
GRANT ALL ON FUNCTION public.source_level_rank(_level public.source_level) TO authenticated;
GRANT ALL ON FUNCTION public.source_level_rank(_level public.source_level) TO service_role;


--
-- Name: FUNCTION stamp_compensating_measure(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.stamp_compensating_measure() TO anon;
GRANT ALL ON FUNCTION public.stamp_compensating_measure() TO authenticated;
GRANT ALL ON FUNCTION public.stamp_compensating_measure() TO service_role;


--
-- Name: FUNCTION stamp_requirement_audit_actor(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.stamp_requirement_audit_actor() TO anon;
GRANT ALL ON FUNCTION public.stamp_requirement_audit_actor() TO authenticated;
GRANT ALL ON FUNCTION public.stamp_requirement_audit_actor() TO service_role;


--
-- Name: FUNCTION stamp_requirement_link_author(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.stamp_requirement_link_author() TO anon;
GRANT ALL ON FUNCTION public.stamp_requirement_link_author() TO authenticated;
GRANT ALL ON FUNCTION public.stamp_requirement_link_author() TO service_role;


--
-- Name: FUNCTION stamp_requirement_review_actor(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.stamp_requirement_review_actor() TO anon;
GRANT ALL ON FUNCTION public.stamp_requirement_review_actor() TO authenticated;
GRANT ALL ON FUNCTION public.stamp_requirement_review_actor() TO service_role;


--
-- Name: FUNCTION stockholm_today(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.stockholm_today() TO anon;
GRANT ALL ON FUNCTION public.stockholm_today() TO authenticated;
GRANT ALL ON FUNCTION public.stockholm_today() TO service_role;


--
-- Name: FUNCTION submit_requirement_reviews(_items jsonb, _batch_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.submit_requirement_reviews(_items jsonb, _batch_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.submit_requirement_reviews(_items jsonb, _batch_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.submit_requirement_reviews(_items jsonb, _batch_id uuid) TO service_role;


--
-- Name: FUNCTION suggest_requirement_link(_parent_requirement_id uuid, _child_requirement_id uuid, _coverage text, _rationale text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.suggest_requirement_link(_parent_requirement_id uuid, _child_requirement_id uuid, _coverage text, _rationale text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.suggest_requirement_link(_parent_requirement_id uuid, _child_requirement_id uuid, _coverage text, _rationale text) TO authenticated;
GRANT ALL ON FUNCTION public.suggest_requirement_link(_parent_requirement_id uuid, _child_requirement_id uuid, _coverage text, _rationale text) TO service_role;


--
-- Name: FUNCTION sync_component_requirements(_asset_id uuid, _mode text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sync_component_requirements(_asset_id uuid, _mode text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.sync_component_requirements(_asset_id uuid, _mode text) TO authenticated;
GRANT ALL ON FUNCTION public.sync_component_requirements(_asset_id uuid, _mode text) TO service_role;


--
-- Name: FUNCTION sync_components_of_types(_type_ids uuid[]); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sync_components_of_types(_type_ids uuid[]) FROM PUBLIC;
GRANT ALL ON FUNCTION public.sync_components_of_types(_type_ids uuid[]) TO authenticated;
GRANT ALL ON FUNCTION public.sync_components_of_types(_type_ids uuid[]) TO service_role;


--
-- Name: FUNCTION sync_requirements(_object_type text, _object_id uuid, _mode text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sync_requirements(_object_type text, _object_id uuid, _mode text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.sync_requirements(_object_type text, _object_id uuid, _mode text) TO authenticated;
GRANT ALL ON FUNCTION public.sync_requirements(_object_type text, _object_id uuid, _mode text) TO service_role;


--
-- Name: FUNCTION target_sl_for_class(_level smallint); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.target_sl_for_class(_level smallint) TO anon;
GRANT ALL ON FUNCTION public.target_sl_for_class(_level smallint) TO authenticated;
GRANT ALL ON FUNCTION public.target_sl_for_class(_level smallint) TO service_role;


--
-- Name: FUNCTION track_requirement_content_change(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.track_requirement_content_change() TO anon;
GRANT ALL ON FUNCTION public.track_requirement_content_change() TO authenticated;
GRANT ALL ON FUNCTION public.track_requirement_content_change() TO service_role;


--
-- Name: FUNCTION trg_asset_component_type_sync(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.trg_asset_component_type_sync() TO anon;
GRANT ALL ON FUNCTION public.trg_asset_component_type_sync() TO authenticated;
GRANT ALL ON FUNCTION public.trg_asset_component_type_sync() TO service_role;


--
-- Name: FUNCTION trg_profile_default_sync(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.trg_profile_default_sync() TO anon;
GRANT ALL ON FUNCTION public.trg_profile_default_sync() TO authenticated;
GRANT ALL ON FUNCTION public.trg_profile_default_sync() TO service_role;


--
-- Name: FUNCTION trg_profile_items_sync(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.trg_profile_items_sync() TO anon;
GRANT ALL ON FUNCTION public.trg_profile_items_sync() TO authenticated;
GRANT ALL ON FUNCTION public.trg_profile_items_sync() TO service_role;


--
-- Name: FUNCTION trigger_has_linked_conditions(_logic jsonb); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.trigger_has_linked_conditions(_logic jsonb) TO anon;
GRANT ALL ON FUNCTION public.trigger_has_linked_conditions(_logic jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.trigger_has_linked_conditions(_logic jsonb) TO service_role;


--
-- Name: FUNCTION trigger_logic_keys(_target text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.trigger_logic_keys(_target text) TO anon;
GRANT ALL ON FUNCTION public.trigger_logic_keys(_target text) TO authenticated;
GRANT ALL ON FUNCTION public.trigger_logic_keys(_target text) TO service_role;


--
-- Name: FUNCTION trigger_logic_problems(_logic jsonb, _target_type text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.trigger_logic_problems(_logic jsonb, _target_type text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.trigger_logic_problems(_logic jsonb, _target_type text) TO authenticated;
GRANT ALL ON FUNCTION public.trigger_logic_problems(_logic jsonb, _target_type text) TO service_role;


--
-- Name: FUNCTION trigger_matches_facility(_logic jsonb, f jsonb); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.trigger_matches_facility(_logic jsonb, f jsonb) TO anon;
GRANT ALL ON FUNCTION public.trigger_matches_facility(_logic jsonb, f jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.trigger_matches_facility(_logic jsonb, f jsonb) TO service_role;


--
-- Name: FUNCTION trigger_matches_linked_facility(_logic jsonb, f jsonb); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.trigger_matches_linked_facility(_logic jsonb, f jsonb) TO anon;
GRANT ALL ON FUNCTION public.trigger_matches_linked_facility(_logic jsonb, f jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.trigger_matches_linked_facility(_logic jsonb, f jsonb) TO service_role;


--
-- Name: FUNCTION trigger_matches_system(_logic jsonb, s jsonb); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.trigger_matches_system(_logic jsonb, s jsonb) TO anon;
GRANT ALL ON FUNCTION public.trigger_matches_system(_logic jsonb, s jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.trigger_matches_system(_logic jsonb, s jsonb) TO service_role;


--
-- Name: FUNCTION update_updated_at_column(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_updated_at_column() TO anon;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO service_role;


--
-- Name: FUNCTION validate_compliance_assessment(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.validate_compliance_assessment() TO anon;
GRANT ALL ON FUNCTION public.validate_compliance_assessment() TO authenticated;
GRANT ALL ON FUNCTION public.validate_compliance_assessment() TO service_role;


--
-- Name: FUNCTION validate_default_profile(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.validate_default_profile() TO anon;
GRANT ALL ON FUNCTION public.validate_default_profile() TO authenticated;
GRANT ALL ON FUNCTION public.validate_default_profile() TO service_role;


--
-- Name: FUNCTION validate_project_requirement(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.validate_project_requirement() TO anon;
GRANT ALL ON FUNCTION public.validate_project_requirement() TO authenticated;
GRANT ALL ON FUNCTION public.validate_project_requirement() TO service_role;


--
-- Name: FUNCTION validate_requirement_applicability(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.validate_requirement_applicability() TO anon;
GRANT ALL ON FUNCTION public.validate_requirement_applicability() TO authenticated;
GRANT ALL ON FUNCTION public.validate_requirement_applicability() TO service_role;


--
-- Name: FUNCTION validate_requirement_link(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.validate_requirement_link() TO anon;
GRANT ALL ON FUNCTION public.validate_requirement_link() TO authenticated;
GRANT ALL ON FUNCTION public.validate_requirement_link() TO service_role;


--
-- Name: FUNCTION validate_requirement_trigger_logic(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.validate_requirement_trigger_logic() TO anon;
GRANT ALL ON FUNCTION public.validate_requirement_trigger_logic() TO authenticated;
GRANT ALL ON FUNCTION public.validate_requirement_trigger_logic() TO service_role;


--
-- Name: FUNCTION validate_source_level_change(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.validate_source_level_change() TO anon;
GRANT ALL ON FUNCTION public.validate_source_level_change() TO authenticated;
GRANT ALL ON FUNCTION public.validate_source_level_change() TO service_role;


--
-- Name: FUNCTION validate_system_class_override(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.validate_system_class_override() TO anon;
GRANT ALL ON FUNCTION public.validate_system_class_override() TO authenticated;
GRANT ALL ON FUNCTION public.validate_system_class_override() TO service_role;


--
-- Name: FUNCTION verify_activity_chain(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.verify_activity_chain() FROM PUBLIC;
GRANT ALL ON FUNCTION public.verify_activity_chain() TO authenticated;
GRANT ALL ON FUNCTION public.verify_activity_chain() TO service_role;


--
-- Name: FUNCTION withdraw_requirement_link(_link_id uuid, _reason text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.withdraw_requirement_link(_link_id uuid, _reason text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.withdraw_requirement_link(_link_id uuid, _reason text) TO authenticated;
GRANT ALL ON FUNCTION public.withdraw_requirement_link(_link_id uuid, _reason text) TO service_role;


--
-- Name: TABLE activity_log; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,REFERENCES,TRIGGER ON TABLE public.activity_log TO authenticated;
GRANT ALL ON TABLE public.activity_log TO service_role;


--
-- Name: TABLE asset_compliance_records; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.asset_compliance_records TO authenticated;
GRANT ALL ON TABLE public.asset_compliance_records TO service_role;


--
-- Name: TABLE asset_controls; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.asset_controls TO authenticated;
GRANT ALL ON TABLE public.asset_controls TO service_role;


--
-- Name: TABLE audit_chain_head; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.audit_chain_head TO service_role;


--
-- Name: TABLE class_sl_mapping; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.class_sl_mapping TO authenticated;
GRANT ALL ON TABLE public.class_sl_mapping TO service_role;
GRANT SELECT ON TABLE public.class_sl_mapping TO anon;


--
-- Name: TABLE compensating_measures; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.compensating_measures TO authenticated;
GRANT ALL ON TABLE public.compensating_measures TO service_role;


--
-- Name: TABLE compliance_records; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.compliance_records TO authenticated;
GRANT ALL ON TABLE public.compliance_records TO service_role;


--
-- Name: TABLE requirements; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.requirements TO authenticated;
GRANT ALL ON TABLE public.requirements TO service_role;


--
-- Name: TABLE system_compliance_records; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.system_compliance_records TO authenticated;
GRANT ALL ON TABLE public.system_compliance_records TO service_role;


--
-- Name: TABLE compliance_record_scope; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.compliance_record_scope TO authenticated;
GRANT ALL ON TABLE public.compliance_record_scope TO service_role;


--
-- Name: TABLE compliance_domain_metrics; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.compliance_domain_metrics TO authenticated;
GRANT ALL ON TABLE public.compliance_domain_metrics TO service_role;


--
-- Name: TABLE compliance_object_metrics; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.compliance_object_metrics TO authenticated;
GRANT ALL ON TABLE public.compliance_object_metrics TO service_role;


--
-- Name: TABLE system_assets; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.system_assets TO authenticated;
GRANT ALL ON TABLE public.system_assets TO service_role;


--
-- Name: TABLE component_requirement_metrics; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.component_requirement_metrics TO authenticated;
GRANT ALL ON TABLE public.component_requirement_metrics TO service_role;


--
-- Name: TABLE component_types; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.component_types TO authenticated;
GRANT ALL ON TABLE public.component_types TO service_role;


--
-- Name: TABLE domain_checklists; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.domain_checklists TO authenticated;
GRANT ALL ON TABLE public.domain_checklists TO service_role;


--
-- Name: TABLE export_history; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,REFERENCES,TRIGGER ON TABLE public.export_history TO authenticated;
GRANT ALL ON TABLE public.export_history TO service_role;


--
-- Name: TABLE facilities; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.facilities TO authenticated;
GRANT ALL ON TABLE public.facilities TO service_role;


--
-- Name: TABLE facility_systems; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.facility_systems TO authenticated;
GRANT ALL ON TABLE public.facility_systems TO service_role;


--
-- Name: TABLE facility_rollup_metrics; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.facility_rollup_metrics TO authenticated;
GRANT ALL ON TABLE public.facility_rollup_metrics TO service_role;


--
-- Name: TABLE information_systems; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.information_systems TO authenticated;
GRANT ALL ON TABLE public.information_systems TO service_role;


--
-- Name: TABLE installation_settings; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,UPDATE ON TABLE public.installation_settings TO authenticated;
GRANT ALL ON TABLE public.installation_settings TO service_role;


--
-- Name: TABLE procurement_projects; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.procurement_projects TO authenticated;
GRANT ALL ON TABLE public.procurement_projects TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


--
-- Name: TABLE project_requirements; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.project_requirements TO authenticated;
GRANT ALL ON TABLE public.project_requirements TO service_role;


--
-- Name: TABLE requirement_audit_log; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER ON TABLE public.requirement_audit_log TO authenticated;
GRANT ALL ON TABLE public.requirement_audit_log TO service_role;


--
-- Name: TABLE requirement_catalog_releases; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.requirement_catalog_releases TO authenticated;
GRANT ALL ON TABLE public.requirement_catalog_releases TO service_role;


--
-- Name: TABLE requirement_domain_suggestions; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.requirement_domain_suggestions TO authenticated;
GRANT ALL ON TABLE public.requirement_domain_suggestions TO service_role;


--
-- Name: TABLE requirement_links; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT ON TABLE public.requirement_links TO authenticated;
GRANT ALL ON TABLE public.requirement_links TO service_role;


--
-- Name: TABLE requirement_sources; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.requirement_sources TO authenticated;
GRANT ALL ON TABLE public.requirement_sources TO service_role;


--
-- Name: TABLE requirement_link_details; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.requirement_link_details TO authenticated;
GRANT ALL ON TABLE public.requirement_link_details TO service_role;


--
-- Name: TABLE requirement_profile_items; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.requirement_profile_items TO authenticated;
GRANT ALL ON TABLE public.requirement_profile_items TO service_role;


--
-- Name: TABLE requirement_profiles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.requirement_profiles TO authenticated;
GRANT ALL ON TABLE public.requirement_profiles TO service_role;


--
-- Name: TABLE requirement_reviews; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER ON TABLE public.requirement_reviews TO authenticated;
GRANT ALL ON TABLE public.requirement_reviews TO service_role;


--
-- Name: TABLE requirement_review_status; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.requirement_review_status TO authenticated;
GRANT ALL ON TABLE public.requirement_review_status TO service_role;


--
-- Name: TABLE requirement_test_mappings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.requirement_test_mappings TO authenticated;
GRANT ALL ON TABLE public.requirement_test_mappings TO service_role;


--
-- Name: TABLE scoring_thresholds; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.scoring_thresholds TO authenticated;
GRANT ALL ON TABLE public.scoring_thresholds TO service_role;
GRANT SELECT ON TABLE public.scoring_thresholds TO anon;


--
-- Name: TABLE security_domains; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.security_domains TO authenticated;
GRANT ALL ON TABLE public.security_domains TO service_role;


--
-- Name: TABLE system_classification; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.system_classification TO authenticated;
GRANT ALL ON TABLE public.system_classification TO service_role;


--
-- Name: TABLE test_mapping_notes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.test_mapping_notes TO authenticated;
GRANT ALL ON TABLE public.test_mapping_notes TO service_role;


--
-- Name: TABLE user_roles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.user_roles TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--


