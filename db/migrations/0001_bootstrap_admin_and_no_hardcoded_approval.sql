-- 0001: Ta bort hårdkodat auto-godkännande (@addcontext.se) och inför en
-- kontrollerad väg för första administratören.
--
-- Godkännande sker av en administratör i gränssnittet. Första administratören
-- sätts av API:t vid inloggning via bootstrap_admin(): bara om ingen
-- administratör finns, eller om e-posten finns i installationens
-- bootstrap-lista (miljövariabeln BOOTSTRAP_ADMIN_EMAILS). Loggas i kedjan.

CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  -- Inget automatiskt godkännande längre. Behålls som trigger för att
  -- schemat ska vara oförändrat; godkännande sker via admin eller bootstrap.
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.bootstrap_admin(_user_id uuid, _bootstrap_emails text[] DEFAULT '{}')
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_email text;
  v_has_admin boolean;
BEGIN
  SELECT lower(email) INTO v_email FROM auth.users WHERE id = _user_id;
  IF v_email IS NULL THEN RETURN false; END IF;
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO v_has_admin;
  IF v_has_admin AND NOT (v_email = ANY (SELECT lower(e) FROM unnest(_bootstrap_emails) e)) THEN
    RETURN false;
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin') THEN
    RETURN false;
  END IF;
  UPDATE public.profiles SET approved = true WHERE id = _user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'admin') ON CONFLICT DO NOTHING;
  INSERT INTO public.activity_log (action, entity_type, entity_id, entity_label, metadata)
  VALUES ('admin_bootstrapped', 'profile', _user_id, v_email,
          jsonb_build_object('orsak', CASE WHEN v_has_admin THEN 'bootstrap-lista' ELSE 'första administratören' END));
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_admin(uuid, text[]) FROM PUBLIC, anon, authenticated;
-- Anropas bara av API:t med dess egen roll (app_api), aldrig via PostgREST.
GRANT EXECUTE ON FUNCTION public.bootstrap_admin(uuid, text[]) TO app_api;

-- API:t (app_api) äger användartabellen: skapar/uppdaterar vid inloggning.
GRANT SELECT, INSERT, UPDATE ON auth.users TO app_api;
