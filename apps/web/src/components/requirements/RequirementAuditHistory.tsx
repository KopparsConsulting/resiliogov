import { useRequirementAuditLog } from '@/hooks/useRequirementReviews';
import { format } from 'date-fns';
import { History } from 'lucide-react';

const actionLabels: Record<string, string> = {
  trigger_logic_updated: 'ändrade trigger logic',
  review_approved: 'godkände kravet',
  review_flagged: 'flaggade kravet',
  review_reset: 'återställde granskningen',
  review_comment: 'kommenterade',
};

export function RequirementAuditHistory({ requirementId }: { requirementId: string }) {
  const { data: log = [], isLoading } = useRequirementAuditLog(requirementId);

  if (isLoading) return <p className="text-xs text-muted-foreground">Laddar historik...</p>;
  if (log.length === 0) return <p className="text-xs text-muted-foreground italic">Ingen ändringshistorik</p>;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 mb-1">
        <History className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Ändringshistorik</span>
      </div>
      <div className="space-y-0.5 max-h-40 overflow-y-auto">
        {log.map((entry) => (
          <div key={entry.id} className="text-xs text-muted-foreground flex gap-2">
            <span className="shrink-0 font-mono">
              {format(new Date(entry.created_at), 'MM-dd HH:mm')}
            </span>
            <span>
              <span className="font-medium">{entry.changed_by}</span>{' '}
              {actionLabels[entry.action] || entry.action}
              {entry.new_value && typeof entry.new_value === 'object' && (entry.new_value as any).comment && (
                <span className="italic"> — "{(entry.new_value as any).comment}"</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
