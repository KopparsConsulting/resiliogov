/* eslint-disable @typescript-eslint/no-explicit-any */
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { ExportData, ExportFilters, ExportProgress } from './types';
import { generateExcelWorkbook } from './generateExcel';

const APP_NAME = 'Compliance Manager';

/**
 * Bygger rapportpaketet (zip) från data som servern redan registrerat i
 * revisionskedjan. Export-ID och filnamn kommer från servern så att filen
 * kan spåras till loggposten.
 */
export async function generateOfflinePackage(
  data: ExportData,
  onProgress?: (p: ExportProgress) => void,
) {
  const zip = new JSZip();
  const root = zip.folder('efterlevnadspaket')!;
  const { exportId, fileName, filters } = data;
  const now = new Date(data.exportedAt || Date.now());

  onProgress?.({ step: 'Skapar dokumentation...', percentage: 10 });
  root.file('README.txt', generateReadme(data, filters, exportId, now));

  onProgress?.({ step: 'Skapar metadata...', percentage: 20 });
  root.file('package-metadata.json', JSON.stringify(generateMetadata(data, filters, exportId, now), null, 2));

  onProgress?.({ step: 'Genererar Excel-arbetsbok...', percentage: 30 });
  const workbook = await generateExcelWorkbook(data, filters, exportId);
  const excelBuffer = await workbook.xlsx.writeBuffer();
  root.file('compliance-export.xlsx', excelBuffer);

  onProgress?.({ step: 'Skapar JSON-export...', percentage: 50 });
  const jsonExport = {
    metadata: { exportId, exportedAt: now.toISOString(), source: APP_NAME, filters },
    regelverk: data.requirementSources,
    domaner: data.domains,
    krav: data.requirements.map(requirementRow),
    anlaggningar: data.facilities,
    informationssystem: data.systems,
    kopplingar: data.facilitySystems,
    efterlevnad_anlaggningar: data.complianceRecords.map((r: any) => ({ facility_id: r.facility_id, ...assessmentRow(r) })),
    efterlevnad_system: data.systemComplianceRecords.map((r: any) => ({ system_id: r.system_id, ...assessmentRow(r) })),
    andringar_sedan_forra_exporten: data.diff ?? null,
  };
  root.file('compliance-data.json', JSON.stringify(jsonExport, null, 2));

  onProgress?.({ step: 'Skapar CSV-filer...', percentage: 60 });
  const csv = root.folder('csv')!;
  csv.file('regelverk.csv', toCsv(data.requirementSources, ['id', 'document_name', 'category', 'description']));
  csv.file('krav.csv', toCsv(data.requirements.map(requirementRow), REQUIREMENT_COLUMNS));
  csv.file('anlaggningar.csv', toCsv(
    data.facilities.map((f: any) => ({
      id: f.id, name: f.name, type: f.type,
      classification_level: f.classification_level ?? '',
      length_meters: f.length_meters ?? '', traffic_flow_adt: f.traffic_flow_adt ?? '',
      construction_type: f.construction_type || '',
      is_critical_entity: f.is_critical_entity ? 'Ja' : 'Nej',
      has_dangerous_goods: f.has_dangerous_goods ? 'Ja' : 'Nej',
    })),
    ['id', 'name', 'type', 'classification_level', 'length_meters', 'traffic_flow_adt', 'construction_type', 'is_critical_entity', 'has_dangerous_goods'],
  ));
  csv.file('system.csv', toCsv(
    data.systems.map((s: any) => ({
      id: s.id, name: s.name, system_type: s.system_type,
      system_category: s.system_category || '', system_owner: s.system_owner || '',
      classification_source: s.classification_source || '',
      is_critical_entity: s.is_critical_entity ? 'Ja' : 'Nej',
    })),
    ['id', 'name', 'system_type', 'system_category', 'system_owner', 'classification_source', 'is_critical_entity'],
  ));
  csv.file('kopplingar.csv', toCsv(data.facilitySystems, ['facility_id', 'system_id', 'relation_type', 'criticality', 'is_primary']));
  csv.file('efterlevnad_anlaggningar.csv', toCsv(
    data.complianceRecords.map((r: any) => ({ facility_id: r.facility_id, ...assessmentRow(r) })),
    ['facility_id', ...ASSESSMENT_COLUMNS],
  ));
  csv.file('efterlevnad_system.csv', toCsv(
    data.systemComplianceRecords.map((r: any) => ({ system_id: r.system_id, ...assessmentRow(r) })),
    ['system_id', ...ASSESSMENT_COLUMNS],
  ));

  onProgress?.({ step: 'Skapar dokumentation...', percentage: 80 });
  const docFolder = root.folder('documentation')!;
  docFolder.file('export-description.txt', generateExportDescription());
  docFolder.file('field-definitions.csv', generateFieldDefinitionsCsv());

  onProgress?.({ step: 'Packar ZIP-fil...', percentage: 90 });
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });

  onProgress?.({ step: 'Startar nedladdning...', percentage: 100 });
  saveAs(blob, fileName);

  return { exportId, fileName };
}

