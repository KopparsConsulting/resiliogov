import { FileText, Filter } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { SystemComplianceRecord } from '@/types/system';
import { STATUS_STYLES } from '@/components/compliance/statusConfig';
import { StatusEditDialog, type AssessmentValues } from '@/components/compliance/StatusEditDialog';
import { MetricPair } from '@/components/compliance/ComplianceMetricsDisplay';
import { calculateMetrics, isExpired } from '@/lib/complianceMetrics';
import { useUpdateSystemComplianceStatus } from '@/hooks/useSystemComplianceStatus';
import { OutOfScopeBadge, RequirementChangedBadge, RepealedBadge } from '@/components/compliance/OutOfScopeBadge';

interface SystemRequirementListProps {
  records: SystemComplianceRecord[];
  systemId: string;
}


export function SystemRequirementList({ records, systemId }: SystemRequirementListProps) {
  const [editRecord, setEditRecord] = useState<SystemComplianceRecord | null>(null);
  const updateStatus = useUpdateSystemComplianceStatus();
  const metrics = calculateMetrics(records);

  const handleAssessmentSave = (values: AssessmentValues) => {
    if (!editRecord) return;
    updateStatus.mutate(
      { id: editRecord.id, ...values },
      { onSuccess: () => setEditRecord(null) },
    );
  };

  const allSources = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => set.add(r.requirements?.requirement_sources?.document_name || 'Övrigt'));
    return Array.from(set).sort();
  }, [records]);

  const [selectedSources, setSelectedSources] = useState<string[]>([]);

  const toggleSource = (s: string) =>
    setSelectedSources((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const activeSources = selectedSources.length === 0 ? allSources : selectedSources;

  const filteredRecords = records.filter((r) =>
    activeSources.includes(r.requirements?.requirement_sources?.document_name || 'Övrigt')
  );

  if (records.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="p-3 rounded-full bg-muted mb-3">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Inga krav matchade detta system</p>
        </CardContent>
      </Card>
    );
  }

  // Group by source document
  const groupedRecords = filteredRecords.reduce((acc, record) => {
    const source = record.requirements?.requirement_sources?.document_name || 'Övrigt';
    if (!acc[source]) acc[source] = [];
    acc[source].push(record);
    return acc;
  }, {} as Record<string, SystemComplianceRecord[]>);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <MetricPair coverage={metrics.coverage} compliance={metrics.compliance} showBars />
          <p className="text-xs text-muted-foreground mt-2">
            {metrics.assessed} av {metrics.total} krav bedömda · {metrics.fulfilled} uppfyllda ·{' '}
            {metrics.notApplicable} ej tillämpliga{metrics.expired > 0 ? ` · ${metrics.expired} behöver omprövas` : ''}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtrera kravkälla
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {allSources.map((source) => {
              const count = records.filter(
                (r) => (r.requirements?.requirement_sources?.document_name || 'Övrigt') === source
              ).length;
              const active = selectedSources.includes(source);
              return (
                <Button
                  key={source}
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  onClick={() => toggleSource(source)}
                >
                  {source}
                  <Badge variant="secondary" className="ml-2">{count}</Badge>
                </Button>
              );
            })}
            {selectedSources.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setSelectedSources([])}>
                Rensa filter
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {selectedSources.length === 0
              ? `Visar alla ${records.length} krav`
              : `Visar ${filteredRecords.length} av ${records.length} krav`}
          </p>
        </CardContent>
      </Card>

      {Object.entries(groupedRecords).map(([source, sourceRecords]) => (
        <Card key={source}>
          <CardHeader>
            <CardTitle className="text-lg">{source}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sourceRecords.map((record) => {
              const style = STATUS_STYLES[record.status];
              const StatusIcon = style.icon;
              return (
                <div
                  key={record.id}
                  className="flex items-start justify-between gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <StatusIcon className={`h-5 w-5 mt-0.5 ${style.color}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {record.requirements?.chapter_section}
                        </Badge>
                        {isExpired(record) && (
                          <Badge variant="outline" className="text-xs bg-status-warning/10 text-status-warning border-status-warning/20">
                            Behöver omprövas
                          </Badge>
                        )}
                        <OutOfScopeBadge since={record.out_of_scope_since} reason={record.out_of_scope_reason} />
                        <RequirementChangedBadge assessedAt={record.assessed_at} changedAt={record.requirements?.content_changed_at} />
                        <RepealedBadge repealedAt={record.requirements?.repealed_at} />
                      </div>
                      <p className="text-sm">{record.requirements?.description}</p>
                      {record.assessed_by && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Bedömd av {record.assessed_by}
                          {record.valid_until && ` · giltig till ${record.valid_until}`}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Badge variant="outline" className={style.badgeClass}>{record.status}</Badge>
                    <Button size="sm" variant="outline" onClick={() => setEditRecord(record)}>
                      Bedöm
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

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
    </div>
  );
}
