import { AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { GapDetails } from '@/hooks/useAnalyticsChat';
import { formatCompliance } from '@/lib/complianceMetrics';

interface GapDetailsCardProps {
  details: GapDetails;
}

export function GapDetailsCard({ details }: GapDetailsCardProps) {
  const { facility1, facility2, gap_percentage, missing_requirements } = details;
  
  const GapIcon = gap_percentage > 0 ? TrendingUp : gap_percentage < 0 ? TrendingDown : Minus;
  const gapColor = gap_percentage > 0 ? 'text-status-success' : gap_percentage < 0 ? 'text-destructive' : 'text-muted-foreground';

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-status-warning" />
          GAP-analys detaljer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 p-3 bg-muted/50 rounded-lg">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">{facility1.name}</p>
            <p className="text-2xl font-bold">{formatCompliance(facility1.percentage ?? null)}</p>
          </div>
          <div className="text-center flex flex-col items-center justify-center">
            <GapIcon className={`h-5 w-5 ${gapColor}`} />
            <p className={`text-sm font-medium ${gapColor}`}>
              {gap_percentage === null || gap_percentage === undefined ? 'ej jämförbart' : `${gap_percentage > 0 ? '+' : ''}${gap_percentage}%`}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">{facility2.name}</p>
            <p className="text-2xl font-bold">{formatCompliance(facility2.percentage ?? null)}</p>
          </div>
        </div>

        {/* Missing requirements table */}
        {missing_requirements.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Badge variant="destructive" className="text-xs">
                {missing_requirements.length}
              </Badge>
              Krav uppfyllda i {facility2.name} men ej i {facility1.name}
            </h4>
            <div className="scroll-x-visible h-[200px] overflow-auto rounded-md border">
              <Table containerClassName="overflow-visible">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Dokument</TableHead>
                    <TableHead className="w-[100px]">Paragraf</TableHead>
                    <TableHead className="w-[100px]">Domän</TableHead>
                    <TableHead>Beskrivning</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {missing_requirements.map((req, index) => (
                    <TableRow key={req.id || index}>
                      <TableCell className="font-medium text-xs">
                        {req.document_name}
                      </TableCell>
                      <TableCell className="text-xs">
                        {req.chapter_section}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {req.domain_name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {req.description}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {missing_requirements.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            ✅ Inga unika krav identifierade - anläggningarna har liknande efterlevnadsprofil
          </p>
        )}
      </CardContent>
    </Card>
  );
}
