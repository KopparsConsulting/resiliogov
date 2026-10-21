/**
 * IEC 62443 Foundational Requirements (FR 1–7). The FR number is read from the
 * requirement code, e.g. "CR 1.4", "SR 2.1 RE 1", "EDR 3.2".
 */
export const FR_LABELS: Record<number, string> = {
  1: 'FR 1 – Identifiering och autentisering',
  2: 'FR 2 – Användningskontroll',
  3: 'FR 3 – Systemintegritet',
  4: 'FR 4 – Datakonfidentialitet',
  5: 'FR 5 – Begränsat dataflöde',
  6: 'FR 6 – Snabb respons på händelser',
  7: 'FR 7 – Resurstillgänglighet',
};

export function functionalRequirementOf(code: string): number | null {
  const match = code.match(/\b(?:CR|SR|EDR|HDR|NDR|SAR|FR)\s*(\d+)(?:\.\d+)?/i);
  if (!match) return null;
  const value = Number(match[1]);
  return value >= 1 && value <= 7 ? value : null;
}

export function functionalRequirementLabel(fr: number | null) {
  return fr == null ? 'Övriga krav' : FR_LABELS[fr];
}

/** Natural sort for requirement codes ("CR 1.10" after "CR 1.9"). */
export function compareRequirementCodes(a: string, b: string) {
  return a.localeCompare(b, 'sv', { numeric: true });
}
