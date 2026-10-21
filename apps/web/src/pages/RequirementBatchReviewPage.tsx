import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, Check, Pencil, RotateCcw, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAll';
import { useAuth } from '@/hooks/useAuth';
import { useReviewStatus, useSubmitReviews, type ReviewStatusRow, type ReviewDecision } from '@/hooks/useRequirementReviews';
import { usePendingDomainSuggestions } from '@/hooks/useDomainSuggestions';
import { usePendingLinkSuggestions, useDecideLinks, type PendingLink } from '@/hooks/useLinkSuggestions';
import { ReviewStatusBadge } from '@/components/requirements/RequirementReviewActions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

interface BatchRequirement {
  id: string;
  chapter_section: string;
  description: string;
  domain_id: string | null;
  repealed_at: string | null;
  requirement_sources: { document_name: string } | null;
  security_domains: { name: string } | null;
}

function useBatch(batchId: string | undefined) {
  return useQuery({
    queryKey: ['review-batch', batchId],
    enabled: !!batchId,
    queryFn: async () => {
      const { data: batch, error } = await supabase
        .from('review_batches').select('*').eq('id', batchId!).maybeSingle();
      if (error) throw error;
      if (!batch) return null;
      const { data: reqs, error: reqError } = await fetchAllRows(() => supabase
        .from('requirements')
        .select('id, chapter_section, description, domain_id, repealed_at, requirement_sources(document_name), security_domains(name)')
        .in('id', batch.requirement_ids)
        .order('id'));
      if (reqError) throw reqError;
      const byId = new Map((reqs as unknown as BatchRequirement[]).map((r) => [r.id, r]));
      return {
        batch,
        requirements: batch.requirement_ids.map((id) => byId.get(id)).filter(Boolean) as BatchRequirement[],
      };
    },
  });
}

/** Klar i den här utskriften = beslut (godkänt eller flaggat) som gäller nu */
const isDecided = (s: ReviewStatusRow | undefined) => s?.review_state === 'approved' || s?.review_state === 'flagged';

/**
 * Hela utskriften som en lista. För in besluten från papperet i samma ordning
 * som korten – ett tryck per krav.
 */
