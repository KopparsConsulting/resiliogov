import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, MapPin, AlertTriangle, Shield, FileText, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useFacility, useSyncFacilityRequirements, useUpdateFacility } from '@/hooks/useFacilities';
import { useComplianceRecords } from '@/hooks/useComplianceRecords';
import { useQuery } from '@tanstack/react-query';
import { fetchFacilityRollup } from '@/lib/objectMetrics';
import { RequirementList } from '@/components/facility/RequirementList';
import { calculateMetrics, formatCompliance, needsAction, isClosed } from '@/lib/complianceMetrics';
import { ComplianceLabelBadge } from '@/components/compliance/ComplianceMetricsDisplay';
import { LinkedSystemRequirements } from '@/components/facility/LinkedSystemRequirements';
import { FacilitySystemsList } from '@/components/facility/FacilitySystemsList';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CLASSIFICATION_LABELS, type ClassificationLevel } from '@/types/compliance';
import { SecurityLevelBadge } from '@/components/requirements/SecurityLevelBadge';


export function FacilityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: facility, isLoading: facilityLoading } = useFacility(id || '');
  const { data: records, isLoading: recordsLoading } = useComplianceRecords(id || '');
  // Anläggningens siffror inkluderar kopplade system (samma som i listorna)
  const { data: rollup } = useQuery({
    queryKey: ['facility-rollup', id],
    queryFn: async () => (await fetchFacilityRollup([id!])).get(id!),
    enabled: !!id,
  });
  const syncRequirements = useSyncFacilityRequirements();
  const updateFacility = useUpdateFacility();

  if (facilityLoading || recordsLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!facility) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Anläggning hittades inte</h2>
          <Button onClick={() => navigate('/')}>Tillbaka till översikt</Button>
        </div>
      </div>
    );
  }

  const ownMetrics = calculateMetrics(records || []);
  const metrics = rollup ?? { ...ownMetrics, ownTotal: ownMetrics.total, systemsTotal: 0, linkedSystems: 0 };
  // Varje krav i omfattningen är antingen öppet (kräver åtgärd) eller klart
  const openRecords = (records || []).filter((r) => needsAction(r));
  const closedRecords = (records || []).filter((r) => isClosed(r));
  const openRequirements = openRecords.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tillbaka
          </Button>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold">{facility.name}</h1>
                  <Badge>{facility.type}</Badge>
                  <Select
                    value={facility.classification_level ? String(facility.classification_level) : ''}
                    onValueChange={(v) =>
                      updateFacility.mutate({
                        id: facility.id,
                        classification_level: (v ? Number(v) : null) as ClassificationLevel | null,
                      })
                    }
                  >
                    <SelectTrigger className="h-8 w-[220px] text-xs">
                      <SelectValue placeholder="Sätt klassificering..." />
                    </SelectTrigger>
                    <SelectContent>
                      {([1, 2, 3, 4, 5] as ClassificationLevel[]).map((lvl) => (
                        <SelectItem key={lvl} value={String(lvl)}>{CLASSIFICATION_LABELS[lvl]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <SecurityLevelBadge classificationLevel={facility.classification_level} />

                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {facility.length_meters && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {facility.length_meters} m
                    </div>
                  )}
                  {facility.is_critical_entity && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <AlertTriangle className="h-4 w-4" />
                      Samhällsviktig
                    </div>
                  )}
                  {facility.owner_type && (
                    <div className="flex items-center gap-1">
                      <Shield className="h-4 w-4" />
                      {facility.owner_type}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => syncRequirements.mutate(id!)}
                disabled={syncRequirements.isPending}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${syncRequirements.isPending ? 'animate-spin' : ''}`} />
                Uppdatera krav
              </Button>
              <div className="h-16 w-px bg-border" />
              <div className="text-center">
                <div className="text-3xl font-bold">{metrics.coverage}%</div>
                <div className="text-sm text-muted-foreground">Täckning</div>
              </div>
              <div className="h-16 w-px bg-border" />
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{formatCompliance(metrics.compliance)}</div>
                <div className="text-sm text-muted-foreground">Efterlevnad</div>
              </div>
              <div className="h-16 w-px bg-border" />
              <ComplianceLabelBadge coverage={metrics.coverage} compliance={metrics.compliance} />
              <div className="h-16 w-px bg-border" />
              <div className="text-center">
                <div className="text-3xl font-bold">{rollup ? rollup.needsAction : openRequirements}</div>
                <div className="text-sm text-muted-foreground">Öppna krav</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        <div className="grid gap-6 lg:grid-cols-4 mb-8">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Efterlevnadsstatus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Progress value={metrics.coverage} className="flex-1 h-3" />
                <span className="text-sm font-medium w-24 text-right">
                  {metrics.assessed}/{metrics.total} bedömda
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Inklusive {metrics.linkedSystems} kopplade system: {metrics.ownTotal} krav på anläggningen och{' '}
                {metrics.systemsTotal} krav på systemen. Flikarna nedan visar anläggningens egna krav.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Parametrar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {facility.length_meters && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Längd</span>
                  <span className="font-medium">{facility.length_meters} m</span>
                </div>
              )}
              {facility.traffic_flow_adt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ÅDT</span>
                  <span className="font-medium">{facility.traffic_flow_adt.toLocaleString()}</span>
                </div>
              )}
              {facility.construction_type && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Konstruktion</span>
                  <span className="font-medium">{facility.construction_type}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all" className="animate-fade-in">
          <TabsList className="mb-6">
            <TabsTrigger value="all">Alla krav ({(records || []).length})</TabsTrigger>
            <TabsTrigger value="open">Öppna ({openRequirements})</TabsTrigger>
            <TabsTrigger value="completed">Klara ({closedRecords.length})</TabsTrigger>
            <TabsTrigger value="facility-systems">System</TabsTrigger>
            <TabsTrigger value="systems">Krav via system</TabsTrigger>
          </TabsList>

          <TabsContent value="facility-systems">
            <FacilitySystemsList facility={facility} />
          </TabsContent>

          <TabsContent value="all">
            <RequirementList records={records || []} />
          </TabsContent>

          <TabsContent value="open">
            <RequirementList records={openRecords} />
          </TabsContent>

          <TabsContent value="completed">
            <RequirementList records={closedRecords} />
          </TabsContent>

          <TabsContent value="systems">
            <LinkedSystemRequirements facilityId={facility.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
