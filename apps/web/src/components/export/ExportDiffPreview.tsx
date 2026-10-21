import { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Minus, RefreshCw, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';

interface SnapshotReq {
  id: string;
  chapter_section: string;
  description: string;
  requirement_level: string | null;
  source_name: string | null;
  domain_name: string | null;
}

interface DiffResult {
  added: SnapshotReq[];
  removed: SnapshotReq[];
  changed: (SnapshotReq & { changedFields: string; prevDescription?: string })[];
  previousDate: string;
}

export function ExportDiffPreview() {
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [noBaseline, setNoBaseline] = useState(false);

  useEffect(() => {
    computeDiff();
  }, []);

  // Samma beräkning som exporten själv använder (export_requirement_diff i
  // databasen), mot senaste export av HELA kravbiblioteket.
  const computeDiff = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('export_requirement_diff', { _filters: {} });
      if (error) throw error;
      if (!data) {
        setNoBaseline(true);
        return;
      }
      const d = data as unknown as {
        previousExportDate: string;
        added: SnapshotReq[];
        removed: SnapshotReq[];
        changed: (SnapshotReq & { changed_fields: string })[];
      };
      setDiff({
        added: d.added,
        removed: d.removed,
        changed: d.changed.map((r) => ({ ...r, changedFields: r.changed_fields })),
        previousDate: d.previousExportDate,
      });
    } catch (e) {
      console.error('Diff preview error:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          Analyserar ändringar sedan senaste exporten...
        </CardContent>
      </Card>
    );
  }

  if (noBaseline) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          <p>Ingen tidigare export av hela kravbiblioteket att jämföra mot. Nästa sådan export blir baslinjen.</p>
        </CardContent>
      </Card>
    );
  }

  if (!diff) return null;

  const total = diff.added.length + diff.removed.length + diff.changed.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <RefreshCw className="h-5 w-5 text-primary" />
          Ändringar sedan senaste exporten
        </CardTitle>
        <CardDescription>
          Jämfört med senaste exporten av hela kravbiblioteket, {new Date(diff.previousDate).toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary badges */}
        <div className="flex flex-wrap gap-3">
          <Badge variant={diff.added.length > 0 ? 'default' : 'secondary'} className={diff.added.length > 0 ? 'bg-status-success hover:bg-status-success' : ''}>
            <Plus className="h-3 w-3 mr-1" />
            {diff.added.length} nya krav
          </Badge>
          <Badge variant={diff.changed.length > 0 ? 'default' : 'secondary'} className={diff.changed.length > 0 ? 'bg-status-warning hover:bg-status-warning' : ''}>
            <ArrowRight className="h-3 w-3 mr-1" />
            {diff.changed.length} ändrade krav
          </Badge>
          <Badge variant={diff.removed.length > 0 ? 'default' : 'secondary'} className={diff.removed.length > 0 ? 'bg-destructive hover:bg-destructive' : ''}>
            <Minus className="h-3 w-3 mr-1" />
            {diff.removed.length} borttagna krav
          </Badge>
        </div>

        {total === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <CheckCircle2 className="h-4 w-4 text-status-success" />
            Inga ändringar sedan senaste exporten. Kravbasen är oförändrad.
          </div>
        ) : (
          <Accordion type="multiple" className="w-full">
            {diff.added.length > 0 && (
              <AccordionItem value="added">
                <AccordionTrigger className="text-sm hover:no-underline">
                  <span className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-status-success" />
                    {diff.added.length} nya krav
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <ScrollArea className="max-h-48">
                    <div className="space-y-2">
                      {diff.added.map(r => (
                        <DiffRow key={r.id} req={r} color="border-l-emerald-500" />
                      ))}
                    </div>
                  </ScrollArea>
                </AccordionContent>
              </AccordionItem>
            )}

            {diff.changed.length > 0 && (
              <AccordionItem value="changed">
                <AccordionTrigger className="text-sm hover:no-underline">
                  <span className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-status-warning" />
                    {diff.changed.length} ändrade krav
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <ScrollArea className="max-h-48">
                    <div className="space-y-2">
                      {diff.changed.map(r => (
                        <DiffRow key={r.id} req={r} color="border-l-amber-500" extra={`Ändrat: ${r.changedFields}`} />
                      ))}
                    </div>
                  </ScrollArea>
                </AccordionContent>
              </AccordionItem>
            )}

            {diff.removed.length > 0 && (
              <AccordionItem value="removed">
                <AccordionTrigger className="text-sm hover:no-underline">
                  <span className="flex items-center gap-2">
                    <Minus className="h-4 w-4 text-destructive" />
                    {diff.removed.length} borttagna krav
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <ScrollArea className="max-h-48">
                    <div className="space-y-2">
                      {diff.removed.map(r => (
                        <DiffRow key={r.id} req={r} color="border-l-red-500" />
                      ))}
                    </div>
                  </ScrollArea>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}

function DiffRow({ req, color, extra }: { req: SnapshotReq; color: string; extra?: string }) {
  return (
    <div className={`border-l-4 ${color} pl-3 py-1.5`}>
      <div className="flex items-center gap-2 text-sm">
        <span className="font-mono text-xs text-muted-foreground">{req.chapter_section}</span>
        {req.source_name && <Badge variant="outline" className="text-xs">{req.source_name}</Badge>}
        {req.domain_name && <Badge variant="outline" className="text-xs">{req.domain_name}</Badge>}
      </div>
      <p className="text-sm text-foreground mt-0.5 line-clamp-2">{req.description}</p>
      {extra && <p className="text-xs text-status-warning mt-0.5">{extra}</p>}
    </div>
  );
}