export default function RequirementBatchReviewPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useBatch(batchId);
  const { data: status = new Map<string, ReviewStatusRow>() } = useReviewStatus();
  const { data: suggestions = new Map() } = usePendingDomainSuggestions();
  const submit = useSubmitReviews();
  const { data: links } = usePendingLinkSuggestions();
  const decideLinks = useDecideLinks();
  const [busyLinks, setBusyLinks] = useState<Set<string>>(new Set());
  const [onlyRemaining, setOnlyRemaining] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const rows = useMemo(() => (data?.requirements ?? []).map((r, i) => ({ r, position: i + 1 })), [data]);
  const decided = rows.filter(({ r }) => isDecided(status.get(r.id))).length;
  const visible = onlyRemaining ? rows.filter(({ r }) => !isDecided(status.get(r.id))) : rows;

  if (isLoading) return <div className="p-4 text-sm text-muted-foreground">Laddar utskriften...</div>;
  if (!data) return <div className="p-4 text-sm">Utskriften hittades inte.</div>;

  const save = (decision: ReviewDecision, message: string) => {
    setBusyId(decision.requirementId);
    submit.mutate({ decisions: [decision], batchId }, {
      onSuccess: () => {
        toast.success(message);
        setEditing(null);
        setComment('');
      },
      onError: (e) => toast.error(`Kunde inte spara: ${(e as Error).message}`),
      onSettled: () => setBusyId(null),
    });
  };

  const approveDomain = async (suggestionId: string, name: string) => {
    const { error } = await supabase.rpc('decide_domain_suggestions', { _suggestion_ids: [suggestionId], _approve: true });
    if (error) { toast.error(`Kunde inte spara domänen: ${error.message}`); return; }
    toast.success(`Domän satt: ${name}`);
    for (const key of ['domain-suggestions', 'review-batch', 'requirements-explorer']) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  };

  const decideLink = (items: PendingLink[], approve: boolean) => {
    const ids = items.map((l) => l.id);
    setBusyLinks((prev) => new Set([...prev, ...ids]));
    decideLinks.mutate({ ids, approve }, {
      onSuccess: () => toast.success(items.length > 1
        ? `${items.length} kopplingar ${approve ? 'godkända' : 'avvisade'}`
        : `Koppling till ${items[0].parent_source} ${items[0].parent_section} ${approve ? 'godkänd' : 'avvisad'}`),
      onError: (e) => toast.error(`Kunde inte spara kopplingen: ${(e as Error).message}`),
      onSettled: () => setBusyLinks((prev) => { const n = new Set(prev); ids.forEach((id) => n.delete(id)); return n; }),
    });
  };

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <Link to="/requirements" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Kravdatabas
      </Link>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div>
            <p className="text-lg font-semibold">Utskrift <span className="font-mono">{data.batch.batch_no}</span></p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(data.batch.created_at), 'yyyy-MM-dd HH:mm')} · utskriven av {data.batch.created_by}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>{decided} av {rows.length} granskade</span>
              <span className="text-muted-foreground">{rows.length - decided} kvar</span>
            </div>
            <Progress value={rows.length ? (decided / rows.length) * 100 : 0} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={onlyRemaining} onCheckedChange={setOnlyRemaining} />
            Visa bara de som är kvar
          </label>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {visible.map(({ r, position }) => {
          const s = status.get(r.id);
          const suggestion = suggestions.get(r.id);
          const upLinks = links?.byChild.get(r.id) ?? [];
          const busy = busyId === r.id;
          const isOpen = expanded.has(r.id);
          return (
            <Card key={r.id} className={isDecided(s) ? 'opacity-80' : ''}>
              <CardContent className="p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold tabular-nums border rounded px-1.5">{position}/{rows.length}</span>
                  <span className="font-mono font-semibold text-sm">{r.chapter_section}</span>
                  <span className="text-xs text-muted-foreground truncate">{r.requirement_sources?.document_name}</span>
                  <div className="flex-1" />
                  <ReviewStatusBadge review={s} />
                </div>
                {r.repealed_at && <p className="text-xs text-status-warning">Kravet har upphävts efter utskriften.</p>}
                <button type="button" className={`text-left text-sm w-full ${isOpen ? 'whitespace-pre-wrap' : 'line-clamp-2'}`}
                  onClick={() => setExpanded((prev) => { const n = new Set(prev); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n; })}>
                  {r.description}
                </button>
                {s?.review_state === 'flagged' && s.comment && (
                  <p className="text-xs bg-destructive/10 dark:bg-destructive/10 rounded p-2">Ändra: {s.comment}</p>
                )}
                {s?.review_state === 'changed' && (
                  <p className="text-xs bg-status-warning/10 dark:bg-status-warning/10 rounded p-2">Kravtexten har ändrats sedan den godkändes – granska igen.</p>
                )}
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>Domän: {r.security_domains?.name ?? (suggestion ? `${suggestion.domain_name} (förslag)` : 'ingen')}</span>
                  {!r.security_domains && suggestion && isAdmin && (
                    <Button size="sm" variant="outline" className="h-6 text-xs"
                      onClick={() => approveDomain(suggestion.id, suggestion.domain_name)}>
                      Godkänn domän
                    </Button>
                  )}
                </div>
                {upLinks.length > 0 && (
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>Preciserar (förslag):</span>
                      {isAdmin && upLinks.length > 1 && (
                        <Button size="sm" variant="outline" className="h-6 text-xs ml-auto"
                          disabled={upLinks.some((l) => busyLinks.has(l.id))}
                          onClick={() => decideLink(upLinks, true)}>
                          Godkänn alla {upLinks.length}
                        </Button>
                      )}
                    </div>
                    {upLinks.map((link) => (
                      <div key={link.id} className="flex items-start gap-2 rounded border px-2 py-1">
                        <div className="flex-1 min-w-0">
                          <p>
                            <span className="font-mono font-medium">{link.parent_source} {link.parent_section}</span>
                            <span className="text-muted-foreground"> · {link.coverage === 'full' ? 'helt' : 'delvis'}{link.confidence ? ` · ${link.confidence} säkerhet` : ''}</span>
                          </p>
                          {link.rationale && <p className="text-muted-foreground">{link.rationale}</p>}
                        </div>
                        {isAdmin && (
                          <div className="flex gap-1 shrink-0">
                            <Button size="sm" variant="outline" className="h-7 px-2" title="Godkänn kopplingen"
                              disabled={busyLinks.has(link.id)} onClick={() => decideLink([link], true)}>
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2" title="Avvisa kopplingen"
                              disabled={busyLinks.has(link.id)} onClick={() => decideLink([link], false)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {editing === r.id ? (
                  <div className="space-y-2">
                    <Textarea autoFocus rows={3} value={comment} onChange={(e) => setComment(e.target.value)}
                      placeholder="Vad ska ändras? Skriv av anteckningen från papperet." />
                    <div className="flex gap-2">
                      <Button size="sm" variant="destructive" disabled={!comment.trim() || busy}
                        onClick={() => save({ requirementId: r.id, status: 'flagged', comment }, `${r.chapter_section} flaggad för ändring`)}>
                        {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Spara ändring
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(null); setComment(''); }}>Avbryt</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 h-10" disabled={busy || r.repealed_at !== null}
                      variant={s?.review_state === 'approved' ? 'secondary' : 'default'}
                      onClick={() => save({ requirementId: r.id, status: 'approved' }, `${r.chapter_section} godkänd`)}>
                      {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />} Godkänn
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 h-10" disabled={busy || r.repealed_at !== null}
                      onClick={() => { setEditing(r.id); setComment(s?.review_state === 'flagged' ? s.comment ?? '' : ''); }}>
                      <Pencil className="h-4 w-4 mr-1" /> Ändra
                    </Button>
                    {isDecided(s) && (
                      <Button size="sm" variant="ghost" className="h-10" title="Ångra beslutet" disabled={busy}
                        onClick={() => save({ requirementId: r.id, status: 'pending' }, `${r.chapter_section} återställd`)}>
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {visible.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Alla krav i utskriften är granskade.</p>
        )}
      </div>
    </div>
  );
}