// ── Rader ──

const REQUIREMENT_COLUMNS = [
  'id', 'regelverk', 'domain', 'chapter_section', 'description', 'requirement_level', 'target_type',
  'min_classification_level', 'sl_capability', 'trigger_logic', 'is_general_advice', 'is_local', 'repealed_at',
];

function requirementRow(r: any) {
  return {
    id: r.id,
    regelverk: r.requirement_sources?.document_name || '',
    domain: r.security_domains?.name || '',
    chapter_section: r.chapter_section,
    description: r.description,
    requirement_level: r.requirement_level || '',
    target_type: r.target_type || '',
    min_classification_level: r.min_classification_level ?? '',
    sl_capability: r.sl_capability ?? '',
    trigger_logic: r.trigger_logic ? JSON.stringify(r.trigger_logic) : '',
    is_general_advice: r.is_general_advice ? 'Ja' : 'Nej',
    is_local: r.is_local ? 'Ja' : 'Nej',
    repealed_at: r.repealed_at || '',
  };
}

const ASSESSMENT_COLUMNS = [
  'requirement_id', 'chapter_section', 'status', 'valid_until', 'assessed_by', 'assessed_at',
  'justification', 'evidence', 'evidence_url', 'evidence_file_name', 'notes',
  'out_of_scope_since', 'out_of_scope_reason', 'requirement_changed_after_assessment',
];

function assessmentRow(r: any) {
  const changedAt = r.requirements?.content_changed_at;
  return {
    requirement_id: r.requirement_id,
    chapter_section: r.requirements?.chapter_section || '',
    status: r.status || 'Ej påbörjad',
    valid_until: r.valid_until || '',
    assessed_by: r.assessed_by || '',
    assessed_at: r.assessed_at || '',
    justification: r.justification || '',
    evidence: r.evidence || '',
    evidence_url: r.evidence_url || '',
    evidence_file_name: r.evidence_file_name || '',
    notes: r.notes || '',
    out_of_scope_since: r.out_of_scope_since || '',
    out_of_scope_reason: r.out_of_scope_reason || '',
    requirement_changed_after_assessment:
      r.assessed_at && changedAt && new Date(r.assessed_at) < new Date(changedAt) ? 'Ja' : 'Nej',
  };
}

// ── Hjälpfunktioner ──

/**
 * Värden som börjar med = + - @ (eller tab/CR) tolkas som formler när
 * CSV-filen öppnas i Excel. Fritext (anteckningar, evidens) får därför en
 * inledande apostrof så att den alltid visas som text.
 */
