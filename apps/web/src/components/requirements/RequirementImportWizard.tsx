import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDomains } from '@/hooks/useDomains';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { fetchTriggerLogicProblems } from '@/lib/requirementEngine';
import { Upload, Loader2, Trash2, Save, FileText, Link2 } from 'lucide-react';

interface ExtractedRequirement {
  chapter_section: string;
  description: string;
  requirement_level: 'mandatory' | 'recommended' | 'strategic';
  target_type: 'facility' | 'system';
  domain_slug?: string;
  trigger_logic?: Record<string, unknown>;
  source_page?: number | null;
  source_excerpt?: string | null;
  selected: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type LanguageFilter = 'all' | 'sv' | 'en';
type SourceMode = 'pdf' | 'url';

interface LawChapter {
  label: string;
  text: string;
  charCount: number;
}

const categoryOptions = [
  { value: 'Fysisk Säkerhet', label: 'Fysisk Säkerhet' },
  { value: 'Informationssäkerhet', label: 'Informationssäkerhet' },
  { value: 'Krisberedskap', label: 'Krisberedskap' },
];

const languageOptions: { value: LanguageFilter; label: string }[] = [
  { value: 'all', label: 'Alla språk (ingen filtrering)' },
  { value: 'sv', label: 'Endast svenska' },
  { value: 'en', label: 'Endast engelska' },
];

// Heuristic language detection markers
const LANG_MARKERS: Record<Exclude<LanguageFilter, 'all'>, string[]> = {
  sv: ['ska', 'krav', 'säkerhet', 'system', 'användare', 'åtkomst', 'nätverk', 'enligt', 'följande', 'samt', 'och', 'eller', 'för', 'måste', 'bör'],
  en: ['shall', 'requirement', 'security', 'components', 'network', 'user', 'access', 'system', 'control', 'the', 'and', 'or', 'must', 'should'],
};

const FOREIGN_MARKERS: Record<Exclude<LanguageFilter, 'all'>, string[]> = {
  // when filtering for SV, these indicate foreign (mainly EN/FR/DE) text to drop
  sv: ['shall', 'requirement', 'doivent', 'exigences', 'sécurité', 'composants', 'réseau', 'utilisateur', 'müssen', 'sicherheit'],
  // when filtering for EN, these indicate foreign (mainly FR/DE/SV) text to drop
  en: ['doivent', 'exigences', 'sécurité', 'composants', 'réseau', 'utilisateur', 'système', 'accès', 'müssen', 'sicherheit', 'måste', 'säkerhet'],
};

function filterTextByLanguage(text: string, lang: LanguageFilter): string {
  if (lang === 'all') return text;

  const native = LANG_MARKERS[lang];
  const foreign = FOREIGN_MARKERS[lang];

  // Split into paragraphs (preserve page markers)
  const paragraphs = text.split(/\n\s*\n/);

  const kept = paragraphs.filter((para) => {
    const lower = para.toLowerCase();
    // Keep page markers and very short paragraphs (likely numbers/headers)
    if (/^---\s*sida/i.test(para.trim())) return true;
    if (lower.length < 40) return true;

    let nativeHits = 0;
    let foreignHits = 0;
    for (const m of native) {
      const re = new RegExp(`\\b${m}\\b`, 'gi');
      nativeHits += (lower.match(re) || []).length;
    }
    for (const m of foreign) {
      const re = new RegExp(`\\b${m}\\b`, 'gi');
      foreignHits += (lower.match(re) || []).length;
    }

    // If no markers at all, keep (could be reference numbers, code, etc.)
    if (nativeHits === 0 && foreignHits === 0) return true;
    // Keep if native >= foreign
    return nativeHits >= foreignHits;
  });

  return kept.join('\n\n');
}

function dedupRequirements(reqs: ExtractedRequirement[]): ExtractedRequirement[] {
  const seen = new Map<string, ExtractedRequirement>();
  for (const r of reqs) {
    const key = (r.chapter_section || '').trim().toUpperCase();
    if (!key) {
      // No reference — fall back to description hash to dedupe identical translations
      const altKey = `__nodesc_${r.description.slice(0, 80).toLowerCase()}`;
      if (!seen.has(altKey)) seen.set(altKey, r);
      continue;
    }
    const existing = seen.get(key);
    if (!existing || r.description.length > existing.description.length) {
      seen.set(key, r);
    }
  }
  return Array.from(seen.values());
}

async function loadPdfPageCount(file: File): Promise<number> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  return pdf.numPages;
}

