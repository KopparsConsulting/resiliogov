import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import type { ComplianceStatus } from '@/types/compliance';
import {
  COMPLIANCE_STATUSES,
  MIN_JUSTIFICATION_LENGTH,
  STATUS_DESCRIPTIONS,
  STATUSES_REQUIRING_EVIDENCE,
  STATUSES_REQUIRING_JUSTIFICATION,
  defaultValidUntil,
} from '@/lib/complianceMetrics';

export interface AssessmentValues {
  status: ComplianceStatus;
  justification: string;
  evidence: string;
  evidence_url: string;
  valid_until: string | null;
  notes: string;
}

interface StatusEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  initial: Partial<AssessmentValues>;
  isSaving?: boolean;
  /** Set when the assessment is backed by an approved test mapping. */
  linkedTestLabel?: string | null;
  onSave: (values: AssessmentValues) => void;
}

export function StatusEditDialog({
  open,
  onOpenChange,
  title,
  description,
  initial,
  isSaving,
  linkedTestLabel,
  onSave,
}: StatusEditDialogProps) {
  const [status, setStatus] = useState<ComplianceStatus>(initial.status ?? 'Ej påbörjad');
  const [justification, setJustification] = useState(initial.justification ?? '');
  const [evidence, setEvidence] = useState(initial.evidence ?? '');
  const [evidenceUrl, setEvidenceUrl] = useState(initial.evidence_url ?? '');
  const [validUntil, setValidUntil] = useState(initial.valid_until ?? '');
  const [notes, setNotes] = useState(initial.notes ?? '');

  useEffect(() => {
    if (!open) return;
    setStatus(initial.status ?? 'Ej påbörjad');
    setJustification(initial.justification ?? '');
    setEvidence(initial.evidence ?? '');
    setEvidenceUrl(initial.evidence_url ?? '');
    setValidUntil(initial.valid_until ?? '');
    setNotes(initial.notes ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const needsJustification = STATUSES_REQUIRING_JUSTIFICATION.includes(status);
  const needsEvidence = STATUSES_REQUIRING_EVIDENCE.includes(status);
  const hasEvidence = !!evidence.trim() || !!evidenceUrl.trim() || !!linkedTestLabel;
  const justificationOk = !needsJustification || justification.trim().length >= MIN_JUSTIFICATION_LENGTH;
  const evidenceOk = !needsEvidence || hasEvidence;
  const canSave = justificationOk && evidenceOk && !isSaving;

  const handleStatusChange = (value: string) => {
    const next = value as ComplianceStatus;
    setStatus(next);
    if (next !== 'Ej påbörjad' && !validUntil) {
      setValidUntil(defaultValidUntil());
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="assessment-status">Status</Label>
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger id="assessment-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMPLIANCE_STATUSES.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{STATUS_DESCRIPTIONS[status]}</p>
          </div>

          {needsJustification && (
            <div className="space-y-2">
              <Label htmlFor="assessment-justification">
                Motivering <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="assessment-justification"
                value={justification}
                onChange={e => setJustification(e.target.value)}
                placeholder="Varför är kravet inte tillämpligt för det här objektet?"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {justification.trim().length}/{MIN_JUSTIFICATION_LENGTH} tecken (minst {MIN_JUSTIFICATION_LENGTH})
              </p>
            </div>
          )}

          {needsEvidence && (
            <div className="space-y-4 rounded-lg border border-border p-4">
              <div>
                <p className="text-sm font-medium">Verifikat krävs</p>
                <p className="text-xs text-muted-foreground">
                  Ange minst en länk, ett dokument eller en godkänd testmappning.
                </p>
              </div>
              {linkedTestLabel && (
                <p className="text-xs text-status-success">Kopplad testmappning: {linkedTestLabel}</p>
              )}
              <div className="space-y-2">
                <Label htmlFor="assessment-evidence-url">Länk till verifikat</Label>
                <Input
                  id="assessment-evidence-url"
                  value={evidenceUrl}
                  onChange={e => setEvidenceUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assessment-evidence">Dokumentation / beskrivning av bevis</Label>
                <Textarea
                  id="assessment-evidence"
                  value={evidence}
                  onChange={e => setEvidence(e.target.value)}
                  placeholder="t.ex. Protokoll FAT2 2026-04-12, diarienummer..."
                  rows={2}
                />
              </div>
            </div>
          )}

          {status !== 'Ej påbörjad' && (
            <div className="space-y-2">
              <Label htmlFor="assessment-valid-until">Giltig till</Label>
              <Input
                id="assessment-valid-until"
                type="date"
                value={validUntil}
                onChange={e => setValidUntil(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Standard är 12 månader. Efter datumet visas bedömningen som "Behöver omprövas".
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="assessment-notes">Anteckning</Label>
            <Textarea
              id="assessment-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {!canSave && !isSaving && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {!justificationOk
                  ? `Motiveringen måste vara minst ${MIN_JUSTIFICATION_LENGTH} tecken.`
                  : 'Statusen kräver minst ett verifikat.'}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
          <Button
            disabled={!canSave}
            onClick={() =>
              onSave({
                status,
                justification: justification.trim(),
                evidence: evidence.trim(),
                evidence_url: evidenceUrl.trim(),
                valid_until: status === 'Ej påbörjad' ? null : validUntil || defaultValidUntil(),
                notes: notes.trim(),
              })
            }
          >
            {isSaving ? 'Sparar...' : 'Spara bedömning'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
