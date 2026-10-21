import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Server, Building2, Box, ChevronRight, Trash2, Link2Off } from 'lucide-react';
import { ClassificationBadge } from '@/components/system/ClassificationBadge';
import { getEffectiveClassification } from '@/lib/effectiveClassification';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { aggregateMetrics, formatCompliance } from '@/lib/complianceMetrics';
import { ComplianceLabelBadge } from '@/components/compliance/ComplianceMetricsDisplay';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useInformationSystems, useDeleteInformationSystem } from '@/hooks/useInformationSystems';

export default function SystemsPage() {
  const navigate = useNavigate();
  const { data: systems, isLoading } = useInformationSystems();
  const systemTotals = aggregateMetrics(systems ?? []);
  const deleteSystem = useDeleteInformationSystem();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Informationssystem</h1>
          <p className="text-muted-foreground">
            IT-system som stödjer fysiska anläggningar (Level 2)
          </p>
        </div>
        <Button onClick={() => navigate('/systems/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Nytt system
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Totalt antal system
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{systems?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Samhällsviktiga
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              {systems?.filter(s => s.is_critical_entity).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Täckning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{systemTotals.coverage}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {systemTotals.assessed} av {systemTotals.total} krav bedömda
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Efterlevnad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {formatCompliance(systemTotals.compliance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Uppfyllda av bedömda krav
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Systems Table */}
      {!systems || systems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-full bg-muted mb-4">
              <Server className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Inga informationssystem ännu</h3>
            <p className="text-muted-foreground text-center max-w-sm mb-4">
              Lägg till ditt första informationssystem för att börja spåra IT-säkerhetskrav.
            </p>
            <Button onClick={() => navigate('/systems/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Skapa system
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[280px]">System</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead className="w-[240px]">Anläggning</TableHead>
                <TableHead className="text-center">Komponenter</TableHead>
                <TableHead className="w-[240px]">Täckning / Efterlevnad</TableHead>
                <TableHead className="text-right">Åtgärder</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {systems.map((system, index) => (
                <TableRow
                  key={system.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  style={{ animationDelay: `${index * 30}ms` }}
                  onClick={() => navigate(`/systems/${system.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Server className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{system.name}</p>
                        {system.is_critical_entity && (
                          <Badge variant="destructive" className="text-xs">
                            Samhällsviktig
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{system.system_type}</Badge>
                  </TableCell>
                  <TableCell>
                    {system.primary_facility ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          {system.primary_facility.name}
                        </div>
                        <ClassificationBadge
                          classification={getEffectiveClassification(system, system.primary_facility, system.classification)}
                          compact
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Link2Off className="h-3.5 w-3.5" />
                          Fristående
                        </span>
                        <ClassificationBadge
                          classification={getEffectiveClassification(system, null, system.classification)}
                          compact
                        />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Box className="h-4 w-4 text-muted-foreground" />
                      <span>{system.assets_count || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Progress value={system.coverage ?? 0} className="h-2 flex-1" />
                      <span className="text-sm font-medium whitespace-nowrap">
                        {system.coverage ?? 0}% / {formatCompliance(system.compliance ?? null)}
                      </span>
                      <ComplianceLabelBadge
                        coverage={system.coverage ?? 0}
                        compliance={system.compliance ?? null}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSystem.mutate(system.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
