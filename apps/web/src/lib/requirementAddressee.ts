/**
 * Mottagare och mätskala för regelverk och krav.
 *
 * Själva matchningen mot tillgångar sker i databasen
 * (requirement_addresses_asset). Här finns bara etiketter och samma regel
 * för att filtrera bort leverantörs-/organisationskrav ur kravförslag.
 */
export const ADDRESSEES = ['asset', 'supplier', 'asset_owner'] as const;
export type RequirementAddressee = typeof ADDRESSEES[number];

export const ADDRESSEE_LABELS: Record<RequirementAddressee, string> = {
  asset: 'Tillgångskrav',
  supplier: 'Leverantörskrav',
  asset_owner: 'Organisationskrav',
};

export const ADDRESSEE_DESCRIPTIONS: Record<RequirementAddressee, string> = {
  asset: 'Gäller en tillgång: anläggning, system eller komponent',
  supplier: 'Gäller leverantörens process (t.ex. IEC 62443-4-1)',
  asset_owner: 'Gäller den egna organisationen som tillgångsägare (t.ex. IEC 62443-2-1)',
};

export const MEASURE_SCALES = ['security_level', 'maturity_level', 'none'] as const;
export type MeasureScale = typeof MEASURE_SCALES[number];

export const MEASURE_SCALE_LABELS: Record<MeasureScale, string> = {
  security_level: 'Security Level (SL 1–4)',
  maturity_level: 'Maturity Level (ML 1–4)',
  none: 'Ingen skala',
};

export const MEASURE_SCALE_SHORT: Record<MeasureScale, string | null> = {
  security_level: 'SL',
  maturity_level: 'ML',
  none: null,
};

export const TARGET_TYPE_LABELS: Record<string, string> = {
  facility: 'Anläggning',
  system: 'System',
  both: 'Anl./system',
  component: 'Komponent',
  supplier: 'Leverantör',
  asset_owner: 'Organisation',
};

/** Effektiv mottagare för ett krav: källans mottagare, eller kravets måltyp för leverantör/organisation. */
export function effectiveAddressee(
  sourceAddressee: RequirementAddressee | null | undefined,
  targetType: string | null | undefined,
): RequirementAddressee {
  if (targetType === 'supplier') return 'supplier';
  if (targetType === 'asset_owner') return 'asset_owner';
  return sourceAddressee ?? 'asset';
}

export function addressesAsset(
  sourceAddressee: RequirementAddressee | null | undefined,
  targetType: string | null | undefined,
) {
  return effectiveAddressee(sourceAddressee, targetType) === 'asset';
}
