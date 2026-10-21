import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCarriedMeasures } from '@/hooks/useCompensatingMeasures';
import { MEASURE_STATUS_LABELS, MEASURE_TYPE_LABELS } from '@/types/project';

interface CarriedMeasuresSectionProps {
  carrier: 'system' | 'asset' | 'facility';
  carrierId: string;
  /** Compact rendering inside an asset card. */
  compact?: boolean;
}

/** "Bär kompenserande åtgärder för": requirements this asset compensates for, and where they come from. */
export function CarriedMeasuresSection({ carrier, carrierId, compact = false }: CarriedMeasuresSectionProps) {
  const { data: measures = [] } = useCarriedMeasures(carrier, carrierId);
  if (compact && measures.length === 0) return null;

  const list = measures.length === 0 ? (
    <p className="text-sm text-muted-foreground">Bär inga kompenserande åtgärder.</p>
  ) : (
    <ul className="space-y-2">
      {measures.map((measure) => (
        <li key={measure.id} className="rounded-md border p-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{measure.chapter_section}</span>
            <Badge variant="outline" className="text-xs">{MEASURE_TYPE_LABELS[measure.measure_type]}</Badge>
            <Badge variant="secondary" className="text-xs">{MEASURE_STATUS_LABELS[measure.status]}</Badge>
            <span className="text-xs text-muted-foreground">
              {measure.origin_kind === 'project' ? 'Projekt: ' : 'Profil: '}
              {measure.origin_kind === 'project' && measure.origin_id ? (
                <Link to={`/projects/${measure.origin_id}`} className="underline">{measure.origin_name}</Link>
              ) : measure.origin_name}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{measure.description}</p>
        </li>
      ))}
    </ul>
  );

  if (compact) {
    return (
      <div className="space-y-1 pt-2">
        <p className="text-xs font-medium flex items-center gap-1"><ShieldCheck className="h-3 w-3" />Bär kompenserande åtgärder för</p>
        {list}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          Bär kompenserande åtgärder för
        </CardTitle>
      </CardHeader>
      <CardContent>{list}</CardContent>
    </Card>
  );
}
