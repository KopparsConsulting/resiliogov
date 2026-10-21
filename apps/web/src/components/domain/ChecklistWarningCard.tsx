import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface WarningItem {
  id: string;
  name: string;
  linkTo: string;
  subtitle?: string;
}

interface ChecklistWarningCardProps {
  items: WarningItem[];
  successMessage: string;
  warningMessage: (count: number) => string;
  className?: string;
}

export function ChecklistWarningCard({
  items,
  successMessage,
  warningMessage,
  className,
}: ChecklistWarningCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasWarnings = items.length > 0;

  if (!hasWarnings) {
    return (
      <div className={cn('flex items-center gap-2 p-2 bg-status-success/10 dark:bg-status-success/30 rounded-md text-sm', className)}>
        <CheckCircle2 className="h-4 w-4 text-status-success dark:text-status-success shrink-0" />
        <span className="text-status-success dark:text-status-success">{successMessage}</span>
      </div>
    );
  }

  return (
    <div className={cn('rounded-md border border-status-warning/30 dark:border-status-warning/30 bg-status-warning/10 dark:bg-status-warning/30', className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between gap-2 p-2 text-sm hover:bg-status-warning/10 dark:hover:bg-status-warning/30 rounded-md transition-colors"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-status-warning dark:text-status-warning shrink-0" />
          <span className="text-status-warning dark:text-status-warning font-medium">
            {warningMessage(items.length)}
          </span>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-status-warning dark:text-status-warning" />
        ) : (
          <ChevronRight className="h-4 w-4 text-status-warning dark:text-status-warning" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-2 pb-2 space-y-1">
          {items.map((item) => (
            <Link
              key={item.id}
              to={item.linkTo}
              className="flex items-center gap-2 p-2 text-sm rounded-md hover:bg-status-warning/10 dark:hover:bg-status-warning/30 transition-colors group"
            >
              <span className="text-status-warning dark:text-status-warning">→</span>
              <div className="flex flex-col">
                <span className="text-foreground group-hover:text-primary transition-colors">
                  {item.name}
                </span>
                {item.subtitle && (
                  <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
