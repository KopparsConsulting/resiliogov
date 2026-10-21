import { Link } from 'react-router-dom';
import { AlertTriangle, Building2, Link2Off } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CLASSIFICATION_LABELS } from '@/types/compliance';
import type { EffectiveClassification } from '@/lib/effectiveClassification';
import { cn } from '@/lib/utils';

interface ClassificationBadgeProps {
  classification: EffectiveClassification;
  /** Render the facility name as a link to the facility page */
  linkToFacility?: boolean;
  /** Compact mode omits the source suffix (for table cells) */
  compact?: boolean;
  className?: string;
}

/**
 * Shows a system's effective classification, e.g.
 * "Klass 4 · SL 3 · Ärvd från Norra Länken" or "Avvikelse – överstyrd".
 */
export function ClassificationBadge({
  classification,
  linkToFacility = false,
  compact = false,
  className,
}: ClassificationBadgeProps) {
  const { classificationLevel, securityLevelLabel, facilityName, facilityId, isDeviation, source } =
    classification;

  if (classification.isMissing && source === 'own') {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
        <Link2Off className="h-3.5 w-3.5" />
        <span>Ingen anläggning – egen klassificering</span>
      </div>
    );
  }

  if (classificationLevel === null) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-status-warning', className)}>
        <AlertTriangle className="h-3.5 w-3.5" />
        <span>Klassificering saknas</span>
      </div>
    );
  }

  const classBadge = (
    <Badge variant={isDeviation ? 'outline' : 'secondary'}>
      Klass {classificationLevel}
    </Badge>
  );

  return (
    <TooltipProvider>
      <div className={cn('flex flex-wrap items-center gap-2', className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>{classBadge}</span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            {CLASSIFICATION_LABELS[classificationLevel]}
          </TooltipContent>
        </Tooltip>

        {securityLevelLabel && <Badge variant="outline">{securityLevelLabel}</Badge>}

        {!compact && isDeviation && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Avvikelse – överstyrd
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              {classification.overrideReason || 'Klassificeringen är överstyrd manuellt.'}
            </TooltipContent>
          </Tooltip>
        )}

        {!compact && !isDeviation && facilityName && (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            Ärvd från{' '}
            {linkToFacility && facilityId ? (
              <Link to={`/facility/${facilityId}`} className="underline hover:text-foreground">
                {facilityName}
              </Link>
            ) : (
              facilityName
            )}
          </span>
        )}
      </div>
    </TooltipProvider>
  );
}
