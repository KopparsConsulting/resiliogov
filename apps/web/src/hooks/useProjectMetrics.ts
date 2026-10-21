import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { calculateMetrics, type ComplianceMetrics } from '@/lib/complianceMetrics';
import type { ComplianceStatus } from '@/types/compliance';
import { fetchAllRows } from '@/lib/fetchAll';

export interface ProjectMetrics extends ComplianceMetrics {
  scopeCount: number;
  plannedCount: number;
  unplannedCount: number;
}

/**
 * Coverage/compliance for a project's requirement scope, plus how much of the
 * scope that has at least one test activity.
 */
export function useProjectMetrics(projectId: string | undefined, systemId: string | null) {
  return useQuery({
    queryKey: ['project-metrics', projectId, systemId],
    enabled: !!projectId,
    queryFn: async (): Promise<ProjectMetrics> => {
      const { data: scope, error } = await fetchAllRows(() => supabase
        .from('project_requirements')
        .select('requirement_id, applicability')
        .eq('project_id', projectId as string));
      if (error) throw error;

      const requirementIds = (scope ?? []).map((row) => row.requirement_id);
      const scopeCount = requirementIds.length;

      const { data: mappings } = await fetchAllRows(() => supabase
        .from('requirement_test_mappings')
        .select('requirement_id')
        .eq('project_id', projectId as string));
      const planned = new Set((mappings ?? []).map((row) => row.requirement_id));
      const plannedCount = requirementIds.filter((id) => planned.has(id)).length;

      let records: Array<{ status: ComplianceStatus; valid_until: string | null }> = [];
      if (systemId && requirementIds.length > 0) {
        const { data } = await fetchAllRows(() => supabase
          .from('system_compliance_records')
          .select('status, valid_until')
          .eq('system_id', systemId)
          .in('requirement_id', requirementIds));
        records = (data ?? []) as typeof records;
      }

      return {
        ...calculateMetrics(records),
        scopeCount,
        plannedCount,
        unplannedCount: scopeCount - plannedCount,
      };
    },
  });
}
