import { AlertTriangle, Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DomainCard } from './DomainCard';
import { FacilityComplianceTable } from './FacilityComplianceTable';
import { useDomainCompliance } from '@/hooks/useDomainCompliance';
import { useFacilities } from '@/hooks/useFacilities';
import { aggregateMetrics, formatCompliance, getComplianceLabel } from '@/lib/complianceMetrics';

export function ExecutiveSummary() {
  const { data: domains, isLoading: domainsLoading } = useDomainCompliance();
  const { data: facilities, isLoading: facilitiesLoading } = useFacilities();

  const isLoading = domainsLoading || facilitiesLoading;

  const facilityTotals = aggregateMetrics(facilities ?? []);

  const facilityLabels = (facilities ?? []).map((facility) =>
    getComplianceLabel({ coverage: facility.coverage ?? 0, compliance: facility.compliance ?? null })
  );
  const domainLabels = (domains ?? []).map((domain) =>
    getComplianceLabel({ coverage: domain.coverage_percentage ?? 0, compliance: domain.compliance_value ?? null })
  );
  const allLabels = [...facilityLabels, ...domainLabels];

  const criticalCount = allLabels.filter((label) => label === 'Kritisk').length;
  const notAssessedCount = allLabels.filter((label) => label === 'Ej bedömd').length;

  if (isLoading) {
    return (
      <div className="space-y-8 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold">Executive Summary</h1>
        <p className="text-muted-foreground">
          Översikt av säkerhetsläget för infrastrukturanläggningar
        </p>
      </div>

      {/* KPI Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Anläggningar
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{facilityTotals.coverage}%</div>
            <p className="text-xs text-muted-foreground">
              Täckning – {facilityTotals.assessed} av {facilityTotals.total} krav bedömda
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Efterlevnad
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCompliance(facilityTotals.compliance)}</div>
            <p className="text-xs text-muted-foreground">
              Uppfyllda av bedömda krav (ej tillämpliga borträknade)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Kritiska områden
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{criticalCount}</div>
            <p className="text-xs text-muted-foreground">
              Låg efterlevnad trots genomförd bedömning
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Ej bedömda
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notAssessedCount}</div>
            <p className="text-xs text-muted-foreground">
              Objekt och domäner utan bedömning
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Facilities and Domains */}
      <Tabs defaultValue="facilities" className="space-y-6">
        <TabsList>
          <TabsTrigger value="facilities">
            Anläggningar ({facilities?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="domains">
            Säkerhetsdomäner ({domains?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="facilities">
          {facilities && <FacilityComplianceTable facilities={facilities} />}
        </TabsContent>

        <TabsContent value="domains">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {domains?.map((domain) => (
              <DomainCard key={domain.id} domain={domain} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
