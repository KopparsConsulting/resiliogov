import ExcelJS from 'exceljs';
import type { ExportData, ExportFilters, ExportDiff } from './types';
import { calculateMetrics, isExpired, type ScorableRecord } from '@/lib/complianceMetrics';

export async function generateExcelWorkbook(
  data: ExportData,
  filters: ExportFilters,
  exportId: string
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Compliance Manager';
  workbook.created = new Date();

  // ── Overview sheet ──
  const overview = workbook.addWorksheet('Översikt');
  overview.columns = [
    { header: 'Fält', key: 'field', width: 30 },
    { header: 'Värde', key: 'value', width: 60 },
  ];
  overview.addRows([
    { field: 'Export-ID', value: exportId },
    { field: 'Exportdatum', value: new Date().toLocaleString('sv-SE') },
    { field: 'Källa', value: 'Compliance Manager' },
    { field: 'Antal anläggningar', value: data.facilities.length },
    { field: 'Antal informationssystem', value: data.systems.length },
    { field: 'Antal regelverk', value: data.requirementSources.length },
    { field: 'Antal krav', value: data.requirements.length },
    { field: 'Antal efterlevnadsposter (anläggning)', value: data.complianceRecords.length },
    { field: 'Antal efterlevnadsposter (system)', value: data.systemComplianceRecords.length },
    { field: 'Filter: Anläggningar', value: filters.facilityIds?.length ? `${filters.facilityIds.length} valda` : 'Alla' },
    { field: 'Filter: System', value: filters.systemIds?.length ? `${filters.systemIds.length} valda` : 'Alla' },
    { field: 'Filter: Regelverk', value: filters.sourceIds?.length ? `${filters.sourceIds.length} valda` : 'Alla' },
    { field: 'Filter: Domäner', value: filters.domainIds?.length ? `${filters.domainIds.length} valda` : 'Alla' },
  ]);
  styleSheet(overview);

  // ── Regelverk sheet ──
  const regelverkSheet = workbook.addWorksheet('Regelverk');
  regelverkSheet.columns = [
    { header: 'ID', key: 'id', width: 36 },
    { header: 'Regelverksnamn', key: 'document_name', width: 40 },
    { header: 'Kategori', key: 'category', width: 25 },
    { header: 'Beskrivning', key: 'description', width: 50 },
    { header: 'Antal krav', key: 'req_count', width: 12 },
  ];
  const reqCountMap = new Map<string, number>();
  data.requirements.forEach((r) => {
    if (r.source_id) reqCountMap.set(r.source_id, (reqCountMap.get(r.source_id) || 0) + 1);
  });
  data.requirementSources.forEach((s) => {
    regelverkSheet.addRow({
      id: s.id,
      document_name: s.document_name,
      category: s.category,
      description: s.description || '',
      req_count: reqCountMap.get(s.id) || 0,
    });
  });
  styleSheet(regelverkSheet);

  // ── Krav sheet ──
  const kravSheet = workbook.addWorksheet('Krav');
  kravSheet.columns = [
    { header: 'Krav-ID', key: 'id', width: 36 },
    { header: 'Regelverk', key: 'source', width: 35 },
    { header: 'Domän', key: 'domain', width: 25 },
    { header: 'Kravnummer', key: 'chapter_section', width: 15 },
    { header: 'Kravtext', key: 'description', width: 60 },
    { header: 'Nivå', key: 'level', width: 15 },
    { header: 'Måltyp', key: 'target_type', width: 15 },
  ];
  data.requirements.forEach((r) => {
    kravSheet.addRow({
      id: r.id,
      source: r.requirement_sources?.document_name || '',
      domain: r.security_domains?.name || '',
      chapter_section: r.chapter_section,
      description: r.description,
      level: r.requirement_level || '',
      target_type: r.target_type || '',
    });
  });
  styleSheet(kravSheet);

  // ── Anläggningar sheet ──
  const facilitySheet = workbook.addWorksheet('Anläggningar');
  facilitySheet.columns = [
    { header: 'ID', key: 'id', width: 36 },
    { header: 'Anläggning', key: 'name', width: 30 },
    { header: 'Typ', key: 'type', width: 20 },
    { header: 'Längd (m)', key: 'length_meters', width: 12 },
    { header: 'ÅDT', key: 'traffic_flow_adt', width: 12 },
    { header: 'Konstruktion', key: 'construction_type', width: 15 },
    { header: 'Samhällsviktig', key: 'is_critical_entity', width: 15 },
    { header: 'Farligt gods', key: 'has_dangerous_goods', width: 15 },
    { header: 'Krav (inkl. system)', key: 'total', width: 16 },
    { header: 'Täckning %', key: 'coverage', width: 14 },
    { header: 'Efterlevnad %', key: 'compliance', width: 14 },
  ];
  // Täckning och efterlevnad – samma definition som i appen (complianceMetrics.ts).
  // Anläggningen redovisas INKLUSIVE kopplade system, som i appen.
  const systemsByFacility = new Map<string, Set<string>>();
  (data.facilitySystems || []).forEach((l: { facility_id: string; system_id: string }) => {
    if (!systemsByFacility.has(l.facility_id)) systemsByFacility.set(l.facility_id, new Set());
    systemsByFacility.get(l.facility_id)!.add(l.system_id);
  });
  const facilityRollup = (facilityId: string) => {
    const linked = systemsByFacility.get(facilityId) ?? new Set<string>();
    return calculateMetrics([
      ...data.complianceRecords.filter((r: { facility_id: string }) => r.facility_id === facilityId),
      ...data.systemComplianceRecords.filter((r: { system_id: string }) => linked.has(r.system_id)),
    ]);
  };
  data.facilities.forEach((f) => {
    const m = facilityRollup(f.id);
    facilitySheet.addRow({
      id: f.id,
      name: f.name,
      type: f.type,
      length_meters: f.length_meters || '',
      traffic_flow_adt: f.traffic_flow_adt || '',
      construction_type: f.construction_type || '',
      is_critical_entity: f.is_critical_entity ? 'Ja' : 'Nej',
      has_dangerous_goods: f.has_dangerous_goods ? 'Ja' : 'Nej',
      total: m.total,
      coverage: m.coverage,
      compliance: m.compliance ?? '–',
    });
  });
  styleSheet(facilitySheet);

  // ── System sheet ──
  const systemSheet = workbook.addWorksheet('System');
  systemSheet.columns = [
    { header: 'ID', key: 'id', width: 36 },
    { header: 'Systemnamn', key: 'name', width: 30 },
    { header: 'Typ', key: 'system_type', width: 20 },
    { header: 'Kategori', key: 'system_category', width: 20 },
    { header: 'Ägare', key: 'system_owner', width: 20 },
    { header: 'Samhällsviktig', key: 'is_critical_entity', width: 15 },
    { header: 'Externt åtkomlig', key: 'is_externally_accessible', width: 18 },
    { header: 'Centralt system', key: 'is_central_system', width: 16 },
    { header: 'Krav', key: 'total', width: 10 },
    { header: 'Täckning %', key: 'coverage', width: 14 },
    { header: 'Efterlevnad %', key: 'compliance', width: 14 },
  ];
  const systemMetrics = metricsByObject(data.systemComplianceRecords, (r) => r.system_id);
  data.systems.forEach((s) => {
    const m = systemMetrics.get(s.id) ?? calculateMetrics([]);
    systemSheet.addRow({
      id: s.id,
      name: s.name,
      system_type: s.system_type,
      system_category: s.system_category || '',
      system_owner: s.system_owner || '',
      is_critical_entity: s.is_critical_entity ? 'Ja' : 'Nej',
      is_externally_accessible: s.is_externally_accessible ? 'Ja' : 'Nej',
      is_central_system: s.is_central_system ? 'Ja' : 'Nej',
      total: m.total,
      coverage: m.coverage,
      compliance: m.compliance ?? '–',
    });
  });
  styleSheet(systemSheet);

  // ── Compliance Mapping sheet (facilities) ──
  const mappingSheet = workbook.addWorksheet('Efterlevnad Anläggningar');
  mappingSheet.columns = [
    { header: 'Anläggning', key: 'facility', width: 25 },
    { header: 'Regelverk', key: 'source', width: 30 },
    { header: 'Krav-ID', key: 'req_id', width: 15 },
    { header: 'Kravtext', key: 'description', width: 50 },
    { header: 'Domän', key: 'domain', width: 20 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Anteckningar', key: 'notes', width: 30 },
    { header: 'Evidens', key: 'evidence', width: 30 },
    ...ASSESSMENT_COLUMNS,
  ];
  const facilityMap = new Map(data.facilities.map((f: any) => [f.id, f.name]));
  data.complianceRecords.forEach((r) => {
    mappingSheet.addRow({
      facility: facilityMap.get(r.facility_id) || r.facility_id,
      source: r.requirements?.requirement_sources?.document_name || '',
      req_id: r.requirements?.chapter_section || '',
      description: r.requirements?.description || '',
      domain: r.requirements?.security_domains?.name || '',
      status: r.status || 'Ej påbörjad',
      notes: r.notes || '',
      evidence: r.evidence || '',
      ...assessmentCells(r),
    });
  });
  styleSheet(mappingSheet);

  // ── System Compliance Mapping ──
  const sysMappingSheet = workbook.addWorksheet('Efterlevnad System');
  sysMappingSheet.columns = [
    { header: 'System', key: 'system', width: 25 },
    { header: 'Regelverk', key: 'source', width: 30 },
    { header: 'Krav-ID', key: 'req_id', width: 15 },
    { header: 'Kravtext', key: 'description', width: 50 },
    { header: 'Domän', key: 'domain', width: 20 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Anteckningar', key: 'notes', width: 30 },
    { header: 'Evidens', key: 'evidence', width: 30 },
    ...ASSESSMENT_COLUMNS,
  ];
  const systemMap = new Map(data.systems.map((s: any) => [s.id, s.name]));
  data.systemComplianceRecords.forEach((r) => {
    sysMappingSheet.addRow({
      system: systemMap.get(r.system_id) || r.system_id,
      source: r.requirements?.requirement_sources?.document_name || '',
      req_id: r.requirements?.chapter_section || '',
      description: r.requirements?.description || '',
      domain: r.requirements?.security_domains?.name || '',
      status: r.status || 'Ej påbörjad',
      notes: r.notes || '',
      evidence: r.evidence || '',
      ...assessmentCells(r),
    });
  });
  styleSheet(sysMappingSheet);

  // ── Definitions sheet ──
  const defSheet = workbook.addWorksheet('Definitioner');
  defSheet.columns = [
    { header: 'Term', key: 'term', width: 25 },
    { header: 'Beskrivning', key: 'description', width: 60 },
  ];
  defSheet.addRows([
    { term: 'Regelverk', description: 'Lagar, förordningar eller standarder som ställer krav på organisationen.' },
    { term: 'Krav', description: 'Enskild regel eller paragraf från ett regelverk som ska uppfyllas.' },
    { term: 'Domän', description: 'Säkerhetsområde som grupperar relaterade krav (t.ex. fysisk säkerhet, nätverkssäkerhet).' },
    { term: 'Anläggning', description: 'Fysisk infrastruktur som tunnel, bro, trafikledningscentral etc.' },
    { term: 'Informationssystem', description: 'IT- eller OT-system som stödjer eller styr anläggningar.' },
    { term: 'Efterlevnadsstatus', description: 'Bedömning av hur väl ett krav uppfylls: Ej påbörjad, Pågående, Delvis uppfyllt, Uppfyllt, Ej uppfyllt, Ej tillämpligt.' },
    { term: 'Täckning', description: 'Andel krav som har fått någon bedömning (allt utom Ej påbörjad).' },
    { term: 'Efterlevnad', description: 'Uppfyllda krav (ej utgångna) delat med bedömda krav exklusive Ej tillämpligt. Visas som – när inget är bedömt.' },
    { term: 'Utanför omfattning', description: 'Krav som inte längre gäller objektet (t.ex. efter omklassning) men har registrerat arbete. Bedömningen bevaras men räknas inte i täckning eller efterlevnad.' },
    { term: 'Samhällsviktig', description: 'Verksamhet som klassats som samhällsviktig enligt säkerhetsskyddslagen.' },
    { term: 'ÅDT', description: 'Årsdygnstrafik – genomsnittligt antal fordon per dygn.' },
  ]);
  styleSheet(defSheet);

  // ── Ändringar (diff) sheet ──
  if (data.diff && (data.diff.added.length || data.diff.removed.length || data.diff.changed.length)) {
    const diffSheet = workbook.addWorksheet('Ändringar');
    diffSheet.columns = [
      { header: 'Typ', key: 'change_type', width: 18 },
      { header: 'Krav-ID', key: 'chapter_section', width: 15 },
      { header: 'Regelverk', key: 'source_name', width: 30 },
      { header: 'Domän', key: 'domain_name', width: 20 },
      { header: 'Kravtext', key: 'description', width: 55 },
      { header: 'Ändrade fält', key: 'changed_fields', width: 25 },
      { header: 'Tidigare kravtext', key: 'prev_description', width: 55 },
    ];

    const addColoredRows = (entries: any[], fillColor: string) => {
      entries.forEach((e: any) => {
        const row = diffSheet.addRow({
          change_type: e.change_type,
          chapter_section: e.chapter_section,
          source_name: e.source_name || '',
          domain_name: e.domain_name || '',
          description: e.description,
          changed_fields: e.changed_fields || '',
          prev_description: e.prev?.description || '',
        });
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
        });
      });
    };

    addColoredRows(data.diff.added, 'FFD4EDDA');    // green
    addColoredRows(data.diff.changed, 'FFFFF3CD');   // yellow
    addColoredRows(data.diff.removed, 'FFF8D7DA');   // red

    // Add summary row at the top (insert after header)
    const summaryRow = diffSheet.insertRow(2, {
      change_type: `Sedan ${new Date(data.diff.previousExportDate).toLocaleDateString('sv-SE')}`,
      chapter_section: '',
      source_name: `${data.diff.summary.added} nya`,
      domain_name: `${data.diff.summary.changed} ändrade`,
      description: `${data.diff.summary.removed} borttagna`,
      changed_fields: '',
      prev_description: '',
    });
    summaryRow.font = { bold: true, italic: true };

    styleSheet(diffSheet);
  }

  return workbook;
}

