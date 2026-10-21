import { Link, useNavigate } from 'react-router-dom';
import { Plus, Server, Box, ChevronRight, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFacilitySystems } from '@/hooks/useInformationSystems';
import { ClassificationBadge } from '@/components/system/ClassificationBadge';
import { getEffectiveClassification } from '@/lib/effectiveClassification';
import { relationTypeLabels, criticalityLabels } from '@/types/system';
import type { PrimaryFacility } from '@/types/system';

interface FacilitySystemsListProps {
  facility: PrimaryFacility;
}

/**
 * Facility-driven view of the systems that belong to a facility.
 * The facility is the entry point: new systems are created from here and
 * inherit the facility's classification.
 */
export function FacilitySystemsList({ facility }: FacilitySystemsListProps) {
  const navigate = useNavigate();
  const { data: links, isLoading } = useFacilitySystems(facility.id);

  const createSystemHref = `/systems/new?facilityId=${facility.id}`;

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!links || links.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="p-3 rounded-lg bg-muted">
            <Server className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">Inga system kopplade ännu</p>
            <p className="text-sm text-muted-foreground">
              System som skapas här ärver anläggningens klassificering och säkerhetsnivå.
            </p>
          </div>
          <Button asChild>
            <Link to={createSystemHref}>
              <Plus className="mr-2 h-4 w-4" />
              Lägg till system
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {links.length} system kopplade. System märkta med stjärna ärver klassificering från denna anläggning.
        </p>
        <Button asChild>
          <Link to={createSystemHref}>
            <Plus className="mr-2 h-4 w-4" />
            Lägg till system
          </Link>
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[280px]">System</TableHead>
              <TableHead>Relation</TableHead>
              <TableHead>Klassificering</TableHead>
              <TableHead className="text-center">Komponenter</TableHead>
              <TableHead className="w-[180px]">Efterlevnad</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {links.map((link) => {
              const system = link.information_systems;
              if (!system) return null;
              const classification = getEffectiveClassification(system, facility, link.classification);

              return (
                <TableRow
                  key={link.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/systems/${system.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Server className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium flex items-center gap-1">
                          {system.name}
                          {link.is_primary && (
                            <Star className="h-3.5 w-3.5 fill-current text-primary" />
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{system.system_type}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant="secondary" className="w-fit">
                        {relationTypeLabels[link.relation_type]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {criticalityLabels[link.criticality]}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <ClassificationBadge classification={classification} compact />
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center gap-1">
                      <Box className="h-4 w-4 text-muted-foreground" />
                      {link.assets_count ?? 0}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={link.compliance_score ?? 0} className="h-2" />
                      <span className="text-xs text-muted-foreground w-10 text-right">
                        {link.compliance_score ?? 0}%
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {link.total_requirements ?? 0} krav
                    </span>
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
