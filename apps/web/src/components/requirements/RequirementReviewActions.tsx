import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ThumbsUp, ThumbsDown, RotateCcw } from 'lucide-react';
import { useSubmitReview, REVIEW_STATE_LABELS, type ReviewStatusRow } from '@/hooks/useRequirementReviews';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Props {
  requirementId: string;
  currentReview: ReviewStatusRow | undefined;
}

const STATE_CLASS = {
  pending: 'bg-muted text-muted-foreground',
  approved: 'bg-status-success/10 text-status-success dark:bg-status-success/10 dark:text-status-success border-transparent',
  changed: 'bg-status-warning/10 text-status-warning dark:bg-status-warning/10 dark:text-status-warning border-transparent',
  flagged: 'bg-destructive/10 text-destructive dark:bg-destructive/10 dark:text-destructive border-transparent',
} as const;

export function ReviewStatusBadge({ review }: { review: ReviewStatusRow | undefined }) {
  const state = review?.review_state ?? 'pending';
  return (
    <Badge variant="outline" className={`text-xs ${STATE_CLASS[state]}`}
      title={state === 'changed' ? 'Kravets innehåll har ändrats efter godkännandet – granska igen' : undefined}>
      {REVIEW_STATE_LABELS[state]}
    </Badge>
  );
}

export function RequirementReviewActions({ requirementId, currentReview }: Props) {
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [comment, setComment] = useState('');
  const submitReview = useSubmitReview();

  const handleApprove = () => {
    submitReview.mutate(
      { requirementId, status: 'approved' },
      {
        onSuccess: () => toast({ title: 'Godkänt', description: 'Kravet har markerats som godkänt' }),
        onError: (e) => toast({ title: 'Fel', description: e.message, variant: 'destructive' }),
      }
    );
  };

  const handleFlag = () => {
    submitReview.mutate(
      { requirementId, status: 'flagged', comment },
      {
        onSuccess: () => {
          toast({ title: 'Flaggat', description: 'Kravet har markerats för uppföljning' });
          setFlagDialogOpen(false);
          setComment('');
        },
        onError: (e) => toast({ title: 'Fel', description: e.message, variant: 'destructive' }),
      }
    );
  };

  const handleReset = () => {
    submitReview.mutate(
      { requirementId, status: 'pending' },
      {
        onSuccess: () => toast({ title: 'Återställt', description: 'Granskningsstatus återställd' }),
        onError: (e) => toast({ title: 'Fel', description: e.message, variant: 'destructive' }),
      }
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Granskning:</span>
        <ReviewStatusBadge review={currentReview} />
        {currentReview?.reviewed_at && currentReview.review_state !== 'pending' && (
          <span className="text-xs text-muted-foreground">
            av {currentReview.reviewed_by} — {format(new Date(currentReview.reviewed_at), 'yyyy-MM-dd HH:mm')}
          </span>
        )}
      </div>

      {currentReview?.review_state === 'changed' && (
        <div className="text-xs bg-status-warning/10 dark:bg-status-warning/10 border border-status-warning/30 dark:border-status-warning/30 rounded p-2">
          Kravet godkändes men har ändrats efteråt. Granska och godkänn igen.
        </div>
      )}

      {currentReview?.review_state === 'flagged' && currentReview.comment && (
        <div className="text-xs bg-destructive/10 dark:bg-destructive/10 border border-destructive/30 dark:border-destructive/30 rounded p-2">
          <span className="font-medium">Kommentar:</span> {currentReview.comment}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant={currentReview?.review_state === 'approved' ? 'default' : 'outline'}
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={handleApprove}
          disabled={submitReview.isPending}
        >
          <ThumbsUp className="h-3 w-3" /> Godkänn
        </Button>
        <Button
          variant={currentReview?.review_state === 'flagged' ? 'destructive' : 'outline'}
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => setFlagDialogOpen(true)}
          disabled={submitReview.isPending}
        >
          <ThumbsDown className="h-3 w-3" /> Flagga
        </Button>
        {currentReview && currentReview.review_state !== 'pending' && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={handleReset}
            disabled={submitReview.isPending}
          >
            <RotateCcw className="h-3 w-3" /> Återställ
          </Button>
        )}
      </div>

      <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flagga krav för uppföljning</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Beskriv vad som behöver åtgärdas eller följas upp..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlagDialogOpen(false)}>Avbryt</Button>
            <Button variant="destructive" onClick={handleFlag} disabled={!comment.trim() || submitReview.isPending}>
              Flagga
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
