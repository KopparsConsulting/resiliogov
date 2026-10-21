import { useState } from 'react';
import { CheckCircle2, Clock, AlertCircle, XCircle, FileText, User, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ComplianceRecord, ComplianceStatus } from '@/types/compliance';
import { useUpdateComplianceStatus } from '@/hooks/useComplianceRecords';
import { STATUS_STYLES } from '@/components/compliance/statusConfig';
import { StatusEditDialog, type AssessmentValues } from '@/components/compliance/StatusEditDialog';
import { MetricPair } from '@/components/compliance/ComplianceMetricsDisplay';
import { calculateMetrics, isExpired } from '@/lib/complianceMetrics';
import { OutOfScopeBadge, RequirementChangedBadge, RepealedBadge } from '@/components/compliance/OutOfScopeBadge';

interface RequirementListProps {
  records: ComplianceRecord[];
}

const STATUS_CONFIG = STATUS_STYLES;

export function RequirementList({ records }: RequirementListProps) {
  const [selectedRecord, setSelectedRecord] = useState<ComplianceRecord | null>(null);
  const [editRecord, setEditRecord] = useState<ComplianceRecord | null>(null);
  const updateStatus = useUpdateComplianceStatus();
  const metrics = calculateMetrics(records);

  const handleAssessmentSave = (values: AssessmentValues) => {
    if (!editRecord) return;
    updateStatus.mutate(
      { id: editRecord.id, ...values },
      { onSuccess: () => setEditRecord(null) },
    );
  };

  // Group records by source document and sort within groups
  const groupedRecords = records.reduce((acc, record) => {
    const sourceName = record.requirements?.requirement_sources?.document_name || 'Övrigt';
    if (!acc[sourceName]) {
      acc[sourceName] = [];
    }
    acc[sourceName].push(record);
    return acc;
  }, {} as Record<string, ComplianceRecord[]>);

  // Sort records within each group by chapter_section (natural sort)
  Object.keys(groupedRecords).forEach(key => {
    groupedRecords[key].sort((a, b) => {
      const sectionA = a.requirements?.chapter_section || '';
      const sectionB = b.requirements?.chapter_section || '';
      // Extract numeric parts for natural sorting
      const numA = parseInt(sectionA.match(/\d+/)?.[0] || '0', 10);
      const numB = parseInt(sectionB.match(/\d+/)?.[0] || '0', 10);
      if (numA !== numB) return numA - numB;
      return sectionA.localeCompare(sectionB, 'sv');
    });
  });


  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'Fysisk Säkerhet':
        return 'bg-chart-1/10 text-chart-1 border-chart-1/20';
      case 'Informationssäkerhet':
        return 'bg-chart-2/10 text-chart-2 border-chart-2/20';
      case 'Krisberedskap':
        return 'bg-chart-3/10 text-chart-3 border-chart-3/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
        <div className="p-4 rounded-full bg-muted mb-4">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Inga krav matchade</h3>
        <p className="text-muted-foreground max-w-sm">
          Baserat på anläggningens parametrar hittades inga tillämpliga krav.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        <div className="rounded-lg border border-border bg-card p-4">
          <MetricPair coverage={metrics.coverage} compliance={metrics.compliance} showBars />
          <p className="text-xs text-muted-foreground mt-2">
            {metrics.assessed} av {metrics.total} krav bedömda · {metrics.fulfilled} uppfyllda ·{' '}
            {metrics.notApplicable} ej tillämpliga{metrics.expired > 0 ? ` · ${metrics.expired} behöver omprövas` : ''}
          </p>
        </div>
        {Object.entries(groupedRecords).map(([sourceName, sourceRecords]) => (
          <div key={sourceName} className="animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold">{sourceName}</h3>
              <Badge 
                variant="outline" 
                className={getCategoryColor(sourceRecords[0]?.requirements?.requirement_sources?.category)}
              >
                {sourceRecords[0]?.requirements?.requirement_sources?.category}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {calculateMetrics(sourceRecords).fulfilled}/{calculateMetrics(sourceRecords).total} uppfyllda
              </span>
            </div>

            <div className="space-y-2">
              {sourceRecords.map((record, index) => {
                const StatusIcon = STATUS_CONFIG[record.status].icon;
                return (
                  <div
                    key={record.id}
                    className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors cursor-pointer animate-fade-in"
                    style={{ animationDelay: `${index * 30}ms` }}
                    onClick={() => setSelectedRecord(record)}
                  >
                    <div className={`p-2 rounded-lg ${STATUS_CONFIG[record.status].bgColor}`}>
                      <StatusIcon className={`h-4 w-4 ${STATUS_CONFIG[record.status].color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-primary">
                          {record.requirements?.chapter_section}
                        </span>
                        {record.requirements?.is_general_advice && (
                          <Badge variant="outline" className="text-xs">
                            Allmänt råd
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-foreground line-clamp-2">
                        {record.requirements?.description}
                      </p>
                      {record.assigned_role && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          {record.assigned_role}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant="outline" className={STATUS_CONFIG[record.status].badgeClass}>
                        {record.status}
                      </Badge>
                      {isExpired(record) && (
                        <Badge variant="outline" className="bg-status-warning/10 text-status-warning border-status-warning/20">
                          Behöver omprövas
                        </Badge>
                      )}
                      <OutOfScopeBadge since={record.out_of_scope_since} reason={record.out_of_scope_reason} />
                      <RequirementChangedBadge assessedAt={record.assessed_at} changedAt={record.requirements?.content_changed_at} />
                      <RepealedBadge repealedAt={record.requirements?.repealed_at} />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); setEditRecord(record); }}
                      >
                        Bedöm
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Sheet open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedRecord && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2 text-sm text-primary mb-2">
                  <FileText className="h-4 w-4" />
                  {selectedRecord.requirements?.requirement_sources?.document_name}
                </div>
                <SheetTitle className="text-xl">
                  {selectedRecord.requirements?.chapter_section}
                </SheetTitle>
                <SheetDescription className="text-base text-foreground">
                  {selectedRecord.requirements?.description}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-8 space-y-6">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={STATUS_CONFIG[selectedRecord.status].badgeClass}>
                      {selectedRecord.status}
                    </Badge>
                    {isExpired(selectedRecord) && (
                      <Badge variant="outline" className="bg-status-warning/10 text-status-warning border-status-warning/20">
                        Behöver omprövas
                      </Badge>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setEditRecord(selectedRecord)}>
                      Ändra bedömning
                    </Button>
                  </div>
                  {selectedRecord.assessed_by && (
                    <p className="text-xs text-muted-foreground">
                      Bedömd av {selectedRecord.assessed_by}
                      {selectedRecord.assessed_at && ` den ${new Date(selectedRecord.assessed_at).toLocaleDateString('sv-SE')}`}
                      {selectedRecord.valid_until && ` · giltig till ${selectedRecord.valid_until}`}
                    </p>
                  )}
                  {selectedRecord.justification && (
                    <p className="text-xs text-muted-foreground">Motivering: {selectedRecord.justification}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assigned-role">Tilldelad roll</Label>
                  <Input
                    id="assigned-role"
                    placeholder="t.ex. Säkerhetssamordnare"
                    defaultValue={selectedRecord.assigned_role || ''}
                    onBlur={(e) => {
                      updateStatus.mutate({
                        id: selectedRecord.id,
                        assigned_role: e.target.value,
                      });
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Verifikat</Label>
                  {selectedRecord.evidence_url || selectedRecord.evidence ? (
                    <div className="space-y-1">
                      {selectedRecord.evidence && (
                        <p className="text-sm text-muted-foreground">{selectedRecord.evidence}</p>
                      )}
                      {selectedRecord.evidence_url && (
                        <Button variant="link" className="px-0 h-auto" asChild>
                          <a href={selectedRecord.evidence_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Öppna dokument
                          </a>
                        </Button>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Inget verifikat registrerat.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Anteckningar</Label>
                  <Textarea
                    id="notes"
                    placeholder="Lägg till anteckningar..."
                    className="min-h-24"
                    defaultValue={selectedRecord.notes || ''}
                    onBlur={(e) => {
                      updateStatus.mutate({
                        id: selectedRecord.id,
                        notes: e.target.value,
                      });
                    }}
                  />
                </div>

                {selectedRecord.requirements?.is_general_advice && (
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm font-medium mb-1">Allmänt råd</p>
                    <p className="text-sm text-muted-foreground">
                      Detta är ett allmänt råd som ger vägledning för hur föreskriften ska tillämpas.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <StatusEditDialog
        open={!!editRecord}
        onOpenChange={(open) => !open && setEditRecord(null)}
        title="Bedöm krav"
        description={editRecord?.requirements?.chapter_section}
        isSaving={updateStatus.isPending}
        initial={{
          status: editRecord?.status,
          justification: editRecord?.justification ?? '',
          evidence: editRecord?.evidence ?? '',
          evidence_url: editRecord?.evidence_url ?? '',
          valid_until: editRecord?.valid_until ?? '',
          notes: editRecord?.notes ?? '',
        }}
        onSave={handleAssessmentSave}
      />
    </>
  );
}
