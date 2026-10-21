import { useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useActivityLog, useActivityChainStatus, type ActivityLogRow } from '@/hooks/useActivityLog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity, Users, Filter, ChevronDown, ChevronRight, ShieldCheck, ShieldAlert } from 'lucide-react';

const ACTION_LABELS: Record<string, string> = {
  login: 'Loggade in',
  requirement_created: 'Skapade krav',
  requirement_updated: 'Uppdaterade krav',
  requirement_deleted: 'Tog bort krav',
  requirement_reviewed: 'Granskade krav',
  source_created: 'Importerade kravkälla',
  source_updated: 'Uppdaterade kravkälla',
  source_deleted: 'Tog bort kravkälla',
  facility_created: 'Skapade anläggning',
  facility_updated: 'Uppdaterade anläggning',
  facility_deleted: 'Tog bort anläggning',
  system_created: 'Skapade system',
  system_updated: 'Uppdaterade system',
  system_deleted: 'Tog bort system',
  test_mapping_created: 'Skapade testmappning',
  test_mapping_updated: 'Uppdaterade testmappning',
  test_mapping_deleted: 'Tog bort testmappning',
  test_import: 'Importerade testmappningar',
  approve_test_suggestion: 'Godkände kravbedömning från test',
  dismiss_test_suggestion: 'Avfärdade bedömningsförslag',
  restore_test_suggestion: 'Återställde bedömningsförslag',
  test_export: 'Exporterade testmappningar',
  project_created: 'Skapade projekt',
  project_updated: 'Uppdaterade projekt',
  project_deleted: 'Tog bort projekt',
  compliance_updated: 'Ändrade kravbedömning',
  requirements_added: 'Krav tillagda på objekt',
  requirements_removed: 'Krav borttagna från objekt',
  facility_linked: 'Kopplade anläggning till system',
  facility_unlinked: 'Kopplade bort anläggning från system',
  facility_link_updated: 'Ändrade anläggningskoppling',
  requirement_review_comment: 'Kommenterade krav',
};

const ENTITY_LABELS: Record<string, string> = {
  requirement: 'Krav',
  facility: 'Anläggning',
  system: 'System',
  source: 'Kravkälla',
  test_mapping: 'Testmappning',
  requirement_test_mapping: 'Testmappning',
  system_compliance_record: 'Kravbedömning',
  compliance_record: 'Kravbedömning',
  project: 'Projekt',
  auth: 'Inloggning',
};

