import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PackageOpen, PackagePlus, KeyRound, ShieldCheck, ShieldAlert, Upload, Loader2, History, CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  buildPackageFile, checkPackage, downloadJson, generateSigningKey, keyIdFor, parsePackageFile,
  parseSigningKeyFile, signContent, type PackageCheck, type RequirementPackageFile, type SigningKeyFile,
} from '@/lib/requirementPackage';

type InstallationRole = 'combined' | 'catalog' | 'operations';

const ROLE_LABELS: Record<InstallationRole, string> = {
  combined: 'Kombinerad (katalog och drift i samma miljö)',
  catalog: 'Katalogmiljö (underhåller kravbiblioteket, skapar paket)',
  operations: 'Driftmiljö (importerar paket)',
};

interface ImportSummary {
  version: number;
  notes?: string | null;
  krav_i_paketet: number;
  nya: number;
  ändrade: number;
  återinförda: number;
  upphävda: number;
  nya_poster: number;
  objekt_att_granska: number;
  preview?: boolean;
  added_list?: { id: string; chapter_section: string; description: string }[];
  changed_list?: { id: string; chapter_section: string; description: string; text_changed: boolean; reinstated: boolean }[];
  repealed_list?: { id: string; chapter_section: string; description: string }[];
}

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) return String((error as { message: unknown }).message);
  return 'Okänt fel';
}

