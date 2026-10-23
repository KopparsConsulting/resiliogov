import { useState, useMemo } from 'react';
import { RepealedBadge } from '@/components/compliance/OutOfScopeBadge';
import { useRequirements, RequirementWithDetails } from '@/hooks/useRequirements';
import { RequirementImportWizard } from '@/components/requirements/RequirementImportWizard';
import { RequirementLinkImportDialog } from '@/components/requirements/RequirementLinkImportDialog';
import { RequirementLinksPanel } from '@/components/requirements/RequirementLinksPanel';
import { useRequirementSources } from '@/hooks/useRequirementSources';
import { useDomains } from '@/hooks/useDomains';
import { useFacilities } from '@/hooks/useFacilities';
import { useInformationSystems } from '@/hooks/useInformationSystems';
import { useReviewStatus, needsReview } from '@/hooks/useRequirementReviews';
import { fetchRequirementMatches } from '@/lib/requirementEngine';
import { useQuery } from '@tanstack/react-query';
import { buildSourceLink, sourceLinkLabel, isPdfUrl } from '@/lib/sourceLink';
import { TriggerLogicEditor } from '@/components/requirements/TriggerLogicEditor';
import { SourceDocumentUpload } from '@/components/requirements/SourceDocumentUpload';
import { RequirementReviewActions, ReviewStatusBadge } from '@/components/requirements/RequirementReviewActions';
import { RequirementAuditHistory } from '@/components/requirements/RequirementAuditHistory';
import { AddresseeBadges } from '@/components/requirements/AddresseeBadges';
import { useReviewQueueCounts } from '@/hooks/useReviewQueueCounts';
import { ADDRESSEES, ADDRESSEE_LABELS, TARGET_TYPE_LABELS, addressesAsset, effectiveAddressee } from '@/lib/requirementAddressee';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, ChevronDown, Building2, Server, Filter, CheckCircle2, AlertTriangle, Clock, FileText, ExternalLink, Upload, Printer, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { Facility } from '@/types/compliance';
import type { InformationSystem } from '@/types/system';

const levelLabels: Record<string, string> = {
  strategic: 'Strategiska',
  mandatory: 'Tvingande',
  recommended: 'Rekommenderade',
};

const levelColors: Record<string, string> = {
  strategic: 'bg-muted text-foreground',
  mandatory: 'bg-muted text-foreground',
  recommended: 'bg-muted text-foreground',
};

function TriggerLogicChips({ logic }: { logic: unknown }) {
  if (!logic || typeof logic !== 'object') {
    return <span className="text-muted-foreground text-xs italic">Alla (inget filter)</span>;
  }

  const entries = Object.entries(logic as Record<string, unknown>);
  const labelMap: Record<string, string> = {
    type: 'Typ', length_gt: 'Längd >', traffic_flow_gt: 'ÅDT >', construction_type: 'Konstruktion',
    is_critical_entity: 'Samhällsviktig', has_dangerous_goods: 'Farligt gods', owner_type: 'Ägare',
    system_category: 'Systemkategori', system_type: 'Systemtyp', is_central_system: 'Centralt system',
    is_externally_accessible: 'Externt åtkomligt', linked_to_facility_type: 'Kopplad till anl.typ',
    linked_to_critical_facility: 'Kopplad till samhällsviktig', linked_to_dangerous_goods_facility: 'Kopplad till farligt gods',
  };

  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([key, value]) => (
        <Badge key={key} variant="outline" className="text-xs font-normal">
          {labelMap[key] || key}: {Array.isArray(value) ? value.join(', ') : String(value)}
        </Badge>
      ))}
    </div>
  );
}

function MatchInfo({ req, facilities, systems }: { req: RequirementWithDetails; facilities: Facility[]; systems: InformationSystem[] }) {
  // Beräknas av kravmotorn i databasen – samma svar som när posterna skapas
  const { data: matches = [], isLoading } = useQuery({
    queryKey: ['requirement-matches', req.id, req.trigger_logic, req.target_type],
    queryFn: () => fetchRequirementMatches(req.id),
  });

  const matchedFacilities = useMemo(() => {
    const ids = new Set(matches.filter((m) => m.objectType === 'facility').map((m) => m.objectId));
    return facilities.filter((f) => ids.has(f.id));
  }, [matches, facilities]);

  const matchedSystems = useMemo(() => {
    const ids = new Set(matches.filter((m) => m.objectType === 'system').map((m) => m.objectId));
    return systems.filter((s) => ids.has(s.id));
  }, [matches, systems]);

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">Beräknar matchningar…</p>;
  }

  return (
    <div className="space-y-3">
      {req.target_type !== 'system' && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Matchar {matchedFacilities.length} anläggning(ar)</span>
          </div>
          {matchedFacilities.length > 0 ? (
            <div className="flex flex-wrap gap-1 ml-6">{matchedFacilities.map((f) => <Badge key={f.id} variant="secondary" className="text-xs">{f.name} ({f.type})</Badge>)}</div>
          ) : <p className="text-xs text-muted-foreground ml-6">Inga matchande anläggningar</p>}
        </div>
      )}
      {req.target_type !== 'facility' && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Server className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Matchar {matchedSystems.length} system</span>
          </div>
          {matchedSystems.length > 0 ? (
            <div className="flex flex-wrap gap-1 ml-6">{matchedSystems.map((s) => <Badge key={s.id} variant="secondary" className="text-xs">{s.name}</Badge>)}</div>
          ) : <p className="text-xs text-muted-foreground ml-6">Inga matchande system</p>}
        </div>
      )}
    </div>
  );
}

