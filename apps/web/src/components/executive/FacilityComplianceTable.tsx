import { Link } from 'react-router-dom';
import { Building2, AlertTriangle, CheckCircle2, Clock, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { FacilityWithCompliance } from '@/types/compliance';
import { aggregateMetrics, formatCompliance, getComplianceLabel } from '@/lib/complianceMetrics';
import { ComplianceLabelBadge } from '@/components/compliance/ComplianceMetricsDisplay';

interface FacilityComplianceTableProps {
  facilities: FacilityWithCompliance[];
}


export function FacilityComplianceTable({ facilities }: FacilityComplianceTableProps) {
  // Group facilities by type
  const groupedByType = facilities.reduce((acc, facility) => {
    const type = facility.type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(facility);
    return acc;
  }, {} as Record<string, FacilityWithCompliance[]>);

  // Calculate stats per type
  const typeStats = Object.entries(groupedByType).map(([type, typeFacilities]) => {
    const typeTotals = aggregateMetrics(typeFacilities);

    return {
      type,
      count: typeFacilities.length,
      coverage: typeTotals.coverage,
      compliance: typeTotals.compliance,
      totalReqs: typeTotals.total,
      facilities: typeFacilities,
    };
  }).sort((a, b) => a.coverage - b.coverage);

  // Overall stats
  const totalFacilities = facilities.length;
  const totals = aggregateMetrics(facilities);
  const labels = facilities.map((facility) =>
    getComplianceLabel({ coverage: facility.coverage ?? 0, compliance: facility.compliance ?? null })
  );
  const criticalFacilities = labels.filter((label) => label === 'Kritisk').length;
  const notAssessedFacilities = labels.filter((label) => label === 'Ej bedömd').length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Totalt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFacilities}</div>
            <p className="text-xs text-muted-foreground">anläggningar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-foreground" />
              Täckning / Efterlevnad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totals.coverage}% / {formatCompliance(totals.compliance)}
            </div>
            <Progress value={totals.coverage} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Ej bedömda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notAssessedFacilities}</div>
            <p className="text-xs text-muted-foreground">anläggningar utan bedömning</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Kritiska
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{criticalFacilities}</div>
            <p className="text-xs text-muted-foreground">låg efterlevnad trots bedömning</p>
          </CardContent>
        </Card>
      </div>

      {/* Compliance by Type */}
      <Card>
        <CardHeader>
          <CardTitle>Täckning och efterlevnad per anläggningstyp</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {typeStats.map(({ type, count, coverage, compliance, totalReqs }) => (
              <div key={type} className="flex items-center gap-4">
                <div className="w-40 font-medium">{type}</div>
                <div className="flex-1">
                  <Progress value={coverage} className="h-3" />
                </div>
                <div className="w-28 text-right font-bold whitespace-nowrap">
                  {coverage}% / {formatCompliance(compliance)}
                </div>
                <Badge variant="outline" className="w-28 justify-center">
                  {count} st · {totalReqs} krav
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Alla anläggningar</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Anläggning</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Täckning</TableHead>
                <TableHead className="text-right">Efterlevnad</TableHead>
                <TableHead className="text-right">Bedömda krav</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...facilities]
                .sort((a, b) => (a.coverage ?? 0) - (b.coverage ?? 0))
                .map((facility) => {
                  return (
                    <TableRow key={facility.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {facility.name}
                          {facility.is_critical_entity && (
                            <AlertTriangle className="h-4 w-4 text-status-warning" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{facility.type}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <ComplianceLabelBadge
                          coverage={facility.coverage ?? 0}
                          compliance={facility.compliance ?? null}
                        />
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {facility.coverage ?? 0}%
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCompliance(facility.compliance ?? null)}
                      </TableCell>
                      <TableCell className="text-right">
                        {facility.assessed_count ?? 0} / {facility.total_requirements ?? 0}
                      </TableCell>
                      <TableCell>
                        <Link 
                          to={`/facility/${facility.id}`}
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          Visa <ChevronRight className="h-4 w-4" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
