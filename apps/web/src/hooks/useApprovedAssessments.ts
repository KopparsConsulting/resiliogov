import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ComplianceStatus } from '@/types/compliance';
import { fetchAllRows } from '@/lib/fetchAll';

export interface ApprovedAssessment {
  recordId: string;
  mappingId: string;
  systemId: string;
  requirementId: string;
  status: ComplianceStatus;
  assessedBy: string | null;
  assessedAt: string | null;
  validUntil: string | null;
}

/**
 * Compliance assessments that were approved from a test result.
 * Keyed by the test mapping that served as evidence.
 */
export function useApprovedAssessments() {
  return useQuery({
    queryKey: ['approved-assessments'],
    queryFn: async (): Promise<Map<string, ApprovedAssessment>> => {
      const { data, error } = await fetchAllRows(() => supabase
        .from('system_compliance_records')
        .select(
          'id, system_id, requirement_id, status, assessed_by, assessed_at, valid_until, verified_by_test_mapping_id'
        )
        .not('verified_by_test_mapping_id', 'is', null));

      if (error) throw error;

      return new Map(
        (data ?? []).map((record) => [
          record.verified_by_test_mapping_id as string,
          {
            recordId: record.id,
            mappingId: record.verified_by_test_mapping_id as string,
            systemId: record.system_id,
            requirementId: record.requirement_id,
            status: record.status as ComplianceStatus,
            assessedBy: record.assessed_by,
            assessedAt: record.assessed_at,
            validUntil: record.valid_until,
          },
        ])
      );
    },
  });
}
