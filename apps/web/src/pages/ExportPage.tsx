import { useState, useEffect, useMemo } from 'react';
import { Archive, Download, Clock, FileSpreadsheet, FileJson, FileText, FolderArchive, Info, ChevronRight, Hash, CalendarClock, Database } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { ExportFilterDialog } from '@/components/export/ExportFilterDialog';
import { ExportDiffPreview } from '@/components/export/ExportDiffPreview';
import { RequirementPackagesCard } from '@/components/export/RequirementPackagesCard';

interface ExportRecord {
  id: string;
  export_id: string;
  file_name: string;
  user_email: string | null;
  filters: any;
  row_counts: any;
  created_at: string;
}

export default function ExportPage() {
  const [history, setHistory] = useState<ExportRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('export_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setHistory(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchHistory(); }, []);

  const filterSummary = (filters: Record<string, any>) => {
    const parts: string[] = [];
    if (filters.facilityIds?.length) parts.push(`${filters.facilityIds.length} anläggningar${filters.includeLinkedSystems === false ? '' : ' + kopplade system'}`);
    if (filters.systemIds?.length) parts.push(`${filters.systemIds.length} system`);
    if (filters.sourceIds?.length) parts.push(`${filters.sourceIds.length} regelverk`);
    if (filters.domainIds?.length) parts.push(`${filters.domainIds.length} domäner`);
    return parts.length ? parts.join(', ') : 'Alla data';
  };

  const rowCountSummary = (rc: Record<string, any>) => {
    if (!rc || Object.keys(rc).length === 0) return null;
    return (
      <div className="flex flex-wrap gap-2 mt-1">
        {rc.facilities != null && <Badge variant="outline" className="text-xs">{rc.facilities} anl.</Badge>}
        {rc.systems != null && <Badge variant="outline" className="text-xs">{rc.systems} system</Badge>}
        {rc.requirements != null && <Badge variant="outline" className="text-xs">{rc.requirements} krav</Badge>}
        {rc.complianceRecords != null && <Badge variant="outline" className="text-xs">{rc.complianceRecords} poster</Badge>}
      </div>
    );
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Archive className="h-6 w-6 text-primary" />
            Export
          </h1>
          <p className="text-muted-foreground">
            Efterlevnadspaket för granskning och arkivering, och kravpaket för att föra kravbiblioteket till en annan miljö.
          </p>
        </div>
        <ExportFilterDialog onExportComplete={fetchHistory} />
      </div>

      {/* Stats widgets */}
      {(() => {
        const totalExports = history.length;
        const lastExport = history[0]?.created_at ? new Date(history[0].created_at) : null;
        const totalRows = history.reduce((sum, r) => {
          const rc = r.row_counts || {};
          return sum + (rc.facilities || 0) + (rc.systems || 0) + (rc.requirements || 0) + (rc.complianceRecords || 0) + (rc.systemComplianceRecords || 0);
        }, 0);
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Hash className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalExports}</p>
                  <p className="text-xs text-muted-foreground">Totalt antal exporter</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="p-3 rounded-lg bg-primary/10">
                  <CalendarClock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{lastExport ? lastExport.toLocaleDateString('sv-SE') : '–'}</p>
                  <p className="text-xs text-muted-foreground">Senaste export</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalRows.toLocaleString('sv-SE')}</p>
                  <p className="text-xs text-muted-foreground">Totalt exporterade rader</p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* Changes preview */}
      <ExportDiffPreview />

      {/* Requirement packages */}
      <RequirementPackagesCard />

      {/* Usage guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="h-5 w-5 text-primary" />
            Så här använder du denna export
          </CardTitle>
          <CardDescription>
            Paketet är utformat för intern granskning, analys och arkivering utan nätverksåtkomst.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick steps */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="mt-0.5 p-2 rounded-md bg-primary/10">
                <Download className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">1. Exportera</p>
                <p className="text-xs text-muted-foreground">Klicka "Exportpaket", välj filter och ladda ner ZIP-filen. Kräver administratör.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="mt-0.5 p-2 rounded-md bg-primary/10">
                <FolderArchive className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">2. Packa upp</p>
                <p className="text-xs text-muted-foreground">Extrahera ZIP-filen till valfri mapp på din dator.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="mt-0.5 p-2 rounded-md bg-primary/10">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">3. Analysera</p>
                <p className="text-xs text-muted-foreground">Öppna <code className="text-xs bg-muted px-1 rounded">compliance-export.xlsx</code> i Excel för en komplett översikt.</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* File structure accordion */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="structure">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                <span className="flex items-center gap-2">
                  <FolderArchive className="h-4 w-4" />
                  Paketets filstruktur
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-3 text-sm">
                  <FileRow icon={<FileText className="h-4 w-4 text-muted-foreground" />} name="README.txt" desc="Introduktion, filter, datavolymer – läs först." />
                  <FileRow icon={<FileJson className="h-4 w-4 text-primary" />} name="package-metadata.json" desc="Maskinläsbar metadata: export-ID, tidsstämpel, radantal. För spårbarhet." />
                  <FileRow icon={<FileSpreadsheet className="h-4 w-4 text-primary" />} name="compliance-export.xlsx" desc="Huvudfilen. Polerad Excel-arbetsbok med 7 flikar, frysta rubriker och autofilter." />
                  <FileRow icon={<FileJson className="h-4 w-4 text-primary" />} name="compliance-data.json" desc="Samma data i strukturerat JSON-format för import till lokala databaser eller skript." />
                  <div className="pl-4 border-l-2 border-muted space-y-2 mt-1">
                    <p className="text-xs font-semibold text-muted-foreground font-medium">csv/</p>
                    <FileRow icon={<FileText className="h-3.5 w-3.5 text-muted-foreground" />} name="regelverk.csv" desc="Regelverk med ID, namn, kategori." small />
                    <FileRow icon={<FileText className="h-3.5 w-3.5 text-muted-foreground" />} name="krav.csv" desc="Alla krav med koppling till regelverk och domän." small />
                    <FileRow icon={<FileText className="h-3.5 w-3.5 text-muted-foreground" />} name="anlaggningar.csv" desc="Anläggningar med typ, längd, trafikflöde." small />
                    <FileRow icon={<FileText className="h-3.5 w-3.5 text-muted-foreground" />} name="system.csv" desc="Informationssystem med typ och ägare." small />
                    <FileRow icon={<FileText className="h-3.5 w-3.5 text-muted-foreground" />} name="kopplingar.csv" desc="Vilka system som hör till vilka anläggningar." small />
                    <FileRow icon={<FileText className="h-3.5 w-3.5 text-muted-foreground" />} name="efterlevnad_anlaggningar.csv" desc="Bedömningar per anläggning: status, giltighet, motivering, evidens, omfattning." small />
                    <FileRow icon={<FileText className="h-3.5 w-3.5 text-muted-foreground" />} name="efterlevnad_system.csv" desc="Bedömningar per system, samma fält." small />
                  </div>
                  <div className="pl-4 border-l-2 border-muted space-y-2 mt-1">
                    <p className="text-xs font-semibold text-muted-foreground font-medium">documentation/</p>
                    <FileRow icon={<FileText className="h-3.5 w-3.5 text-muted-foreground" />} name="export-description.txt" desc="Beskrivning av paketets syfte och användningsområden." small />
                    <FileRow icon={<FileText className="h-3.5 w-3.5 text-muted-foreground" />} name="field-definitions.csv" desc="Ordlista: varje fältnamn med beskrivning och exempelvärde." small />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="tips">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                <span className="flex items-center gap-2">
                  <ChevronRight className="h-4 w-4" />
                  Tips och användningsområden
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2"><span className="text-primary font-bold">•</span>Öppna <strong>compliance-export.xlsx</strong> för en formaterad översikt – redo att användas direkt av analytiker och chefer.</li>
                  <li className="flex items-start gap-2"><span className="text-primary font-bold">•</span>Använd <strong>CSV-filerna</strong> (semikolonseparerade, UTF-8 BOM) för import till Power BI, SPSS eller andra analysverktyg.</li>
                  <li className="flex items-start gap-2"><span className="text-primary font-bold">•</span>Använd <strong>compliance-data.json</strong> för programmatisk bearbetning i Python, PowerShell eller andra skriptspråk.</li>
                  <li className="flex items-start gap-2"><span className="text-primary font-bold">•</span>Se <strong>field-definitions.csv</strong> för att förstå vad varje kolumn och fält betyder.</li>
                  <li className="flex items-start gap-2"><span className="text-primary font-bold">•</span>Använd <strong>package-metadata.json</strong> för spårbarhet vid revision eller arkivering.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Export history */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-primary" />
            Exporthistorik
          </CardTitle>
          <CardDescription>
            Alla exporter, med vem som gjorde dem. Historiken kan inte ändras eller raderas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Laddar historik...</p>
          ) : history.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <Archive className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground">Ingen exporthistorik ännu.</p>
              <p className="text-xs text-muted-foreground">Skapa det första exportpaketet med knappen ovan.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-3">
                {history.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-start justify-between gap-4 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5 p-2 rounded-md bg-primary/10 shrink-0">
                        <Archive className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-medium truncate">{record.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(record.created_at).toLocaleString('sv-SE')}
                          {record.user_email ? ` • ${record.user_email}` : ''} • Filter: {filterSummary(record.filters || {})}
                        </p>
                        {rowCountSummary(record.row_counts || {})}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FileRow({ icon, name, desc, small }: { icon: React.ReactNode; name: string; desc: string; small?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <code className={`${small ? 'text-xs' : 'text-sm'} font-semibold`}>{name}</code>
        <p className={`${small ? 'text-xs' : 'text-xs'} text-muted-foreground`}>{desc}</p>
      </div>
    </div>
  );
}