export function RequirementPackagesCard() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['installation-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('installation_settings').select('*').eq('id', 1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const { data: releases = [] } = useQuery({
    queryKey: ['requirement-catalog-releases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('requirement_catalog_releases')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const role = (settings?.role ?? 'combined') as InstallationRole;
  const trusted = settings?.trusted_key_id && settings?.trusted_public_key
    ? { keyId: settings.trusted_key_id, publicKey: settings.trusted_public_key }
    : null;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['installation-settings'] });
    queryClient.invalidateQueries({ queryKey: ['requirement-catalog-releases'] });
  };

  const updateSettings = async (patch: { role?: InstallationRole; trusted_key_id?: string | null; trusted_public_key?: string | null }) => {
    const { error } = await supabase.from('installation_settings').update(patch).eq('id', 1);
    if (error) {
      toast.error(`Kunde inte spara: ${error.message}`);
      return false;
    }
    refresh();
    return true;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <PackageOpen className="h-5 w-5 text-primary" />
          Kravpaket
        </CardTitle>
        <CardDescription>
          För över kravbiblioteket – regelverk, krav och villkor – från en öppen katalogmiljö till en skyddad
          driftmiljö. Paketet innehåller aldrig anläggningar, system eller bedömningar. Det är versionerat, har
          kontrollsumma och kan signeras.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground">Den här miljön:</span>
          {isAdmin ? (
            <Select value={role} onValueChange={(v) => updateSettings({ role: v as InstallationRole })}>
              <SelectTrigger className="w-[420px] max-w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(ROLE_LABELS) as InstallationRole[]).map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Badge variant="outline">{ROLE_LABELS[role]}</Badge>
          )}
        </div>

        {!isAdmin && (
          <Alert>
            <AlertDescription>Endast administratörer kan skapa och importera kravpaket.</AlertDescription>
          </Alert>
        )}

        {isAdmin && role !== 'operations' && <CreatePackageSection onDone={refresh} />}
        {isAdmin && role === 'combined' && <Separator />}
        {isAdmin && role !== 'catalog' && (
          <ImportPackageSection trusted={trusted} onDone={refresh} onSaveTrustedKey={updateSettings} />
        )}

        <Separator />
        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2"><History className="h-4 w-4" />Historik</h4>
          {releases.length === 0 ? (
            <p className="text-sm text-muted-foreground">Inga kravpaket har skapats eller importerats här.</p>
          ) : (
            <div className="space-y-2">
              {releases.map((r) => {
                const counts = (r.counts ?? {}) as Record<string, unknown>;
                return (
                  <div key={r.id} className="flex flex-wrap items-center gap-2 text-sm border rounded-md px-3 py-2">
                    <Badge variant={r.direction === 'export' ? 'secondary' : 'default'}>
                      {r.direction === 'export' ? 'Skapat' : 'Importerat'}
                    </Badge>
                    <span className="font-medium">Version {r.version}</span>
                    <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString('sv-SE')}</span>
                    {r.created_by && <span className="text-muted-foreground">• {r.created_by}</span>}
                    {r.direction === 'import' && (
                      <span className="text-muted-foreground">
                        • {String(counts['nya'] ?? 0)} nya, {String(counts['ändrade'] ?? 0)} ändrade, {String(counts['upphävda'] ?? 0)} upphävda
                      </span>
                    )}
                    {r.direction === 'import' && (r.signature_verified
                      ? <Badge variant="outline" className="gap-1"><ShieldCheck className="h-3 w-3" />Signatur kontrollerad</Badge>
                      : <Badge variant="outline" className="gap-1"><ShieldAlert className="h-3 w-3" />Osignerat</Badge>)}
                    <code className="text-xs text-muted-foreground ml-auto" title="SHA-256">{r.sha256.slice(0, 12)}…</code>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Katalogsidan: skapa paket och signeringsnyckel ──

function CreatePackageSection({ onDone }: { onDone: () => void }) {
  const [notes, setNotes] = useState('');
  const [key, setKey] = useState<SigningKeyFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [newKey, setNewKey] = useState<SigningKeyFile | null>(null);
  const keyInput = useRef<HTMLInputElement>(null);

  const loadKey = async (file: File | undefined) => {
    if (!file) return;
    try {
      setKey(parseSigningKeyFile(await file.text()));
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const createPackage = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('export_requirement_catalog', { _notes: notes || undefined });
      if (error) throw error;
      const row = data?.[0];
      if (!row) throw new Error('Inget paket skapades');
      const signature = key ? await signContent(row.content, key) : null;
      const pkg = buildPackageFile({ version: row.version, sha256: row.sha256, content: row.content, signature });
      downloadJson(`kravpaket-v${row.version}.json`, pkg);
      toast.success(`Kravpaket version ${row.version} skapat${signature ? ' och signerat' : ' (osignerat)'}`);
      setNotes('');
      onDone();
    } catch (e) {
      toast.error(`Kunde inte skapa kravpaket: ${errorMessage(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const createKey = async () => {
    const k = await generateSigningKey();
    downloadJson(`signeringsnyckel-${k.key_id}.json`, k);
    setNewKey(k);
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold flex items-center gap-2"><PackagePlus className="h-4 w-4" />Skapa kravpaket</h4>
      <p className="text-sm text-muted-foreground">
        Paketet innehåller alla krav som inte är lokala eller upphävda. Krav som saknas i ett nytt paket markeras
        som upphävda i driftmiljön, där deras bedömningar granskas i stället för att tas bort.
      </p>
      <div className="space-y-1">
        <Label htmlFor="package-notes">Versionsanteckning</Label>
        <Textarea id="package-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="T.ex. Uppdaterad efter TSFS 2026:12" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input ref={keyInput} type="file" accept="application/json,.json" className="hidden"
          onChange={(e) => { loadKey(e.target.files?.[0]); e.target.value = ''; }} />
        <Button variant="outline" size="sm" onClick={() => keyInput.current?.click()}>
          <KeyRound className="mr-2 h-4 w-4" />
          {key ? `Signerar med ${key.key_id}` : 'Välj signeringsnyckel'}
        </Button>
        {key && <Button variant="ghost" size="sm" onClick={() => setKey(null)}>Ta bort nyckel</Button>}
        <Button size="sm" onClick={createPackage} disabled={busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackagePlus className="mr-2 h-4 w-4" />}
          Skapa och ladda ner
        </Button>
      </div>
      <div className="text-sm">
        <Button variant="link" className="px-0 h-auto" onClick={createKey}>Skapa ny signeringsnyckel</Button>
        <span className="text-muted-foreground"> – den privata nyckeln laddas ner som fil och sparas aldrig på servern.</span>
      </div>
      {newKey && (
        <Alert>
          <KeyRound className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <p>
              Nyckeln <strong>{newKey.key_id}</strong> har laddats ner. Förvara filen säkert. Registrera den publika
              nyckeln nedan som betrodd i driftmiljön:
            </p>
            <code className="block break-all text-xs bg-muted p-2 rounded">{newKey.public_key}</code>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// ── Driftsidan: betrodd nyckel och import ──

function ImportPackageSection({
  trusted, onDone, onSaveTrustedKey,
}: {
  trusted: { keyId: string; publicKey: string } | null;
  onDone: () => void;
  onSaveTrustedKey: (patch: { trusted_key_id: string | null; trusted_public_key: string | null }) => Promise<boolean>;
}) {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pkg, setPkg] = useState<RequirementPackageFile | null>(null);
  const [check, setCheck] = useState<PackageCheck | null>(null);
  const [preview, setPreview] = useState<ImportSummary | null>(null);
  const [result, setResult] = useState<ImportSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [publicKeyInput, setPublicKeyInput] = useState('');

  const reset = () => { setPkg(null); setCheck(null); setPreview(null); };

  const loadPackage = async (file: File | undefined) => {
    if (!file) return;
    reset();
    setResult(null);
    try {
      const parsed = parsePackageFile(await file.text());
      setPkg(parsed);
      const c = await checkPackage(parsed, trusted);
      setCheck(c);
      if (c.ok) await runPreview(parsed, c);
    } catch (e) {
      setCheck({ ok: false, reason: errorMessage(e) });
    }
  };

  const args = (p: RequirementPackageFile, c: Extract<PackageCheck, { ok: true }>) => ({
    _content: p.content,
    _sha256: p.sha256,
    _signature_key_id: c.keyId ?? undefined,
    _signature_verified: c.signatureVerified,
  });

  const runPreview = async (p: RequirementPackageFile, c: Extract<PackageCheck, { ok: true }>) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('preview_requirement_catalog_import', args(p, c));
      if (error) throw error;
      setPreview(data as unknown as ImportSummary);
    } catch (e) {
      setCheck({ ok: false, reason: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  const runImport = async () => {
    if (!pkg || !check?.ok) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('import_requirement_catalog', args(pkg, check));
      if (error) throw error;
      const summary = data as unknown as ImportSummary;
      setResult(summary);
      reset();
      toast.success(`Kravpaket version ${summary.version} importerat`);
      for (const key of ['requirements', 'information-systems', 'facilities', 'system-compliance-records',
        'compliance-records', 'requirement-sync-pending', 'facility-systems']) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      onDone();
    } catch (e) {
      toast.error(`Importen avbröts: ${errorMessage(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const saveTrustedKey = async () => {
    const value = publicKeyInput.trim();
    try {
      const keyId = await keyIdFor(value);
      if (await onSaveTrustedKey({ trusted_key_id: keyId, trusted_public_key: value })) {
        toast.success(`Nyckel ${keyId} är nu betrodd – osignerade paket avvisas`);
        setPublicKeyInput('');
      }
    } catch {
      toast.error('Ogiltig publik nyckel');
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold flex items-center gap-2"><Upload className="h-4 w-4" />Importera kravpaket</h4>

      <div className="rounded-md border p-3 space-y-2">
        {trusted ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4 text-status-success" />
            Betrodd nyckel: <code>{trusted.keyId}</code>. Bara paket signerade med den importeras.
            <Button variant="ghost" size="sm" onClick={() => onSaveTrustedKey({ trusted_key_id: null, trusted_public_key: null })}>
              Ta bort
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Ingen betrodd nyckel – även osignerade paket kan importeras. Klistra in den publika nyckeln från
              katalogmiljön för att kräva signatur.
            </p>
            <div className="flex gap-2">
              <Textarea rows={1} value={publicKeyInput} onChange={(e) => setPublicKeyInput(e.target.value)}
                placeholder="Publik nyckel (base64)" className="font-mono text-xs" />
              <Button size="sm" variant="outline" onClick={saveTrustedKey} disabled={!publicKeyInput.trim()}>Spara</Button>
            </div>
          </>
        )}
      </div>

      <input ref={fileInput} type="file" accept="application/json,.json" className="hidden"
        onChange={(e) => { loadPackage(e.target.files?.[0]); e.target.value = ''; }} />
      <Button size="sm" variant="outline" onClick={() => fileInput.current?.click()} disabled={busy}>
        <Upload className="mr-2 h-4 w-4" />Välj kravpaket
      </Button>

      {check && 'reason' in check && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>{check.reason}</AlertDescription>
        </Alert>
      )}
      {check && 'warning' in check && check.warning && (
        <Alert><ShieldAlert className="h-4 w-4" /><AlertDescription>{check.warning}</AlertDescription></Alert>
      )}
      {busy && !preview && <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Kontrollerar paketet…</p>}

      {preview && (
        <div className="rounded-md border p-3 space-y-3">
          <p className="text-sm font-medium">
            Version {preview.version}{preview.notes ? ` – ${preview.notes}` : ''}. Förhandsvisning, inget är ändrat ännu.
          </p>
          <SummaryBadges s={preview} />
          <ChangeList title="Nya krav" items={preview.added_list} />
          <ChangeList title="Ändrade krav" items={preview.changed_list?.map((c) => ({
            ...c, description: `${c.reinstated ? '(återinförs) ' : ''}${c.text_changed ? '' : '(villkor/nivå) '}${c.description}`,
          }))} />
          <ChangeList title="Upphävs" items={preview.repealed_list} />
          {preview.objekt_att_granska > 0 && (
            <p className="text-sm text-muted-foreground">
              {preview.objekt_att_granska} anläggningar/system får krav att granska. Bedömningar tas aldrig bort
              automatiskt – de visas under "Kraven behöver granskas".
            </p>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={runImport} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Importera version {preview.version}
            </Button>
            <Button size="sm" variant="ghost" onClick={reset} disabled={busy}>Avbryt</Button>
          </div>
        </div>
      )}

      {result && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <p>Version {result.version} är importerad och loggad.</p>
            <SummaryBadges s={result} />
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function SummaryBadges({ s }: { s: ImportSummary }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="secondary">{s.krav_i_paketet} krav i paketet</Badge>
      <Badge variant="secondary">{s.nya} nya</Badge>
      <Badge variant="secondary">{s.ändrade} ändrade</Badge>
      {s.återinförda > 0 && <Badge variant="secondary">{s.återinförda} återinförda</Badge>}
      <Badge variant="secondary">{s.upphävda} upphävda</Badge>
      <Badge variant="secondary">{s.nya_poster} nya bedömningsposter</Badge>
    </div>
  );
}

function ChangeList({ title, items }: { title: string; items?: { id: string; chapter_section: string; description: string }[] }) {
  if (!items?.length) return null;
  return (
    <details className="text-sm">
      <summary className="cursor-pointer font-medium">{title} ({items.length})</summary>
      <ul className="mt-2 space-y-1 max-h-48 overflow-y-auto">
        {items.map((i) => (
          <li key={i.id}><span className="font-mono text-xs text-muted-foreground mr-2">{i.chapter_section}</span>{i.description}</li>
        ))}
      </ul>
    </details>
  );
}
