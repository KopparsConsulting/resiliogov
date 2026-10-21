import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, ArrowRight, CheckCircle2, Flag, List, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubmitReview, useReviewStatus, type ReviewStatusRow } from '@/hooks/useRequirementReviews';
import { ReviewStatusBadge } from '@/components/requirements/RequirementReviewActions';
import { RequirementAuditHistory } from '@/components/requirements/RequirementAuditHistory';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';

function useRequirementForReview(requirementId: string | undefined) {
  return useQuery({
    queryKey: ['requirement-review-page', requirementId],
    enabled: !!requirementId,
    queryFn: async () => {
      const { data: requirement, error } = await supabase
        .from('requirements')
        .select('id, chapter_section, description, source_page, source_excerpt, requirement_sources(document_name)')
        .eq('id', requirementId!)
        .maybeSingle();
      if (error) throw error;
      return { requirement };
    },
  });
}

function useAddComment() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async ({ requirementId, comment, batch }: { requirementId: string; comment: string; batch: string | null }) => {
      const { error } = await supabase.from('requirement_audit_log').insert({
        requirement_id: requirementId,
        action: 'review_comment',
        changed_by: profile?.email || 'unknown',
        new_value: { comment, print_batch: batch },
      } as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['requirement-audit-log'] }),
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function useBatchInfo(batchId: string | null) {
  return useQuery({
    queryKey: ['review-batch-info', batchId],
    enabled: !!batchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('review_batches').select('id, batch_no, requirement_ids').eq('id', batchId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export default function RequirementReviewPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const batchParam = searchParams.get('batch');
  // Äldre utskrifter har bara ett nummer i länken, nyare har utskriftens id
  const batchId = batchParam && UUID_RE.test(batchParam) ? batchParam : null;
  const { data: batchInfo } = useBatchInfo(batchId);
  const batch = batchInfo?.batch_no ?? (batchId ? null : batchParam);
  const { data: statusMap = new Map<string, ReviewStatusRow>() } = useReviewStatus();
  const [decidedHere, setDecidedHere] = useState(false);
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useRequirementForReview(id);
  const submitReview = useSubmitReview();
  const addComment = useAddComment();
  const [comment, setComment] = useState('');
  const [confirmApprove, setConfirmApprove] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['requirement-review-page', id] });
  const onError = (e: Error) => toast({ title: 'Kunde inte spara', description: e.message, variant: 'destructive' });

  if (isLoading) return <div className="p-4 text-sm text-muted-foreground">Laddar krav...</div>;
  if (!data?.requirement || !id) return <div className="p-4 text-sm">Kravet hittades inte.</div>;

  const { requirement } = data;
  const latestReview = statusMap.get(id);
  const position = batchInfo ? batchInfo.requirement_ids.indexOf(id) : -1;
  const nextId = batchInfo
    ? [...batchInfo.requirement_ids.slice(position + 1), ...batchInfo.requirement_ids.slice(0, Math.max(position, 0))]
        .find((rid) => !['approved', 'flagged'].includes(statusMap.get(rid)?.review_state ?? 'pending'))
    : undefined;
  const sourceName = (requirement as any).requirement_sources?.document_name ?? 'Okänd källa';
  const trimmedComment = comment.trim();

  const approve = () => {
    submitReview.mutate(
      { requirementId: id, status: 'approved', comment: trimmedComment || undefined, batchId },
      {
        onSuccess: () => { toast({ title: 'Kravet är godkänt' }); setComment(''); setConfirmApprove(false); setDecidedHere(true); refresh(); },
        onError,
      },
    );
  };

  const flag = () => {
    submitReview.mutate(
      { requirementId: id, status: 'flagged', comment: trimmedComment, batchId },
      { onSuccess: () => { toast({ title: 'Kravet är flaggat' }); setComment(''); setDecidedHere(true); refresh(); }, onError },
    );
  };

  const saveComment = () => {
    addComment.mutate(
      { requirementId: id, comment: trimmedComment, batch },
      { onSuccess: () => { toast({ title: 'Kommentaren är sparad' }); setComment(''); }, onError },
    );
  };

  const busy = submitReview.isPending || addComment.isPending;

  return (
    <div className="p-4 max-w-xl mx-auto space-y-4">
      <Link to="/requirements" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Kravdatabas
      </Link>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div>
            <p className="font-mono text-lg font-semibold">{requirement.chapter_section}</p>
            <p className="text-xs text-muted-foreground">
              {sourceName}{requirement.source_page ? ` · s. ${requirement.source_page}` : ''}
              {batch ? ` · utskrift ${batch}` : ''}
              {batchInfo && position >= 0 ? ` · ${position + 1}/${batchInfo.requirement_ids.length}` : ''}
            </p>
          </div>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{requirement.description}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <ReviewStatusBadge review={latestReview} />
            {latestReview?.reviewed_at && latestReview.review_state !== 'pending' && (
              <span className="text-muted-foreground">
                av {latestReview.reviewed_by} · {format(new Date(latestReview.reviewed_at), 'yyyy-MM-dd HH:mm')}
              </span>
            )}
          </div>
          {latestReview?.review_state === 'changed' && (
            <p className="text-xs bg-status-warning/10 dark:bg-status-warning/10 rounded p-2">
              Kravet godkändes men texten har ändrats efteråt. Granska och godkänn igen.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="review-comment">Kommentar</Label>
            <Textarea
              id="review-comment"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Skriv av dina anteckningar från papperet..."
            />
            <p className="text-xs text-muted-foreground">Krävs för att flagga. Sparas med {profile?.email ?? 'ditt konto'} och tidpunkt.</p>
          </div>
          <div className="grid gap-2">
            <Button size="lg" className="h-12" onClick={() => setConfirmApprove(true)} disabled={busy}>
              <CheckCircle2 className="h-5 w-5 mr-2" /> Godkänn krav
            </Button>
            <Button size="lg" variant="outline" className="h-12" onClick={flag} disabled={busy || !trimmedComment}>
              <Flag className="h-5 w-5 mr-2" /> Flagga för ändring
            </Button>
            <Button size="lg" variant="ghost" className="h-12" onClick={saveComment} disabled={busy || !trimmedComment}>
              <MessageSquare className="h-5 w-5 mr-2" /> Spara bara kommentar
            </Button>
          </div>
        </CardContent>
      </Card>

      {batchInfo && (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-11" onClick={() => navigate(`/requirements/batch/${batchInfo.id}`)}>
            <List className="h-4 w-4 mr-2" /> Hela utskriften
          </Button>
          <Button variant={decidedHere ? 'default' : 'outline'} className="h-11" disabled={!nextId}
            onClick={() => { setDecidedHere(false); navigate(`/requirements/${nextId}/review?batch=${batchInfo.id}`); }}>
            {nextId ? <>Nästa krav <ArrowRight className="h-4 w-4 ml-2" /></> : 'Alla granskade'}
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <RequirementAuditHistory requirementId={id} />
        </CardContent>
      </Card>

      <AlertDialog open={confirmApprove} onOpenChange={setConfirmApprove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vill du godkänna {requirement.chapter_section}?</AlertDialogTitle>
            <AlertDialogDescription>
              Godkännandet sparas med {profile?.email ?? 'ditt konto'} och dagens datum och syns i kravets historik.
              {trimmedComment && <><br />Kommentar: "{trimmedComment}"</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={approve}>Godkänn</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
