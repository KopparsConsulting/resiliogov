import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { fetchAllRows } from '@/lib/fetchAll';

export interface RequirementReview {
  id: string;
  requirement_id: string;
  status: 'pending' | 'approved' | 'flagged';
  reviewed_by: string;
  comment: string | null;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  requirement_id: string;
  action: string;
  changed_by: string;
  old_value: unknown;
  new_value: unknown;
  created_at: string;
}

/**
 * Aktuell granskningsstatus per krav (vyn requirement_review_status).
 * approved – godkänt och oförändrat sedan dess
 * changed  – godkänt, men kravets innehåll har ändrats sedan – granskas igen
 * flagged  – flaggat för ändring
 * pending  – ogranskat
 */
export type ReviewState = 'approved' | 'changed' | 'flagged' | 'pending';

export interface ReviewStatusRow {
  requirement_id: string;
  review_state: ReviewState;
  last_status: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  comment: string | null;
  batch_id: string | null;
}

export const REVIEW_STATE_LABELS: Record<ReviewState, string> = {
  approved: 'Godkänd',
  changed: 'Ändrad sedan godkännande',
  flagged: 'Flaggad',
  pending: 'Ogranskad',
};

export function useReviewStatus() {
  return useQuery({
    queryKey: ['requirement-review-status'],
    queryFn: async (): Promise<Map<string, ReviewStatusRow>> => {
      const { data, error } = await fetchAllRows(() => supabase
        .from('requirement_review_status')
        .select('*')
        .order('requirement_id'));
      if (error) throw error;
      return new Map((data || []).map((r) => [r.requirement_id as string, r as ReviewStatusRow]));
    },
  });
}

/** Behöver granskas: ogranskat, flaggat eller ändrat sedan godkännandet */
export function needsReview(status: ReviewStatusRow | undefined): boolean {
  return !status || status.review_state !== 'approved';
}

export function useRequirementAuditLog(requirementId: string | null) {
  return useQuery({
    queryKey: ['requirement-audit-log', requirementId],
    enabled: !!requirementId,
    queryFn: async (): Promise<AuditLogEntry[]> => {
      const { data, error } = await fetchAllRows(() => supabase
        .from('requirement_audit_log')
        .select('*')
        .eq('requirement_id', requirementId!)
        .order('created_at', { ascending: false }));
      if (error) throw error;
      return (data || []) as AuditLogEntry[];
    },
  });
}

export interface ReviewDecision {
  requirementId: string;
  status: 'approved' | 'flagged' | 'pending';
  comment?: string;
}

/**
 * Sparar ett eller flera granskningsbeslut i en transaktion. Databasen sätter
 * granskare, tidpunkt och kontrollsumma av kravtexten.
 */
export function useSubmitReviews() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ decisions, batchId }: { decisions: ReviewDecision[]; batchId?: string | null }) => {
      const { data, error } = await supabase.rpc('submit_requirement_reviews', {
        _items: decisions.map((d) => ({ requirement_id: d.requirementId, status: d.status, comment: d.comment ?? null })),
        _batch_id: batchId ?? undefined,
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: () => {
      for (const key of ['requirement-reviews', 'requirement-review-status', 'requirement-audit-log', 'requirement-review-page']) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
  });
}

/** Ett enskilt beslut (samma funktion som ovan) */
export function useSubmitReview() {
  const submit = useSubmitReviews();
  return {
    ...submit,
    mutate: (
      decision: ReviewDecision & { batchId?: string | null },
      options?: { onSuccess?: () => void; onError?: (e: Error) => void },
    ) => submit.mutate(
      { decisions: [decision], batchId: decision.batchId },
      { onSuccess: () => options?.onSuccess?.(), onError: (e) => options?.onError?.(e as Error) },
    ),
  };
}

export function useLogTriggerChange() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      requirementId,
      oldValue,
      newValue,
    }: {
      requirementId: string;
      oldValue: unknown;
      newValue: unknown;
    }) => {
      const email = profile?.email || 'unknown';
      const { error } = await supabase
        .from('requirement_audit_log')
        .insert({
          requirement_id: requirementId,
          action: 'trigger_logic_updated',
          changed_by: email,
          old_value: oldValue,
          new_value: newValue,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requirement-audit-log'] });
    },
  });
}
