import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2, Upload, XCircle, CircleDashed } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAll';
import {
  guessSources, parseMappingWorkbook, type ParsedMappingSheet, type SourceOption,
} from '@/lib/linkMappingSheet';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ImportLink {
  parent_section: string;
  child_section: string;
  child_source: string;
  coverage: 'full' | 'delvis';
  state: 'ny' | 'väntar' | 'godkänd';
}

interface ImportRowResult {
  ref: string;
  status: 'ok' | 'varning' | 'fel';
  lucka: boolean;
  meddelanden: string[];
  länkar: ImportLink[];
}

interface ImportResult {
  sammanfattning: {
    rader: number;
    rader_ok: number;
    rader_med_varning: number;
    rader_med_fel: number;
    luckor: number;
    nya_förslag: number;
    väntar_redan: number;
    redan_godkända: number;
    skapade: number;
    importerad: boolean;
  };
  rader: ImportRowResult[];
}

const NONE = 'none';
const LEVEL_LABEL = { lag: 'Lag', förordning: 'Förordning', föreskrift: 'Föreskrift', standard: 'Standard' } as const;
const STATE_LABEL = { ny: 'nytt förslag', väntar: 'väntar redan', godkänd: 'redan godkänd' } as const;
type RowFilter = 'alla' | 'fel' | 'varning' | 'lucka';

/**
 * Importerar mappningsarket (lag → föreskrift → standard) som länkförslag.
 * Arket läses här; matchningen mot kravkatalogen görs i databasen och
 * förslagen blir gällande först när en administratör godkänt dem.
 */
