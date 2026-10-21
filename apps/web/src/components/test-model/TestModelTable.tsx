import { useMemo, useState } from 'react';
import {
  useTestMappings, useDeleteTestMapping, useUpsertTestMapping, useBulkUpdateTestMappings, useCreateTestRounds,
  type TestMappingWithDetails,
} from '@/hooks/useTestMappings';
import { useRequirements } from '@/hooks/useRequirements';
import { useInformationSystems } from '@/hooks/useInformationSystems';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Search, ArrowUp, ArrowDown, ArrowUpDown, Check, CheckCircle2, ChevronLeft, ChevronRight, ChevronDown, PanelRightOpen, Download, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getSecurityLevelLabel } from '@/lib/securityLevel';
import { useTableScroll } from '@/hooks/useTableScroll';

import { exportTestMappings } from './exportTestMappings';
import { EvidenceCell } from './EvidenceCell';
import { BulkEditBar } from './BulkEditBar';
import { RequirementPanel } from './RequirementPanel';
import { NotesCell } from './NotesCell';
import { useTestMappingNotes } from '@/hooks/useTestMappingNotes';
import { ResponsibleSelect } from './ResponsibleSelect';
import { useProjects } from '@/hooks/useProjects';
import { useProjectMetrics } from '@/hooks/useProjectMetrics';
import { useApprovedAssessments } from '@/hooks/useApprovedAssessments';
import { useSuggestions } from '@/hooks/useSuggestionDecisions';
import { DecisionCell, decisionStateFor } from './DecisionCell';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  TEST_PHASES, TEST_PHASE_LABELS,
  TEST_TYPES, TEST_TYPE_LABELS,
  TESTABILITIES, TESTABILITY_LABELS,
  RESULT_STATUSES, RESULT_STATUS_LABELS,
} from './constants';

const ALL = '__all__';
const NULL_VALUE = '__null__';
const INCOMPLETE = '__incomplete__';
const APPROVED = '__approved__';
const NOT_APPROVED = '__not_approved__';
const PENDING = '__pending__';
const DISMISSED = '__dismissed__';

const STATUS_BADGE_VARIANT: Record<string, 'outline' | 'default' | 'secondary' | 'destructive'> = {
  not_tested: 'outline',
  passed: 'default',
  passed_with_remarks: 'secondary',
  failed: 'destructive',
};

function prettySourceName(name: string | null): string {
  if (!name) return '–';
  if (!name.includes('-') || name.includes(' ')) return name;
  return name.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase());
}

