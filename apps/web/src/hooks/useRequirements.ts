import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAll';
import type { MeasureScale, RequirementAddressee } from '@/lib/requirementAddressee';

export interface RequirementWithDetails {
  id: string;
  source_id: string | null;
  chapter_section: string;
  description: string;
  trigger_logic: unknown;
  is_general_advice: boolean | null;
  domain_id: string | null;
  requirement_level: 'strategic' | 'mandatory' | 'recommended' | null;
  target_type: string | null;
  source_page: number | null;
  source_excerpt: string | null;
  min_classification_level: number;
  sl_capability: number | null;
  ml_capability: number | null;
  created_at: string | null;
  /** Upphävt i ett importerat kravpaket – gäller inga objekt längre */
  repealed_at: string | null;
  /** Lokalt krav i driftmiljön */
  is_local: boolean;
  source_name: string | null;
  source_url: string | null;
  source_category: string | null;
  source_addressee: RequirementAddressee;
  source_measure_scale: MeasureScale;
  domain_name: string | null;
  domain_slug: string | null;
  domain_color: string | null;
}

export function useRequirements() {
  return useQuery({
    queryKey: ['requirements-explorer'],
    queryFn: async (): Promise<RequirementWithDetails[]> => {
      const { data, error } = await fetchAllRows(() => supabase
        .from('requirements')
        .select(`
          *,
          requirement_sources(document_name, category, document_url, addressee, measure_scale),
          security_domains(name, slug, color)
        `)
        .order('chapter_section'));

      if (error) throw error;

      return (data || []).map((r: any) => ({
        id: r.id,
        source_id: r.source_id,
        chapter_section: r.chapter_section,
        description: r.description,
        trigger_logic: r.trigger_logic,
        is_general_advice: r.is_general_advice,
        domain_id: r.domain_id,
        requirement_level: r.requirement_level,
        target_type: r.target_type,
        source_page: r.source_page ?? null,
        source_excerpt: r.source_excerpt ?? null,
        min_classification_level: r.min_classification_level ?? 1,
        sl_capability: r.sl_capability ?? null,
        ml_capability: r.ml_capability ?? null,
        created_at: r.created_at,
        repealed_at: r.repealed_at ?? null,
        is_local: !!r.is_local,
        source_name: r.requirement_sources?.document_name || null,
        source_url: r.requirement_sources?.document_url || null,
        source_category: r.requirement_sources?.category || null,
        source_addressee: r.requirement_sources?.addressee ?? 'asset',
        source_measure_scale: r.requirement_sources?.measure_scale ?? 'none',
        domain_name: r.security_domains?.name || null,
        domain_slug: r.security_domains?.slug || null,
        domain_color: r.security_domains?.color || null,
      }));
    },
  });
}
