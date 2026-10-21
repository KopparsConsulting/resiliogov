import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTestMappings, type TestMappingWithDetails } from '@/hooks/useTestMappings';
import { useUpdateSystemComplianceStatus } from '@/hooks/useSystemComplianceStatus';
import { logActivity } from '@/hooks/useActivityLog';
import { defaultValidUntil } from '@/lib/complianceMetrics';
import type { ComplianceStatus } from '@/types/compliance';
import { fetchAllRows } from '@/lib/fetchAll';

export interface Suggestion {
  mapping: TestMappingWithDetails;
  recordId: string;
  currentStatus: ComplianceStatus;
  suggestedStatus: ComplianceStatus;
}

function suggestedStatusFor(mapping: TestMappingWithDetails): ComplianceStatus {
  if (mapping.result_status === 'failed') return 'Ej uppfyllt';
  if (mapping.result_status === 'passed_with_remarks') return 'Delvis uppfyllt';
  return 'Uppfyllt';
}

/** Pending suggestions keyed by test mapping id. Never applied automatically. */
export function useSuggestions() {
  const { data: mappings } = useTestMappings();

  const candidates = useMemo(
    () =>
      (mappings ?? []).filter(
        (mapping) =>
          mapping.system_id &&
          !mapping.suggestion_dismissed_at &&
          (mapping.result_status === 'passed' || mapping.result_status === 'passed_with_remarks'
            ? !!(mapping.evidence_url || mapping.evidence_file_name || mapping.evidence)
            : mapping.result_status === 'failed')
      ),
    [mappings]
  );

  return useQuery({
    queryKey: ['test-result-suggestions', candidates.map((c) => `${c.id}:${c.result_status}`).join(',')],
    enabled: candidates.length > 0,
    queryFn: async (): Promise<Map<string, Suggestion>> => {
      const { data, error } = await fetchAllRows(() => supabase
        .from('system_compliance_records')
        .select('id, system_id, requirement_id, status, verified_by_test_mapping_id')
        .in('system_id', Array.from(new Set(candidates.map((c) => c.system_id as string)))));
      if (error) throw error;

      const recordByKey = new Map(
        (data ?? []).map((record) => [`${record.system_id}-${record.requirement_id}`, record])
      );

      const suggestions = new Map<string, Suggestion>();
      for (const mapping of candidates) {
        const record = recordByKey.get(`${mapping.system_id}-${mapping.requirement_id}`);
        if (!record) continue;
        const suggestedStatus = suggestedStatusFor(mapping);
        if (record.status === suggestedStatus && record.verified_by_test_mapping_id === mapping.id) continue;
        suggestions.set(mapping.id, {
          mapping,
          recordId: record.id,
          currentStatus: record.status as ComplianceStatus,
          suggestedStatus,
        });
      }
      return suggestions;
    },
  });
}

/** Stores who dismissed a suggestion, when and why — or clears an earlier dismissal (reason = null). */
export function useDismissSuggestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ mappingId, reason, label }: { mappingId: string; reason: string | null; label?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email ?? null;
      const { error } = await supabase
        .from('requirement_test_mappings')
        .update({
          suggestion_dismissed_at: reason ? new Date().toISOString() : null,
          suggestion_dismissed_by: reason ? email : null,
          suggestion_dismiss_reason: reason,
        })
        .eq('id', mappingId);
      if (error) throw error;
      await logActivity({
        action: reason ? 'dismiss_test_suggestion' : 'restore_test_suggestion',
        entity_type: 'requirement_test_mapping',
        entity_id: mappingId,
        entity_label: label ?? null,
        metadata: reason ? { reason } : {},
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['test-mappings'] });
      queryClient.invalidateQueries({ queryKey: ['test-result-suggestions'] });
      toast.success(variables.reason ? 'Förslaget avfärdat' : 'Förslaget återställt');
    },
    onError: (error: { message?: string }) => toast.error(error?.message || 'Kunde inte spara beslutet'),
  });
}

/** Approves a suggestion as the formal assessment on the system requirement. */
export function useApproveSuggestion() {
  const updateStatus = useUpdateSystemComplianceStatus();
  const queryClient = useQueryClient();

  const approve = (suggestion: Suggestion) => {
    const { mapping } = suggestion;
    updateStatus.mutate(
      {
        id: suggestion.recordId,
        status: suggestion.suggestedStatus,
        verified_by_test_mapping_id: mapping.id,
        evidence_url: mapping.evidence_url ?? undefined,
        evidence: mapping.evidence ?? `Testmappning ${mapping.test_phase ?? ''}`.trim(),
        valid_until: defaultValidUntil(),
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['test-result-suggestions'] });
          queryClient.invalidateQueries({ queryKey: ['approved-assessments'] });
          logActivity({
            action: 'approve_test_suggestion',
            entity_type: 'system_compliance_record',
            entity_id: suggestion.recordId,
            entity_label: `${mapping.requirement_chapter ?? ''} · ${mapping.system_name ?? ''}`.trim(),
            metadata: {
              from_status: suggestion.currentStatus,
              to_status: suggestion.suggestedStatus,
              test_mapping_id: mapping.id,
              test_phase: mapping.test_phase,
              test_result: mapping.result_status,
            },
          });
        },
      }
    );
  };

  return { approve, isPending: updateStatus.isPending };
}
