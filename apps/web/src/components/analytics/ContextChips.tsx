import { X, BookOpen, Building2, Server } from 'lucide-react';
import type { ContextItem } from './AnalyticsContextPanel';

interface ContextChipsProps {
  items: ContextItem[];
  onRemove: (id: string) => void;
}

const iconMap = {
  regelverk: BookOpen,
  anläggning: Building2,
  system: Server,
};

const colorMap = {
  regelverk: 'bg-muted/10 text-foreground dark:text-foreground border-border/30',
  anläggning: 'bg-muted/10 text-foreground dark:text-foreground border-border/30',
  system: 'bg-muted/10 text-foreground dark:text-foreground border-border/30',
};

export function ContextChips({ items, onRemove }: ContextChipsProps) {
  if (items.length === 0) return null;

  return (
    <div className="flex gap-1.5 flex-wrap">
      {items.map(item => {
        const Icon = iconMap[item.type];
        return (
          <span
            key={item.id}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${colorMap[item.type]}`}
          >
            <Icon className="h-3 w-3" />
            <span className="truncate max-w-[120px]">{item.name}</span>
            <button
              onClick={() => onRemove(item.id)}
              className="hover:opacity-70 ml-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        );
      })}
    </div>
  );
}