async function extractTextFromPdf(
  file: File,
  fromPage: number,
  toPage: number,
  onPageProgress?: (current: number, total: number) => void,
): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];

  const start = Math.max(1, fromPage);
  const end = Math.min(pdf.numPages, toPage);
  const total = end - start + 1;

  for (let i = start; i <= end; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item: any) => item.str)
      .join(' ');
    pages.push(`--- Sida ${i} ---\n${text}`);
    onPageProgress?.(i - start + 1, total);
  }

  return pages.join('\n\n');
}

export function RequirementImportWizard({ open, onOpenChange }: Props) {
  const { data: domains = [] } = useDomains();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [sourceMode, setSourceMode] = useState<SourceMode>('pdf');
  const [lawUrl, setLawUrl] = useState('');
  const [lawChapters, setLawChapters] = useState<LawChapter[]>([]);
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [category, setCategory] = useState<string>('');
  const [language, setLanguage] = useState<LanguageFilter>('all');
  const [totalPages, setTotalPages] = useState<number>(0);
  const [pageFrom, setPageFrom] = useState<number>(1);
  const [pageTo, setPageTo] = useState<number>(1);
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [extractedReqs, setExtractedReqs] = useState<ExtractedRequirement[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, label: '' });

  const reset = useCallback(() => {
    setStep(1);
    setSourceMode('pdf');
    setLawUrl('');
    setLawChapters([]);
    setSelectedChapters([]);
    setIsFetchingUrl(false);
    setFile(null);
    setDocumentName('');
    setCategory('');
    setLanguage('all');
    setTotalPages(0);
    setPageFrom(1);
    setPageTo(1);
    setIsLoadingMeta(false);
    setExtractedReqs([]);
    setIsProcessing(false);
    setIsSaving(false);
    setProgress({ current: 0, total: 0, label: '' });
  }, []);

  const handleFetchUrl = async () => {
    if (!lawUrl.trim()) {
      toast.error('Klistra in en länk till författningen');
      return;
    }
    setIsFetchingUrl(true);
    setLawChapters([]);
    setSelectedChapters([]);
    try {
      const response = await supabase.functions.invoke('fetch-law-text', { body: { url: lawUrl.trim() } });
      if (response.error) throw new Error(response.error.message);
      const chapters: LawChapter[] = response.data?.chapters || [];
      if (chapters.length === 0) throw new Error('Hittade ingen lagtext på sidan');

      setLawChapters(chapters);
      setSelectedChapters(chapters.map(c => c.label));
      if (!documentName && response.data?.title) setDocumentName(response.data.title);
      if (!language || language === 'all') setLanguage('sv');
      toast.success(`${chapters.length} kapitel hittades i "${response.data?.title || 'dokumentet'}"`);
    } catch (err: any) {
      console.error('fetch-law-text error:', err);
      toast.error(err.message || 'Kunde inte hämta lagtexten');
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const toggleChapter = (label: string) => {
    setSelectedChapters(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || f.type !== 'application/pdf') return;

    setFile(f);
    if (!documentName) {
      setDocumentName(f.name.replace('.pdf', ''));
    }

    setIsLoadingMeta(true);
    setTotalPages(0);
    try {
      const pages = await loadPdfPageCount(f);
      setTotalPages(pages);
      setPageFrom(1);
      setPageTo(pages);
    } catch (err: any) {
      console.error('Failed to read PDF metadata:', err);
      toast.error('Kunde inte läsa PDF:en');
    } finally {
      setIsLoadingMeta(false);
    }
  };

  const handleExtract = async () => {
    if (!documentName || !category) {
      toast.error('Fyll i alla fält');
      return;
    }
    if (sourceMode === 'pdf' && !file) {
      toast.error('Välj en PDF-fil');
      return;
    }
    if (sourceMode === 'url' && selectedChapters.length === 0) {
      toast.error('Välj minst ett kapitel att bearbeta');
      return;
    }
    if (sourceMode === 'pdf' && totalPages > 0 && (pageFrom < 1 || pageTo > totalPages || pageFrom > pageTo)) {
      toast.error(`Sidintervall måste vara mellan 1 och ${totalPages}`);
      return;
    }

    setStep(2);
    setIsProcessing(true);
    setProgress({ current: 0, total: 0, label: sourceMode === 'pdf' ? 'Läser PDF...' : 'Förbereder lagtext...' });

    try {
      let rawText: string;

      if (sourceMode === 'pdf') {
        const effectiveFrom = totalPages > 0 ? pageFrom : 1;
        const effectiveTo = totalPages > 0 ? pageTo : 999999;
        rawText = await extractTextFromPdf(file!, effectiveFrom, effectiveTo, (cur, tot) => {
          setProgress({ current: cur, total: tot, label: `Läser sida ${cur} av ${tot}` });
        });

        if (!rawText.trim()) {
          throw new Error('Kunde inte extrahera text från PDF:en. Dokumentet kan vara skannat/bildbas.');
        }
      } else {
        rawText = lawChapters
          .filter(c => selectedChapters.includes(c.label))
          .map(c => c.text)
          .join('\n\n');

        if (!rawText.trim()) {
          throw new Error('Valda kapitel innehåller ingen text.');
        }
      }

      // Apply language filtering before chunking
      const text = filterTextByLanguage(rawText, language);

      if (!text.trim()) {
        throw new Error('Inget innehåll matchade valt språk. Prova "Alla språk".');
      }

      // Chunk if needed (smaller chunks → AI returns more requirements per chunk reliably)
      const MAX_CHARS = 15000;
      const chunks: string[] = [];
      if (text.length <= MAX_CHARS) {
        chunks.push(text);
      } else {
        const pages = text.split(/--- Sida \d+ ---/);
        let current = '';
        for (const page of pages) {
          if ((current + page).length > MAX_CHARS && current) {
            chunks.push(current);
            current = page;
          } else {
            current += page;
          }
        }
        if (current) chunks.push(current);
      }

      setProgress({ current: 0, total: chunks.length, label: `Bearbetar chunk 0 av ${chunks.length}` });
      const allReqs: ExtractedRequirement[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        // Fallback page = first page marker present in this chunk
        const chunkPageMatch = chunk.match(/---\s*Sida\s+(\d+)\s*---/i);
        const chunkFallbackPage = chunkPageMatch ? parseInt(chunkPageMatch[1], 10) : null;


        // Retry up to 3 times on transient network errors / rate limits
        let lastErr: any = null;
        let reqs: any[] = [];
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const response = await supabase.functions.invoke('extract-requirements', {
              body: {
                text: chunk,
                document_name: documentName,
                domains: domains.map(d => ({ name: d.name, slug: d.slug })),
                language,
              },
            });
            if (response.error) throw new Error(response.error.message);
            reqs = response.data?.requirements || [];
            lastErr = null;
            break;
          } catch (err: any) {
            lastErr = err;
            console.warn(`Chunk ${i + 1} attempt ${attempt} failed:`, err.message);
            if (attempt < 3) {
              await new Promise(r => setTimeout(r, 2000 * attempt));
            }
          }
        }

        if (lastErr) {
          toast.warning(`Chunk ${i + 1}/${chunks.length} hoppades över efter 3 försök: ${lastErr.message}`);
        } else {
          allReqs.push(...reqs.map((r: any) => {
            const page = Number(r.source_page);
            return {
              ...r,
              source_page: Number.isFinite(page) && page > 0 ? page : chunkFallbackPage,
              source_excerpt: typeof r.source_excerpt === 'string' && r.source_excerpt.trim()
                ? r.source_excerpt.trim()
                : null,
              selected: true,
            };
          }));
        }

        setProgress({ current: i + 1, total: chunks.length, label: `Bearbetar chunk ${i + 1} av ${chunks.length}` });
        // Small pause between chunks to avoid rate limiting
        if (i < chunks.length - 1) {
          await new Promise(r => setTimeout(r, 500));
        }
      }


      // Deduplicate across all chunks (same chapter_section may appear multiple times)
      const deduped = dedupRequirements(allReqs);

      if (deduped.length === 0) {
        toast.warning('Inga krav kunde extraheras från dokumentet');
        setStep(1);
      } else {
        setExtractedReqs(deduped);
        setStep(3);
        const dupRemoved = allReqs.length - deduped.length;
        toast.success(
          `${deduped.length} unika krav extraherade${dupRemoved > 0 ? ` (${dupRemoved} dubbletter borttagna)` : ''}`
        );
      }
    } catch (err: any) {
      console.error('Extraction error:', err);
      toast.error(err.message || 'Fel vid kravextraktion');
      setStep(1);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleReq = (index: number) => {
    setExtractedReqs(prev => prev.map((r, i) => i === index ? { ...r, selected: !r.selected } : r));
  };

  const removeReq = (index: number) => {
    setExtractedReqs(prev => prev.filter((_, i) => i !== index));
  };

  const updateReq = (index: number, field: string, value: string) => {
    setExtractedReqs(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  const updatePage = (index: number, value: string) => {
    const parsed = parseInt(value, 10);
    setExtractedReqs(prev => prev.map((r, i) =>
      i === index ? { ...r, source_page: Number.isFinite(parsed) && parsed > 0 ? parsed : null } : r
    ));
  };

  const missingPageCount = sourceMode === 'pdf'
    ? extractedReqs.filter(r => r.selected && r.source_page == null).length
    : 0;
  const missingExcerptCount = sourceMode === 'url'
    ? extractedReqs.filter(r => r.selected && !r.source_excerpt).length
    : 0;

  const handleSave = async () => {
    const selected = extractedReqs.filter(r => r.selected);
    if (selected.length === 0) {
      toast.error('Välj minst ett krav att spara');
      return;
    }

    setIsSaving(true);

    try {
      // 0. Kontrollera villkoren (trigger_logic) innan något skapas. Databasen
      //    avvisar ogiltiga villkor, och ett felaktigt villkor får aldrig
      //    tyst göra att ett krav gäller fel objekt.
      const problemsPerRow = await Promise.all(
        selected.map(async (r) => ({
          ref: r.chapter_section,
          problems: r.trigger_logic && Object.keys(r.trigger_logic).length > 0
            ? await fetchTriggerLogicProblems(r.trigger_logic, r.target_type)
            : [],
        })),
      );
      const invalid = problemsPerRow.filter((p) => p.problems.length > 0);
      if (invalid.length > 0) {
        toast.error(
          `${invalid.length} krav har ogiltiga villkor och importerades inte. Avmarkera dem eller lägg in villkoren manuellt efter import: ` +
            invalid.slice(0, 5).map((p) => `${p.ref} (${p.problems[0]})`).join('; ') +
            (invalid.length > 5 ? ' …' : ''),
          { duration: 15000 },
        );
        return;
      }

      // 1. Resolve the source document URL — uploaded PDF or the public law page
      let documentUrl: string;

      if (sourceMode === 'pdf') {
        const filePath = `imports/${Date.now()}_${file!.name}`;
        const { error: uploadError } = await supabase.storage
          .from('requirement-documents')
          .upload(filePath, file!);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('requirement-documents')
          .getPublicUrl(filePath);
        documentUrl = urlData.publicUrl;
      } else {
        documentUrl = lawUrl.trim();
      }

      // 2. Create requirement_source
      const { data: source, error: srcError } = await supabase
        .from('requirement_sources')
        .insert({
          document_name: documentName,
          category: category as any,
          document_url: documentUrl,
        })
        .select('id')
        .single();

      if (srcError) throw srcError;

      // 3. Create requirements
      const rows = selected.map(r => {
        const domainMatch = r.domain_slug ? domains.find(d => d.slug === r.domain_slug) : null;
        return {
          source_id: source.id,
          chapter_section: r.chapter_section,
          description: r.description,
          requirement_level: r.requirement_level as any,
          target_type: r.target_type,
          domain_id: domainMatch?.id || null,
          trigger_logic: (r.trigger_logic as any) || null,
          source_page: r.source_page ?? null,
          source_excerpt: r.source_excerpt ?? null,
          is_general_advice: false,
        };
      });

      const { error: reqError } = await supabase
        .from('requirements')
        .insert(rows);

      if (reqError) throw reqError;

      toast.success(`${selected.length} krav importerade från "${documentName}"`);
      queryClient.invalidateQueries({ queryKey: ['requirements-explorer'] });
      queryClient.invalidateQueries({ queryKey: ['requirement-sources-with-counts'] });
      onOpenChange(false);
      reset();
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error(err.message || 'Fel vid sparning');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCount = extractedReqs.filter(r => r.selected).length;
  const progressPct = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Importera regelverk via AI
          </DialogTitle>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-2 text-sm">
          <Badge variant={step >= 1 ? 'default' : 'outline'}>1. Ladda upp</Badge>
          <span className="text-muted-foreground">→</span>
          <Badge variant={step >= 2 ? 'default' : 'outline'}>2. AI-analys</Badge>
          <span className="text-muted-foreground">→</span>
          <Badge variant={step >= 3 ? 'default' : 'outline'}>3. Granska & spara</Badge>
        </div>

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Källtyp</label>
              <div className="mt-1 flex gap-2">
                <Button
                  type="button"
                  variant={sourceMode === 'pdf' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setSourceMode('pdf')}
                >
                  <FileText className="h-4 w-4 mr-2" /> PDF-dokument
                </Button>
                <Button
                  type="button"
                  variant={sourceMode === 'url' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setSourceMode('url')}
                >
                  <Link2 className="h-4 w-4 mr-2" /> Webbsida (svensk lag)
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {sourceMode === 'pdf'
                  ? 'För standarder (IEC/ISO) och föreskrifter som bara finns som PDF. Källhänvisning blir sidnummer.'
                  : 'För författningar på riksdagen.se — alltid aktuell version. Källhänvisning blir kapitel och paragraf.'}
              </p>
            </div>

            {sourceMode === 'url' && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Länk till författningen</label>
                  <div className="mt-1 flex gap-2">
                    <Input
                      value={lawUrl}
                      onChange={e => setLawUrl(e.target.value)}
                      placeholder="https://www.riksdagen.se/sv/dokument-och-lagar/dokument/..."
                    />
                    <Button onClick={handleFetchUrl} disabled={isFetchingUrl || !lawUrl.trim()}>
                      {isFetchingUrl ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Hämta'}
                    </Button>
                  </div>
                </div>

                {lawChapters.length > 0 && (
                  <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                    <p className="text-sm">
                      Dokumentet består av <strong>{lawChapters.length} kapitel</strong>. Vilka vill du bearbeta?
                    </p>
                    <div className="space-y-1">
                      {lawChapters.map(c => (
                        <label key={c.label} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={selectedChapters.includes(c.label)}
                            onCheckedChange={() => toggleChapter(c.label)}
                          />
                          <span className="flex-1">{c.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {Math.round(c.charCount / 1000)} k tecken
                          </span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Tips: hoppa över kapitel om överklagande och övergångsbestämmelser om de inte innehåller krav.
                    </p>
                  </div>
                )}
              </div>
            )}

            {sourceMode === 'pdf' && (
              <div>
                <label className="text-sm font-medium">PDF-fil</label>
                <Input type="file" accept=".pdf" onChange={handleFileChange} className="mt-1" />
                {file && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
                    {isLoadingMeta && ' — läser sidantal...'}
                  </p>
                )}
              </div>
            )}

            {sourceMode === 'pdf' && totalPages > 0 && (
              <div className="rounded-md border bg-muted/30 p-3 space-y-3">
                <p className="text-sm">
                  Detta dokument består av <strong>{totalPages} sidor</strong>. Vilka vill du bearbeta?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Från sida</label>
                    <Input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={pageFrom}
                      onChange={e => setPageFrom(Math.max(1, Math.min(totalPages, parseInt(e.target.value) || 1)))}
                      className="mt-1 h-9"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Till sida</label>
                    <Input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={pageTo}
                      onChange={e => setPageTo(Math.max(1, Math.min(totalPages, parseInt(e.target.value) || totalPages)))}
                      className="mt-1 h-9"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tips: hoppa över innehållsförteckning, bilagor och index för snabbare import. För bilinguala dokument — välj sidor för ett språk.
                </p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Dokumentnamn</label>
              <Input value={documentName} onChange={e => setDocumentName(e.target.value)} placeholder="t.ex. MSBFS 2020:7" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Kategori</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Välj kategori" /></SelectTrigger>
                <SelectContent>
                  {categoryOptions.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Språk att importera</label>
              <Select value={language} onValueChange={(v) => setLanguage(v as LanguageFilter)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {languageOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                För bilinguala dokument (t.ex. EN/FR) — välj ett språk för att undvika att samma krav importeras flera gånger.
              </p>
            </div>
            <Button
              onClick={handleExtract}
              disabled={
                !documentName || !category ||
                (sourceMode === 'pdf' ? !file : selectedChapters.length === 0)
              }
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              Extrahera krav med AI
            </Button>
          </div>
        )}

        {/* Step 2: Processing */}
        {step === 2 && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">AI analyserar dokumentet och identifierar krav...</p>
            {progress.total > 0 ? (
              <div className="w-full max-w-md space-y-2">
                <Progress value={progressPct} />
                <p className="text-xs text-center text-muted-foreground">
                  {progress.label || `${progress.current} av ${progress.total}`}
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{progress.label || 'Läser PDF och förbereder text...'}</p>
            )}
            <p className="text-xs text-muted-foreground">Stora dokument kan ta flera minuter</p>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">{selectedCount} av {extractedReqs.length} krav valda för import</p>
                {missingPageCount > 0 && (
                  <p className="text-xs text-status-warning dark:text-status-warning">
                    {missingPageCount} krav saknar sidhänvisning — fyll i sidan för att få direktlänk i dokumentet.
                  </p>
                )}
                {missingExcerptCount > 0 && (
                  <p className="text-xs text-status-warning dark:text-status-warning">
                    {missingExcerptCount} krav saknar originaltext — länken hoppar då till dokumentets början i stället för paragrafen.
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { reset(); }}>Avbryt</Button>
                <Button onClick={handleSave} disabled={isSaving || selectedCount === 0}>
                  {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Spara {selectedCount} krav
                </Button>
              </div>
            </div>

            <div className="scroll-x-visible border rounded-md overflow-auto max-h-[50vh]">
              <Table containerClassName="overflow-visible">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead className="w-[120px]">{sourceMode === 'url' ? 'Kap./paragraf' : 'Kapitel'}</TableHead>
                    {sourceMode === 'pdf' && <TableHead className="w-[70px]">Sida</TableHead>}
                    <TableHead>Beskrivning</TableHead>
                    <TableHead className="w-[110px]">Nivå</TableHead>
                    <TableHead className="w-[90px]">Mål</TableHead>
                    <TableHead className="w-[130px]">Domän</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {extractedReqs.map((r, i) => (
                    <TableRow key={i} className={!r.selected ? 'opacity-40' : ''}>
                      <TableCell>
                        <Checkbox checked={r.selected} onCheckedChange={() => toggleReq(i)} />
                      </TableCell>
                      <TableCell>
                        <Input value={r.chapter_section} onChange={e => updateReq(i, 'chapter_section', e.target.value)} className="h-7 text-xs font-mono" />
                      </TableCell>
                      {sourceMode === 'pdf' && (
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            value={r.source_page ?? ''}
                            placeholder="–"
                            onChange={e => updatePage(i, e.target.value)}
                            className={`h-7 text-xs ${r.source_page == null ? 'border-status-warning/30' : ''}`}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <p className="text-xs line-clamp-3">{r.description}</p>
                        {r.source_excerpt && (
                          <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1 italic">
                            Original: {r.source_excerpt}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select value={r.requirement_level} onValueChange={v => updateReq(i, 'requirement_level', v)}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mandatory">Tvingande</SelectItem>
                            <SelectItem value="recommended">Rekommenderat</SelectItem>
                            <SelectItem value="strategic">Strategiskt</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={r.target_type} onValueChange={v => updateReq(i, 'target_type', v)}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="facility">Anl.</SelectItem>
                            <SelectItem value="system">System</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={r.domain_slug || '_none'} onValueChange={v => updateReq(i, 'domain_slug', v === '_none' ? '' : v)}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="-" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none">–</SelectItem>
                            {domains.map(d => <SelectItem key={d.slug} value={d.slug}>{d.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeReq(i)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
