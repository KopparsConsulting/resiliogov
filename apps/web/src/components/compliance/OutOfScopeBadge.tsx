import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Visas på krav som inte längre gäller objektet men har registrerat arbete.
 * Bedömningen ligger kvar men räknas inte i täckning eller efterlevnad.
 */
export function OutOfScopeBadge({
  since,
  reason,
}: {
  since?: string | null;
  reason?: string | null;
}) {
  if (!since) return null;
  const label = `Utanför omfattning sedan ${since.slice(0, 10)}`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className="text-xs bg-muted text-muted-foreground" tabIndex={0}>
          {label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        {reason || 'Kravet gäller inte längre objektet.'} Räknas inte i täckning eller efterlevnad.
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Kravets text, villkor eller nivå har ändrats efter att det bedömdes –
 * bedömningen ska granskas mot den nya lydelsen.
 */
export function RequirementChangedBadge({
  assessedAt,
  changedAt,
}: {
  assessedAt?: string | null;
  changedAt?: string | null;
}) {
  if (!assessedAt || !changedAt || new Date(assessedAt) >= new Date(changedAt)) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className="text-xs bg-status-warning/10 text-status-warning border-status-warning/20" tabIndex={0}>
          Kravet ändrat efter bedömning
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        Kravet ändrades {changedAt.slice(0, 10)}, efter bedömningen {assessedAt.slice(0, 10)}. Granska bedömningen mot den nya lydelsen.
      </TooltipContent>
    </Tooltip>
  );
}

/** Kravet har upphävts i ett importerat kravpaket */
export function RepealedBadge({ repealedAt }: { repealedAt?: string | null }) {
  if (!repealedAt) return null;
  return (
    <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
      Upphävt {repealedAt.slice(0, 10)}
    </Badge>
  );
}
