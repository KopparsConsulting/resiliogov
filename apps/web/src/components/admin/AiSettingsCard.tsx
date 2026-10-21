import { Bot, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useInstallationSettings, useSetAiComplianceAnalysis } from '@/hooks/useInstallationSettings';

/**
 * Styr vilka AI-funktioner som får skicka data till extern AI-tjänst.
 * Regelverkschatt och kravimport skickar bara offentlig lagtext (plus
 * användarens fråga). Analysassistenten skickar efterlevnadsdata och är
 * därför avstängd som standard.
 */
export function AiSettingsCard() {
  const { data: settings } = useInstallationSettings();
  const setAi = useSetAiComplianceAnalysis();
  const enabled = !!settings?.ai_compliance_analysis;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" />AI och extern databehandling</CardTitle>
        <CardDescription>
          AI-funktionerna körs hos en extern leverantör. Här styr du vilka data som får lämna systemet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-4 rounded-md border p-3">
          <div className="space-y-1">
            <Label htmlFor="ai-analysis" className="font-medium">Analysassistent för efterlevnadsdata</Label>
            <p className="text-sm text-muted-foreground">
              Skickar anläggnings- och systemnamn, klasser och vilka krav som inte är uppfyllda till den externa
              AI-tjänsten. Bör vara avstängd för skyddsvärda uppgifter.
            </p>
          </div>
          <Switch
            id="ai-analysis"
            checked={enabled}
            disabled={setAi.isPending || !settings}
            onCheckedChange={(v) => setAi.mutate(v)}
          />
        </div>
        {enabled && (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertDescription>
              Påslagen: efterlevnadsdata skickas till extern AI-tjänst när någon använder analysassistenten.
            </AlertDescription>
          </Alert>
        )}
        <p className="text-sm text-muted-foreground">
          Regelverkschatten och kravimporten skickar bara offentlig lagtext och användarens egen fråga, och är
          alltid påslagna. Skriv inte skyddsvärda uppgifter i frågorna.
        </p>
      </CardContent>
    </Card>
  );
}
