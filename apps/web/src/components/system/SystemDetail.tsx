import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Server, Building2, Box, Shield, Globe, AlertTriangle, FileText, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useInformationSystem, useSystemComplianceRecords, useSystemFacilities, useSystemAssets } from '@/hooks/useInformationSystems';
import { SystemRequirementList } from './SystemRequirementList';
import { calculateMetrics, formatCompliance, needsAction } from '@/lib/complianceMetrics';
import { ComplianceLabelBadge } from '@/components/compliance/ComplianceMetricsDisplay';
import { SystemFacilitiesList } from './SystemFacilitiesList';
import { SystemAssetsList } from './SystemAssetsList';
import { ComponentRequirementsSummary } from './ComponentRequirementsSummary';
import { CarriedMeasuresSection } from '@/components/project/CarriedMeasuresSection';
import { ClassificationBadge } from './ClassificationBadge';
import { SystemClassificationDialog } from './SystemClassificationDialog';
import { RequirementSyncDialog } from './RequirementSyncDialog';
import { getEffectiveClassification } from '@/lib/effectiveClassification';
import { useSystemClassification, useRequirementSyncPending } from '@/hooks/useSystemClassification';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function SystemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: system, isLoading: systemLoading } = useInformationSystem(id || '');
  const { data: records, isLoading: recordsLoading } = useSystemComplianceRecords(id || '');
  const { data: facilities } = useSystemFacilities(id || '');
  const { data: assets } = useSystemAssets(id || '');
  const { data: dbClassification } = useSystemClassification(id);
  const { data: pending } = useRequirementSyncPending('system', id);
  const [classificationDialogOpen, setClassificationDialogOpen] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);

  if (systemLoading || recordsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!system) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">System hittades inte</h2>
          <Button onClick={() => navigate('/systems')}>Tillbaka till systemöversikt</Button>
        </div>
      </div>
    );
  }

  const metrics = calculateMetrics(records || []);
  const openRequirements = (records || []).filter((r) => needsAction(r)).length;

  const primaryFacility = (facilities || []).find(f => f.is_primary)?.facilities || null;
  const effectiveClassification = getEffectiveClassification(system, primaryFacility, dbClassification);
  const pendingReview = (pending?.removals ?? 0) + (pending?.deactivations ?? 0) + (pending?.reactivations ?? 0);


  return (
    <div className="space-y-6">
      <SystemClassificationDialog
        open={classificationDialogOpen}
        onOpenChange={setClassificationDialogOpen}
        systemId={system.id}
        systemName={system.name}
        classification={effectiveClassification}
        primaryFacility={primaryFacility}
        dbClassification={dbClassification ?? null}
      />

      <RequirementSyncDialog
        open={syncDialogOpen}
        onOpenChange={setSyncDialogOpen}
        systemId={system.id}
        systemName={system.name}
      />


      {/* Header */}
      <div className="border-b border-border pb-6">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate('/systems')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tillbaka
        </Button>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Server className="h-8 w-8 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">{system.name}</h1>
                <Badge>{system.system_type}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <ClassificationBadge
                  classification={effectiveClassification}
                  linkToFacility
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setClassificationDialogOpen(true)}
                >
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Ändra klassificering
                </Button>
              </div>
              {effectiveClassification.isDeviation && effectiveClassification.overrideReason && (
                <p className="text-sm text-muted-foreground mb-2">
                  <span className="font-medium text-foreground">Motivering: </span>
                  {effectiveClassification.overrideReason}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {system.system_owner && (
                  <div className="flex items-center gap-1">
                    <Shield className="h-4 w-4" />
                    {system.system_owner}
                  </div>
                )}
                {system.is_critical_entity && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <AlertTriangle className="h-4 w-4" />
                    Samhällsviktig
                  </div>
                )}
                {system.is_externally_accessible && (
                  <div className="flex items-center gap-1">
                    <Globe className="h-4 w-4" />
                    Externt tillgängligt
                  </div>
                )}
              </div>
              {system.description && (
                <p className="text-muted-foreground mt-2">{system.description}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSyncDialogOpen(true)}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
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
              <div className="text-3xl font-bold">{openRequirements}</div>
              <div className="text-sm text-muted-foreground">Öppna krav</div>
            </div>
          </div>
        </div>
      </div>

      {pendingReview > 0 && (
        <Alert className="border-status-warning/50 bg-subtle">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Kraven behöver granskas</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>
              Klassen eller underlaget har ändrats.{' '}
              {[
                pending!.removals + pending!.deactivations > 0 &&
                  `${pending!.removals + pending!.deactivations} krav gäller inte längre`,
                pending!.reactivations > 0 && `${pending!.reactivations} krav gäller igen`,
              ].filter(Boolean).join(' och ')}
              . Nya krav har redan lagts till automatiskt.
            </span>
            <Button size="sm" variant="outline" onClick={() => setSyncDialogOpen(true)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Granska ändringar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Efterlevnadsstatus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Progress value={metrics.coverage} className="flex-1 h-2" />
              <span className="text-sm font-medium whitespace-nowrap">
                {metrics.assessed}/{metrics.total} bedömda
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Kopplade anläggningar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{facilities?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Box className="h-4 w-4" />
              Komponenter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assets?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ägartyp
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium">
              {system.owner_type || 'Ej angiven'}
            </div>
          </CardContent>
        </Card>
      </div>

      <ComponentRequirementsSummary systemId={id || ''} />

      {/* Tabs */}
      <Tabs defaultValue="requirements">
        <TabsList>
          <TabsTrigger value="requirements">
            Krav ({(records || []).length})
          </TabsTrigger>
          <TabsTrigger value="facilities">
            Anläggningar ({facilities?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="assets">
            Komponenter ({assets?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requirements" className="mt-6">
          <SystemRequirementList records={records || []} systemId={id || ''} />
        </TabsContent>

        <TabsContent value="facilities" className="mt-6">
          <SystemFacilitiesList 
            facilities={facilities || []} 
            systemId={id || ''} 
          />
        </TabsContent>

        <TabsContent value="assets" className="mt-6">
          <SystemAssetsList 
            assets={assets || []} 
            systemId={id || ''} 
          />
        </TabsContent>
      </Tabs>

      <CarriedMeasuresSection carrier="system" carrierId={id || ''} />
    </div>
  );
}
