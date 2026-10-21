import * as XLSX from 'xlsx';
import type { TestMappingWithDetails } from '@/hooks/useTestMappings';
import {
  TEST_PHASE_LABELS, TEST_TYPE_LABELS, TESTABILITY_LABELS, RESULT_STATUS_LABELS,
} from './constants';

export const EXPORT_HEADERS = [
  'Krav-ID', 'Kravtext', 'Källa', 'Sida', 'System', 'Komponent', 'Systemklass',
  'Tillämpligt', 'Testbart', 'Testtillfälle', 'Testtyp', 'Ansvarig',
  'Status', 'Testdatum', 'Utförd av', 'Avvikelse/åtgärd', 'Verifikat', 'Kommentar',
];

function applicableLabel(value: boolean | null): string {
  if (value === true) return 'Ja';
  if (value === false) return 'Nej';
  return 'Ej bedömt';
}

export function mappingsToRows(mappings: TestMappingWithDetails[]): (string | number)[][] {
  return mappings.map(m => [
    m.requirement_chapter ?? '',
    m.requirement_description ?? '',
    m.source_name ?? '',
    m.requirement_page ?? '',
    m.system_name ?? '',
    m.asset_name ?? '',
    m.classification_level ?? '',
    applicableLabel(m.is_applicable),
    m.testability ? TESTABILITY_LABELS[m.testability] : '',
    m.test_phase ? TEST_PHASE_LABELS[m.test_phase] : '',
    m.test_type ? TEST_TYPE_LABELS[m.test_type] : '',
    m.responsible_party ?? '',
    RESULT_STATUS_LABELS[m.result_status] ?? '',
    m.tested_at ?? '',
    m.tested_by ?? '',
    m.deviation ?? '',
    m.evidence_file_name ?? m.evidence ?? '',
    m.comment ?? '',
  ]);
}

/** Exports the given test mappings to an .xlsx file, one sheet per test phase plus a full sheet. */
export function exportTestMappings(mappings: TestMappingWithDetails[], fileNamePrefix = 'testmodell') {
  const workbook = XLSX.utils.book_new();

  const allSheet = XLSX.utils.aoa_to_sheet([EXPORT_HEADERS, ...mappingsToRows(mappings)]);
  allSheet['!cols'] = EXPORT_HEADERS.map((h, index) => ({ wch: index === 1 ? 60 : Math.max(12, h.length + 2) }));
  XLSX.utils.book_append_sheet(workbook, allSheet, 'Alla rader');

  const phases = Array.from(new Set(mappings.map(m => m.test_phase).filter(Boolean))) as (keyof typeof TEST_PHASE_LABELS)[];
  for (const phase of phases) {
    const phaseRows = mappings.filter(m => m.test_phase === phase);
    const sheet = XLSX.utils.aoa_to_sheet([EXPORT_HEADERS, ...mappingsToRows(phaseRows)]);
    sheet['!cols'] = allSheet['!cols'];
    XLSX.utils.book_append_sheet(workbook, sheet, TEST_PHASE_LABELS[phase]);
  }

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `${fileNamePrefix}-${date}.xlsx`);
}
