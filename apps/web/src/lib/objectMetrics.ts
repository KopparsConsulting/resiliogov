import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAll';
import { metricsFromRow, type ComplianceMetrics, type MetricsRow } from '@/lib/complianceMetrics';

export interface ObjectMetrics extends ComplianceMetrics {
  /** Krav inom omfattningen som kräver åtgärd (samma som needsAction) */
  needsAction: number;
}

const EMPTY: MetricsRow = {
  total: 0, assessed: 0, not_applicable: 0, fulfilled: 0, expired: 0,
  out_of_scope: 0, coverage: 0, compliance: null, needs_action: 0,
};

export function objectMetricsFromRow(row: MetricsRow | null | undefined): ObjectMetrics {
  return { ...metricsFromRow(row ?? EMPTY), needsAction: row?.needs_action ?? 0 };
}

/**
 * Mått per objekt från databasvyn compliance_object_metrics – en fråga för
 * alla objekt i stället för en fråga per anläggning eller system.
 * Objekt utan poster saknas i vyn och får tomma mått via get().
 */
export async function fetchObjectMetrics(
  objectType: 'facility' | 'system',
  objectIds?: string[],
): Promise<{ get: (id: string) => ObjectMetrics }> {
  const map = new Map<string, ObjectMetrics>();
  if (!objectIds || objectIds.length > 0) {
    const { data, error } = await fetchAllRows(() => {
      const q = supabase.from('compliance_object_metrics').select('*').eq('object_type', objectType);
      return objectIds ? q.in('object_id', objectIds) : q;
    }, { stableOrderColumn: 'object_id' });
    if (error) throw error;
    for (const row of data || []) {
      if (row.object_id) map.set(row.object_id, objectMetricsFromRow(row));
    }
  }
  return { get: (id: string) => map.get(id) ?? objectMetricsFromRow(null) };
}

export interface FacilityRollupMetrics extends ObjectMetrics {
  /** Krav på anläggningen själv */
  ownTotal: number;
  /** Krav på kopplade system */
  systemsTotal: number;
  linkedSystems: number;
}

/**
 * Anläggningens mått INKLUSIVE kopplade system (vyn facility_rollup_metrics).
 * Det är så anläggningar redovisas i appen: det mesta arbetet ligger på
 * systemen. Ett system kopplat till flera anläggningar räknas i var och en.
 */
export async function fetchFacilityRollup(
  facilityIds?: string[],
): Promise<{ get: (id: string) => FacilityRollupMetrics }> {
  const map = new Map<string, FacilityRollupMetrics>();
  if (!facilityIds || facilityIds.length > 0) {
    const { data, error } = await fetchAllRows(() => {
      const q = supabase.from('facility_rollup_metrics').select('*');
      return facilityIds ? q.in('facility_id', facilityIds) : q;
    }, { stableOrderColumn: 'facility_id' });
    if (error) throw error;
    for (const row of data || []) {
      if (!row.facility_id) continue;
      map.set(row.facility_id, {
        ...objectMetricsFromRow(row),
        ownTotal: row.own_total ?? 0,
        systemsTotal: row.systems_total ?? 0,
        linkedSystems: row.linked_systems ?? 0,
      });
    }
  }
  const empty: FacilityRollupMetrics = { ...objectMetricsFromRow(null), ownTotal: 0, systemsTotal: 0, linkedSystems: 0 };
  return { get: (id: string) => map.get(id) ?? empty };
}
