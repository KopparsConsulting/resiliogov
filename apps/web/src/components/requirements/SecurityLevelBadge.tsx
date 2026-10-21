import { ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getSecurityLevel, getSecurityLevelDescription, SECURITY_LEVEL_LABELS } from '@/lib/securityLevel';
import type { ClassificationLevel } from '@/types/compliance';

interface SecurityLevelBadgeProps {
  classificationLevel?: ClassificationLevel | number | null;
  showDescription?: boolean;
  className?: string;
}

/**
 * Read-only badge. The security level is always derived from the facility
 * classification level and can never be set independently.
 */
export function SecurityLevelBadge({
  classificationLevel,
  showDescription = false,
  className,
}: SecurityLevelBadgeProps) {
  const code = getSecurityLevel(classificationLevel);

  if (!code) {
    return (
      <span className={cn('text-xs text-muted-foreground', className)}>
        Säkerhetsnivå sätts av anläggningsklassen
      </span>
    );
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-center gap-2">
        <Badge variant={code === 'none' ? 'secondary' : 'default'} className="gap-1 text-xs">
          <ShieldCheck className="h-3 w-3" />
          {SECURITY_LEVEL_LABELS[code]}
        </Badge>
        <span className="text-xs text-muted-foreground">
          Härledd från Klass {classificationLevel}
        </span>
      </div>
      {showDescription && (
        <p className="text-xs text-muted-foreground">{getSecurityLevelDescription(classificationLevel)}</p>
      )}
    </div>
  );
}
