import { useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  RESPONSIBLE_ORGS,
  RESPONSIBLE_ORG_LABELS,
  RESULT_STATUS_LABELS,
  type ResponsibleOrg,
} from '@/components/test-model/constants';
import {
  exportSupplierWorkbook,
  parseSupplierWorkbook,
  type SupplierImportRow,
} from './supplierWorkbook';
import { useImportSupplierResults, type TestPlanRow } from '@/hooks/useProjectTestPlan';

const ALL = 'all';

interface ProjectSupplierExchangeProps {
  projectId: string;
  projectName: string;
  rows: TestPlanRow[];
  assets: { id: string; name: string }[];
}

export function ProjectSupplierExchange({
  projectId,
  projectName,
  rows,
  assets,
}: ProjectSupplierExchangeProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importResults = useImportSupplierResults();
  const [exportOrg, setExportOrg] = useState<ResponsibleOrg | typeof ALL>('supplier');
  const [preview, setPreview] = useState<SupplierImportRow[] | null>(null);

  const assetNames = useMemo(
    () => Object.fromEntries(assets.map((asset) => [asset.id, asset.name])),
    [assets],
  );
  const activityIds = useMemo(
    () => new Set(rows.flatMap((row) => row.activities.map((activity) => activity.id))),
    [rows],
  );
  const exportCount = useMemo(
    () =>
      rows
        .flatMap((row) => row.activities)
        .filter((activity) => exportOrg === ALL || activity.responsible_org === exportOrg).length,
    [rows, exportOrg],
  );

  const validRows = preview?.filter((row) => !row.error) ?? [];
  const errorRows = preview?.filter((row) => row.error) ?? [];

  const handleExport = () => {
    const count = exportSupplierWorkbook({
      rows,
      assetNames,
      projectName,
      responsibleOrg: exportOrg === ALL ? null : exportOrg,
    });
    if (count === 0) toast.error('Inga testaktiviteter matchar valet');
    else toast.success(`${count} rader exporterade`);
  };

  const handleFile = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseSupplierWorkbook(buffer, activityIds);
      if (parsed.length === 0) {
        toast.error('Filen innehåller inga ifyllda rader');
        return;
      }
      setPreview(parsed);
    } catch {
      toast.error('Kunde inte läsa filen. Använd den exporterade Excel-mallen.');
    }
  };

  const handleConfirm = () => {
    importResults.mutate(
      {
        projectId,
        updates: validRows.map((row) => ({
          mappingId: row.mappingId,
          resultStatus: row.resultStatus,
          testedAt: row.testedAt,
          testedBy: row.testedBy,
          deviation: row.deviation,
          evidence: row.evidence,
          comment: row.comment,
        })),
      },
      { onSuccess: () => setPreview(null) },
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Leverantörsunderlag</CardTitle>
        <CardDescription>
          Exportera testplanen till leverantören och läs in deras ifyllda resultat när provningen är klar.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label>Ansvarig part i underlaget</Label>
          <Select
            value={exportOrg}
            onValueChange={(value) => setExportOrg(value as ResponsibleOrg | typeof ALL)}
          >
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Alla aktiviteter</SelectItem>
              {RESPONSIBLE_ORGS.map((org) => (
                <SelectItem key={org} value={org}>{RESPONSIBLE_ORG_LABELS[org]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleExport} disabled={exportCount === 0}>
          <Download className="mr-2 h-4 w-4" />
          Exportera {exportCount} rader
        </Button>

        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
          <Upload className="mr-2 h-4 w-4" />
          Importera leverantörssvar
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = '';
          }}
        />
      </CardContent>

      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Granska leverantörens svar</DialogTitle>
            <DialogDescription>
              Kontrollera raderna innan de sparas. Endast godkända rader importeras.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-3">
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {validRows.length} rader klara att importera
            </Badge>
            {errorRows.length > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                {errorRows.length} rader med fel
              </Badge>
            )}
          </div>

          <div className="max-h-80 overflow-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Krav</th>
                  <th className="px-3 py-2 text-left font-medium">Resultat</th>
                  <th className="px-3 py-2 text-left font-medium">Testdatum</th>
                  <th className="px-3 py-2 text-left font-medium">Verifikat</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {preview?.map((row, index) => (
                  <tr key={`${row.mappingId}-${index}`}>
                    <td className="px-3 py-2">{row.chapterSection || '—'}</td>
                    <td className="px-3 py-2">{RESULT_STATUS_LABELS[row.resultStatus]}</td>
                    <td className="px-3 py-2">{row.testedAt ?? '—'}</td>
                    <td className="px-3 py-2 max-w-[16rem] truncate">{row.evidence ?? '—'}</td>
                    <td className="px-3 py-2">
                      {row.error ? (
                        <span className="text-destructive">{row.error}</span>
                      ) : (
                        <span className="text-muted-foreground">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>Avbryt</Button>
            <Button
              onClick={handleConfirm}
              disabled={validRows.length === 0 || importResults.isPending}
            >
              Importera {validRows.length} rader
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
