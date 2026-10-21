import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAll';
import type { SystemClassificationRow } from '@/types/system';

/**
 * Systemklassen enligt databasen (vyn system_classification). Samma regel som
 * kravmotorn: högsta klassen bland kopplade anläggningar, egen klass eller en
 * motiverad avvikelse nedåt.
 */
export async function fetchSystemClassifications(
  systemIds?: string[],
): Promise<Map<string, SystemClassificationRow>> {
  if (systemIds && systemIds.length === 0) return new Map();
  const { data, error } = await fetchAllRows(() => {
    const q = supabase.from('system_classification').select('*');
    return systemIds ? q.in('system_id', systemIds) : q;
  }, { stableOrderColumn: 'system_id' });
  if (error) throw error;
  const map = new Map<string, SystemClassificationRow>();
  for (const row of (data || []) as SystemClassificationRow[]) {
    map.set(row.system_id, row);
  }
  return map;
}

export function useSystemClassification(systemId: string | undefined) {
  return useQuery({
    queryKey: ['system-classification', systemId],
    queryFn: async () => {
      const map = await fetchSystemClassifications([systemId!]);
      return map.get(systemId!) ?? null;
    },
    enabled: !!systemId,
  });
}

export interface RequirementSyncPending {
  additions: number;
  removals: number;
  deactivations: number;
  reactivations: number;
}

/**
 * Hur många kravändringar som väntar på granskning för ett objekt. Nya krav
 * läggs till automatiskt i databasen; borttagning och återaktivering kräver
 * att någon granskar dem i dialogen "Uppdatera krav".
 */
export function useRequirementSyncPending(objectType: 'facility' | 'system', objectId: string | undefined) {
  return useQuery({
    queryKey: ['requirement-sync-pending', objectType, objectId],
    queryFn: async (): Promise<RequirementSyncPending> => {
      const { data, error } = await supabase.rpc('requirement_sync_pending', {
        _object_type: objectType,
        _object_id: objectId!,
      });
      if (error) throw error;
      const row = (data || [])[0];
      return {
        additions: row?.additions ?? 0,
        removals: row?.removals ?? 0,
        deactivations: row?.deactivations ?? 0,
        reactivations: row?.reactivations ?? 0,
      };
    },
    enabled: !!objectId,
  });
}