export default function RequirementsPage() {
  const { data: requirements = [], isLoading } = useRequirements();
  const { data: sources = [] } = useRequirementSources();
  const { data: domains = [] } = useDomains();
  const { data: facilities = [] } = useFacilities();
  const { data: systems = [] } = useInformationSystems();
  const { data: reviewMap = new Map() } = useReviewStatus();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queue = useReviewQueueCounts();
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [domainFilter, setDomainFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [targetFilter, setTargetFilter] = useState('all');
  // ?review=todo m.fl. – så att andra sidor kan länka till en filtrerad vy
  const [reviewFilter, setReviewFilter] = useState(searchParams.get('review') ?? 'all');
  const [addresseeFilter, setAddresseeFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [linkImportOpen, setLinkImportOpen] = useState(false);

  const filtered = useMemo(() => {
    return requirements.filter((r) => {
      if (search) {
        const q = search.toLowerCase();
        if (!r.description.toLowerCase().includes(q) && !r.chapter_section.toLowerCase().includes(q)) return false;
      }
      if (sourceFilter !== 'all' && r.source_id !== sourceFilter) return false;
      if (domainFilter !== 'all' && r.domain_id !== domainFilter) return false;
      if (levelFilter !== 'all' && r.requirement_level !== levelFilter) return false;
      if (targetFilter !== 'all' && r.target_type !== targetFilter) return false;
      if (addresseeFilter !== 'all' && effectiveAddressee(r.source_addressee, r.target_type) !== addresseeFilter) return false;
      if (reviewFilter !== 'all') {
        const review = reviewMap.get(r.id);
        if (reviewFilter === 'todo') {
          if (!needsReview(review)) return false;
        } else if (reviewFilter !== (review?.review_state ?? 'pending')) return false;
      }
      return true;
    });
  }, [requirements, search, sourceFilter, domainFilter, levelFilter, targetFilter, reviewFilter, addresseeFilter, reviewMap]);

  const stats = useMemo(() => {
    const levels = { strategic: 0, mandatory: 0, recommended: 0 };
    const targets = { facility: 0, system: 0 };
    const reviewStats = { approved: 0, changed: 0, flagged: 0, pending: 0 };
    for (const r of requirements) {
      if (r.requirement_level && levels[r.requirement_level] !== undefined) levels[r.requirement_level]++;
      if (r.target_type === 'system') targets.system++; else targets.facility++;
      if (r.repealed_at) continue;
      reviewStats[reviewMap.get(r.id)?.review_state ?? 'pending']++;
    }
    return { total: requirements.length, levels, targets, reviewStats };
  }, [requirements, reviewMap]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kravdatabas</h1>
          <p className="text-muted-foreground">Utforska, granska och verifiera matchning av samtliga krav</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              sessionStorage.setItem('requirement-print-selection', JSON.stringify(filtered.map((r) => r.id)));
              navigate('/requirements/print');
            }}
            disabled={filtered.length === 0}
          >
            <Printer className="h-4 w-4 mr-2" />
            Skriv ut för granskning ({filtered.length})
          </Button>
          <Button variant="outline" onClick={() => setLinkImportOpen(true)}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Importera kravmappning
          </Button>
          <Button onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importera regelverk
          </Button>
        </div>
      </div>

      <RequirementImportWizard open={importOpen} onOpenChange={setImportOpen} />
      <RequirementLinkImportDialog open={linkImportOpen} onOpenChange={setLinkImportOpen} />

      {queue.domains + queue.links > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border px-4 py-2 text-sm">
          <span className="text-muted-foreground">
            {queue.domains} domänförslag och {queue.links} kravlänkar väntar på granskning.
          </span>
          <Link to="/review?tab=domaner" className="font-medium underline-offset-2 hover:underline">Till granskningen →</Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Totalt</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-foreground">{stats.levels.mandatory}</p><p className="text-xs text-muted-foreground">Tvingande</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-foreground">{stats.levels.strategic}</p><p className="text-xs text-muted-foreground">Strategiska</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-foreground">{stats.levels.recommended}</p><p className="text-xs text-muted-foreground">Rekommenderade</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-lg font-bold">{stats.targets.facility}</p><p className="text-xs text-muted-foreground">Anläggning</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-lg font-bold">{stats.targets.system}</p><p className="text-xs text-muted-foreground">System</p></CardContent></Card>
        <Card className="border-status-success/30 dark:border-status-success/30"><CardContent className="p-3 text-center flex flex-col items-center"><div className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-status-success" /><p className="text-lg font-bold text-status-success">{stats.reviewStats.approved}</p></div><p className="text-xs text-muted-foreground">Godkända</p></CardContent></Card>
        <Card className="border-destructive/30 dark:border-destructive/30"><CardContent className="p-3 text-center flex flex-col items-center"><div className="flex items-center gap-1"><AlertTriangle className="h-4 w-4 text-destructive" /><p className="text-lg font-bold text-destructive">{stats.reviewStats.flagged}</p></div><p className="text-xs text-muted-foreground">Flaggade{stats.reviewStats.changed > 0 ? ` · ${stats.reviewStats.changed} ändrade` : ''}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filter</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Sök beskrivning / kapitel..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger><SelectValue placeholder="Källa" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla källor</SelectItem>
                {sources.map((s) => <SelectItem key={s.id} value={s.id}>{s.document_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={domainFilter} onValueChange={setDomainFilter}>
              <SelectTrigger><SelectValue placeholder="Domän" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla domäner</SelectItem>
                {domains.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger><SelectValue placeholder="Nivå" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla nivåer</SelectItem>
                <SelectItem value="mandatory">Tvingande</SelectItem>
                <SelectItem value="strategic">Strategiskt</SelectItem>
                <SelectItem value="recommended">Rekommenderat</SelectItem>
              </SelectContent>
            </Select>
            <Select value={targetFilter} onValueChange={setTargetFilter}>
              <SelectTrigger><SelectValue placeholder="Måltyp" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla</SelectItem>
                <SelectItem value="facility">Anläggning</SelectItem>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="component">Komponent</SelectItem>
                <SelectItem value="supplier">Leverantör</SelectItem>
                <SelectItem value="asset_owner">Organisation</SelectItem>
              </SelectContent>
            </Select>
            <Select value={addresseeFilter} onValueChange={setAddresseeFilter}>
              <SelectTrigger aria-label="Mottagare"><SelectValue placeholder="Mottagare" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla mottagare</SelectItem>
                {ADDRESSEES.map((a) => <SelectItem key={a} value={a}>{ADDRESSEE_LABELS[a]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={reviewFilter} onValueChange={setReviewFilter}>
              <SelectTrigger><SelectValue placeholder="Granskning" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla</SelectItem>
                <SelectItem value="todo">Kvar att granska</SelectItem>
                <SelectItem value="pending">Ogranskade</SelectItem>
                <SelectItem value="approved">Godkända</SelectItem>
                <SelectItem value="changed">Ändrade sedan godkännande</SelectItem>
                <SelectItem value="flagged">Flaggade</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">Visar {filtered.length} av {requirements.length} krav</p>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Status</TableHead>
                <TableHead className="w-[180px]">Källa</TableHead>
                <TableHead className="w-[100px]">Kapitel</TableHead>
                <TableHead>Beskrivning</TableHead>
                <TableHead className="w-[130px]">Domän</TableHead>
                <TableHead className="w-[110px]">Nivå</TableHead>
                <TableHead className="w-[80px]">Mål</TableHead>
                <TableHead className="w-[250px]">Trigger Logic</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <Collapsible key={r.id} open={expandedId === r.id} onOpenChange={(open) => setExpandedId(open ? r.id : null)} asChild>
                  <>
                    <CollapsibleTrigger asChild>
                      <TableRow className="cursor-pointer">
                        <TableCell><ReviewStatusBadge review={reviewMap.get(r.id)} /></TableCell>
                        <TableCell className="text-xs font-medium">
                          <div className="flex flex-wrap items-center gap-1">
                            <span>{r.source_name || '–'}</span>
                            {(() => {
                              const src = sources.find(s => s.id === r.source_id);
                              return src?.document_url ? (
                                <a href={src.document_url} target="_blank" rel="noopener noreferrer" title="Visa källdokument">
                                  <FileText className="h-3 w-3 text-primary hover:text-primary/80" />
                                </a>
                              ) : null;
                            })()}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            <AddresseeBadges
                              addressee={r.source_addressee}
                              measureScale={r.source_measure_scale}
                              targetType={r.target_type}
                              slCapability={r.sl_capability}
                              mlCapability={r.ml_capability}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          <div className="flex flex-col">
                            <span>{r.chapter_section}</span>
                            {r.repealed_at && <RepealedBadge repealedAt={r.repealed_at} />}
                            {r.is_local && <span className="text-[10px] text-muted-foreground font-sans">Lokalt krav</span>}
                            {(() => {
                              const src = sources.find(s => s.id === r.source_id);
                              const url = src?.document_url || null;
                              const href = buildSourceLink({
                                documentUrl: url,
                                page: r.source_page,
                                excerpt: r.source_excerpt,
                                chapterSection: r.chapter_section,
                              });
                              const isPdf = url ? isPdfUrl(url) : false;

                              if (isPdf && r.source_page == null) {
                                return <span className="text-[10px] text-muted-foreground italic">sida saknas</span>;
                              }
                              if (!href) {
                                return isPdf
                                  ? <span className="text-[10px] text-muted-foreground">s. {r.source_page}</span>
                                  : null;
                              }
                              return (
                                <a href={href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                                   className="text-[10px] text-primary hover:underline">
                                  {isPdf ? `s. ${r.source_page}` : 'öppna paragraf'} ↗
                                </a>
                              );
                            })()}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm max-w-md"><p className="line-clamp-2">{r.description}</p></TableCell>
                        <TableCell>
                          {r.domain_name ? <Badge variant="outline" className="text-xs" >{r.domain_name}</Badge> : '–'}
                        </TableCell>
                        <TableCell>
                          {r.requirement_level ? <Badge className={`text-xs ${levelColors[r.requirement_level] || ''}`}>{levelLabels[r.requirement_level] || r.requirement_level}</Badge> : '–'}
                        </TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{TARGET_TYPE_LABELS[r.target_type ?? 'facility'] ?? r.target_type}</Badge></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex-1"><TriggerLogicChips logic={r.trigger_logic} /></div>
                            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedId === r.id ? 'rotate-180' : ''}`} />
                          </div>
                        </TableCell>
                      </TableRow>
                    </CollapsibleTrigger>
                    <CollapsibleContent asChild>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={8} className="p-4">
                          <div className="space-y-4">
                            <div className="space-y-1">
                              <span className="text-xs font-medium text-muted-foreground">Kravtext</span>
                              <p className="text-sm whitespace-pre-wrap leading-relaxed">{r.description}</p>
                            </div>
                            {r.source_excerpt && (
                              <div className="space-y-1">
                                <span className="text-xs font-medium text-muted-foreground">Originaltext ur källan</span>
                                <p className="text-sm whitespace-pre-wrap leading-relaxed italic rounded-md border bg-background p-3">
                                  {r.source_excerpt}
                                </p>
                                {(() => {
                                  const src = sources.find(s => s.id === r.source_id);
                                  const href = buildSourceLink({
                                    documentUrl: src?.document_url,
                                    page: r.source_page,
                                    excerpt: r.source_excerpt,
                                    chapterSection: r.chapter_section,
                                  });
                                  const label = sourceLinkLabel({
                                    documentUrl: src?.document_url,
                                    page: r.source_page,
                                    chapterSection: r.chapter_section,
                                  });
                                  return href ? (
                                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                                      {src?.document_name}{label ? `, ${label}` : ''} ↗
                                    </a>
                                  ) : null;
                                })()}
                              </div>
                            )}
                            <RequirementReviewActions requirementId={r.id} currentReview={reviewMap.get(r.id)} />
                            {r.source_id && (() => {
                              const src = sources.find(s => s.id === r.source_id);
                              return src ? (
                                <div className="space-y-1">
                                  <span className="text-xs font-medium text-muted-foreground">Källdokument</span>
                                  <SourceDocumentUpload sourceId={src.id} sourceName={src.document_name} documentUrl={src.document_url} />
                                </div>
                              ) : null;
                            })()}
                            <RequirementLinksPanel requirementId={r.id} />
                            {addressesAsset(r.source_addressee, r.target_type) ? <MatchInfo req={r} facilities={facilities as Facility[]} systems={systems as InformationSystem[]} /> : (
                              <p className="text-xs text-muted-foreground">
                                {ADDRESSEE_LABELS[effectiveAddressee(r.source_addressee, r.target_type)]} – matchas inte mot anläggningar, system eller komponenter och skapar inga bedömningsposter.
                              </p>
                            )}
                            <TriggerLogicEditor requirementId={r.id} triggerLogic={r.trigger_logic} targetType={r.target_type} />
                            <RequirementAuditHistory requirementId={r.id} />
                          </div>
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  </>
                </Collapsible>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Inga krav matchar filtren</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
