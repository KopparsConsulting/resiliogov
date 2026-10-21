/**
 * Läser mappningsarket (lag → föreskrift → standard → teststeg) till rader
 * för import av kravlänkar. Här görs bara kolumnutläsning; all matchning
 * mot kravkatalogen sker i databasen (import_requirement_link_rows).
 */

export interface LinkImportRow {
  ref: string;
  law: string;
  regulation: string;
  standard: string;
  coverage: string;
  comment: string;
}

export type MappingColumn = keyof LinkImportRow;

export interface ParsedMappingSheet {
  sheetName: string;
  /** 1-baserat radnummer i arket där rubrikerna står */
  headerRow: number;
  rows: LinkImportRow[];
  /** Exempelrader (Rad-ID som börjar med "EX-") som hoppats över */
  skippedExamples: number;
  /** Kolumner som inte hittades (law är det enda som krävs) */
  missingColumns: MappingColumn[];
}

export interface SheetData {
  name: string;
  rows: unknown[][];
}

/** "MCFFS 2026:11 – punkt" → "mcffs202611punkt" */
export const normalizeHeader = (value: unknown): string =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^a-z0-9åäöé]/g, '');

const COLUMN_MATCHERS: Record<MappingColumn, (h: string) => boolean> = {
  ref: (h) => h === 'radid' || h === 'rad' || h === 'id',
  law: (h) => h.startsWith('lagparagraf') || h === 'lag' || h === 'lagkravid',
  regulation: (h) =>
    h.startsWith('mcffs')
    || (h.includes('föreskrift') && (h.includes('punkt') || h.includes('paragraf') || h.endsWith('id'))),
  standard: (h) =>
    (h.includes('iec') || h.startsWith('standard')) && (h.endsWith('id') || h.includes('kravid')),
  coverage: (h) => h.startsWith('täckning'),
  comment: (h) => h.startsWith('kommentar'),
};

const COLUMN_ORDER: MappingColumn[] = ['ref', 'law', 'regulation', 'standard', 'coverage', 'comment'];

const cellText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
};

/** Hittar rubrikraden (den första med en lagparagraf-kolumn) bland de 20 första raderna */
export function findHeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    if ((rows[i] ?? []).some((c) => COLUMN_MATCHERS.law(normalizeHeader(c)))) return i;
  }
  return -1;
}

export function mapColumns(header: unknown[]): Partial<Record<MappingColumn, number>> {
  const result: Partial<Record<MappingColumn, number>> = {};
  header.forEach((cell, index) => {
    const h = normalizeHeader(cell);
    if (!h) return;
    for (const column of COLUMN_ORDER) {
      if (result[column] === undefined && COLUMN_MATCHERS[column](h)) {
        result[column] = index;
        break;
      }
    }
  });
  return result;
}

export function parseMappingRows(sheet: SheetData): ParsedMappingSheet | null {
  const headerIndex = findHeaderRow(sheet.rows);
  if (headerIndex < 0) return null;

  const columns = mapColumns(sheet.rows[headerIndex] ?? []);
  const missingColumns = COLUMN_ORDER.filter((c) => columns[c] === undefined);
  const rows: LinkImportRow[] = [];
  let skippedExamples = 0;

  for (let i = headerIndex + 1; i < sheet.rows.length; i++) {
    const raw = sheet.rows[i] ?? [];
    const get = (column: MappingColumn) => {
      const index = columns[column];
      return index === undefined ? '' : cellText(raw[index]);
    };
    const row: LinkImportRow = {
      ref: get('ref'),
      law: get('law'),
      regulation: get('regulation'),
      standard: get('standard'),
      coverage: get('coverage'),
      comment: get('comment'),
    };
    if (!row.law && !row.regulation && !row.standard) continue;
    if (/^ex-/i.test(row.ref)) {
      skippedExamples++;
      continue;
    }
    // Radnummer i arket när Rad-ID saknas, så att fel går att hitta
    if (!row.ref) row.ref = `Rad ${i + 1}`;
    rows.push(row);
  }

  return { sheetName: sheet.name, headerRow: headerIndex + 1, rows, skippedExamples, missingColumns };
}

/** Väljer fliken "Mappning" om den finns, annars första flik med en lagparagraf-kolumn */
export function parseMappingWorkbook(sheets: SheetData[]): ParsedMappingSheet | null {
  const preferred = sheets.find((s) => normalizeHeader(s.name) === 'mappning');
  const ordered = preferred ? [preferred, ...sheets.filter((s) => s !== preferred)] : sheets;
  for (const sheet of ordered) {
    const parsed = parseMappingRows(sheet);
    if (parsed) return parsed;
  }
  return null;
}

export interface SourceOption {
  id: string;
  document_name: string;
  source_level: 'lag' | 'förordning' | 'föreskrift' | 'standard' | null;
}

/** Förval av regelverk: cybersäkerhetslagen, MCFFS och IEC 62443 om de finns */
export function guessSources(sources: SourceOption[]) {
  const pick = (level: SourceOption['source_level'], pattern: RegExp) =>
    sources.find((s) => s.source_level === level && pattern.test(s.document_name))?.id
    ?? (sources.filter((s) => s.source_level === level).length === 1
      ? sources.find((s) => s.source_level === level)?.id
      : undefined);
  return {
    law: pick('lag', /cybersäkerhet/i),
    regulation: pick('föreskrift', /mcffs/i),
    standard: pick('standard', /62443/),
  };
}
