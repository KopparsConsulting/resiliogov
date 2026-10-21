import { useState } from 'react';
import { CheckCircle2, MinusCircle, RotateCcw, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import type { TestMappingWithDetails } from '@/hooks/useTestMappings';
import type { ApprovedAssessment } from '@/hooks/useApprovedAssessments';
import { useApproveSuggestion, useDismissSuggestion, type Suggestion } from '@/hooks/useSuggestionDecisions';
import { useAuth } from '@/hooks/useAuth';
import { defaultValidUntil } from '@/lib/complianceMetrics';
import { TEST_PHASE_LABELS, RESULT_STATUS_LABELS, type TestPhase } from './constants';

export type DecisionState = 'approved' | 'pending' | 'dismissed' | 'none';

export function decisionStateFor(
  mapping: TestMappingWithDetails,
  approved: ApprovedAssessment | undefined,
  suggestion: Suggestion | undefined,
): DecisionState {
  if (approved) return 'approved';
  if (mapping.suggestion_dismissed_at) return 'dismissed';
  if (suggestion) return 'pending';
  return 'none';
}

const formatDate = (value: string | null) => (value ? new Date(value).toLocaleDateString('sv-SE') : '');
const formatDateTime = (value: string | null) =>
  value ? new Date(value).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' }) : '';

interface DecisionCellProps {
  mapping: TestMappingWithDetails;
  approved?: ApprovedAssessment;
  suggestion?: Suggestion;
  /** Larger layout with explanations, used in the detail panel. */
  detailed?: boolean;
}

/** Shows the formal decision for a test row and lets the user approve, dismiss or restore it. */
export function DecisionCell({ mapping, approved, suggestion, detailed = false }: DecisionCellProps) {
  const { approve, isPending } = useApproveSuggestion();
  const dismiss = useDismissSuggestion();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [reason, setReason] = useState('');
  const state = decisionStateFor(mapping, approved, suggestion);
  const label = `${mapping.requirement_chapter ?? ''} · ${mapping.system_name ?? ''}`.trim();
  const buttonSize = detailed ? 'default' : 'sm';
  const evidenceLabel = mapping.evidence_file_name || mapping.evidence || null;

  const confirmDismiss = () => {
    if (reason.trim().length < 15) return;
    dismiss.mutate(
      { mappingId: mapping.id, reason: reason.trim(), label },
      { onSuccess: () => { setDialogOpen(false); setReason(''); } },
    );
  };

  const confirmApprove = () => {
    if (!suggestion) return;
    approve(suggestion);
    setApproveOpen(false);
  };

  let content: JSX.Element;
  if (state === 'approved' && approved) {
    const failed = approved.status === 'Ej uppfyllt';
    content = (
      <div className="space-y-0.5">
        <Badge
          variant="outline"
          className={
            failed
              ? 'gap-1 bg-destructive/10 text-destructive border-destructive/20'
              : 'gap-1 bg-status-success/10 text-status-success border-status-success/20'
          }
        >
          {failed ? <XCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
          {failed ? 'Underkänd: ' : 'Godkänd: '}{approved.status}
        </Badge>
        <p className="text-[11px] text-muted-foreground">
          Beslut av {approved.assessedBy ?? 'okänd'} · {formatDateTime(approved.assessedAt)}
        </p>
        {approved.validUntil && (
          <p className="text-[11px] text-muted-foreground">Giltig t.o.m. {approved.validUntil}</p>
        )}
        {detailed && (
          <p className="text-[11px] text-muted-foreground">
            Bevis: {evidenceLabel ?? 'saknas'}
            {mapping.tested_by ? ` · testad av ${mapping.tested_by}` : ''}
            {mapping.tested_at ? ` (${mapping.tested_at})` : ''}
          </p>
        )}
      </div>
    );
  } else if (state === 'dismissed') {
    content = (
      <div className="space-y-1">
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          <MinusCircle className="h-3 w-3" /> Avfärdad
        </Badge>
        <p className="text-[11px] text-muted-foreground line-clamp-2" title={mapping.suggestion_dismiss_reason ?? ''}>
          {mapping.suggestion_dismissed_by ?? 'okänd'} · {formatDateTime(mapping.suggestion_dismissed_at)}
          {mapping.suggestion_dismiss_reason ? ` — ${mapping.suggestion_dismiss_reason}` : ''}
        </p>
        <Button
          size={buttonSize}
          variant="ghost"
          className="h-7 px-2 text-xs"
          disabled={dismiss.isPending}
          onClick={() => dismiss.mutate({ mappingId: mapping.id, reason: null, label })}
        >
          <RotateCcw className="mr-1 h-3 w-3" /> Återställ förslag
        </Button>
      </div>
    );
  } else if (state === 'pending' && suggestion) {
    const failed = suggestion.suggestedStatus === 'Ej uppfyllt';
    content = (
      <div className="space-y-1.5">
        <div className="flex items-center gap-1 text-xs">
          {failed
            ? <XCircle className="h-3.5 w-3.5 text-destructive" />
            : <CheckCircle2 className="h-3.5 w-3.5 text-status-warning" />}
          <span>Förslag: <strong>{suggestion.suggestedStatus}</strong></span>
        </div>
        <p className="text-[11px] text-muted-foreground">Nu: {suggestion.currentStatus}</p>
        {detailed && (
          <p className="text-xs text-muted-foreground">
            <strong>Godkänn som bedömning</strong> sätter den formella statusen på systemets krav, knyter testet som
            bevis och stämplar ditt namn, datum och 12 månaders giltighet. <strong>Avfärda</strong> lämnar kravet
            oförändrat och sparar din motivering.
          </p>
        )}
        <div className="flex gap-1.5">
          <Button size={buttonSize} className={detailed ? '' : 'h-7 px-2 text-xs'} disabled={isPending} onClick={() => setApproveOpen(true)}>
            Godkänn
          </Button>
          <Button size={buttonSize} variant="outline" className={detailed ? '' : 'h-7 px-2 text-xs'} onClick={() => setDialogOpen(true)}>
            Avfärda
          </Button>
        </div>
      </div>
    );
  } else {
    const hint = !mapping.system_id
      ? 'Saknar system'
      : mapping.result_status === 'not_tested'
        ? 'Ej testad'
        : (mapping.result_status === 'passed' || mapping.result_status === 'passed_with_remarks') &&
            !(mapping.evidence_url || mapping.evidence_file_name || mapping.evidence)
          ? 'Verifikat saknas'
          : 'Inget förslag';
    content = <span className="text-xs text-muted-foreground">{hint}</span>;
  }

  return (
    <>
      {content}

      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Vill du {suggestion?.suggestedStatus === 'Ej uppfyllt' ? 'underkänna' : 'godkänna'} kravbedömningen?
            </DialogTitle>
            <DialogDescription>
              Beslutet blir den formella kravbedömningen på systemet och syns i dashboard, anläggnings- och systemvy.
              Det sparas med ditt namn, datum och testet som bevis.
            </DialogDescription>
          </DialogHeader>
          {suggestion && (
            <dl className="space-y-1.5 rounded-md border p-3 text-sm">
              <div className="flex gap-2">
                <dt className="w-40 shrink-0 text-muted-foreground">Krav</dt>
                <dd className="font-mono">{mapping.requirement_chapter}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-40 shrink-0 text-muted-foreground">Objekt</dt>
                <dd>{mapping.system_name || '–'}{mapping.asset_name ? ` · ${mapping.asset_name}` : ''}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-40 shrink-0 text-muted-foreground">Ny status</dt>
                <dd><strong>{suggestion.suggestedStatus}</strong> (nu: {suggestion.currentStatus})</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-40 shrink-0 text-muted-foreground">Testunderlag</dt>
                <dd>
                  {mapping.test_phase ? TEST_PHASE_LABELS[mapping.test_phase as TestPhase] : 'Ingen fas'} ·{' '}
                  {RESULT_STATUS_LABELS[mapping.result_status]}
                  {mapping.tested_by ? ` · ${mapping.tested_by}` : ''}
                  {mapping.tested_at ? ` · ${mapping.tested_at}` : ''}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-40 shrink-0 text-muted-foreground">Verifikat</dt>
                <dd>
                  {mapping.evidence_url ? (
                    <a href={mapping.evidence_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      {evidenceLabel ?? 'Öppna verifikat'}
                    </a>
                  ) : (evidenceLabel ?? 'Saknas')}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-40 shrink-0 text-muted-foreground">Bedöms av</dt>
                <dd>{user?.email ?? 'okänd användare'} · {formatDate(new Date().toISOString())}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-40 shrink-0 text-muted-foreground">Giltig t.o.m.</dt>
                <dd>{defaultValidUntil()}</dd>
              </div>
            </dl>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>Avbryt</Button>
            <Button disabled={isPending} onClick={confirmApprove}>Bekräfta och spara bedömning</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Avfärda förslag – {label}</DialogTitle>
            <DialogDescription>
              Kravets status lämnas oförändrad. Testresultatet ligger kvar och din motivering sparas med namn och datum.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`dismiss-${mapping.id}`}>Motivering (minst 15 tecken)</Label>
            <Textarea
              id={`dismiss-${mapping.id}`}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="T.ex. Kräver även godkänt SAT innan bedömning"
            />
            <p className="text-xs text-muted-foreground">
              Sparas som {user?.email ?? 'din användare'} med dagens datum.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Avbryt</Button>
            <Button disabled={reason.trim().length < 15 || dismiss.isPending} onClick={confirmDismiss}>
              Avfärda förslag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
