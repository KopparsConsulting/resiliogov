import type { ComplianceStatus } from '@/types/compliance';

/**
 * Måtten för täckning och efterlevnad.
 *
 * SAMMA definition finns i databasen (vyerna compliance_record_scope och
 * compliance_object_metrics, migration 20261005100000). Ändras reglerna här
 * måste de ändras där också – testfallen i complianceMetrics.test.ts och
 * supabase/tests/metrics_test.sql är identiska.
 *
 *   bedömd       = status annan än Ej påbörjad / Pågående
 *   utgången     = bedömd och giltig-till har passerat (svensk tid)
 *   uppfylld     = Uppfyllt och inte utgången
 *   täckning     = bedömda / alla, i procent (0 när inga krav)
 *   efterlevnad  = uppfyllda / (bedömda − Ej tillämpligt), i procent,
 *                  null när inget är bedömbart
 *
 * Poster som är utanför omfattning (out_of_scope_since satt) räknas inte.
 */

/** Minimal shape needed to score a compliance record. */
export interface ScorableRecord {
  status: ComplianceStatus | null;
  valid_until?: string | null;
  out_of_scope_since?: string | null;
}

export const COMPLIANCE_STATUSES: ComplianceStatus[] = [
  'Ej påbörjad',
  'Pågående',
  'Delvis uppfyllt',
  'Uppfyllt',
  'Ej uppfyllt',
  'Ej tillämpligt',
];

export const STATUS_DESCRIPTIONS: Record<ComplianceStatus, string> = {
  'Ej påbörjad': 'Kravet är ännu inte bedömt.',
  'Pågående': 'Arbete pågår, ingen slutlig bedömning gjord.',
  'Delvis uppfyllt': 'Delar av kravet är verifierade. Kräver verifikat.',
  'Uppfyllt': 'Kravet är verifierat uppfyllt. Kräver verifikat.',
  'Ej uppfyllt': 'Kravet är bedömt och uppfylls inte.',
  'Ej tillämpligt': 'Kravet gäller inte objektet. Kräver motivering.',
};

/** Statuses that require at least one piece of evidence. */
export const STATUSES_REQUIRING_EVIDENCE: ComplianceStatus[] = ['Uppfyllt', 'Delvis uppfyllt'];

/** Statuses that require a written justification. */
export const STATUSES_REQUIRING_JUSTIFICATION: ComplianceStatus[] = ['Ej tillämpligt'];

export const MIN_JUSTIFICATION_LENGTH = 15;

/** Statuses that do not count as a completed assessment. */
export const UNASSESSED_STATUSES: ComplianceStatus[] = ['Ej påbörjad', 'Pågående'];

/** Dagens datum i Sverige som 'YYYY-MM-DD' – samma som databasens stockholm_today(). */
export function stockholmToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function isInScope(record: ScorableRecord): boolean {
  return !record.out_of_scope_since;
}

export function isAssessed(record: ScorableRecord): boolean {
  const status = record.status ?? 'Ej påbörjad';
  return !UNASSESSED_STATUSES.includes(status);
}

export function isExpired(record: ScorableRecord, today: string = stockholmToday()): boolean {
  if (!record.valid_until) return false;
  if (!isAssessed(record)) return false;
  return record.valid_until.slice(0, 10) < today;
}

export function isFulfilled(record: ScorableRecord, today: string = stockholmToday()): boolean {
  return record.status === 'Uppfyllt' && !isExpired(record, today);
}

/**
 * Kräver åtgärd: ej bedömd, delvis/ej uppfylld eller utgången bedömning.
 * Varje post i omfattningen är antingen öppen eller klar – aldrig båda, aldrig ingen.
 */
export function needsAction(record: ScorableRecord, today: string = stockholmToday()): boolean {
  if (!isInScope(record)) return false;
  if (!isAssessed(record)) return true;
  if (record.status === 'Delvis uppfyllt' || record.status === 'Ej uppfyllt') return true;
  return isExpired(record, today);
}

export function isClosed(record: ScorableRecord, today: string = stockholmToday()): boolean {
  return isInScope(record) && !needsAction(record, today);
}

export interface ComplianceMetrics {
  total: number;
  assessed: number;
  notApplicable: number;
  fulfilled: number;
  expired: number;
  /** Poster utanför omfattning – ingår inte i övriga siffror. */
  outOfScope: number;
  /** Share of requirements with a completed assessment (not Ej påbörjad/Pågående), 0-100. */
  coverage: number;
  /** Uppfyllt / (assessed - notApplicable), 0-100, or null when nothing assessable. */
  compliance: number | null;
}

export function metricCoverage(assessed: number, total: number): number {
  return total > 0 ? Math.round((assessed / total) * 100) : 0;
}

export function metricCompliance(fulfilled: number, assessed: number, notApplicable: number): number | null {
  const denominator = assessed - notApplicable;
  return denominator > 0 ? Math.round((fulfilled / denominator) * 100) : null;
}

