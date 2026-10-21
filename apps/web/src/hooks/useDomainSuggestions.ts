import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAll';

export interface PendingDomainSuggestion {
  id: string;
  requirement_id: string;
  domain_id: string;
  domain_name: string;
  confidence: 'hög' | 'medel' | 'låg';
}

/** Domänförslag som väntar på beslut, per krav */
export function usePendingDomainSuggestions() {
  return useQuery({
    queryKey: ['domain-suggestions', 'by-requirement'],
    queryFn: async (): Promise<Map<string, PendingDomainSuggestion>> => {
      const { data, error } = await fetchAllRows(() => supabase
        .from('requirement_domain_suggestions')
        .select('id, requirement_id, domain_id, confidence, security_domains!requirement_domain_suggestions_domain_id_fkey(name)')
        .eq('status', 'pending')
        .order('id'));
      if (error) throw error;
      type Row = { id: string; requirement_id: string; domain_id: string; confidence: string; security_domains: { name: string } | null };
      return new Map(((data || []) as unknown as Row[]).map((s) => [s.requirement_id, {
        id: s.id,
        requirement_id: s.requirement_id,
        domain_id: s.domain_id,
        domain_name: s.security_domains?.name ?? 'Okänd domän',
        confidence: s.confidence as PendingDomainSuggestion['confidence'],
      }]));
    },
  });
}