export function RequirementLinkImportDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [fileName, setFileName] = useState('');
  const [sheet, setSheet] = useState<ParsedMappingSheet | null>(null);
  const [chosen, setChosen] = useState<{ law?: string; regulation?: string; standard?: string }>({});
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState<'preview' | 'apply' | null>(null);
  const [filter, setFilter] = useState<RowFilter>('alla');

  const { data: sources = [] } = useQuery({
    queryKey: ['requirement-sources-with-level'],
    enabled: open,
    queryFn: async (): Promise<SourceOption[]> => {
      const { data, error } = await fetchAllRows(() => supabase
        .from('requirement_sources').select('id, document_name, source_level').order('document_name'));
      if (error) throw error;
      return (data ?? []) as SourceOption[];
    },
  });

  const guessed = useMemo(() => guessSources(sources), [sources]);
  const withoutLevel = sources.filter((s) => !s.source_level);

  // Regelverk som saknar nivå kan inte länkas; nivån sätts här
  const setLevel = async (id: string, level: NonNullable<SourceOption['source_level']>) => {
    const { error } = await supabase.from('requirement_sources').update({ source_level: level }).eq('id', id);
    if (error) {
      toast.error(`Kunde inte sätta nivå: ${error.message}`);
      return;
    }
    toast.success('Nivå sparad');
    setResult(null);
    queryClient.invalidateQueries({ queryKey: ['requirement-sources-with-level'] });
  };
  const lawId = chosen.law ?? guessed.law;
  const regulationId = chosen.regulation === NONE ? undefined : chosen.regulation ?? guessed.regulation;
  const standardId = chosen.standard === NONE ? undefined : chosen.standard ?? guessed.standard;

  const reset = () => {
    setFileName('');
    setSheet(null);
    setChosen({});
    setResult(null);
    setFilter('alla');
  };

  const readFile = async (file: File) => {
    setResult(null);
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const parsed = parseMappingWorkbook(wb.SheetNames.map((name) => ({
        name,
        rows: XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, defval: '', blankrows: false }),
      })));
      if (!parsed) {
        toast.error('Hittade ingen flik med kolumnen "Lagparagraf"');
        return;
      }
      setFileName(file.name);
      setSheet(parsed);
      if (parsed.rows.length === 0) toast.warning('Arket innehåller inga ifyllda rader utöver exemplen');
    } catch (e) {
      toast.error(`Kunde inte läsa filen: ${(e as Error).message}`);
    }
  };

  const run = async (apply: boolean) => {
    if (!sheet || !lawId) return;
    setBusy(apply ? 'apply' : 'preview');
    try {
      const { data, error } = await supabase.rpc('import_requirement_link_rows', {
        _law_source_id: lawId,
        _regulation_source_id: regulationId ?? null,
        _standard_source_id: standardId ?? null,
        _rows: sheet.rows as unknown as never,
        _file_name: fileName,
        _apply: apply,
      });
      if (error) throw error;
      const res = data as unknown as ImportResult;
      setResult(res);
      if (apply) {
        toast.success(`${res.sammanfattning.skapade} länkförslag skapade – granska dem i kravdatabasen`);
        queryClient.invalidateQueries({ queryKey: ['requirement-link-suggestions'] });
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const sourceSelect = (
    key: 'law' | 'regulation' | 'standard', label: string, value: string | undefined, optional: boolean,
  ) => (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Select
        value={value ?? (optional ? NONE : '')}
        onValueChange={(v) => { setChosen((c) => ({ ...c, [key]: v })); setResult(null); }}
      >
        <SelectTrigger><SelectValue placeholder="Välj regelverk" /></SelectTrigger>
        <SelectContent>
          {optional && <SelectItem value={NONE}>Inget (kolumnen används inte)</SelectItem>}
          {sources.map((s) => (
            <SelectItem key={s.id} value={s.id} disabled={!s.source_level}>
              {s.document_name}
              <span className="ml-2 text-xs text-muted-foreground">
                {s.source_level ? LEVEL_LABEL[s.source_level] : 'saknar nivå'}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const sum = result?.sammanfattning;
  const visibleRows = (result?.rader ?? []).filter((r) =>
    filter === 'alla' ? true : filter === 'lucka' ? r.lucka : r.status === filter);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importera kravmappning
          </DialogTitle>
          <DialogDescription>
            Läser mappningsarket (lagparagraf → föreskrift → IEC-krav) och skapar länkförslag. Inget blir gällande
            förrän en administratör godkänt förslagen. Teststeg i arket importeras inte här.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" asChild>
              <label className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" />
                {fileName ? 'Byt fil' : 'Välj Excel-fil'}
                <input type="file" accept=".xlsx,.xls" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); e.target.value = ''; }} />
              </label>
            </Button>
            {sheet && (
              <span className="text-sm text-muted-foreground">
                {fileName} · fliken {sheet.sheetName} · {sheet.rows.length} rader
                {sheet.skippedExamples > 0 && ` (${sheet.skippedExamples} exempelrader hoppas över)`}
              </span>
            )}
          </div>

          {sheet && sheet.missingColumns.includes('standard') && sheet.missingColumns.includes('regulation') && (
            <p className="text-sm text-destructive">
              Arket saknar både föreskrifts- och IEC-kolumn – det finns inget att länka lagparagraferna till.
            </p>
          )}

          {sheet && (
            <div className="grid gap-3 md:grid-cols-3">
              {sourceSelect('law', 'Lagparagraf hör till', lawId, false)}
              {sourceSelect('regulation', 'Föreskriftspunkt hör till', regulationId, true)}
              {sourceSelect('standard', 'IEC-krav hör till', standardId, true)}
            </div>
          )}

          {sheet && withoutLevel.length > 0 && (
            <div className="rounded-md border border-dashed p-3 space-y-2">
              <p className="text-sm text-muted-foreground">
                Regelverk utan nivå kan inte väljas ovan. Ange nivå för de regelverk som ska användas:
              </p>
              {withoutLevel.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center gap-2">
                  <span className="text-sm flex-1 min-w-[200px] truncate" title={s.document_name}>{s.document_name}</span>
                  <Select onValueChange={(v) => setLevel(s.id, v as NonNullable<SourceOption['source_level']>)}>
                    <SelectTrigger className="w-40 h-8"><SelectValue placeholder="Välj nivå" /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(LEVEL_LABEL) as (keyof typeof LEVEL_LABEL)[]).map((l) => (
                        <SelectItem key={l} value={l}>{LEVEL_LABEL[l]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}

          {sheet && (
            <div className="flex gap-2">
              <Button variant="outline" disabled={!!busy || !lawId || sheet.rows.length === 0} onClick={() => run(false)}>
                {busy === 'preview' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Förhandsgranska
              </Button>
              <Button
                disabled={!!busy || !sum || sum.importerad || sum.nya_förslag === 0}
                onClick={() => run(true)}
              >
                {busy === 'apply' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Skapa {sum && !sum.importerad ? sum.nya_förslag : ''} länkförslag
              </Button>
            </div>
          )}

          {sum && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 text-sm">
                {sum.importerad
                  ? <Badge className="bg-status-success">{sum.skapade} förslag skapade</Badge>
                  : <Badge variant="secondary">{sum.nya_förslag} nya förslag</Badge>}
                {sum.väntar_redan > 0 && <Badge variant="outline">{sum.väntar_redan} väntar redan</Badge>}
                {sum.redan_godkända > 0 && <Badge variant="outline">{sum.redan_godkända} redan godkända</Badge>}
                <span className="text-muted-foreground">·</span>
                {(['alla', 'fel', 'varning', 'lucka'] as const).map((f) => {
                  const n = f === 'alla' ? sum.rader : f === 'fel' ? sum.rader_med_fel
                    : f === 'varning' ? sum.rader_med_varning : sum.luckor;
                  return (
                    <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} className="h-7"
                      onClick={() => setFilter(f)} disabled={f !== 'alla' && n === 0}>
                      {f === 'alla' ? 'Alla rader' : f === 'fel' ? 'Fel' : f === 'varning' ? 'Varningar' : 'Luckor'} ({n})
                    </Button>
                  );
                })}
              </div>
              {sum.rader_med_fel > 0 && !sum.importerad && (
                <p className="text-sm text-muted-foreground">
                  Rader med fel ger inga länkar. Rätta dem i arket och importera igen – redan skapade förslag
                  dubbleras inte.
                </p>
              )}

              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Rad</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                      <TableHead>Länkar</TableHead>
                      <TableHead>Meddelanden</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleRows.map((r) => (
                      <TableRow key={r.ref}>
                        <TableCell className="font-mono text-xs">{r.ref}</TableCell>
                        <TableCell>
                          {r.status === 'fel' && <span className="flex items-center gap-1 text-destructive text-xs"><XCircle className="h-4 w-4" />Fel</span>}
                          {r.status === 'varning' && <span className="flex items-center gap-1 text-status-warning text-xs"><AlertTriangle className="h-4 w-4" />Varning</span>}
                          {r.status === 'ok' && !r.lucka && <span className="flex items-center gap-1 text-status-success text-xs"><CheckCircle2 className="h-4 w-4" />OK</span>}
                          {r.status === 'ok' && r.lucka && <span className="flex items-center gap-1 text-muted-foreground text-xs"><CircleDashed className="h-4 w-4" />Lucka</span>}
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.länkar.map((l) => (
                            <div key={`${l.parent_section}-${l.child_section}`} className="flex flex-wrap items-center gap-1">
                              <span className="font-mono">{l.parent_section}</span>
                              <span className="text-muted-foreground">→</span>
                              <span className="font-mono">{l.child_section}</span>
                              <span className="text-muted-foreground">({l.child_source})</span>
                              {l.coverage === 'delvis' && <Badge variant="outline" className="h-5 text-[10px]">delvis</Badge>}
                              {l.state !== 'ny' && <Badge variant="secondary" className="h-5 text-[10px]">{STATE_LABEL[l.state]}</Badge>}
                            </div>
                          ))}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.meddelanden.map((m) => <div key={m}>{m}</div>)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
