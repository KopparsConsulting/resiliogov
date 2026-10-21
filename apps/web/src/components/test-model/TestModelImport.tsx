import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Download, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { useRequirements } from '@/hooks/useRequirements';
import { useInformationSystems } from '@/hooks/useInformationSystems';
import { useBulkInsertTestMappings } from '@/hooks/useTestMappings';
import { supabase } from '@/integrations/supabase/client';
import {
  PHASE_FROM_LABEL, TYPE_FROM_LABEL, TESTABILITY_FROM_LABEL, APPLICABLE_FROM_LABEL,
  RESULT_STATUS_LABELS, type ResultStatus,
} from './constants';
import { fetchAllRows } from '@/lib/fetchAll';

interface AssetRow { id: string; name: string; system_id: string }

interface ParsedRow {
  raw: Record<string, any>;
  resolved: {
    requirement_id: string | null;
    system_id: string | null;
    asset_id: string | null;
    is_applicable: boolean | null;
    testability: any;
    test_phase: any;
    test_type: any;
    responsible_party: string | null;
    evidence: string | null;
    comment: string | null;
    result_status: ResultStatus;
  };
  existingId: string | null;
  errors: string[];
  warnings: string[];
}

const matchKey = (requirementId: string | null, systemId: string | null, assetId: string | null, phase: string | null) =>
  [requirementId ?? '', systemId ?? '', assetId ?? '', phase ?? ''].join('|');

/** Strips leading clause numbering ("5.3", "5.3.3.1") and normalises spacing/case. */
const normalizeCode = (value: string) =>
  value
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[\d]+(\.[\d]+)*\s+(?=[A-Za-zÅÄÖåäö])/, '')
    .toLowerCase();

const parseResultFromComment = (comment: string): ResultStatus => {
  const upper = comment.toUpperCase();
  if (/\bFAIL(ED|URE)?\b/.test(upper)) return 'failed';
  if (/\bPASS(ED)?\b/.test(upper)) return 'passed';
  return 'not_tested';
};

const TEMPLATE_HEADERS = [
  'Krav-ID','Kravtext','Källa','System','Komponent','Systemklass',
  'Tillämpligt','Testbart','Testtillfälle','Testtyp','Ansvarig','Verifikat','Kommentar'
];

const TEMPLATE_EXAMPLE = [
  '5.1 SR 1.1','Identifiera mänskliga användare','IEC 62443-3-3','System Klass 3','Komponent Klass 3','3',
  'Ja','Ja','FAT 2','Funktionstest','Anders A','Testprotokoll FAT2-001','Verifierad innan SAT'
];

