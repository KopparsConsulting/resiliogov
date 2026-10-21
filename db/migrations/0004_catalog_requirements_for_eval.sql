-- 0004: Läsning av katalogens krav utan inloggad användare, för modellutvärderingen.
--
-- eval/run.py kör som app_api i AI-tjänsten. RLS på requirements ger då noll
-- rader (ingen app.user_id), så facit blev tomt och recall 0. Samma mönster som
-- requirements_needing_embedding: en SECURITY DEFINER-funktion som bara
-- app_api får anropa. Läser bara kravtext – inga anläggningar eller bedömningar.

CREATE OR REPLACE FUNCTION public.catalog_requirements(_source text)
RETURNS TABLE (document_name text, chapter_section text, description text, source_page integer,
               requirement_level text, target_type text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.document_name, r.chapter_section, r.description, r.source_page,
         r.requirement_level::text, r.target_type::text
  FROM public.requirements r
  JOIN public.requirement_sources s ON s.id = r.source_id
  WHERE r.repealed_at IS NULL
    AND (s.document_name = _source OR s.document_name ILIKE '%' || _source || '%')
  ORDER BY s.document_name, r.chapter_section
$$;
REVOKE ALL ON FUNCTION public.catalog_requirements(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.catalog_requirements(text) TO app_api;
