import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, X, Link2, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAll';
import { useAuth } from '@/hooks/useAuth';

interface LinkedRequirement {
  chapter_section: string;
  description: string;
  requirement_sources: { document_name: string } | null;
}

interface LinkSuggestion {
  id: string;
  coverage: 'full' | 'delvis';
  link_type: 'preciseras_av' | 'omsätts_av';
  rationale: string | null;
  suggested_by: string;
  parent: LinkedRequirement | null;
  child: LinkedRequirement | null;
}

const ALL = 'alla';
const TYPE_LABEL = { preciseras_av: 'preciseras av', omsätts_av: 'omsätts av' } as const;

function RequirementRef({ r }: { r: LinkedRequirement | null }) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <span>{r?.requirement_sources?.document_name}</span>
        <span className="font-mono text-foreground">{r?.chapter_section}</span>
      </div>
      <p className="text-sm line-clamp-2">{r?.description}</p>
    </div>
  );
}

/**
 * Granskningskö för kravlänkar (lag → föreskrift → standard). En länk blir
 * gällande först när en administratör godkänt den; beslutet loggas.
 */
export function RequirementLinkSuggestionsCard() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [batch, setBatch] = useState<string>(ALL);
  const [coverage, setCoverage] = useState<Record<string, 'full' | 'delvis'>>({});
  const [busy, setBusy] = useState(false);

  const { data: suggestions = [] } = useQuery({
    queryKey: ['requirement-link-suggestions'],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await fetchAllRows(() => supabase
        .from('requirement_links')
        .select(`id, coverage, link_type, rationale, suggested_by,
          parent:requirements!requirement_links_parent_requirement_id_fkey(chapter_section, description, requirement_sources(document_name)),
          child:requirements!requirement_links_child_requirement_id_fkey(chapter_section, description, requirement_sources(document_name))`)
        .eq('status', 'pending')
        .order('id'));
      if (error) throw error;
      return (data as unknown as LinkSuggestion[]).sort((a, b) =>
        (a.parent?.chapter_section ?? '').localeCompare(b.parent?.chapter_section ?? '', 'sv', { numeric: true })
        || (a.child?.chapter_section ?? '').localeCompare(b.child?.chapter_section ?? '', 'sv', { numeric: true }));
    },
  });

  const batches = useMemo(() => {
    const counts = new Map<string, number>();
    suggestions.forEach((s) => counts.set(s.suggested_by, (counts.get(s.suggested_by) ?? 0) + 1));
    return [...counts.entries()];
  }, [suggestions]);

  if (!isAdmin || suggestions.length === 0) return null;

  const visible = batch === ALL ? suggestions : suggestions.filter((s) => s.suggested_by === batch);

  const decide = async (ids: string[], approve: boolean, cov?: 'full' | 'delvis') => {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('decide_requirement_links', {
        _link_ids: ids, _approve: approve, _coverage: cov,
      });
      if (error) throw error;
      toast.success(approve ? `${data} länkar godkända` : `${data} förslag avvisade`);
      setCoverage((c) => { const n = { ...c }; ids.forEach((id) => delete n[id]); return n; });
      queryClient.invalidateQueries({ queryKey: ['requirement-link-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['link-suggestions'] });
    } catch (e) {
      toast.error(`Kunde inte spara: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  // Godkänn alla synliga; förslag där täckningen ändrats skickas för sig
  const approveVisible = async () => {
    const unchanged = visible.filter((s) => !coverage[s.id] || coverage[s.id] === s.coverage).map((s) => s.id);
    const changed = visible.filter((s) => coverage[s.id] && coverage[s.id] !== s.coverage);
    if (unchanged.length) await decide(unchanged, true);
    for (const cov of ['full', 'delvis'] as const) {
      const ids = changed.filter((s) => coverage[s.id] === cov).map((s) => s.id);
      if (ids.length) await decide(ids, true, cov);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Link2 className="h-5 w-5 text-primary" />
          Kravlänkar att granska ({suggestions.length})
        </CardTitle>
        <CardDescription>
          Förslag på hur lagkrav preciseras av föreskrifter och omsätts i standardkrav. Inget gäller förrän du
          godkänner. Ändra täckning till delvis om standardkravet bara täcker en del av det överordnade kravet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={batch} onValueChange={setBatch}>
            <SelectTrigger className="w-[420px] max-w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Alla förslag ({suggestions.length})</SelectItem>
              {batches.map(([by, n]) => <SelectItem key={by} value={by}>{by} ({n})</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex-1" />
          <Button size="sm" disabled={busy || visible.length === 0} onClick={approveVisible}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            Godkänn alla som visas ({visible.length})
          </Button>
        </div>

        <div className="max-h-[520px] overflow-y-auto divide-y border rounded-md">
          {visible.map((s) => {
            const cov = coverage[s.id] ?? s.coverage;
            return (
              <div key={s.id} className="p-3 grid gap-2 md:grid-cols-[1fr_auto_1fr_auto] md:items-center">
                <RequirementRef r={s.parent} />
                <div className="flex flex-col items-center text-xs text-muted-foreground">
                  <ArrowRight className="h-4 w-4" />
                  {TYPE_LABEL[s.link_type]}
                </div>
                <div className="min-w-0">
                  <RequirementRef r={s.child} />
                  {s.rationale && <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-line">{s.rationale}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <Badge
                    variant="outline"
                    className={`cursor-pointer select-none ${cov === 'delvis' ? 'border-status-warning/50 text-status-warning' : ''} ${coverage[s.id] && coverage[s.id] !== s.coverage ? 'ring-1 ring-primary' : ''}`}
                    title="Klicka för att växla mellan full och delvis täckning"
                    onClick={() => setCoverage((c) => ({ ...c, [s.id]: cov === 'full' ? 'delvis' : 'full' }))}
                  >
                    {cov}
                  </Badge>
                  <Button size="icon" variant="outline" title="Godkänn" disabled={busy}
                    onClick={() => decide([s.id], true, coverage[s.id])}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" title="Avvisa" disabled={busy}
                    onClick={() => decide([s.id], false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
