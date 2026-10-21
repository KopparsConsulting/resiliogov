import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ComplianceStatus } from '@/types/compliance';

export interface SystemAssessmentUpdate {
  id: string;
  status?: ComplianceStatus;
  notes?: string;
  evidence?: string;
  evidence_url?: string;
  justification?: string;
  valid_until?: string | null;
  verified_by_test_mapping_id?: string | null;
}

/** Saves an assessment on a system compliance record, including evidence and validity. */
export function useUpdateSystemComplianceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...fields }: SystemAssessmentUpdate) => {
      const updateData: Record<string, unknown> = { ...fields };

      if (fields.status !== undefined && fields.status !== 'Ej påbörjad') {
        updateData.assessed_at = new Date().toISOString();
        const { data: userData } = await supabase.auth.getUser();
        updateData.assessed_by = userData.user?.email ?? null;
      }

      const { data, error } = await supabase
        .from('system_compliance_records')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-compliance-records'] });
      queryClient.invalidateQueries({ queryKey: ['information-systems'] });
      toast.success('Bedömning sparad');
    },
    onError: (error: { message?: string }) => {
      toast.error(error?.message || 'Kunde inte spara bedömningen');
    },
  });
}
