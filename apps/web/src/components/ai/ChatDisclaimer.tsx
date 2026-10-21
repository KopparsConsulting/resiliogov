import { AlertTriangle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ChatDisclaimerProps {
  variant?: 'prominent' | 'subtle';
}

export function ChatDisclaimer({ variant = 'prominent' }: ChatDisclaimerProps) {
  if (variant === 'subtle') {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Info className="h-3 w-3" />
        <span>Verifiera alltid mot originalföreskrifter. Din fråga skickas till extern AI-tjänst – skriv inte skyddsvärda uppgifter.</span>
      </div>
    );
  }

  return (
    <Alert variant="default" className="border-status-warning/50 bg-subtle">
      <AlertTriangle className="h-4 w-4 text-status-warning" />
      <AlertTitle className="text-foreground">
        Prototyp – ej för beslutsstöd
      </AlertTitle>
      <AlertDescription className="text-muted-foreground text-sm">
        Denna AI-assistent är ett demonstrations- och lärandeverktyg. Svar baseras på ett 
        avgränsat underlag och ska inte användas för skarpa ärenden. 
        Verifiera alltid mot originalföreskrifterna. Din fråga och relevanta kravtexter skickas till en
        extern AI-tjänst – skriv inte namn på anläggningar, system eller brister i frågan.
      </AlertDescription>
    </Alert>
  );
}
