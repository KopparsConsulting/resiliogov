import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { Printer, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useRequirements } from '@/hooks/useRequirements';
import { useReviewStatus, needsReview, REVIEW_STATE_LABELS, type ReviewStatusRow } from '@/hooks/useRequirementReviews';
import { usePendingDomainSuggestions } from '@/hooks/useDomainSuggestions';
import { usePendingLinkSuggestions } from '@/hooks/useLinkSuggestions';

export const PRINT_SELECTION_KEY = 'requirement-print-selection';

const levelLabels: Record<string, string> = {
  mandatory: 'Obligatoriskt',
  recommended: 'Rekommenderat',
  strategic: 'Strategiskt',
};

interface Batch {
  id: string;
  batch_no: string;
  created_at: string;
  created_by: string;
  key: string;
}

function statusLine(status: ReviewStatusRow | undefined): string {
  if (!status || status.review_state === 'pending') return 'Ogranskad';
  const when = status.reviewed_at ? format(new Date(status.reviewed_at), 'yyyy-MM-dd') : '';
  const label = REVIEW_STATE_LABELS[status.review_state];
  if (status.review_state === 'changed') return `${label} (godkänd ${when} av ${status.reviewed_by})`;
  return `${label} ${when} av ${status.reviewed_by}`;
}

