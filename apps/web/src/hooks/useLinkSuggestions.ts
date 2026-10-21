import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAll';

export interface PendingLink {
  id: string;
  parent_requirement_id: string;
  child_requirement_id: string;
  parent_section: string;
  parent_source: string;
  coverage: 'full' | 'delvis';
  confidence: 'hög' | 'medel' | 'låg' | null;
  rationale: string | null;
}

export interface PendingLinksIndex {
  /** Föreslagna länkar uppåt, per krav (kravet är barnet: "preciserar …") */
  byChild: Map<string, PendingLink[]>;
  /** Antal föreslagna länkar nedåt, per krav (kravet är föräldern) */
  childCount: Map<string, number>;
}

/** Kort källnamn för papper och mobil: "IEC 62443-3-3:2013 - System …" → "IEC 62443-3-3:2013" */
export function shortSourceName(name: string | null | undefined): string {
  if (!name) return 'Okänd källa';
  return name.split(' - ')[0].trim();
}

/** Kravlänkar som väntar på beslut, grupperade per krav */
export function usePendingLinkSuggestions() {
  return useQuery({
    queryKey: ['link-suggestions', 'by-requirement'],
    queryFn: async (): Promise<PendingLinksIndex> => {
      const { data, error } = await fetchAllRows(() => supabase
        .from('requirement_links')
        .select(`id, parent_requirement_id, child_requirement_id, coverage, confidence, rationale,
          parent:requirements!requirement_links_parent_requirement_id_fkey(chapter_section, requirement_sources(document_name))`)
        .eq('status', 'pending')
        .order('id'));
      if (error) throw error;
      type Row = {
        id: string; parent_requirement_id: string; child_requirement_id: string;
        coverage: string; confidence: string | null; rationale: string | null;
        parent: { chapter_section: string; requirement_sources: { document_name: string } | null } | null;
      };
      const byChild = new Map<string, PendingLink[]>();
      const childCount = new Map<string, number>();
      for (const row of (data || []) as unknown as Row[]) {
        const link: PendingLink = {
          id: row.id,
          parent_requirement_id: row.parent_requirement_id,
          child_requirement_id: row.child_requirement_id,
          parent_section: row.parent?.chapter_section ?? '?',
          parent_source: shortSourceName(row.parent?.requirement_sources?.document_name),
          coverage: row.coverage === 'full' ? 'full' : 'delvis',
          confidence: (row.confidence as PendingLink['confidence']) ?? null,
          rationale: row.rationale,
        };
        const list = byChild.get(link.child_requirement_id) ?? [];
        list.push(link);
        byChild.set(link.child_requirement_id, list);
        childCount.set(link.parent_requirement_id, (childCount.get(link.parent_requirement_id) ?? 0) + 1);
      }
      for (const list of byChild.values()) {
        list.sort((a, b) => a.parent_source.localeCompare(b.parent_source, 'sv')
          || a.parent_section.localeCompare(b.parent_section, 'sv', { numeric: true }));
      }
      return { byChild, childCount };
    },
  });
}

/** Godkänn eller avvisa länkförslag (bara administratörer, kontrolleras i databasen) */
export function useDecideLinks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, approve }: { ids: string[]; approve: boolean }) => {
      const { data, error } = await supabase.rpc('decide_requirement_links', { _link_ids: ids, _approve: approve });
      if (error) throw error;
      return data as number;
    },
    onSuccess: () => {
      for (const key of ['link-suggestions', 'requirement-links', 'requirement-link-suggestions']) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
  });
}