function HelpHint({ text }: { text: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="text-muted-foreground hover:text-foreground" aria-label={text}>
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function FilterLabel({ htmlFor, label, help }: { htmlFor: string; label: string; help: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor} className="text-xs">{label}</Label>
      <HelpHint text={help} />
    </div>
  );
}



export function TestModelTable() {
  const { data: mappings = [], isLoading } = useTestMappings();
  const { viewportRef, topScrollbarRef, scrollWidth, scrollBy, canScrollLeft, canScrollRight } = useTableScroll(!isLoading);
  const { data: requirements = [] } = useRequirements();
  const { data: systems = [] } = useInformationSystems();
  const { data: notesByMapping } = useTestMappingNotes();
  const upsert = useUpsertTestMapping();
  const bulkUpdate = useBulkUpdateTestMappings();
  const createRounds = useCreateTestRounds();
  const del = useDeleteTestMapping();

  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState(ALL);
  const { data: projects } = useProjects();
  const activeProject = (projects ?? []).find(p => p.id === projectFilter);
  const { data: projectMetrics } = useProjectMetrics(
    projectFilter === ALL ? undefined : projectFilter,
    activeProject?.system_id ?? null,
  );
  const projectScope = projectMetrics
    ? { total: projectMetrics.scopeCount, planned: projectMetrics.plannedCount }
    : null;
  const [systemFilter, setSystemFilter] = useState(ALL);
  const [classFilter, setClassFilter] = useState(ALL);
  const [phaseFilter, setPhaseFilter] = useState(ALL);
  const [sourceFilter, setSourceFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [assessmentFilter, setAssessmentFilter] = useState(ALL);
  const { data: approvedByMapping } = useApprovedAssessments();
  const { data: suggestionsByMapping } = useSuggestions();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [groupByRequirement, setGroupByRequirement] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [panelMappingId, setPanelMappingId] = useState<string | null>(null);
  const [savedRowIds, setSavedRowIds] = useState<Set<string>>(new Set());

  const handleExport = () => {
    exportTestMappings(sorted);
    void import('@/hooks/useActivityLog').then(({ logActivity }) => logActivity({
      action: 'test_export',
      entity_type: 'test_mapping',
      entity_label: `Excel-export (${sorted.length} rader)`,
      metadata: { rows: sorted.length },
    }));
  };

  const flagSaved = (id: string) => {
    setSavedRowIds(prev => new Set(prev).add(id));
    setTimeout(() => setSavedRowIds(prev => {
      const next = new Set(prev); next.delete(id); return next;
    }), 1600);
  };

  const sources = useMemo(
    () => Array.from(new Set(mappings.map(m => m.source_name).filter(Boolean))) as string[],
    [mappings]
  );

  const responsibleOptions = useMemo(
    () => Array.from(new Set(mappings.map(m => m.responsible_party).filter(Boolean))) as string[],
    [mappings]
  );

  const isIncomplete = (m: TestMappingWithDetails) =>
    m.is_applicable == null || !m.test_phase || !m.test_type || !m.responsible_party || !m.evidence_url;

  const filtered = useMemo(() => mappings.filter(m => {
    if (assessmentFilter !== ALL) {
      const state = decisionStateFor(m, approvedByMapping?.get(m.id), suggestionsByMapping?.get(m.id));
      if (assessmentFilter === APPROVED && state !== 'approved') return false;
      if (assessmentFilter === NOT_APPROVED && state === 'approved') return false;
      if (assessmentFilter === PENDING && state !== 'pending') return false;
      if (assessmentFilter === DISMISSED && state !== 'dismissed') return false;
    }
    if (projectFilter !== ALL && m.project_id !== projectFilter) return false;
    if (systemFilter !== ALL && m.system_id !== systemFilter) return false;
    if (classFilter !== ALL && String(m.classification_level ?? '') !== classFilter) return false;
    if (phaseFilter !== ALL && m.test_phase !== phaseFilter) return false;
    if (sourceFilter !== ALL && m.source_name !== sourceFilter) return false;
    if (statusFilter === INCOMPLETE) {
      if (!isIncomplete(m)) return false;
    } else if (statusFilter !== ALL && m.result_status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(m.requirement_chapter?.toLowerCase().includes(q) ||
            m.requirement_description?.toLowerCase().includes(q))) return false;
    }
    return true;
  }), [mappings, projectFilter, systemFilter, classFilter, phaseFilter, sourceFilter, statusFilter, search, assessmentFilter, approvedByMapping, suggestionsByMapping]);

  type SortKey = 'requirement_chapter' | 'requirement_description' | 'source_name' | 'system_name' | 'asset_name' | 'classification_level' | 'is_applicable' | 'testability' | 'test_phase' | 'test_type' | 'responsible_party' | 'result_status' | 'tested_at' | 'tested_by' | 'deviation' | 'evidence_file_name';
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const toggleSort = (k: SortKey) => {
    if (sortKey !== k) { setSortKey(k); setSortDir('asc'); }
    else if (sortDir === 'asc') setSortDir('desc');
    else { setSortKey(null); setSortDir('asc'); }
  };

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = (a as any)[sortKey];
      const bv = (b as any)[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      if (typeof av === 'boolean' && typeof bv === 'boolean') return ((av === bv) ? 0 : av ? -1 : 1) * dir;
      return String(av).localeCompare(String(bv), 'sv') * dir;
    });
  }, [filtered, sortKey, sortDir]);

  const groups = useMemo(() => {
    const map = new Map<string, TestMappingWithDetails[]>();
    for (const m of sorted) {
      const list = map.get(m.requirement_id);
      if (list) list.push(m); else map.set(m.requirement_id, [m]);
    }
    return Array.from(map.entries()).map(([requirementId, rows]) => ({ requirementId, rows }));
  }, [sorted]);

  const pageCount = Math.max(1, Math.ceil((groupByRequirement ? groups.length : sorted.length) / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleGroups = groupByRequirement
    ? groups.slice(currentPage * pageSize, currentPage * pageSize + pageSize)
    : [];
  const visibleRows = groupByRequirement
    ? visibleGroups.filter(g => expandedGroups.has(g.requirementId)).flatMap(g => g.rows)
    : sorted.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

  const toggleGroup = (requirementId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(requirementId)) next.delete(requirementId); else next.add(requirementId);
      return next;
    });
  };

  const panelMapping = mappings.find(m => m.id === panelMappingId) ?? null;
  const panelRounds = panelMapping
    ? mappings
        .filter(m => m.requirement_id === panelMapping.requirement_id && m.system_id === panelMapping.system_id)
        .sort((a, b) => (a.test_phase ?? '').localeCompare(b.test_phase ?? ''))
    : [];

  type RenderItem =
    | { kind: 'group'; requirementId: string; rows: TestMappingWithDetails[] }
    | { kind: 'row'; m: TestMappingWithDetails };

  const renderItems: RenderItem[] = groupByRequirement
    ? visibleGroups.flatMap(g => [
        { kind: 'group', requirementId: g.requirementId, rows: g.rows } as RenderItem,
        ...(expandedGroups.has(g.requirementId)
          ? g.rows.map(m => ({ kind: 'row', m }) as RenderItem)
          : []),
      ])
    : visibleRows.map(m => ({ kind: 'row', m }) as RenderItem);


  const handleField = (m: TestMappingWithDetails, field: string, value: any) => {
    upsert.mutate({ id: m.id, requirement_id: m.requirement_id, silent: true, [field]: value === NULL_VALUE ? null : value });
    flagSaved(m.id);
  };

  const handleFields = (m: TestMappingWithDetails, values: Record<string, unknown>) => {
    upsert.mutate({ id: m.id, requirement_id: m.requirement_id, silent: true, ...values } as any);
    flagSaved(m.id);
  };

  const toggleRow = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every(m => selectedIds.has(m.id));
  const toggleAllVisible = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allVisibleSelected) visibleRows.forEach(m => next.delete(m.id));
      else visibleRows.forEach(m => next.add(m.id));
      return next;
    });
  };

  const applyBulk = (values: Record<string, unknown>) => {
    bulkUpdate.mutate({ ids: Array.from(selectedIds), values: values as any });
  };

  if (isLoading) return <div className="p-6">Laddar...</div>;

  const hasActiveFilter = projectFilter !== ALL || systemFilter !== ALL || classFilter !== ALL || phaseFilter !== ALL || sourceFilter !== ALL || statusFilter !== ALL || assessmentFilter !== ALL || search.length > 0;
  const clearFilters = () => {
    setProjectFilter(ALL); setSystemFilter(ALL); setClassFilter(ALL); setPhaseFilter(ALL); setSourceFilter(ALL); setStatusFilter(ALL); setAssessmentFilter(ALL); setSearch(''); setPage(0);
  };
  const approvedCount = mappings.filter(m => approvedByMapping?.has(m.id)).length;
  const pendingCount = mappings.filter(m => !approvedByMapping?.has(m.id) && suggestionsByMapping?.has(m.id)).length;
  const dismissedCount = mappings.filter(m => !approvedByMapping?.has(m.id) && m.suggestion_dismissed_at).length;

  const columns: [SortKey, string, string, string?][] = [
    ['requirement_description', 'Kravtext', 'min-w-[260px]'],
    ['source_name', 'Källa', 'min-w-[140px]'],
    ['system_name', 'System', '', 'Informationssystemet som kravet testas mot.'],
    ['asset_name', 'Komponent', '', 'Enskild komponent under systemet, t.ex. en PLC eller switch. Tomt betyder att kravet gäller hela systemet.'],
    ['classification_level', 'Anläggningsklass', '', 'Klassificeringen 1–5 på den anläggning systemet tillhör. Klassen styr vilken IEC 62443 Security Level som gäller.'],
    ['is_applicable', 'Tillämpligt', ''],
    ['testability', 'Testbart', ''],
    ['test_phase', 'Testtillfälle', ''],
    ['test_type', 'Testtyp', ''],
    ['responsible_party', 'Ansvarig', ''],
    ['result_status', 'Status', ''],
    ['tested_at', 'Testdatum', ''],
    ['tested_by', 'Utförd av', ''],
    ['deviation', 'Avvikelse/åtgärd', 'min-w-[180px]'],
    ['evidence_file_name', 'Verifikat', 'min-w-[160px]'],
  ];

  const renderSortButton = (key: SortKey, label: string, help?: string) => {
    const active = sortKey === key;
    const Icon = active ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <span className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={() => toggleSort(key)}
          className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${active ? 'text-foreground font-medium' : ''}`}
        >
          {label}
          <Icon className={`h-3 w-3 ${active ? 'opacity-100' : 'opacity-40'}`} />
        </button>
        {help && <HelpHint text={help} />}
      </span>
    );
  };


  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground px-1">
        <div className="flex flex-wrap items-center gap-2">
          <span>Visar <strong className="text-foreground">{filtered.length}</strong> av {mappings.length} mappningar</span>
          <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Scrolla tabellen åt vänster" title="Scrolla åt vänster" disabled={!canScrollLeft} onClick={() => scrollBy(-400)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Scrolla tabellen åt höger" title="Scrolla åt höger" disabled={!canScrollRight} onClick={() => scrollBy(400)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch id="group-by-req" checked={groupByRequirement} onCheckedChange={(v) => { setGroupByRequirement(v); setPage(0); }} />
            <Label htmlFor="group-by-req" className="text-sm font-normal">Gruppera per krav</Label>
          </div>
          <Button size="sm" variant="outline" onClick={handleExport} disabled={sorted.length === 0}>
            <Download className="h-4 w-4 mr-2" />Exportera Excel
          </Button>
          {hasActiveFilter && (
            <Button size="sm" variant="ghost" onClick={clearFilters}>Rensa filter</Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">System / komponent</strong> = den tillgång som testas.{' '}
            <strong className="text-foreground">Anläggningsklass</strong> = klassificeringen 1–5 på den anläggning
            systemet tillhör, och den styr vilken IEC 62443 Security Level som gäller.{' '}
            Ett krav räknas som <strong className="text-foreground">omappat</strong> när det inte har någon
            testaktivitet här — alltså ingen rad som kopplar kravet till en tillgång och ett testtillfälle.
            Väljer du ett projekt räknas siffrorna inom projektets kravomfattning i stället för globalt.
          </p>
          {projectFilter !== ALL && projectScope && (
            <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
              Projektets kravomfattning: <strong>{projectScope.total}</strong> krav ·{' '}
              <strong>{projectScope.planned}</strong> testplanerade ·{' '}
              <strong>{projectScope.total - projectScope.planned}</strong> saknar testaktivitet.
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="space-y-1.5">
              <FilterLabel htmlFor="tm-project" label="Projekt" help="Upphandling eller leverans som testaktiviteten hör till. Utan val visas alla mappningar." />
              <Select value={projectFilter} onValueChange={v => { setProjectFilter(v); setPage(0); }}>
                <SelectTrigger id="tm-project"><SelectValue placeholder="Projekt" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Alla projekt</SelectItem>
                  {(projects ?? []).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="tm-search" className="text-xs">Sök krav</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="tm-search" placeholder="Sök kravtext / kapitel..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
              </div>
            </div>
            <div className="space-y-1.5">
              <FilterLabel htmlFor="tm-system" label="System / komponent" help="Vilken tillgång kravet testas på — ett informationssystem eller en komponent under systemet." />
              <Select value={systemFilter} onValueChange={v => { setSystemFilter(v); setPage(0); }}>
                <SelectTrigger id="tm-system"><SelectValue placeholder="System / komponent" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Alla system och komponenter</SelectItem>
                  {systems.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="flex flex-col items-start">
                        <span>{s.name}</span>
                        {s.system_type && (
                          <span className="text-xs text-muted-foreground">{s.system_type}</span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <FilterLabel htmlFor="tm-class" label="Anläggningsklass (SL)" help="Klassificeringen 1–5 på den anläggning systemet tillhör. Klassen styr vilken IEC 62443 Security Level som gäller." />
              <Select value={classFilter} onValueChange={v => { setClassFilter(v); setPage(0); }}>
                <SelectTrigger id="tm-class"><SelectValue placeholder="Anläggningsklass" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Alla anläggningsklasser</SelectItem>
                  {[1,2,3,4,5].map(l => (
                    <SelectItem key={l} value={String(l)}>
                      Klass {l} — {getSecurityLevelLabel(l) === 'Ingen SL' ? 'ingen SL' : getSecurityLevelLabel(l)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tm-phase" className="text-xs">Testtillfälle</Label>
              <Select value={phaseFilter} onValueChange={v => { setPhaseFilter(v); setPage(0); }}>
                <SelectTrigger id="tm-phase"><SelectValue placeholder="Testtillfälle" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Alla tillfällen</SelectItem>
                  {TEST_PHASES.map(p => <SelectItem key={p} value={p}>{TEST_PHASE_LABELS[p]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {sources.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="tm-source" className="text-xs">Kravkälla</Label>
                <Select value={sourceFilter} onValueChange={v => { setSourceFilter(v); setPage(0); }}>
                  <SelectTrigger id="tm-source"><SelectValue placeholder="Kravkälla" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Alla kravkällor</SelectItem>
                    {sources.map(s => <SelectItem key={s} value={s}>{prettySourceName(s)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="tm-status" className="text-xs">Testresultat</Label>
              <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
                <SelectTrigger id="tm-status"><SelectValue placeholder="Testresultat" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Alla testresultat</SelectItem>
                  <SelectItem value={INCOMPLETE}>Visa bara ofullständiga</SelectItem>
                  {RESULT_STATUSES.map(s => <SelectItem key={s} value={s}>{RESULT_STATUS_LABELS[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <FilterLabel
                htmlFor="tm-assessment"
                label={`Beslut${pendingCount > 0 ? ` (${pendingCount} väntar)` : ''}`}
                help="Filtrera på formellt beslut. Väntar på beslut = testet har ett förslag som ska godkännas eller avfärdas."
              />
              <Select value={assessmentFilter} onValueChange={v => { setAssessmentFilter(v); setPage(0); }}>
                <SelectTrigger id="tm-assessment"><SelectValue placeholder="Beslut" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Alla rader</SelectItem>
                  <SelectItem value={PENDING}>Väntar på beslut ({pendingCount})</SelectItem>
                  <SelectItem value={APPROVED}>Godkända ({approvedCount})</SelectItem>
                  <SelectItem value={DISMISSED}>Avfärdade ({dismissedCount})</SelectItem>
                  <SelectItem value={NOT_APPROVED}>Dölj godkända</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>


      {selectedIds.size > 0 && (
        <BulkEditBar
          selectedCount={selectedIds.size}
          onClear={() => setSelectedIds(new Set())}
          onApply={applyBulk}
          onCreateRounds={(phases) => createRounds.mutate({
            mappings: mappings.filter(m => selectedIds.has(m.id)),
            phases,
          })}
        />
      )}

      <Card>
        <CardContent className="p-0">
          <div ref={topScrollbarRef} className="scroll-x-visible h-5 max-w-full overflow-x-scroll overflow-y-hidden border-b border-border" role="region" aria-label="Övre horisontell scrollning för mappningar" tabIndex={0}>
            <div className="h-px" style={{ width: scrollWidth }} />
          </div>
          <div ref={viewportRef} className="scroll-x-visible overflow-auto overflow-x-scroll max-h-[70vh] relative" role="region" aria-label="Testmappningar" tabIndex={0}>
            <Table containerClassName="overflow-visible">
              <TableHeader className="sticky top-0 z-30 bg-background border-b border-border">
                <TableRow>
                  <TableHead className="sticky left-0 z-40 bg-background w-10 min-w-10 max-w-10 px-3">
                    <Checkbox checked={allVisibleSelected} onCheckedChange={toggleAllVisible} aria-label="Markera alla synliga" />
                  </TableHead>
                  <TableHead className="sticky left-10 z-40 bg-background min-w-[130px] border-r border-border">
                    {renderSortButton('requirement_chapter', 'Krav')}
                  </TableHead>
                  <TableHead className="min-w-[190px]">
                    <span className="inline-flex items-center gap-1">Beslut <HelpHint text="Formell kravbedömning. Godkänn sätter status på systemets krav med testet som bevis; Avfärda lämnar kravet oförändrat och sparar motiveringen." /></span>
                  </TableHead>
                  {columns.map(([key, label, cls, help]) => (
                    <TableHead key={key} className={cls}>{renderSortButton(key, label, help)}</TableHead>
                  ))}

                  <TableHead className="min-w-[230px]">Anteckningar</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderItems.map(item => {
                  if (item.kind === 'group') {
                    const rows = item.rows;
                    const first = rows[0];
                    const expanded = expandedGroups.has(item.requirementId);
                    const systemsInGroup = Array.from(new Set(rows.map(r => r.system_name).filter(Boolean))) as string[];
                    const tested = rows.filter(r => r.result_status !== 'not_tested').length;
                    return (
                      <TableRow key={`group-${item.requirementId}`} className="bg-muted/40 cursor-pointer" onClick={() => toggleGroup(item.requirementId)}>
                        <TableCell className="sticky left-0 z-20 bg-muted w-10 min-w-10 max-w-10 px-3">
                          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </TableCell>
                        <TableCell className="sticky left-10 z-20 bg-muted font-mono text-xs border-r border-border">
                          {first.requirement_chapter}
                        </TableCell>
                        <TableCell colSpan={18} className="text-xs">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="line-clamp-1 max-w-md">{first.requirement_description}</span>
                            {systemsInGroup.map(name => (
                              <Badge key={name} variant="outline" className="font-normal">{name}</Badge>
                            ))}
                            <span className="text-muted-foreground">{tested}/{rows.length} testade</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }
                  const m = item.m;
                  const approved = approvedByMapping?.get(m.id);
                  return (
                  <TableRow key={m.id} data-state={selectedIds.has(m.id) ? 'selected' : undefined} className={approved ? 'bg-status-success/10' : undefined}>
                    <TableCell className={`sticky left-0 z-20 w-10 min-w-10 max-w-10 px-3 ${approved ? 'test-model-sticky-approved' : 'bg-background'}`}>
                      <Checkbox checked={selectedIds.has(m.id)} onCheckedChange={() => toggleRow(m.id)} aria-label="Markera rad" />
                    </TableCell>
                    <TableCell className={`sticky left-10 z-20 font-mono text-xs border-r border-border ${approved ? 'test-model-sticky-approved' : 'bg-background'}`}>
                      <span className="inline-flex items-center gap-1">
                        {m.requirement_chapter}
                        {savedRowIds.has(m.id) && <Check className="h-3 w-3 text-primary" aria-label="Sparat" />}
                      </span>
                    </TableCell>
                    <TableCell className="min-w-[190px] align-top">
                      <DecisionCell mapping={m} approved={approved} suggestion={suggestionsByMapping?.get(m.id)} />
                    </TableCell>
                    <TableCell className="text-xs max-w-md"><p className="line-clamp-2" title={m.requirement_description ?? ''}>{m.requirement_description}</p></TableCell>
                    <TableCell className="text-xs max-w-[160px]"><span className="line-clamp-2" title={m.source_name ?? ''}>{prettySourceName(m.source_name)}</span></TableCell>
                    <TableCell className="text-xs">{m.system_name || '–'}</TableCell>
                    <TableCell className="text-xs">{m.asset_name || '–'}</TableCell>
                    <TableCell>{m.classification_level ? <Badge variant="outline">L{m.classification_level}</Badge> : '–'}</TableCell>
                    <TableCell>
                      <Select
                        value={m.is_applicable == null ? 'unset' : m.is_applicable ? 'yes' : 'no'}
                        onValueChange={(v) => handleField(m, 'is_applicable', v === 'unset' ? null : v === 'yes')}
                      >
                        <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unset">Ej bedömt</SelectItem>
                          <SelectItem value="yes">Ja</SelectItem>
                          <SelectItem value="no">Nej</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={m.testability ?? NULL_VALUE} onValueChange={(v) => handleField(m, 'testability', v)}>
                        <SelectTrigger className="h-8 w-24"><SelectValue placeholder="–" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NULL_VALUE}>–</SelectItem>
                          {TESTABILITIES.map(t => <SelectItem key={t} value={t}>{TESTABILITY_LABELS[t]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={m.test_phase ?? NULL_VALUE} onValueChange={(v) => handleField(m, 'test_phase', v)}>
                        <SelectTrigger className="h-8 w-24"><SelectValue placeholder="–" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NULL_VALUE}>–</SelectItem>
                          {TEST_PHASES.map(p => <SelectItem key={p} value={p}>{TEST_PHASE_LABELS[p]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={m.test_type ?? NULL_VALUE} onValueChange={(v) => handleField(m, 'test_type', v)}>
                        <SelectTrigger className="h-8 w-40"><SelectValue placeholder="–" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NULL_VALUE}>–</SelectItem>
                          {TEST_TYPES.map(t => <SelectItem key={t} value={t}>{TEST_TYPE_LABELS[t]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <ResponsibleSelect
                        value={m.responsible_party}
                        options={responsibleOptions}
                        onChange={(v) => handleField(m, 'responsible_party', v)}
                      />
                    </TableCell>
                    <TableCell>
                      <Select value={m.result_status} onValueChange={(v) => handleField(m, 'result_status', v)}>
                        <SelectTrigger className="h-8 w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RESULT_STATUSES.map(s => <SelectItem key={s} value={s}>{RESULT_STATUS_LABELS[s]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {m.result_status !== 'not_tested' && (
                        <Badge variant={STATUS_BADGE_VARIANT[m.result_status]} className="mt-1">
                          {RESULT_STATUS_LABELS[m.result_status]}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input type="date" className="h-8 w-36" defaultValue={m.tested_at ?? ''}
                        onBlur={e => e.target.value !== (m.tested_at ?? '') && handleField(m, 'tested_at', e.target.value || null)} />
                    </TableCell>
                    <TableCell>
                      <Input className="h-8 w-32" defaultValue={m.tested_by ?? ''}
                        onBlur={e => e.target.value !== (m.tested_by ?? '') && handleField(m, 'tested_by', e.target.value || null)} />
                    </TableCell>
                    <TableCell>
                      <Input
                        className={`h-8 w-44 ${m.result_status === 'failed' && !m.deviation ? 'border-destructive' : ''}`}
                        placeholder={m.result_status === 'failed' ? 'Krävs vid underkänt' : 'Avvikelse / åtgärd'}
                        defaultValue={m.deviation ?? ''}
                        onBlur={e => e.target.value !== (m.deviation ?? '') && handleField(m, 'deviation', e.target.value || null)} />
                    </TableCell>
                    <TableCell>
                      <EvidenceCell
                        mappingId={m.id}
                        fileName={m.evidence_file_name}
                        path={m.evidence_url}
                        onChange={(values) => handleFields(m, values)}
                      />
                    </TableCell>
                    <TableCell>
                      <NotesCell mappingId={m.id} notes={notesByMapping?.get(m.id) ?? []} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Button size="icon" variant="ghost" onClick={() => setPanelMappingId(m.id)} aria-label="Visa kravtext">
                          <PanelRightOpen className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => del.mutate(m.id)} aria-label="Ta bort mappning">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={20} className="text-center py-8 text-muted-foreground">
                    {hasActiveFilter
                      ? 'Inga mappningar matchar valda filter — rensa filter för att se alla.'
                      : 'Inga mappningar — importera från Excel eller lägg till manuellt nedan'}
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {filtered.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Rader per sida</span>
            <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPage(0); }}>
              <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[50, 100, 200].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">Sida {currentPage + 1} av {pageCount}</span>
            <Button size="sm" variant="outline" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Föregående</Button>
            <Button size="sm" variant="outline" disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)}>Nästa</Button>
          </div>
        </div>
      )}

      <RequirementPanel
        mapping={panelMapping}
        rounds={panelRounds}
        onOpenChange={(open) => { if (!open) setPanelMappingId(null); }}
        decision={panelMapping ? (
          <DecisionCell
            mapping={panelMapping}
            approved={approvedByMapping?.get(panelMapping.id)}
            suggestion={suggestionsByMapping?.get(panelMapping.id)}
            detailed
          />
        ) : null}
      />

      <AddMappingCard mappings={mappings} requirements={requirements} onAdd={(requirementId) => upsert.mutate({ requirement_id: requirementId })} />
    </div>
  );
}

function AddMappingCard({
  mappings, requirements, onAdd,
}: { mappings: TestMappingWithDetails[]; requirements: any[]; onAdd: (id: string) => void }) {
  const unmappedReqs = useMemo(() => {
    const mapped = new Set(mappings.map(m => `${m.requirement_id}-${m.system_id ?? ''}-${m.asset_id ?? ''}`));
    return requirements.filter(r => !mapped.has(`${r.id}--`));
  }, [mappings, requirements]);

  if (unmappedReqs.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-medium mb-2">Lägg till mappning för krav utan ({unmappedReqs.length})</h3>
        <Select onValueChange={onAdd}>
          <SelectTrigger className="w-full max-w-2xl"><SelectValue placeholder="Välj krav att mappa..." /></SelectTrigger>
          <SelectContent>
            {unmappedReqs.slice(0, 200).map(r => (
              <SelectItem key={r.id} value={r.id}>
                {r.chapter_section} — {r.description.slice(0, 80)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}
