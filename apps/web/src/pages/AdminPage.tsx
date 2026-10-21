import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Check, X, Users, Shield } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { ScoringThresholdsCard } from '@/components/admin/ScoringThresholdsCard';
import { AiSettingsCard } from '@/components/admin/AiSettingsCard';
import { fetchAllRows } from '@/lib/fetchAll';

interface PendingUser {
  id: string;
  email: string;
  full_name: string | null;
  approved: boolean;
  created_at: string;
}

export default function AdminPage() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    const { data, error } = await fetchAllRows(() => supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false }));
    if (!error && data) {
      setUsers(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleApprove = async (userId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ approved: true })
      .eq('id', userId);
    if (error) {
      toast.error('Kunde inte godkänna användaren');
    } else {
      toast.success('Användaren har godkänts');
      fetchUsers();
    }
  };

  const handleReject = async (userId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ approved: false })
      .eq('id', userId);
    if (error) {
      toast.error('Kunde inte avvisa användaren');
    } else {
      toast.success('Användaren har avvisats');
      fetchUsers();
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Du har inte behörighet att se denna sida.</p>
      </div>
    );
  }

  const pendingUsers = users.filter(u => !u.approved);
  const approvedUsers = users.filter(u => u.approved);

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          Användarhantering
        </h1>
        <p className="text-muted-foreground mt-1">Godkänn eller avvisa nya användare</p>
      </div>

      <AiSettingsCard />

      <ScoringThresholdsCard />

      {/* Pending */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Väntande godkännande ({pendingUsers.length})
          </CardTitle>
          <CardDescription>Användare som väntar på att bli godkända</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Inga väntande användare</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>E-post</TableHead>
                  <TableHead>Namn</TableHead>
                  <TableHead>Registrerad</TableHead>
                  <TableHead className="text-right">Åtgärd</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell>{u.full_name || '—'}</TableCell>
                    <TableCell>{new Date(u.created_at).toLocaleDateString('sv-SE')}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" className="mr-2" onClick={() => handleApprove(u.id)}>
                        <Check className="h-4 w-4 mr-1" /> Godkänn
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleReject(u.id)}>
                        <X className="h-4 w-4 mr-1" /> Avvisa
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Approved */}
      <Card>
        <CardHeader>
          <CardTitle>Godkända användare ({approvedUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {approvedUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Inga godkända användare ännu</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>E-post</TableHead>
                  <TableHead>Namn</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Åtgärd</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvedUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell>{u.full_name || '—'}</TableCell>
                    <TableCell><Badge variant="default">Godkänd</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => handleReject(u.id)}>
                        Dra tillbaka
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
