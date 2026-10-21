import type { ClassificationLevel } from '@/types/compliance';

/**
 * Mapping between facility classification level (1-5) and IEC 62443-3-3 Security Level.
 *
 * The classification level is the single source of truth — the security level is always
 * derived, never stored separately. The actual mapping lives in the database table
 * `class_sl_mapping` and is loaded at runtime; the values below are only the fallback
 * used before the table has been fetched.
 *
 * target_sl = 0 means "no IEC 62443-3-3 requirements apply".
 */
export type SecurityLevelCode = 'none' | 'SL1' | 'SL2' | 'SL3' | 'SL4';

export interface ClassSlMappingRow {
  classification_level: number;
  target_sl: number;
  label: string;
  description: string | null;
}

const DEFAULT_TARGET_SL: Record<number, number> = {
  1: 0,
  2: 1,
  3: 2,
  4: 3,
  5: 3,
};

let targetSlByClass: Record<number, number> = { ...DEFAULT_TARGET_SL };
let descriptionByClass: Record<number, string> = {};

/** Populate the runtime mapping from the database (see useClassSlMapping). */
export function setClassSlMapping(rows: ClassSlMappingRow[]) {
  if (!rows?.length) return;
  const next: Record<number, number> = {};
  const nextDescriptions: Record<number, string> = {};
  for (const row of rows) {
    next[row.classification_level] = row.target_sl;
    if (row.description) nextDescriptions[row.classification_level] = row.description;
  }
  targetSlByClass = next;
  descriptionByClass = nextDescriptions;
}

export function getClassSlMapping(): Record<number, number> {
  return { ...targetSlByClass };
}

/** Target Security Level (0-4) for a classification level. 0 = no SL requirements. */
export function getTargetSecurityLevel(
  classificationLevel?: ClassificationLevel | number | null,
): number {
  if (!classificationLevel) return 0;
  return targetSlByClass[classificationLevel] ?? 0;
}

export const SECURITY_LEVEL_LABELS: Record<SecurityLevelCode, string> = {
  none: 'Ingen SL',
  SL1: 'SL 1',
  SL2: 'SL 2',
  SL3: 'SL 3',
  SL4: 'SL 4',
};

const SL_DEFAULT_DESCRIPTIONS: Record<SecurityLevelCode, string> = {
  none: 'Endast generella baskrav. Inga cybersäkerhetskrav från IEC 62443-3-3.',
  SL1: 'Skydd mot oavsiktliga eller tillfälliga överträdelser.',
  SL2: 'Skydd mot avsiktliga överträdelser med enkla medel och låg motivation.',
  SL3: 'Skydd mot avsiktliga överträdelser med sofistikerade medel och IACS-specifik kunskap.',
  SL4: 'Skydd mot avsiktliga överträdelser med avancerade medel, omfattande resurser och hög motivation.',
};

export const SECURITY_LEVEL_DESCRIPTIONS = SL_DEFAULT_DESCRIPTIONS;

export function securityLevelCode(targetSl: number): SecurityLevelCode {
  switch (targetSl) {
    case 1:
      return 'SL1';
    case 2:
      return 'SL2';
    case 3:
      return 'SL3';
    case 4:
      return 'SL4';
    default:
      return 'none';
  }
}

export function getSecurityLevel(
  classificationLevel?: ClassificationLevel | number | null,
): SecurityLevelCode | null {
  if (!classificationLevel) return null;
  return securityLevelCode(getTargetSecurityLevel(classificationLevel));
}

export function getSecurityLevelLabel(
  classificationLevel?: ClassificationLevel | number | null,
): string | null {
  const code = getSecurityLevel(classificationLevel);
  return code ? SECURITY_LEVEL_LABELS[code] : null;
}

export function getSecurityLevelDescription(
  classificationLevel?: ClassificationLevel | number | null,
): string | null {
  if (!classificationLevel) return null;
  const fromTable = descriptionByClass[classificationLevel];
  if (fromTable) return fromTable;
  const code = getSecurityLevel(classificationLevel);
  return code ? SL_DEFAULT_DESCRIPTIONS[code] : null;
}

/**
 * Single matching rule shared with the database function get_applicable_requirements:
 * IEC requirements (those with an Annex B security level) are gated by the target SL,
 * all other requirements by the classification level.
 */
export function requirementAppliesToLevel(
  requirement: { sl_capability?: number | null; min_classification_level?: number | null },
  classificationLevel?: number | null,
): boolean {
  const level = classificationLevel ?? 1;
  if (requirement.sl_capability != null) {
    return getTargetSecurityLevel(level) >= requirement.sl_capability;
  }
  return level >= (requirement.min_classification_level ?? 1);
}
