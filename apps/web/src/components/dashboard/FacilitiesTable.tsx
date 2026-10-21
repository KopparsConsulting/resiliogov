import { useNavigate } from 'react-router-dom';
import { Building2, ChevronRight, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { FacilityWithCompliance } from '@/types/compliance';
import { useDeleteFacility } from '@/hooks/useFacilities';
import { formatCompliance } from '@/lib/complianceMetrics';
import { ComplianceLabelBadge } from '@/components/compliance/ComplianceMetricsDisplay';

interface FacilitiesTableProps {
  facilities: FacilityWithCompliance[];
}

function getTypeIcon(type: string) {
  return Building2;
}

function getScoreColor(score: number) {
  if (score >= 80) return 'progress-success';
  if (score >= 50) return 'bg-status-warning';
  return 'bg-destructive';
}

function getTypeBadgeVariant(type: string) {
  switch (type) {
    case 'Vägtunnel':
    case 'Järnvägstunnel':
      return 'default';
    case 'Bro':
    case 'Spåranläggning':
    case 'Terminal':
    case 'Trafikplats':
      return 'secondary';
    case 'Trafikledningscentral':
    case 'Datacenter':
    case 'Elkraftsanläggning':
    case 'Signalanläggning':
      return 'outline';
    default:
      return 'secondary';
  }
}

export function FacilitiesTable({ facilities }: FacilitiesTableProps) {
  const navigate = useNavigate();
  const deleteFacility = useDeleteFacility();

  if (facilities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
        <div className="p-4 rounded-full bg-muted mb-4">
          <Building2 className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Inga anläggningar ännu</h3>
        <p className="text-muted-foreground max-w-sm">
          Kom igång genom att lägga till din första anläggning. Systemet identifierar automatiskt tillämpliga krav.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden animate-fade-in">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[300px]">Anläggning</TableHead>
            <TableHead>Typ</TableHead>
            <TableHead className="text-center">Bedömda krav</TableHead>
            <TableHead className="w-[240px]">Täckning / Efterlevnad</TableHead>
            <TableHead className="text-right">Åtgärder</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {facilities.map((facility, index) => {
            const Icon = getTypeIcon(facility.type);
            return (
              <TableRow
                key={facility.id}
                className="table-row-interactive animate-fade-in"
                style={{ animationDelay: `${index * 30}ms` }}
                onClick={() => navigate(`/facility/${facility.id}`)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{facility.name}</p>
                      {facility.length_meters && (
                        <p className="text-xs text-muted-foreground">
                          {facility.length_meters} m
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getTypeBadgeVariant(facility.type)}>
                    {facility.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-medium">
                      {(facility.total_requirements || 0) - (facility.open_requirements || 0)}
                    </span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-muted-foreground">
                      {facility.total_requirements || 0}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Progress value={facility.coverage ?? 0} className="h-2 flex-1" />
                    <span className="text-sm font-medium whitespace-nowrap">
                      {facility.coverage ?? 0}% / {formatCompliance(facility.compliance ?? null)}
                    </span>
                    <ComplianceLabelBadge
                      coverage={facility.coverage ?? 0}
                      compliance={facility.compliance ?? null}
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
                        deleteFacility.mutate(facility.id);
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
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
