import * as XLSX from 'xlsx';
import {
  RESPONSIBLE_ORG_LABELS,
  RESULT_STATUS_FROM_LABEL,
  RESULT_STATUS_LABELS,
  TEST_PHASE_LABELS,
  TEST_TYPE_LABELS,
  type ResultStatus,
} from '@/components/test-model/constants';
import type { TestPlanRow } from '@/hooks/useProjectTestPlan';

export const SUPPLIER_HEADERS = [
  'Rad-ID',
  'Krav-ID',
  'Kravtext',
  'Källa',
  'Testtillfälle',
  'Testtyp',
  'Metod',
  'Acceptanskriterium',
  'Ansvarig part',
  'Komponent',
  'Resultat (Godkänd / Godkänd med anmärkning / Underkänd / Ej testad)',
  'Testdatum (ÅÅÅÅ-MM-DD)',
  'Utförd av',
  'Avvikelse/åtgärd',
  'Verifikat (protokoll/filnamn)',
  'Kommentar',
];

export interface SupplierExportOptions {
  rows: TestPlanRow[];
  assetNames: Record<string, string>;
  projectName: string;
  /** Only include activities with this responsible org, or all when null. */
  responsibleOrg?: 'supplier' | 'client' | 'joint' | null;
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

/** Builds the supplier response workbook for a project's planned test activities. */
export function exportSupplierWorkbook({
  rows,
  assetNames,
  projectName,
  responsibleOrg = null,
}: SupplierExportOptions): number {
  const dataRows: (string | number)[][] = [];

  for (const row of rows) {
    for (const activity of row.activities) {
      if (responsibleOrg && activity.responsible_org !== responsibleOrg) continue;
      dataRows.push([
        activity.id,
        row.chapter_section,
        row.description,
        row.source_name ?? '',
        activity.test_phase ? TEST_PHASE_LABELS[activity.test_phase] : '',
        activity.test_type ? TEST_TYPE_LABELS[activity.test_type] : '',
        activity.test_method ?? '',
        activity.acceptance_criteria ?? '',
        activity.responsible_org ? RESPONSIBLE_ORG_LABELS[activity.responsible_org] : '',
        activity.asset_id ? assetNames[activity.asset_id] ?? '' : 'Hela systemet',
        activity.result_status === 'not_tested' ? '' : RESULT_STATUS_LABELS[activity.result_status],
        '',
        '',
        '',
        '',
        '',
      ]);
    }
  }

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([SUPPLIER_HEADERS, ...dataRows]);
  sheet['!cols'] = SUPPLIER_HEADERS.map((header, index) => ({
    wch: index === 2 || index === 7 ? 60 : Math.max(14, Math.min(header.length + 2, 34)),
  }));
  XLSX.utils.book_append_sheet(workbook, sheet, 'Leverantörssvar');

  const instructions = [
    ['Instruktion till leverantören'],
    [''],
    ['1. Fyll endast i de gråmarkerade svarsfälten: Resultat, Testdatum, Utförd av, Avvikelse/åtgärd, Verifikat och Kommentar.'],
    ['2. Ändra inte kolumnen Rad-ID – den kopplar ditt svar till rätt krav vid inläsning.'],
    ['3. Tillåtna värden i Resultat: Godkänd, Godkänd med anmärkning, Underkänd, Ej testad.'],
    ['4. Ange alltid en hänvisning till testprotokoll eller intyg i kolumnen Verifikat vid godkänt resultat.'],
    ['5. Vid Underkänd ska avvikelse och planerad åtgärd beskrivas.'],
    [''],
    [`Projekt: ${projectName}`],
    [`Antal testaktiviteter: ${dataRows.length}`],
  ];
  const infoSheet = XLSX.utils.aoa_to_sheet(instructions);
  infoSheet['!cols'] = [{ wch: 110 }];
  XLSX.utils.book_append_sheet(workbook, infoSheet, 'Instruktion');

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `Leverantorsunderlag-${slugify(projectName)}-${date}.xlsx`);
  return dataRows.length;
}

export interface SupplierImportRow {
  mappingId: string;
  chapterSection: string;
  resultStatus: ResultStatus;
  testedAt: string | null;
  testedBy: string | null;
  deviation: string | null;
  evidence: string | null;
  comment: string | null;
  error: string | null;
}

function text(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function parseDate(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${parsed.y}-${pad(parsed.m)}-${pad(parsed.d)}`;
    }
  }
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

/** Parses an uploaded supplier workbook and validates each row against the project's activities. */
export function parseSupplierWorkbook(
  buffer: ArrayBuffer,
  knownActivityIds: Set<string>,
): SupplierImportRow[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName =
    workbook.SheetNames.find((name) => name.toLowerCase().includes('leverantör')) ??
    workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  const results: SupplierImportRow[] = [];
  for (const record of raw) {
    const keys = Object.keys(record);
    const find = (needle: string) =>
      record[keys.find((key) => key.toLowerCase().startsWith(needle)) ?? ''];

    const mappingId = text(find('rad-id'));
    const chapterSection = text(find('krav-id'));
    const resultLabel = text(find('resultat')).toLowerCase();
    const testedAt = parseDate(find('testdatum'));
    const testedBy = text(find('utförd av')) || null;
    const deviation = text(find('avvikelse')) || null;
    const evidence = text(find('verifikat')) || null;
    const comment = text(find('kommentar')) || null;

    if (!mappingId && !resultLabel) continue;

    let error: string | null = null;
    let resultStatus: ResultStatus = 'not_tested';

    if (!mappingId) {
      error = 'Rad-ID saknas';
    } else if (!knownActivityIds.has(mappingId)) {
      error = 'Rad-ID hör inte till detta projekt';
    } else if (!resultLabel) {
      error = 'Resultat saknas';
    } else if (!RESULT_STATUS_FROM_LABEL[resultLabel]) {
      error = `Okänt resultat: ${resultLabel}`;
    } else {
      resultStatus = RESULT_STATUS_FROM_LABEL[resultLabel];
      if (resultStatus === 'failed' && !deviation) error = 'Underkänd rad saknar avvikelse';
      if ((resultStatus === 'passed' || resultStatus === 'passed_with_remarks') && !evidence) {
        error = 'Godkänd rad saknar verifikat';
      }
    }

    results.push({
      mappingId,
      chapterSection,
      resultStatus,
      testedAt,
      testedBy,
      deviation,
      evidence,
      comment,
      error,
    });
  }
  return results;
}