/** Visar "ändringar" som fält: från → till, resten som JSON. */
function MetadataView({ metadata }: { metadata: Record<string, unknown> }) {
  const changes = metadata['ändringar'] as Record<string, { från: unknown; till: unknown }> | undefined;
  const rest = Object.fromEntries(Object.entries(metadata).filter(([k]) => k !== 'ändringar'));
  const fmt = (v: unknown) => (v === null || v === undefined ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v));
  return (
    <div className="space-y-2">
      {changes && (
        <table className="text-xs">
          <tbody>
            {Object.entries(changes).map(([field, c]) => (
              <tr key={field}>
                <td className="pr-3 font-medium align-top">{field}</td>
                <td className="pr-2 text-muted-foreground line-through align-top">{fmt(c?.från)}</td>
                <td className="align-top">→ {fmt(c?.till)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {Object.keys(rest).length > 0 && (
        <pre className="text-xs whitespace-pre-wrap font-mono">{JSON.stringify(rest, null, 2)}</pre>
      )}
    </div>
  );
}

function ChainStatusCard() {
  const { data, isLoading, error } = useActivityChainStatus();
  if (isLoading) {
    return <Card><CardContent className="py-4 text-sm text-muted-foreground">Verifierar loggkedjan…</CardContent></Card>;
  }
  if (error || !data) {
    return <Card><CardContent className="py-4 text-sm text-destructive">Kunde inte verifiera loggkedjan.</CardContent></Card>;
  }
  return (
    <Card className={data.intact ? 'border-primary/40' : 'border-destructive'}>
      <CardContent className="py-4 flex items-start gap-3">
        {data.intact
          ? <ShieldCheck className="h-6 w-6 text-primary shrink-0" aria-hidden="true" />
          : <ShieldAlert className="h-6 w-6 text-destructive shrink-0" aria-hidden="true" />}
        <div className="text-sm space-y-1 min-w-0">
          <p className="font-medium">
            {data.intact
              ? `Loggkedjan är intakt – ${data.checked.toLocaleString('sv-SE')} händelser verifierade`
              : `Loggkedjan är bruten vid händelse ${data.firstBrokenSeq}: ${data.problem}`}
          </p>
          <p className="text-muted-foreground">
            Varje händelse är förseglad med en kontrollsumma som bygger på föregående händelse. Ändras eller tas
            en rad bort i efterhand syns det här. Senaste kontrollsumma (nr {data.headSeq}):
          </p>
          <code className="text-xs break-all">{data.headHash}</code>
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityRow({ row }: { row: ActivityLogRow }) {
  const [open, setOpen] = useState(false);
  const hasMeta = row.metadata && Object.keys(row.metadata).length > 0;
  return (
    <>
      <TableRow className="cursor-pointer" onClick={() => hasMeta && setOpen(!open)}>
        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
          {new Date(row.created_at).toLocaleString('sv-SE')}
        </TableCell>
        <TableCell className="font-medium">{row.user_email ?? '—'}</TableCell>
        <TableCell>{ACTION_LABELS[row.action] ?? row.action}</TableCell>
        <TableCell>
          {row.entity_type && (
            <Badge variant="outline" className="mr-2">{ENTITY_LABELS[row.entity_type] ?? row.entity_type}</Badge>
          )}
          <span className="text-sm">{row.entity_label ?? '—'}</span>
        </TableCell>
        <TableCell className="w-8">
          {hasMeta && (open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
        </TableCell>
      </TableRow>
      {open && hasMeta && (
        <TableRow>
          <TableCell colSpan={5} className="bg-muted/30">
            <MetadataView metadata={row.metadata as Record<string, unknown>} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function ActivityPage() {
  const { isAdmin } = useAuth();
  const [userFilter, setUserFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const { data: rows = [], isLoading } = useActivityLog({
    userId: userFilter !== 'all' ? userFilter : undefined,
    action: actionFilter !== 'all' ? actionFilter : undefined,
    entityType: entityFilter !== 'all' ? entityFilter : undefined,
    search: search || undefined,
    limit: 500,
  });

  const uniqueUsers = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach(r => {
      if (r.user_id) map.set(r.user_id, r.user_email ?? r.user_id);
    });
    return Array.from(map.entries());
  }, [rows]);

  const stats = useMemo(() => {
    const now = Date.now();
    const last7 = new Set<string>();
    const last30 = new Set<string>();
    const perUser: Record<string, number> = {};
    rows.forEach(r => {
      const age = now - new Date(r.created_at).getTime();
      if (r.user_id) {
        if (age <= 7 * 86400_000) last7.add(r.user_id);
        if (age <= 30 * 86400_000) last30.add(r.user_id);
        perUser[r.user_email ?? r.user_id] = (perUser[r.user_email ?? r.user_id] ?? 0) + 1;
      }
    });
    const top = Object.entries(perUser).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { last7: last7.size, last30: last30.size, top };
  }, [rows]);

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Du har inte behörighet att se denna sida.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Activity className="h-8 w-8 text-primary" />
          Aktivitet
        </h1>
        <p className="text-muted-foreground mt-1">
          Spårar inloggningar, kravgranskningar, importer och ändringar per användare.
        </p>
      </div>

      <ChainStatusCard />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Aktiva senaste 7 dagarna</CardDescription></CardHeader>
          <CardContent><p className="text-3xl font-bold">{stats.last7}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Aktiva senaste 30 dagarna</CardDescription></CardHeader>
          <CardContent><p className="text-3xl font-bold">{stats.last30}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Totalt loggade händelser</CardDescription></CardHeader>
          <CardContent><p className="text-3xl font-bold">{rows.length}</p></CardContent>
        </Card>
      </div>

      {stats.top.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4" /> Mest aktiva användare</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.top.map(([email, count]) => (
                <div key={email} className="flex justify-between text-sm">
                  <span>{email}</span>
                  <span className="text-muted-foreground">{count} händelser</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Filter className="h-4 w-4" /> Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger><SelectValue placeholder="Användare" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla användare</SelectItem>
                {uniqueUsers.map(([id, email]) => (
                  <SelectItem key={id} value={id}>{email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger><SelectValue placeholder="Åtgärd" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla åtgärder</SelectItem>
                {Object.entries(ACTION_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger><SelectValue placeholder="Typ" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla typer</SelectItem>
                {Object.entries(ENTITY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Sök e-post / objekt..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {(userFilter !== 'all' || actionFilter !== 'all' || entityFilter !== 'all' || search) && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={() => {
                setUserFilter('all'); setActionFilter('all'); setEntityFilter('all'); setSearch('');
              }}
            >Rensa filter</Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Händelselogg ({rows.length})</CardTitle>
          <CardDescription>Klicka en rad för att se detaljer.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Laddar...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Inga händelser matchar filtren.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tid</TableHead>
                  <TableHead>Användare</TableHead>
                  <TableHead>Åtgärd</TableHead>
                  <TableHead>Objekt</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => <ActivityRow key={r.id} row={r} />)}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
