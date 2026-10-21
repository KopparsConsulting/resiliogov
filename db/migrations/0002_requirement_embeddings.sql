-- 0002: Semantisk sökning i kravmassan. Varje krav får en vektor (bge-m3,
-- 1024 dimensioner) beräknad av AI-tjänsten på den lokala modellservern.
-- Tabellen är härledd data: kan tömmas och byggas om när som helst.
-- content_hash kopplar vektorn till kravtextens version så att ändrade krav
-- indexeras om automatiskt.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.requirement_embeddings (
  requirement_id uuid PRIMARY KEY REFERENCES public.requirements(id) ON DELETE CASCADE,
  model text NOT NULL,
  content_hash text NOT NULL,
  embedding vector(1024) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS requirement_embeddings_hnsw
  ON public.requirement_embeddings USING hnsw (embedding vector_cosine_ops);

ALTER TABLE public.requirement_embeddings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.requirement_embeddings FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.requirement_embeddings TO authenticated;
DROP POLICY IF EXISTS "Godkända användare läser embeddings" ON public.requirement_embeddings;
CREATE POLICY "Godkända användare läser embeddings" ON public.requirement_embeddings
  FOR ALL TO authenticated USING (public.is_approved()) WITH CHECK (public.is_approved());

-- Krav som saknar aktuell vektor (nya, ändrade eller indexerade med annan modell)
CREATE OR REPLACE FUNCTION public.requirements_needing_embedding(_model text)
RETURNS TABLE (requirement_id uuid, content_hash text, text text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, public.requirement_content_hash(r.id),
         s.document_name || ' ' || r.chapter_section || E'\n' || r.description
  FROM public.requirements r
  JOIN public.requirement_sources s ON s.id = r.source_id
  LEFT JOIN public.requirement_embeddings e ON e.requirement_id = r.id
  WHERE r.repealed_at IS NULL
    AND (e.requirement_id IS NULL OR e.model <> _model OR e.content_hash <> public.requirement_content_hash(r.id))
$$;

-- Närmaste krav till en frågevektor, med valfritt urval av regelverk
CREATE OR REPLACE FUNCTION public.search_requirements_semantic(_query vector(1024), _limit int DEFAULT 10, _source_ids uuid[] DEFAULT NULL)
RETURNS TABLE (id uuid, document_name text, chapter_section text, description text, requirement_level requirement_level, domain_name text, similarity real)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, s.document_name, r.chapter_section, r.description, r.requirement_level, d.name,
         (1 - (e.embedding <=> _query))::real AS similarity
  FROM public.requirement_embeddings e
  JOIN public.requirements r ON r.id = e.requirement_id
  JOIN public.requirement_sources s ON s.id = r.source_id
  LEFT JOIN public.security_domains d ON d.id = r.domain_id
  WHERE r.repealed_at IS NULL
    AND (_source_ids IS NULL OR r.source_id = ANY(_source_ids))
    AND public.is_approved()
  ORDER BY e.embedding <=> _query
  LIMIT _limit
$$;

GRANT EXECUTE ON FUNCTION public.requirements_needing_embedding(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_requirements_semantic(vector, int, uuid[]) TO authenticated;

-- Indexeringen körs av AI-tjänsten utan inloggad användare; den skriver via en
-- funktion som bara app_api får anropa (ingen RLS-väg från PostgREST).
CREATE OR REPLACE FUNCTION public.upsert_requirement_embedding(_requirement_id uuid, _model text, _content_hash text, _embedding vector(1024))
RETURNS void
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.requirement_embeddings (requirement_id, model, content_hash, embedding)
  VALUES (_requirement_id, _model, _content_hash, _embedding)
  ON CONFLICT (requirement_id) DO UPDATE
    SET model = EXCLUDED.model, content_hash = EXCLUDED.content_hash, embedding = EXCLUDED.embedding, created_at = now()
$$;
REVOKE ALL ON FUNCTION public.upsert_requirement_embedding(uuid, text, text, vector) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_requirement_embedding(uuid, text, text, vector) TO app_api;
GRANT EXECUTE ON FUNCTION public.requirements_needing_embedding(text) TO app_api;
