-- 0003: Inläsning av kravdokument som bakgrundsjobb.
--
-- Prototypen tolkade PDF:en i webbläsaren och loopade över chunkar mot
-- AI-funktionen; stängdes fliken försvann allt. Nu: API:t sparar filen och
-- skapar ett jobb, AI-tjänsten bearbetar det (Docling → chunkar → extraktion)
-- och uppdaterar progress här, gränssnittet följer jobbet och visar förslagen
-- för granskning när det är klart. Ingenting skrivs i requirements av jobbet –
-- förslagen godkänns av användaren som förut (AI föreslår, människa godkänner).

CREATE TABLE IF NOT EXISTS public.ingestion_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  document_name text NOT NULL,
  file_path text NOT NULL,              -- i filarkivet (requirement-documents/…)
  language text,                        -- sv | en | null
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'parsing', 'extracting', 'done', 'failed')),
  total_chunks integer,
  done_chunks integer NOT NULL DEFAULT 0,
  total_pages integer,
  model text,
  error text,
  result jsonb                          -- {requirements: [...]} när status = done
);
CREATE INDEX IF NOT EXISTS ingestion_jobs_created_by ON public.ingestion_jobs (created_by, created_at DESC);

ALTER TABLE public.ingestion_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ingestion_jobs FROM PUBLIC, anon;
GRANT SELECT ON public.ingestion_jobs TO authenticated;
DROP POLICY IF EXISTS "Egna inläsningsjobb" ON public.ingestion_jobs;
CREATE POLICY "Egna inläsningsjobb" ON public.ingestion_jobs
  FOR SELECT TO authenticated USING (public.is_approved() AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin')));

-- Skapas av API:t för den inloggade användaren
CREATE OR REPLACE FUNCTION public.create_ingestion_job(_id uuid, _document_name text, _file_path text, _language text)
RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_approved() THEN
    RAISE EXCEPTION 'Kontot är inte godkänt' USING ERRCODE = 'insufficient_privilege';
  END IF;
  INSERT INTO public.ingestion_jobs (id, created_by, document_name, file_path, language)
  VALUES (_id, auth.uid(), _document_name, _file_path, _language);
  INSERT INTO public.activity_log (action, entity_type, entity_id, entity_label, metadata)
  VALUES ('ingestion_started', 'ingestion_job', _id, _document_name, jsonb_build_object('fil', _file_path, 'språk', _language));
  RETURN _id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_ingestion_job(uuid, text, text, text) TO authenticated;

-- Uppdateras av AI-tjänsten (app_api utan användare)
CREATE OR REPLACE FUNCTION public.update_ingestion_job(_id uuid, _status text, _total_chunks integer, _done_chunks integer,
                                                       _total_pages integer, _model text, _error text, _result jsonb)
RETURNS void
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.ingestion_jobs
     SET status = coalesce(_status, status),
         total_chunks = coalesce(_total_chunks, total_chunks),
         done_chunks = coalesce(_done_chunks, done_chunks),
         total_pages = coalesce(_total_pages, total_pages),
         model = coalesce(_model, model),
         error = _error,
         result = coalesce(_result, result),
         updated_at = now()
   WHERE id = _id
$$;
REVOKE ALL ON FUNCTION public.update_ingestion_job(uuid, text, integer, integer, integer, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_ingestion_job(uuid, text, integer, integer, integer, text, text, jsonb) TO app_api;

-- AI-tjänsten läser jobbet (utan användare)
CREATE OR REPLACE FUNCTION public.get_ingestion_job(_id uuid)
RETURNS public.ingestion_jobs
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.ingestion_jobs WHERE id = _id
$$;
REVOKE ALL ON FUNCTION public.get_ingestion_job(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_ingestion_job(uuid) TO app_api;

-- Domänlistan till extraktionen skickas med av API:t (hämtad som användaren).
