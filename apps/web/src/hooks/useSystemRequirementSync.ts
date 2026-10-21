import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { syncRequirements, fetchApplicableRequirementIds, type SyncRow } from '@/lib/requirementEngine';
import { toast } from 'sonner';

export interface SyncRequirementSummary {
  requirementId: string;
  recordId?: string;
  chapterSection: string;
  description: string;
  minClassificationLevel: number | null;
}

export interface RequirementSyncPlan {
  effectiveLevel: number;
  totalApplicable: number;
  additions: SyncRequirementSummary[];
  /** Inget registrerat arbete – tas bort */
  removals: SyncRequirementSummary[];
  /** Har registrerat arbete – flyttas utanför omfattningen, bedömningen bevaras */
  deactivations: SyncRequirementSummary[];
  /** Låg utanför omfattningen men gäller igen – återaktiveras med sin bedömning */
  reactivations: SyncRequirementSummary[];
}

const toSummary = (row: SyncRow): SyncRequirementSummary => ({
  requirementId: row.requirementId,
  recordId: row.recordId ?? undefined,
  chapterSection: row.chapterSection || '—',
  description: row.description || 'Okänt krav',
  minClassificationLevel: row.minClassificationLevel,
});

/**
 * Förhandsvisning av synken. Beräknas av kravmotorn i databasen – samma
 * funktion som sedan utför synken, så planen och resultatet kan inte skilja
 * sig åt i logik.
 */
export async function buildRequirementSyncPlan(systemId: string): Promise<RequirementSyncPlan> {
  const [preview, applicable, levelRes] = await Promise.all([
    syncRequirements('system', systemId, 'preview'),
    fetchApplicableRequirementIds('system', systemId),
    supabase.rpc('effective_system_class', { _system_id: systemId }),
  ]);
  if (levelRes.error) throw levelRes.error;

  return {
    effectiveLevel: levelRes.data ?? 1,
    totalApplicable: applicable.length,
    additions: preview.added.map(toSummary),
    removals: preview.removed.map(toSummary),
    deactivations: preview.deactivated.map(toSummary),
    reactivations: preview.reactivated.map(toSummary),
  };
}

export function useRequirementSyncPlan(systemId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['system-requirement-sync-plan', systemId],
    queryFn: () => buildRequirementSyncPlan(systemId),
    enabled: enabled && !!systemId,
    staleTime: 0,
  });
}

export function useApplyRequirementSync() {
  const queryClient = useQueryClient();

  return useMutation({
    // Planen i dialogen är bara en förhandsvisning. Synken räknas om och
    // utförs i en enda databastransaktion, så arbete som registrerats efter
    // att dialogen öppnades aldrig raderas.
    mutationFn: async ({ systemId }: { systemId: string; plan?: RequirementSyncPlan }) =>
      syncRequirements('system', systemId, 'full'),
    onSuccess: (result, { systemId }) => {
      queryClient.invalidateQueries({ queryKey: ['system-compliance-records', systemId] });
      queryClient.invalidateQueries({ queryKey: ['system-requirement-sync-plan', systemId] });
      queryClient.invalidateQueries({ queryKey: ['information-systems'] });
      queryClient.invalidateQueries({ queryKey: ['facility-systems'] });
      queryClient.invalidateQueries({ queryKey: ['requirement-sync-pending', 'system', systemId] });
      const parts = [
        result.added.length ? `${result.added.length} tillagda` : null,
        result.removed.length ? `${result.removed.length} borttagna` : null,
        result.deactivated.length ? `${result.deactivated.length} utanför omfattningen` : null,
        result.reactivated.length ? `${result.reactivated.length} återaktiverade` : null,
      ].filter(Boolean);
      toast.success(parts.length ? `Kraven synkade: ${parts.join(', ')}` : 'Kraven är redan i synk');
    },
    onError: (error) => {
      console.error('Requirement sync error:', error);
      toast.error('Kunde inte synkronisera kraven');
    },
  });
}
