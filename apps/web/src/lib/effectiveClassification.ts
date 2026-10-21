import type { ClassificationLevel } from '@/types/compliance';
import { getSecurityLevel, getSecurityLevelLabel, type SecurityLevelCode } from '@/lib/securityLevel';
import type { ClassificationSource, PrimaryFacility, SystemClassificationRow } from '@/types/system';

/**
 * A system's effective classification.
 *
 * Regeln finns i databasen (effective_system_class / vyn system_classification)
 * och är densamma som kravmotorn använder:
 *   överstyrd -> den överstyrda (lägre) klassen
 *   egen      -> högsta av egen klass och ärvd klass
 *   ärvd      -> HÖGSTA klassen bland kopplade anläggningar (inte bara primär)
 *
 * Skicka med raden från vyn (tredje argumentet) överallt där systemet redan
 * finns. Utan den används en lokal förhandsvisning – bara för guiden, där
 * systemet ännu inte är sparat och bara har en anläggning.
 */
export interface EffectiveClassification {
  source: ClassificationSource;
  /** 1-5, or null when the system has no classification at all */
  classificationLevel: ClassificationLevel | null;
  securityLevel: SecurityLevelCode | null;
  securityLevelLabel: string | null;
  isCriticalEntity: boolean;
  ownerType: string | null;
  /** Anläggningen som styr klassen (högst klass bland kopplade) */
  facilityId: string | null;
  facilityName: string | null;
  /** Antal kopplade anläggningar (okänt i förhandsvisningen) */
  linkedFacilities: number | null;
  /** true when the system deviates from its primary facility's class */
  isDeviation: boolean;
  overrideReason: string | null;
  /** true when neither an inherited nor an own classification exists */
  isMissing: boolean;
}

export interface ClassifiableSystem {
  classification_source?: ClassificationSource | null;
  facility_class_override?: number | null;
  override_reason?: string | null;
  is_critical_entity?: boolean | null;
  owner_type?: string | null;
  own_classification_level?: number | null;
}

function asLevel(level: number | null | undefined): ClassificationLevel | null {
  return level && level >= 1 && level <= 5 ? (level as ClassificationLevel) : null;
}

export function getEffectiveClassification(
  system: ClassifiableSystem,
  primaryFacility?: PrimaryFacility | null,
  db?: SystemClassificationRow | null,
): EffectiveClassification {
  if (db) {
    const level = db.is_missing ? null : asLevel(db.effective_level);
    const fromFacility = db.source !== 'own' || (db.inherited_level ?? 0) >= (db.own_level ?? 0);
    return {
      source: db.source,
      classificationLevel: level,
      securityLevel: getSecurityLevel(level),
      securityLevelLabel: getSecurityLevelLabel(level),
      isCriticalEntity: primaryFacility?.is_critical_entity ?? !!system.is_critical_entity,
      ownerType: primaryFacility?.owner_type ?? system.owner_type ?? null,
      facilityId: fromFacility ? db.driving_facility_id : null,
      facilityName: fromFacility ? db.driving_facility_name : null,
      linkedFacilities: db.linked_facilities,
      isDeviation: db.is_deviation,
      overrideReason: db.override_reason,
      isMissing: db.is_missing,
    };
  }

  const source: ClassificationSource = system.classification_source ?? 'own';

  if (source === 'overridden' && system.facility_class_override) {
    const level = system.facility_class_override as ClassificationLevel;
    return {
      source,
      classificationLevel: level,
      securityLevel: getSecurityLevel(level),
      securityLevelLabel: getSecurityLevelLabel(level),
      isCriticalEntity: !!system.is_critical_entity,
      ownerType: system.owner_type ?? null,
      facilityId: primaryFacility?.id ?? null,
      facilityName: primaryFacility?.name ?? null,
      linkedFacilities: null,
      isDeviation: true,
      overrideReason: system.override_reason ?? null,
      isMissing: false,
    };
  }

  if (source === 'inherited' && primaryFacility) {
    const level = (primaryFacility.classification_level ?? null) as ClassificationLevel | null;
    return {
      source,
      classificationLevel: level,
      securityLevel: getSecurityLevel(level),
      securityLevelLabel: getSecurityLevelLabel(level),
      isCriticalEntity: !!primaryFacility.is_critical_entity,
      ownerType: primaryFacility.owner_type ?? null,
      facilityId: primaryFacility.id,
      facilityName: primaryFacility.name,
      linkedFacilities: null,
      isDeviation: false,
      overrideReason: null,
      isMissing: level === null,
    };
  }

  const ownLevel = asLevel(system.own_classification_level);
  return {
    source: 'own',
    classificationLevel: ownLevel,
    securityLevel: getSecurityLevel(ownLevel),
    securityLevelLabel: getSecurityLevelLabel(ownLevel),
    isCriticalEntity: !!system.is_critical_entity,
    ownerType: system.owner_type ?? null,
    facilityId: null,
    facilityName: null,
    linkedFacilities: null,
    isDeviation: false,
    overrideReason: null,
    isMissing: ownLevel === null,
  };
}

export const CLASSIFICATION_SOURCE_LABELS: Record<ClassificationSource, string> = {
  inherited: 'Ärvd',
  own: 'Egen klassificering',
  overridden: 'Överstyrd',
};