export function calculateMetrics(records: ScorableRecord[], today: string = stockholmToday()): ComplianceMetrics {
  const inScope = records.filter(isInScope);
  const assessedRecords = inScope.filter(isAssessed);
  const notApplicable = assessedRecords.filter(r => r.status === 'Ej tillämpligt').length;
  const fulfilled = inScope.filter(r => isFulfilled(r, today)).length;
  const expired = inScope.filter(r => isExpired(r, today)).length;

  return {
    total: inScope.length,
    assessed: assessedRecords.length,
    notApplicable,
    fulfilled,
    expired,
    outOfScope: records.length - inScope.length,
    coverage: metricCoverage(assessedRecords.length, inScope.length),
    compliance: metricCompliance(fulfilled, assessedRecords.length, notApplicable),
  };
}

/** Rad från databasvyn compliance_object_metrics / compliance_domain_metrics. */
export interface MetricsRow {
  total: number | null;
  assessed: number | null;
  not_applicable: number | null;
  fulfilled: number | null;
  expired: number | null;
  out_of_scope?: number | null;
  coverage: number | null;
  compliance: number | null;
  /** Bara compliance_object_metrics: krav som kräver åtgärd (se needsAction) */
  needs_action?: number | null;
}

export function metricsFromRow(row: MetricsRow | null | undefined): ComplianceMetrics {
  return {
    total: row?.total ?? 0,
    assessed: row?.assessed ?? 0,
    notApplicable: row?.not_applicable ?? 0,
    fulfilled: row?.fulfilled ?? 0,
    expired: row?.expired ?? 0,
    outOfScope: row?.out_of_scope ?? 0,
    coverage: row?.coverage ?? 0,
    compliance: row?.compliance ?? null,
  };
}

export function calculateCoverage(records: ScorableRecord[]): number {
  return calculateMetrics(records).coverage;
}

export function calculateCompliance(records: ScorableRecord[]): number | null {
  return calculateMetrics(records).compliance;
}

/** Formats a compliance value, showing "–" when nothing is assessed. */
export function formatCompliance(value: number | null): string {
  return value === null ? '–' : `${value}%`;
}

export type ComplianceLabel = 'Ej bedömd' | 'Kritisk' | 'Behöver åtgärd' | 'God';

export interface ScoringThresholds {
  not_assessed_coverage: number;
  critical_compliance: number;
  critical_min_coverage: number;
  good_compliance: number;
}

export const DEFAULT_THRESHOLDS: ScoringThresholds = {
  not_assessed_coverage: 10,
  critical_compliance: 50,
  critical_min_coverage: 50,
  good_compliance: 80,
};

let activeThresholds: ScoringThresholds = { ...DEFAULT_THRESHOLDS };

export function setScoringThresholds(partial: Partial<ScoringThresholds>) {
  activeThresholds = { ...DEFAULT_THRESHOLDS, ...partial };
}

export function getScoringThresholds(): ScoringThresholds {
  return activeThresholds;
}

export function getComplianceLabel(
  metrics: Pick<ComplianceMetrics, 'coverage' | 'compliance'>,
  thresholds: ScoringThresholds = activeThresholds,
): ComplianceLabel {
  if (metrics.compliance === null || metrics.coverage < thresholds.not_assessed_coverage) {
    return 'Ej bedömd';
  }
  if (metrics.compliance < thresholds.critical_compliance && metrics.coverage >= thresholds.critical_min_coverage) {
    return 'Kritisk';
  }
  if (metrics.compliance >= thresholds.good_compliance) {
    return 'God';
  }
  return 'Behöver åtgärd';
}

export const LABEL_STYLES: Record<ComplianceLabel, string> = {
  'Ej bedömd': 'bg-muted text-muted-foreground border-border',
  'Kritisk': 'bg-status-danger/10 text-status-danger border-status-danger/20',
  'Behöver åtgärd': 'bg-status-warning/10 text-status-warning border-status-warning/20',
  'God': 'bg-status-success/10 text-status-success border-status-success/20',
};

/** Default validity horizon for a new assessment. */
export function defaultValidUntil(from: Date = new Date()): string {
  const date = new Date(from);
  date.setMonth(date.getMonth() + 12);
  return date.toISOString().slice(0, 10);
}

export interface AggregateInput {
  total_requirements?: number;
  assessed_count?: number;
  fulfilled_count?: number;
  not_applicable_count?: number;
}

/** Aggregates several objects' raw counts into one coverage/compliance pair. */
export function aggregateMetrics(items: AggregateInput[]) {
  const total = items.reduce((sum, i) => sum + (i.total_requirements ?? 0), 0);
  const assessed = items.reduce((sum, i) => sum + (i.assessed_count ?? 0), 0);
  const fulfilled = items.reduce((sum, i) => sum + (i.fulfilled_count ?? 0), 0);
  const notApplicable = items.reduce((sum, i) => sum + (i.not_applicable_count ?? 0), 0);

  return {
    total,
    assessed,
    fulfilled,
    notApplicable,
    coverage: metricCoverage(assessed, total),
    compliance: metricCompliance(fulfilled, assessed, notApplicable),
  };
}
