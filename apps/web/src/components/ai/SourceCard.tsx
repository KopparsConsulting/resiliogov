import { useState } from 'react';
import { ChevronDown, ChevronUp, FileText, Scale, Lightbulb, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { RequirementSource } from '@/hooks/useRegulatoryChat';

interface SourceCardProps {
  source: RequirementSource;
}

export function SourceCard({ source }: SourceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getLevelInfo = (level?: string) => {
    switch (level) {
      case 'mandatory':
        return { label: 'Bindande', variant: 'destructive' as const, icon: Scale };
      case 'recommended':
        return { label: 'Rekommendation', variant: 'secondary' as const, icon: Lightbulb };
      case 'strategic':
        return { label: 'Strategiskt', variant: 'outline' as const, icon: Target };
      default:
        return { label: 'Okänd nivå', variant: 'outline' as const, icon: FileText };
    }
  };

  const levelInfo = getLevelInfo(source.requirement_level);
  const LevelIcon = levelInfo.icon;

  return (
    <div className="border rounded-lg bg-background">
      <Button
        variant="ghost"
        className="w-full justify-between p-3 h-auto font-normal hover:bg-muted/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 text-left">
          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="font-medium text-sm">
            {source.document_name} {source.chapter_section}
          </span>
          <Badge variant={levelInfo.variant} className="text-xs">
            <LevelIcon className="h-3 w-3 mr-1" />
            {levelInfo.label}
          </Badge>
          {source.domain_name && (
            <Badge variant="outline" className="text-xs">
              {source.domain_name}
            </Badge>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}
      </Button>
      
      <div className={cn(
        "overflow-hidden transition-all duration-200",
        isExpanded ? "max-h-96" : "max-h-0"
      )}>
        <div className="p-3 pt-0 border-t">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {source.description}
          </p>
        </div>
      </div>
    </div>
  );
}
