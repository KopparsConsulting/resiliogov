import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { shortSourceName } from '@/hooks/useLinkSuggestions';

interface LinkedReq {
  chapter_section: string;
  requirement_sources: { document_name: string } | null;
}

interface LinkRow {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  coverage: string;
  link_type: 'preciseras_av' | 'omsätts_av';
  parent_requirement_id: string;
  child_requirement_id: string;
  parent: LinkedReq | null;
  child: LinkedReq | null;
}

const DOWN = { preciseras_av: 'Preciseras av', omsätts_av: 'Omsätts av' } as const;
const UP = { preciseras_av: 'Preciserar', omsätts_av: 'Omsätter' } as const;

/**
 * Kravkedjan för ett enskilt krav: vilka krav det preciserar/omsätter och
 * vilka som preciserar/omsätter det. Avvisade länkar visas inte; föreslagna
 * märks och länkar till granskningskön.
 */
export function RequirementLinksPanel({ requirementId }: { requirementId: string }) {
  const { data: links = [], isLoading } = useQuery({
    queryKey: ['requirement-link-suggestions', 'for', requirementId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('requirement_links')
        .select(`id, status, coverage, link_type, parent_requirement_id, child_requirement_id,
          parent:requirements!requirement_links_parent_requirement_id_fkey(chapter_section, requirement_sources(document_name)),
          child:requirements!requirement_links_child_requirement_id_fkey(chapter_section, requirement_sources(document_name))`)
        .or(`parent_requirement_id.eq.${requirementId},child_requirement_id.eq.${requirementId}`)
        .neq('status', 'rejected')
        .limit(200);
      if (error) throw error;
      return data as unknown as LinkRow[];
    },
  });

  if (isLoading) return <p className="text-xs text-muted-foreground">Hämtar kravkedja…</p>;

  const rows = links.map((l) => {
    const down = l.parent_requirement_id === requirementId;
    const other = down ? l.child : l.parent;
    return {
      id: l.id,
      label: down ? DOWN[l.link_type] : UP[l.link_type],
      ref: `${shortSourceName(other?.requirement_sources?.document_name)} ${other?.chapter_section ?? ''}`.trim(),
      coverage: l.coverage,
      pending: l.status === 'pending',
    };
  }).sort((a, b) => a.label.localeCompare(b.label, 'sv') || a.ref.localeCompare(b.ref, 'sv', { numeric: true }));

  return (
    <div className="space-y-1">
      <span className="text-xs font-medium text-muted-foreground">Kravkedja</span>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">Inga länkar till andra regelverk.</p>
      ) : (
        <ul className="space-y-1">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="w-28 shrink-0 text-xs text-muted-foreground">{r.label}</span>
              <span className="font-mono text-xs">{r.ref}</span>
              {r.coverage === 'delvis' && <Badge variant="outline" className="text-xs">delvis</Badge>}
              {r.pending && (
                <Link to="/review?tab=lankar" className="text-xs text-muted-foreground underline-offset-2 hover:underline">
                  förslag – ej granskat
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