export function TestModelImport() {
  const { data: requirements = [] } = useRequirements();
  const { data: systems = [] } = useInformationSystems();
  const bulk = useBulkInsertTestMappings();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [targetSystemId, setTargetSystemId] = useState<string>('none');
  const [targetAssetId, setTargetAssetId] = useState<string>('none');

  useEffect(() => {
    fetchAllRows(() => supabase.from('system_assets').select('id, name, system_id')).then(({ data }) => {
      setAssets((data ?? []) as AssetRow[]);
    });
  }, []);

  useEffect(() => { setTargetAssetId('none'); }, [targetSystemId]);

  const targetSystem = targetSystemId !== 'none' ? targetSystemId : null;
  const targetAsset = targetAssetId !== 'none' ? targetAssetId : null;
  const assetsForTarget = assets.filter(a => a.system_id === targetSystem);

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, TEMPLATE_EXAMPLE]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Testmodell');
    const help = XLSX.utils.aoa_to_sheet([
      ['Fält', 'Giltiga värden'],
      ['Tillämpligt', 'Ja / Nej'],
      ['Testbart', 'Ja / Nej / Delvis'],
      ['Testtillfälle', 'FAT 1, FAT 2, FAT 3, SAT, OSAT'],
      ['Testtyp', 'Dokumentgranskning, Funktionstest, Penetrationstest, Konfigurationstest, Granskning av riskanalys, Annat'],
      ['Krav-ID', 'Matchar kapitel/paragraf på befintligt krav. Inledande kapitelnummer ignoreras ("5.3 SR 1.1" matchar "SR 1.1")'],
      ['System', 'Namn på befintligt informationssystem (annars används valt målsystem)'],
      ['Komponent', 'Frivillig — namn på komponent under systemet'],
      ['Kommentar', 'Innehåller kommentaren PASS sätts resultatet Godkänd, FAIL ger Underkänd'],
    ]);
    XLSX.utils.book_append_sheet(wb, help, 'Hjälp');
    XLSX.writeFile(wb, 'testmodell-mall.xlsx');
  };

  const parseWorkbookRows = (
    data: Record<string, any>[],
    assetList: AssetRow[],
    existingByKey: Map<string, string>,
  ): ParsedRow[] => data.map(raw => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const kravId = String(raw['Krav-ID'] ?? '').trim();
    const systemName = String(raw['System'] ?? '').trim();
    const componentName = String(raw['Komponent'] ?? '').trim();

    const normalized = normalizeCode(kravId);
    const requirement = kravId
      ? requirements.find(r => r.chapter_section?.trim().toLowerCase() === kravId.toLowerCase())
        ?? requirements.find(r => normalizeCode(r.chapter_section ?? '') === normalized)
      : null;
    if (!kravId) errors.push('Krav-ID saknas');
    else if (!requirement) errors.push(`Okänt krav-ID: ${kravId}`);

    const system = systemName
      ? systems.find(s => s.name.toLowerCase() === systemName.toLowerCase())
      : null;
    if (systemName && !system) warnings.push(`Okänt system "${systemName}" – använder valt målsystem`);

    const systemId = system?.id ?? targetSystem;

    const asset = componentName && systemId
      ? assetList.find(a => a.system_id === systemId && a.name.toLowerCase() === componentName.toLowerCase())
      : null;
    if (componentName && !asset) warnings.push(`Okänd komponent "${componentName}" – använder valt mål`);

    const assetId = asset?.id ?? (system && system.id !== targetSystem ? null : targetAsset);

    if (!systemId) warnings.push('Ingen koppling till system');

    const phaseRaw = String(raw['Testtillfälle'] ?? '').trim().toLowerCase();
    const testPhase = phaseRaw ? PHASE_FROM_LABEL[phaseRaw] ?? null : null;
    if (phaseRaw && !testPhase) errors.push(`Ogiltigt testtillfälle: ${raw['Testtillfälle']}`);

    const typeRaw = String(raw['Testtyp'] ?? '').trim().toLowerCase();
    const testType = typeRaw ? TYPE_FROM_LABEL[typeRaw] ?? null : null;
    if (typeRaw && !testType) errors.push(`Ogiltig testtyp: ${raw['Testtyp']}`);

    const testabilityRaw = String(raw['Testbart'] ?? '').trim().toLowerCase();
    const testability = testabilityRaw ? TESTABILITY_FROM_LABEL[testabilityRaw] ?? null : null;

    const applicableRaw = String(raw['Tillämpligt'] ?? '').trim().toLowerCase();
    const isApplicable = applicableRaw ? APPLICABLE_FROM_LABEL[applicableRaw] ?? null : null;

    const comment = String(raw['Kommentar'] ?? '').trim() || null;
    const resultStatus = comment ? parseResultFromComment(comment) : 'not_tested';

    return {
      raw,
      resolved: {
        requirement_id: requirement?.id ?? null,
        system_id: systemId,
        asset_id: assetId,
        is_applicable: isApplicable,
        testability,
        test_phase: testPhase,
        test_type: testType,
        responsible_party: String(raw['Ansvarig'] ?? '').trim() || null,
        evidence: String(raw['Verifikat'] ?? '').trim() || null,
        comment,
        result_status: resultStatus,
      },
      existingId: requirement
        ? existingByKey.get(matchKey(requirement.id, systemId, assetId, testPhase)) ?? null
        : null,
      errors,
      warnings,
    };
  });

  const handleFile = async (file: File) => {
    setFileName(file.name);
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

    const { data: assetData } = await fetchAllRows(() => supabase.from('system_assets').select('id, name, system_id'));
    const assetList = (assetData ?? []) as AssetRow[];
    setAssets(assetList);

    const { data: existing } = await fetchAllRows(() => supabase
      .from('requirement_test_mappings')
      .select('id, requirement_id, system_id, asset_id, test_phase'));
    const existingByKey = new Map<string, string>();
    for (const row of (existing || []) as any[]) {
      existingByKey.set(matchKey(row.requirement_id, row.system_id, row.asset_id, row.test_phase), row.id);
    }

    setRows(parseWorkbookRows(data, assetList, existingByKey));
  };

  const validRows = rows.filter(r => r.errors.length === 0 && r.resolved.requirement_id);
  const errorRows = rows.filter(r => r.errors.length > 0);
  const warningRows = rows.filter(r => r.errors.length === 0 && r.warnings.length > 0);
  const newRows = validRows.filter(r => !r.existingId);
  const updateRows = validRows.filter(r => r.existingId);

  const errorSummary = Object.entries(
    errorRows.reduce<Record<string, number>>((acc, r) => {
      for (const e of r.errors) {
        const key = e.replace(/:.*$/, '');
        acc[key] = (acc[key] ?? 0) + 1;
      }
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  const handleImport = async () => {
    if (validRows.length === 0) return;

    if (newRows.length > 0) {
      await bulk.mutateAsync(newRows.map(r => ({
        requirement_id: r.resolved.requirement_id!,
        system_id: r.resolved.system_id,
        asset_id: r.resolved.asset_id,
        is_applicable: r.resolved.is_applicable,
        testability: r.resolved.testability,
        test_phase: r.resolved.test_phase,
        test_type: r.resolved.test_type,
        responsible_party: r.resolved.responsible_party,
        evidence: r.resolved.evidence,
        comment: r.resolved.comment,
        result_status: r.resolved.result_status,
      })));
    }

    for (const row of updateRows) {
      await supabase.from('requirement_test_mappings').update({
        is_applicable: row.resolved.is_applicable,
        testability: row.resolved.testability,
        test_type: row.resolved.test_type,
        responsible_party: row.resolved.responsible_party,
        evidence: row.resolved.evidence,
        comment: row.resolved.comment,
        result_status: row.resolved.result_status,
      }).eq('id', row.existingId!);
    }

    queryClient.invalidateQueries({ queryKey: ['test-mappings'] });
    if (updateRows.length > 0) {
      toast.success(`${newRows.length} nya rader, ${updateRows.length} uppdaterade`);
    }

    const { logActivity } = await import('@/hooks/useActivityLog');
    void logActivity({
      action: 'test_import',
      entity_type: 'test_mapping',
      entity_label: fileName || 'Excel-import',
      metadata: { new: newRows.length, updated: updateRows.length, errors: errorRows.length },
    });
    setRows([]);
    setFileName('');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-semibold">Importera testmappning från Excel</h3>
              <p className="text-sm text-muted-foreground">Ladda upp en .xlsx med kolumnerna: {TEMPLATE_HEADERS.join(', ')}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />Ladda ner mall
              </Button>
              <Button asChild>
                <label className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />Välj fil
                  <input type="file" accept=".xlsx,.xls" className="hidden"
                    onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                </label>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
            <div className="space-y-2">
              <Label htmlFor="target-system">Målsystem</Label>
              <Select value={targetSystemId} onValueChange={setTargetSystemId}>
                <SelectTrigger id="target-system"><SelectValue placeholder="Välj system" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Inget valt</SelectItem>
                  {systems.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="target-asset">Målkomponent (frivillig)</Label>
              <Select value={targetAssetId} onValueChange={setTargetAssetId} disabled={!targetSystem}>
                <SelectTrigger id="target-asset"><SelectValue placeholder="Välj komponent" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ingen komponent</SelectItem>
                  {assetsForTarget.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Rader vars System- eller Komponentkolumn inte matchar något befintligt objekt kopplas till det mål du
            väljer här. Välj mål innan du laddar upp filen.
          </p>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-medium">{fileName}</span>
                  <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" />{validRows.length} OK</Badge>
                  <Badge variant="secondary">{newRows.length} nya</Badge>
                  <Badge variant="outline">{updateRows.length} uppdateras</Badge>
                  {warningRows.length > 0 && <Badge variant="outline" className="gap-1"><Info className="h-3 w-3" />{warningRows.length} varningar</Badge>}
                  {errorRows.length > 0 && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />{errorRows.length} fel</Badge>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setRows([]); setFileName(''); }}>Avbryt</Button>
                  <Button onClick={handleImport} disabled={validRows.length === 0 || bulk.isPending}>
                    Importera {validRows.length} rader
                  </Button>
                </div>
              </div>

              {errorSummary.length > 0 && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                  <p className="font-medium mb-1">Vanligaste felorsaker</p>
                  <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
                    {errorSummary.map(([reason, count]) => (
                      <li key={reason}>{reason} — {count} rader</li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Testkörning (dry-run): inget sparas förrän du klickar på Importera. Rader som matchar befintlig
                mappning (samma krav, system, komponent och testtillfälle) uppdateras i stället för att dubbleras.
                PASS/FAIL i kommentaren tolkas som testresultat.
              </p>
            </div>

            <div className="scroll-x-visible overflow-x-auto max-h-[500px] overflow-y-auto">
              <Table containerClassName="overflow-visible">
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Åtgärd</TableHead>
                    <TableHead>Krav-ID</TableHead>
                    <TableHead>System</TableHead>
                    <TableHead>Tillämpligt</TableHead>
                    <TableHead>Testbart</TableHead>
                    <TableHead>Tillfälle</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Resultat</TableHead>
                    <TableHead>Fel / varning</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i} className={r.errors.length > 0 ? 'bg-destructive/10' : ''}>
                      <TableCell>
                        {r.errors.length === 0
                          ? <CheckCircle2 className="h-4 w-4 text-status-success" />
                          : <AlertTriangle className="h-4 w-4 text-destructive" />}
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.errors.length > 0
                          ? <span className="text-muted-foreground">Hoppas över</span>
                          : r.existingId
                            ? <Badge variant="outline">Uppdateras</Badge>
                            : <Badge variant="secondary">Ny</Badge>}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.raw['Krav-ID']}</TableCell>
                      <TableCell className="text-xs">
                        {systems.find(s => s.id === r.resolved.system_id)?.name ?? '—'}
                      </TableCell>
                      <TableCell className="text-xs">{r.raw['Tillämpligt']}</TableCell>
                      <TableCell className="text-xs">{r.raw['Testbart']}</TableCell>
                      <TableCell className="text-xs">{r.raw['Testtillfälle']}</TableCell>
                      <TableCell className="text-xs">{r.raw['Testtyp']}</TableCell>
                      <TableCell className="text-xs">{RESULT_STATUS_LABELS[r.resolved.result_status]}</TableCell>
                      <TableCell className="text-xs">
                        <span className="text-destructive">{r.errors.join('; ')}</span>
                        {r.errors.length === 0 && <span className="text-muted-foreground">{r.warnings.join('; ')}</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
