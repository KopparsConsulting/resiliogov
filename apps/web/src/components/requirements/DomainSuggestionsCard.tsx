import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, X, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAll';
import { useAuth } from '@/hooks/useAuth';

interface Suggestion {
  id: string;
  requirement_id: string;
  domain_id: string;
  confidence: 'hög' | 'medel' | 'låg';
  rationale: string | null;
  suggested_by: string;
  requirements: {
    chapter_section: string;
    description: string;
    requirement_sources: { document_name: string } | null;
  } | null;
}

const CONFIDENCE_ORDER = { låg: 0, medel: 1, hög: 2 } as const;
const CONFIDENCE_CLASS = {
  hög: 'bg-status-success/10 text-status-success border-status-success/30',
  medel: 'bg-status-warning/10 text-status-warning border-status-warning/30',
  låg: 'bg-destructive/10 text-destructive border-destructive/30',
} as const;

function shortSource(name?: string | null): string {
  if (!name) return '';
  if (name.startsWith('Cyber')) return 'Cybersäkerhetslagen';
  if (name.startsWith('IEC')) return 'IEC 62443-3-3';
  if (name.toLowerCase().startsWith('ptsfs')) return 'PTSFS 2021:3';
  return name.length > 30 ? `${name.slice(0, 30)}…` : name;
}

/**
 * Granskningskö för domänförslag. Ett förslag blir gällande först när en
 * administratör godkänt det; beslutet loggas som en kravändring.
 */
interface Props {
  /** 'page' = på granskningssidan: hela listan utan inre scroll, tomt läge visas */
  layout?: 'card' | 'page';
}

export function DomainSuggestionsCard({ layout = 'card' }: Props = {}) {
  const onPage = layout === 'page';
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<'alla' | 'hög' | 'medel' | 'låg'>('alla');

  const { data: suggestions = [] } = useQuery({
    queryKey: ['domain-suggestions'],
    queryFn: async () => {
      const { data, error } = await fetchAllRows(() => supabase
        .from('requirement_domain_suggestions')
        .select('id, requirement_id, domain_id, confidence, rationale, suggested_by, requirements(chapter_section, description, requirement_sources(document_name))')
        .eq('status', 'pending'));
      if (error) throw error;
      return (data as unknown as Suggestion[]).sort((a, b) =>
        CONFIDENCE_ORDER[a.confidence] - CONFIDENCE_ORDER[b.confidence]
        || (a.requirements?.chapter_section ?? '').localeCompare(b.requirements?.chapter_section ?? '', 'sv', { numeric: true }));
    },
  });
  const { data: domains = [] } = useQuery({
    queryKey: ['security-domains-for-suggestions'],
    queryFn: async () => {
      const { data, error } = await fetchAllRows(() => supabase
        .from('security_domains').select('id, name, slug').order('priority_order'));
      if (error) throw error;
      return data.filter((d) => d.slug !== 'manager-checklist');
    },
  });

  const domainName = useMemo(() => new Map(domains.map((d) => [d.id, d.name])), [domains]);
  const visible = filter === 'alla' ? suggestions : suggestions.filter((s) => s.confidence === filter);
  const highUnchanged = suggestions.filter((s) => s.confidence === 'hög' && !overrides[s.id]);

  if (!isAdmin) {
    return onPage ? <p className="text-sm text-muted-foreground">Granskning av förslag kräver administratörsbehörighet.</p> : null;
  }
  if (suggestions.length === 0) {
    return onPage ? <p className="text-sm text-muted-foreground">Inga förslag väntar på granskning.</p> : null;
  }

  const refresh = () => {
    for (const key of ['domain-suggestions', 'requirements-explorer', 'domain_compliance', 'requirements_by_domain']) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  };

  const decide = async (ids: string[], approve: boolean, domainId?: string) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('decide_domain_suggestions', {
        _suggestion_ids: ids, _approve: approve, _domain_id: domainId,
      });
      if (error) throw error;
      toast.success(approve ? `${data} domäner satta` : `${data} förslag avvisade`);
      setOverrides((o) => { const n = { ...o }; ids.forEach((id) => delete n[id]); return n; });
      refresh();
    } catch (e) {
      toast.error(`Kunde inte spara: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className={onPage ? undefined : 'mb-6'}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          Domänförslag att granska ({suggestions.length})
        </CardTitle>
        <CardDescription>
          Förslag på säkerhetsdomän per krav. Inget ändras förrän du godkänner. Byt domän i listan om förslaget är
          fel. Föreslaget av {suggestions[0]?.suggested_by}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {(['alla', 'hög', 'medel', 'låg'] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)}>
              {f === 'alla' ? `Alla (${suggestions.length})` : `${f[0].toUpperCase()}${f.slice(1)} säkerhet (${suggestions.filter((s) => s.confidence === f).length})`}
            </Button>
          ))}
          <div className="flex-1" />
          <Button size="sm" disabled={busy || highUnchanged.length === 0}
            onClick={() => decide(highUnchanged.map((s) => s.id), true)}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            Godkänn alla med hög säkerhet ({highUnchanged.length})
          </Button>
        </div>

        <div className={`divide-y border rounded-md ${onPage ? '' : 'max-h-[520px] overflow-y-auto'}`}>
          {visible.map((s) => {
            const chosen = overrides[s.id] ?? s.domain_id;
            return (
              <div key={s.id} className="p-3 grid gap-2 md:grid-cols-[1fr_260px_auto] md:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{shortSource(s.requirements?.requirement_sources?.document_name)}</span>
                    <span className="font-mono">{s.requirements?.chapter_section}</span>
                    <Badge variant="outline" className={`text-xs ${CONFIDENCE_CLASS[s.confidence]}`}>{s.confidence}</Badge>
                  </div>
                  <p className="text-sm line-clamp-2">{s.requirements?.description}</p>
                  {s.rationale && <p className="text-xs text-muted-foreground mt-0.5">{s.rationale}</p>}
                </div>
                <Select value={chosen} onValueChange={(v) => setOverrides((o) => ({ ...o, [s.id]: v }))}>
                  <SelectTrigger className={overrides[s.id] ? 'border-primary' : ''}>
                    <SelectValue>{domainName.get(chosen) ?? 'Välj domän'}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {domains.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex gap-1">
                  <Button size="icon" variant="outline" title="Godkänn" disabled={busy}
                    onClick={() => decide([s.id], true, overrides[s.id])}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" title="Avvisa (ingen domän sätts)" disabled={busy}
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