export default function RequirementPrintPage() {
  const navigate = useNavigate();
  const { data: requirements = [], isLoading } = useRequirements();
  const { data: reviewStatus = new Map<string, ReviewStatusRow>() } = useReviewStatus();
  const { data: domainSuggestions = new Map() } = usePendingDomainSuggestions();
  const { data: linkSuggestions } = usePendingLinkSuggestions();

  const selectedIds = useMemo<string[] | null>(() => {
    try {
      const raw = sessionStorage.getItem(PRINT_SELECTION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const [limitToSelection, setLimitToSelection] = useState(Boolean(selectedIds));
  const [reviewFilter, setReviewFilter] = useState<'todo' | 'all'>('todo');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [securityLevelFilter, setSecurityLevelFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [batch, setBatch] = useState<Batch | null>(null);
  const [creating, setCreating] = useState(false);

  const sourceOptions = useMemo(() => {
    const sources = new Map<string, string>();
    requirements.forEach((r) => { if (r.source_id) sources.set(r.source_id, r.source_name ?? 'Okänd källa'); });
    return [...sources.entries()].sort((a, b) => a[1].localeCompare(b[1], 'sv'));
  }, [requirements]);

  const filtered = useMemo(() => {
    let list = requirements.filter((r) => !r.repealed_at);
    if (limitToSelection && selectedIds) {
      const order = new Map(selectedIds.map((id, index) => [id, index]));
      list = list.filter((r) => order.has(r.id)).sort((a, b) => order.get(a.id)! - order.get(b.id)!);
    }
    const query = searchText.trim().toLowerCase();
    return list.filter((r) =>
      (reviewFilter === 'all' || needsReview(reviewStatus.get(r.id))) &&
      (sourceFilter === 'all' || r.source_id === sourceFilter) &&
      (levelFilter === 'all' || r.requirement_level === levelFilter) &&
      (securityLevelFilter === 'all' || (securityLevelFilter === 'none' ? !r.sl_capability : String(r.sl_capability) === securityLevelFilter)) &&
      (!query || r.chapter_section.toLowerCase().includes(query) || r.description.toLowerCase().includes(query)),
    );
  }, [requirements, selectedIds, limitToSelection, reviewFilter, reviewStatus, sourceFilter, levelFilter, securityLevelFilter, searchText]);

  const printable = useMemo(() => filtered.filter((r) => !excludedIds.has(r.id)), [filtered, excludedIds]);
  const selectionKey = useMemo(() => printable.map((r) => r.id).join(','), [printable]);

  // Ändrat urval efter att numret skapats -> ny utskrift behövs
  useEffect(() => {
    if (batch && batch.key !== selectionKey) setBatch(null);
  }, [batch, selectionKey]);

  const toggleRequirement = (id: string, include: boolean) => {
    setExcludedIds((previous) => {
      const next = new Set(previous);
      if (include) next.delete(id); else next.add(id);
      return next;
    });
  };
  const setAllFiltered = (include: boolean) => {
    setExcludedIds((previous) => {
      const next = new Set(previous);
      filtered.forEach((r) => (include ? next.delete(r.id) : next.add(r.id)));
      return next;
    });
  };

  const printNow = () => setTimeout(() => window.print(), 150);

  const handlePrint = async () => {
    if (batch) { printNow(); return; }
    setCreating(true);
    try {
      const { data, error } = await supabase.rpc('create_review_batch', {
        _requirement_ids: printable.map((r) => r.id),
        _filters: {
          granskning: reviewFilter, regelverk: sourceFilter, kravniva: levelFilter,
          sl: securityLevelFilter, sok: searchText || null, urval: limitToSelection,
        },
      });
      if (error) throw error;
      const row = data as unknown as Omit<Batch, 'key'>;
      setBatch({ ...row, key: selectionKey });
      printNow();
    } catch (e) {
      toast.error(`Kunde inte skapa utskriften: ${(e as Error).message}`);
    } finally {
      setCreating(false);
    }
  };

  const origin = window.location.origin;
  const batchUrl = batch ? `${origin}/requirements/batch/${batch.id}` : null;

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Laddar krav...</div>;

  return (
    <div className="p-6 print:p-0 space-y-6 print-area">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Utskrift för granskning</h1>
          <p className="text-sm text-muted-foreground">
            {printable.length} krav. QR-koden överst öppnar hela utskriften som en lista i mobilen. Varje kort har också en egen kod.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/requirements')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Tillbaka
          </Button>
          <Button onClick={handlePrint} disabled={printable.length === 0 || creating}>
            {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}
            {batch ? 'Skriv ut igen' : 'Skriv ut'}
          </Button>
        </div>
      </div>

      <section className="border rounded-md p-4 bg-card space-y-4 print:hidden">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Välj krav att skriva ut</h2>
          <span className="text-sm text-muted-foreground">{printable.length} av {filtered.length} valda</span>
        </div>
        <div className="grid gap-4 md:grid-cols-5">
          <div className="space-y-1.5">
            <Label>Granskning</Label>
            <Select value={reviewFilter} onValueChange={(v) => setReviewFilter(v as 'todo' | 'all')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">Kvar att granska</SelectItem>
                <SelectItem value="all">Alla krav</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Regelverk</Label>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla regelverk</SelectItem>
                {sourceOptions.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Kravnivå</Label>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla nivåer</SelectItem>
                {Object.entries(levelLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Säkerhetsnivå (SL)</Label>
            <Select value={securityLevelFilter} onValueChange={setSecurityLevelFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla</SelectItem>
                {['1', '2', '3', '4'].map((level) => <SelectItem key={level} value={level}>SL {level}</SelectItem>)}
                <SelectItem value="none">Utan SL</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="print-search">Sök krav-ID eller text</Label>
            <Input id="print-search" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="t.ex. SR 1" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {selectedIds && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={limitToSelection} onCheckedChange={(checked) => setLimitToSelection(checked === true)} />
              Endast urvalet från kravdatabasen ({selectedIds.length})
            </label>
          )}
          <Button variant="outline" size="sm" onClick={() => setAllFiltered(true)}>Markera alla</Button>
          <Button variant="outline" size="sm" onClick={() => setAllFiltered(false)}>Avmarkera alla</Button>
          <span className="text-xs text-muted-foreground">Bocka ur enskilda kort nedan för att utesluta dem.</span>
        </div>
      </section>

      <div className="border rounded-md p-4 text-sm print:border-black flex gap-4 items-start">
        <div className="flex-1 space-y-1">
          <p className="font-semibold">Granskningsunderlag – Kravdatabas</p>
          {batch ? (
            <p>Utskrift <span className="font-mono font-semibold">{batch.batch_no}</span> · {format(new Date(batch.created_at), 'yyyy-MM-dd HH:mm')} · {printable.length} krav · utskriven av {batch.created_by}</p>
          ) : (
            <p className="text-muted-foreground print:hidden">Utskriftsnummer och QR-koder skapas när du trycker på Skriv ut.</p>
          )}
          <p className="text-muted-foreground print:text-black">
            Kryssa Godkänn eller Ändra på varje kort, och de domän- och kravkopplingar som stämmer. Skanna sedan QR-koden här bredvid och för in besluten i listan – alla krav i utskriften
            visas i samma ordning som på papperet. Beslut sparas med ditt namn, tidpunkt och den kravtext du godkände.
          </p>
        </div>
        {batchUrl && (
          <div className="shrink-0 flex flex-col items-center gap-1">
            <QRCodeSVG value={batchUrl} size={112} level="M" />
            <span className="text-[10px] print:text-black">Hela utskriften</span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {filtered.map((requirement) => {
          const included = !excludedIds.has(requirement.id);
          const position = included ? printable.indexOf(requirement) + 1 : null;
          const status = reviewStatus.get(requirement.id);
          const suggestion = domainSuggestions.get(requirement.id);
          const upLinks = linkSuggestions?.byChild.get(requirement.id) ?? [];
          const downCount = linkSuggestions?.childCount.get(requirement.id) ?? 0;
          const reviewUrl = `${origin}/requirements/${requirement.id}/review${batch ? `?batch=${batch.id}` : ''}`;
          return (
            <article key={requirement.id} className={`print-card border rounded-md p-4 flex gap-4 bg-card print:border-black ${included ? '' : 'opacity-50 print:hidden'}`}>
              <Checkbox className="mt-1 print:hidden" checked={included} onCheckedChange={(checked) => toggleRequirement(requirement.id, checked === true)} aria-label={`Ta med ${requirement.chapter_section}`} />
              <div className="flex-1 space-y-2 min-w-0">
                <div className="flex flex-wrap items-baseline gap-2">
                  {position && <span className="text-xs font-semibold tabular-nums border rounded px-1.5 print:border-black">{position}/{printable.length}</span>}
                  <span className="font-mono font-semibold">{requirement.chapter_section}</span>
                  <span className="text-xs text-muted-foreground print:text-black">
                    {requirement.source_name ?? 'Okänd källa'}
                    {requirement.source_page ? ` · s. ${requirement.source_page}` : ''}
                    {requirement.requirement_level ? ` · ${levelLabels[requirement.requirement_level]}` : ''}
                    {requirement.sl_capability ? ` · SL ${requirement.sl_capability}` : ''}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{requirement.description}</p>
                {requirement.source_excerpt && (
                  <p className="text-xs italic text-muted-foreground print:text-black border-l-2 pl-2">
                    {requirement.source_excerpt.slice(0, 400)}{requirement.source_excerpt.length > 400 ? '…' : ''}
                  </p>
                )}
                <div className="text-xs text-muted-foreground print:text-black space-y-0.5">
                  <p>Status: {statusLine(status)}{status?.review_state === 'flagged' && status.comment ? ` – ”${status.comment}”` : ''}</p>
                  <p>
                    Domän: {requirement.domain_name
                      ? requirement.domain_name
                      : suggestion ? <>{suggestion.domain_name} <span className="italic">(förslag)</span> <span className="ml-2 not-italic">☐ Domän OK</span></>
                      : 'ingen'}
                  </p>
                  {upLinks.length > 0 && (
                    <div className="pt-0.5">
                      <p>Preciserar (förslag) – kryssa de kopplingar som stämmer:</p>
                      <ul className="pl-3">
                        {upLinks.map((link) => (
                          <li key={link.id}>
                            <span className="not-italic">☐</span> {link.parent_source} {link.parent_section}
                            {' '}<span className="italic">({link.coverage === 'full' ? 'helt' : 'delvis'}{link.confidence ? `, ${link.confidence} säkerhet` : ''})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {downCount > 0 && (
                    <p>Preciseras av {downCount} föreslagna krav – kopplingarna granskas på deras kort.</p>
                  )}
                </div>
                <div className="flex gap-8 text-sm pt-1 font-medium">
                  <span>☐ Godkänn</span>
                  <span>☐ Ändra</span>
                </div>
                <div className="space-y-3 pt-1">
                  <p className="text-xs text-muted-foreground print:text-black">Vad ska ändras:</p>
                  <div className="border-b border-dashed h-4" />
                  <div className="border-b border-dashed h-4" />
                </div>
              </div>
              <div className="shrink-0 flex flex-col items-center gap-1">
                <QRCodeSVG value={reviewUrl} size={80} level="M" />
                <span className="text-[10px] text-muted-foreground print:text-black">Detta krav</span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
