import { BarChart3, Target, Grid3X3, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AnalyticsQuickFiltersProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

const filters = [
  { label: 'GAP-analys', icon: Target, prompt: 'Gör en GAP-analys för ' },
  { label: 'Efterlevnad', icon: BarChart3, prompt: 'Visa efterlevnadsstatus för ' },
  { label: 'Heatmap', icon: Grid3X3, prompt: 'Skapa en heatmap som visar ' },
  { label: 'Kravlista', icon: ListChecks, prompt: 'Lista alla krav för ' },
];

export function AnalyticsQuickFilters({ onSelect, disabled }: AnalyticsQuickFiltersProps) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {filters.map(f => (
        <Button
          key={f.label}
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={() => onSelect(f.prompt)}
          disabled={disabled}
        >
          <f.icon className="h-3 w-3" />
          {f.label}
        </Button>
      ))}
    </div>
  );
}
