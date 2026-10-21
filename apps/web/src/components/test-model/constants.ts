export const TEST_PHASES = ['FAT1', 'FAT2', 'FAT3', 'SAT', 'OSAT'] as const;
export type TestPhase = typeof TEST_PHASES[number];

export const TEST_PHASE_LABELS: Record<TestPhase, string> = {
  FAT1: 'FAT 1',
  FAT2: 'FAT 2',
  FAT3: 'FAT 3',
  SAT: 'SAT',
  OSAT: 'OSAT',
};

export const TEST_TYPES = [
  'document_review',
  'functional_test',
  'penetration_test',
  'configuration_test',
  'risk_analysis_review',
  'other',
] as const;
export type TestType = typeof TEST_TYPES[number];

export const TEST_TYPE_LABELS: Record<TestType, string> = {
  document_review: 'Dokumentgranskning',
  functional_test: 'Funktionstest',
  penetration_test: 'Penetrationstest',
  configuration_test: 'Konfigurationstest',
  risk_analysis_review: 'Granskning av riskanalys',
  other: 'Annat',
};

export const TESTABILITIES = ['yes', 'no', 'partial'] as const;
export type Testability = typeof TESTABILITIES[number];

export const TESTABILITY_LABELS: Record<Testability, string> = {
  yes: 'Ja',
  no: 'Nej',
  partial: 'Delvis',
};

// Reverse maps for Excel import (Swedish → enum)
export const PHASE_FROM_LABEL: Record<string, TestPhase> = {
  'fat 1': 'FAT1', 'fat1': 'FAT1',
  'fat 2': 'FAT2', 'fat2': 'FAT2',
  'fat 3': 'FAT3', 'fat3': 'FAT3',
  'sat': 'SAT',
  'osat': 'OSAT',
};

export const TYPE_FROM_LABEL: Record<string, TestType> = {
  'dokumentgranskning': 'document_review',
  'funktionstest': 'functional_test',
  'penetrationstest': 'penetration_test',
  'konfigurationstest': 'configuration_test',
  'granskning av riskanalys': 'risk_analysis_review',
  'riskanalys': 'risk_analysis_review',
  'annat': 'other',
};

export const TESTABILITY_FROM_LABEL: Record<string, Testability> = {
  'ja': 'yes', 'yes': 'yes',
  'nej': 'no', 'no': 'no',
  'delvis': 'partial', 'partial': 'partial',
};

export const APPLICABLE_FROM_LABEL: Record<string, boolean> = {
  'ja': true, 'yes': true, 'true': true, '1': true,
  'nej': false, 'no': false, 'false': false, '0': false,
};

export const RESULT_STATUSES = ['not_tested', 'passed', 'passed_with_remarks', 'failed'] as const;
export type ResultStatus = typeof RESULT_STATUSES[number];

export const RESULT_STATUS_LABELS: Record<ResultStatus, string> = {
  not_tested: 'Ej testad',
  passed: 'Godkänd',
  passed_with_remarks: 'Godkänd m. anm.',
  failed: 'Underkänd',
};

export const RESULT_STATUS_FROM_LABEL: Record<string, ResultStatus> = {
  'ej testad': 'not_tested',
  'godkänd': 'passed',
  'godkänd med anmärkning': 'passed_with_remarks',
  'godkänd m. anm.': 'passed_with_remarks',
  'underkänd': 'failed',
};

export const RESPONSIBLE_ORGS = ['supplier', 'client', 'joint'] as const;
export type ResponsibleOrg = typeof RESPONSIBLE_ORGS[number];

export const RESPONSIBLE_ORG_LABELS: Record<ResponsibleOrg, string> = {
  supplier: 'Leverantör',
  client: 'Beställare',
  joint: 'Gemensamt',
};

export const APPLICABILITY_OPTIONS = [
  { value: 'unset', label: 'Ej bedömt' },
  { value: 'yes', label: 'Ja' },
  { value: 'no', label: 'Nej' },
] as const;
