import { BarChart3, GitCompare, Building2, PieChart, Grid3X3, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AnalyticsExampleQuestionsProps {
  onSelectQuestion: (question: string) => void;
  disabled?: boolean;
}

const EXAMPLE_QUESTIONS = [
  {
    icon: BarChart3,
    label: 'Efterlevnadsöversikt',
    question: 'Visa mig efterlevnadsstatus för alla vägtunnlar',
  },
  {
    icon: GitCompare,
    label: 'GAP-analys',
    question: 'Jämför Norra Länken med Södra Länken',
  },
  {
    icon: Grid3X3,
    label: 'Heatmap',
    question: 'Visa en heatmap över alla anläggningar och domäner',
  },
  {
    icon: PieChart,
    label: 'Domänöversikt',
    question: 'Visa efterlevnad per säkerhetsdomän för Norra Länken',
  },
  {
    icon: Building2,
    label: 'Lista anläggningar',
    question: 'Vilka anläggningar finns i systemet?',
  },
  {
    icon: Shield,
    label: 'IEC 62443-4-2',
    question: 'Vilka IEC 62443-4-2-krav gäller för våra system?',
  },
];

export function AnalyticsExampleQuestions({ onSelectQuestion, disabled }: AnalyticsExampleQuestionsProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground text-center">
        Prova en av dessa frågor
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {EXAMPLE_QUESTIONS.map((example) => {
          const Icon = example.icon;
          return (
            <Button
              key={example.label}
              variant="outline"
              className="justify-start gap-2 h-auto py-3 px-4 text-left"
              onClick={() => onSelectQuestion(example.question)}
              disabled={disabled}
            >
              <Icon className="h-4 w-4 flex-shrink-0 text-primary" />
              <div className="flex flex-col">
                <span className="font-medium text-sm">{example.label}</span>
                <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                  {example.question}
                </span>
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
