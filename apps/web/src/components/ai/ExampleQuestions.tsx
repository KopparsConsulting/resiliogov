import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExampleQuestionsProps {
  onSelectQuestion: (question: string) => void;
  disabled?: boolean;
}

const EXAMPLE_QUESTIONS = [
  "Vilka krav ställer NIS2 på ledningens ansvar?",
  "Hur ofta ska informationssäkerhetsarbetet följas upp enligt MSBFS?",
  "Vad säger TSFS 2019:93 om ventilation i tunnlar?",
  "Vilka loggningskrav gäller för kritisk infrastruktur?",
  "Behöver jag MFA enligt MSBFS 2020:7?",
  "Vilka krav finns på incidentrapportering?",
];

export function ExampleQuestions({ onSelectQuestion, disabled }: ExampleQuestionsProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <MessageSquare className="h-4 w-4" />
        <span>Prova en exempelfråga:</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {EXAMPLE_QUESTIONS.map((question, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            className="text-left h-auto py-2 px-3 whitespace-normal"
            onClick={() => onSelectQuestion(question)}
            disabled={disabled}
          >
            {question}
          </Button>
        ))}
      </div>
    </div>
  );
}
