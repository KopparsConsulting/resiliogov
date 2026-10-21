import { useState } from 'react';
import { Shield, LogIn, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { API_BASE } from '@/integrations/supabase/client';

/**
 * Inloggningen sköts helt av organisationens identitetsleverantör (OIDC).
 * Knappen skickar webbläsaren till API:t, som startar inloggningsflödet och
 * sätter sessionscookien när användaren kommer tillbaka.
 */
export default function AuthPage() {
  const [loading, setLoading] = useState(false);

  const handleSignIn = () => {
    setLoading(true);
    window.location.href = `${API_BASE}/auth/login`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Compliance Manager</CardTitle>
          <CardDescription>Logga in för att komma åt systemet</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full" onClick={handleSignIn} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogIn className="h-4 w-4 mr-2" />}
            Logga in
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Du skickas till organisationens inloggning. Nya konton inväntar godkännande
            av en administratör innan de får tillgång.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