function styleSheet(sheet: ExcelJS.Worksheet) {
  // Freeze header row
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, size: 11 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A5F' },
  };
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.alignment = { vertical: 'middle' };

  // Enable auto-filter
  if (sheet.rowCount > 1) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: sheet.rowCount, column: sheet.columnCount },
    };
  }
}


// ── Hjälpare för mått och bedömningskolumner ──

function metricsByObject<T extends ScorableRecord>(records: T[], key: (r: T) => string) {
  const groups = new Map<string, T[]>();
  records.forEach((r) => {
    const k = key(r);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  });
  return new Map(Array.from(groups.entries()).map(([k, rs]) => [k, calculateMetrics(rs)]));
}

const ASSESSMENT_COLUMNS = [
  { header: 'Giltig till', key: 'valid_until', width: 12 },
  { header: 'Bedömd av', key: 'assessed_by', width: 25 },
  { header: 'Bedömd', key: 'assessed_at', width: 12 },
  { header: 'Motivering', key: 'justification', width: 30 },
  { header: 'Omfattning', key: 'scope', width: 30 },
  { header: 'Kravet ändrat efter bedömning', key: 'changed_after', width: 16 },
];

function assessmentCells(r: {
  valid_until?: string | null;
  assessed_by?: string | null;
  assessed_at?: string | null;
  justification?: string | null;
  out_of_scope_since?: string | null;
  out_of_scope_reason?: string | null;
  requirements?: { content_changed_at?: string | null } | null;
}) {
  const changedAt = r.requirements?.content_changed_at;
  return {
    valid_until: r.valid_until ? `${r.valid_until.slice(0, 10)}${isExpired(r as ScorableRecord) ? ' (utgången)' : ''}` : '',
    assessed_by: r.assessed_by || '',
    assessed_at: r.assessed_at ? r.assessed_at.slice(0, 10) : '',
    justification: r.justification || '',
    scope: r.out_of_scope_since
      ? `Utanför sedan ${r.out_of_scope_since.slice(0, 10)}${r.out_of_scope_reason ? ` – ${r.out_of_scope_reason}` : ''}`
      : 'I omfattning',
    changed_after: r.assessed_at && changedAt && new Date(r.assessed_at) < new Date(changedAt) ? 'Ja – granska' : '',
  };
}