export function csvCell(value: unknown): string {
  let val = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(val)) val = `'${val}`;
  return /[;"\n\r]/.test(val) ? `"${val.replace(/"/g, '""')}"` : val;
}

export function toCsv(rows: Record<string, any>[], columns: string[]): string {
  const header = columns.join(';');
  const body = rows.map((row) => columns.map((col) => csvCell(row[col])).join(';')).join('\n');
  return '﻿' + header + '\n' + body; // BOM för Excel
}

function describeFilters(filters: ExportFilters): string[] {
  const parts: string[] = [];
  if (filters.facilityIds?.length) {
    parts.push(`Anläggningar: ${filters.facilityIds.length} valda` +
      (filters.includeLinkedSystems === false ? '' : ' (med kopplade system)'));
  }
  if (filters.systemIds?.length) parts.push(`Informationssystem: ${filters.systemIds.length} valda`);
  if (filters.sourceIds?.length) parts.push(`Regelverk: ${filters.sourceIds.length} valda`);
  if (filters.domainIds?.length) parts.push(`Säkerhetsdomäner: ${filters.domainIds.length} valda`);
  return parts;
}

function generateReadme(data: ExportData, filters: ExportFilters, exportId: string, now: Date): string {
  const filterDesc = describeFilters(filters);
  return `EFTERLEVNADSPAKET
=================

Export-ID: ${exportId}
Genererad: ${now.toLocaleString('sv-SE')}
Källa: ${APP_NAME}
${filterDesc.length ? `\nFilter:\n${filterDesc.map((f) => `  - ${f}`).join('\n')}` : 'Filter: Inget (all data)'}

SKYDDSVÄRT INNEHÅLL
-------------------
Paketet visar vilka säkerhetskrav som inte är uppfyllda för namngivna
anläggningar och system. Hantera det enligt organisationens regler för
skyddsvärd information. Exporten är loggad i systemets revisionslogg
med export-ID ovan.

Innehåll
--------
- compliance-export.xlsx   Excel-arbetsbok (primär fil)
- compliance-data.json     Maskinläsbar JSON-export
- csv/                     CSV-filer per datamängd (semikolonseparerad, UTF-8 BOM)
- documentation/           Fältbeskrivningar och exportbeskrivning
- package-metadata.json    Metadata för spårbarhet

Datavolymer
-----------
- Anläggningar: ${data.facilities.length}
- Informationssystem: ${data.systems.length}
- Regelverk: ${data.requirementSources.length}
- Krav: ${data.requirements.length}
- Efterlevnadsposter (anläggning): ${data.complianceRecords.length}
- Efterlevnadsposter (system): ${data.systemComplianceRecords.length}
`;
}

function generateMetadata(data: ExportData, filters: ExportFilters, exportId: string, now: Date) {
  return {
    exportId,
    exportType: 'efterlevnadspaket',
    generatedAt: now.toISOString(),
    applicationName: APP_NAME,
    schemaVersion: '2.0',
    filters,
    rowCounts: {
      facilities: data.facilities.length,
      systems: data.systems.length,
      requirementSources: data.requirementSources.length,
      requirements: data.requirements.length,
      complianceRecords: data.complianceRecords.length,
      systemComplianceRecords: data.systemComplianceRecords.length,
      facilitySystems: data.facilitySystems.length,
    },
    changesSincePreviousExport: data.diff?.summary ?? null,
    includedFiles: [
      'README.txt',
      'package-metadata.json',
      'compliance-export.xlsx',
      'compliance-data.json',
      'csv/regelverk.csv',
      'csv/krav.csv',
      'csv/anlaggningar.csv',
      'csv/system.csv',
      'csv/kopplingar.csv',
      'csv/efterlevnad_anlaggningar.csv',
      'csv/efterlevnad_system.csv',
      'documentation/export-description.txt',
      'documentation/field-definitions.csv',
    ],
  };
}

function generateExportDescription(): string {
  return `EXPORTBESKRIVNING
=================

Paketet innehåller efterlevnadsdata från ${APP_NAME} för det urval som
angavs vid exporten (se README.txt och package-metadata.json).

Användning:
1. Öppna compliance-export.xlsx för en formaterad översikt
2. Använd CSV-filerna för import till andra verktyg
3. Använd compliance-data.json för programmatisk bearbetning
4. Se documentation/field-definitions.csv för fältbeskrivningar

Fritext som börjar med = + - eller @ har fått en inledande apostrof i
CSV-filerna så att Excel visar den som text och inte kör den som formel.

Paketet är inte ett kravpaket och kan inte importeras i en annan
installation. Kravbiblioteket förs över med funktionen "Kravpaket".
`;
}

function generateFieldDefinitionsCsv(): string {
  const rows = [
    ['Fält', 'Beskrivning', 'Datamängd', 'Exempelvärde'],
    ['id', 'Unikt ID (UUID)', 'Alla', '550e8400-e29b-41d4-a716-446655440000'],
    ['name', 'Namn på objekt', 'Anläggningar/System', 'Södra Länken T1'],
    ['type', 'Typ av anläggning', 'Anläggningar', 'Vägtunnel'],
    ['classification_level', 'Anläggningens klass 1–5', 'Anläggningar', '4'],
    ['document_name', 'Namn på regelverk', 'Regelverk', 'TSFS 2019:93'],
    ['chapter_section', 'Kapitel/paragraf', 'Krav/Efterlevnad', '4 kap. 2 §'],
    ['description', 'Kravtext', 'Krav', 'Brandskydd ska...'],
    ['trigger_logic', 'Villkor för vilka objekt kravet gäller (JSON)', 'Krav', '{"type":"Vägtunnel"}'],
    ['min_classification_level', 'Lägsta klass kravet gäller för', 'Krav', '3'],
    ['sl_capability', 'Kravets säkerhetsnivå (SL 1–4)', 'Krav', '2'],
    ['repealed_at', 'Tidpunkt då kravet upphävdes', 'Krav', '2026-10-05T10:00:00Z'],
    ['status', 'Efterlevnadsstatus', 'Efterlevnad', 'Uppfyllt'],
    ['valid_until', 'Bedömningen gäller till och med', 'Efterlevnad', '2027-06-30'],
    ['out_of_scope_since', 'Kravet gäller inte längre objektet sedan', 'Efterlevnad', '2026-10-05T10:00:00Z'],
    ['requirement_changed_after_assessment', 'Kravtexten har ändrats efter bedömningen', 'Efterlevnad', 'Ja'],
  ];
  return '﻿' + rows.map((r) => r.map(csvCell).join(';')).join('\n');
}
