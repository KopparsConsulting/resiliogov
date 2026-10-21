import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCompliance, getComplianceLabel, LABEL_STYLES } from '@/lib/complianceMetrics';
import { cn } from '@/lib/utils';

interface MetricPairProps {
  coverage: number;
  compliance: number | null;
  className?: string;
  showBars?: boolean;
}

/** Shows the two separate key figures: coverage and compliance. */
export function MetricPair({ coverage, compliance, className, showBars = false }: MetricPairProps) {
  return (
    <div className={cn('flex gap-6', className)}>
      <div className="min-w-[88px]">
        <Tooltip>
          <TooltipTrigger asChild>
            <p className="text-xs text-muted-foreground cursor-help">Täckning</p>
          </TooltipTrigger>
          <TooltipContent>Andel krav som har en annan status än "Ej påbörjad".</TooltipContent>
        </Tooltip>
        <p className="text-xl font-bold">{coverage}%</p>
        {showBars && <Progress value={coverage} className="h-2 mt-1" />}
      </div>
      <div className="min-w-[88px]">
        <Tooltip>
          <TooltipTrigger asChild>
            <p className="text-xs text-muted-foreground cursor-help">Efterlevnad</p>
          </TooltipTrigger>
          <TooltipContent>
            Uppfyllt delat med bedömda krav, exklusive "Ej tillämpligt". Visas som "–" när inget är bedömt.
          </TooltipContent>
        </Tooltip>
        <p className="text-xl font-bold">{formatCompliance(compliance)}</p>
        {showBars && <Progress value={compliance ?? 0} className="h-2 mt-1" />}
      </div>
    </div>
  );
}

interface ComplianceLabelBadgeProps {
  coverage: number;
  compliance: number | null;
  className?: string;
}

export function ComplianceLabelBadge({ coverage, compliance, className }: ComplianceLabelBadgeProps) {
  const label = getComplianceLabel({ coverage, compliance });
  return (
    <Badge variant="outline" className={cn(LABEL_STYLES[label], className)}>
      {label}
    </Badge>
  );
}
