import { AlertTriangle, Info, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';

interface ChatDisclaimerProps {
  variant?: 'prominent' | 'subtle';
}

/**
 * Texten beror på var AI-modellen kör. I driftläge (operations) körs modellen
 * innanför installationen och inget lämnar nätet; i katalogläge används en
 * extern modell på offentlig lagtext.
 */
export function useAiLocality() {
  const { installationRole } = useAuth();
  const local = installationRole === 'operations';
  return {
    local,
    short: local
      ? 'Verifiera alltid mot originalföreskrifter. AI-modellen körs lokalt i installationen – inget lämnar nätet.'
      : 'Verifiera alltid mot originalföreskrifter. Din fråga skickas till en extern AI-tjänst – skriv inte skyddsvärda uppgifter.',
    long: local
      ? 'Verifiera alltid mot originalföreskrifterna. AI-modellen körs lokalt i den här installationen; din fråga och kravtexterna lämnar inte nätet.'
      : 'Verifiera alltid mot originalföreskrifterna. Din fråga och relevanta kravtexter skickas till en extern AI-tjänst – skriv inte namn på anläggningar, system eller brister i frågan.',
  };
}

export function ChatDisclaimer({ variant = 'prominent' }: ChatDisclaimerProps) {
  const ai = useAiLocality();
  if (variant === 'subtle') {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {ai.local ? <ShieldCheck className="h-3 w-3" /> : <Info className="h-3 w-3" />}
        <span>{ai.short}</span>
      </div>
    );
  }

  return (
    <Alert variant="default" className="border-status-warning/50 bg-subtle">
      <AlertTriangle className="h-4 w-4 text-status-warning" />
      <AlertTitle className="text-foreground">
        Ej för beslutsstöd
      </AlertTitle>
      <AlertDescription className="text-muted-foreground text-sm">
        AI-assistenten är ett stöd för att hitta och förstå krav. Svar baseras på kravtexterna i
        systemets databas och ska inte användas som underlag i skarpa ärenden utan egen kontroll. {ai.long}
      </AlertDescription>
    </Alert>
  );
}
