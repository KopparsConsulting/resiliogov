import { Shield, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

interface ApprovalGateProps {
  children: React.ReactNode;
}

export function ApprovalGate({ children }: ApprovalGateProps) {
  const { user, profile, isApproved, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse">
          <Shield className="h-12 w-12 text-primary" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <>{children}</>;
  }

  if (profile && !isApproved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 rounded-full bg-muted w-fit">
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">Inväntar godkännande</CardTitle>
            <CardDescription>
              Ditt konto ({user.email}) har skapats men inväntar godkännande av en administratör.
              Du får ett meddelande när ditt konto har godkänts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={signOut}>
              Logga ut
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
