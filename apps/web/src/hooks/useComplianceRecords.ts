import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ComplianceRecord, ComplianceStatus } from '@/types/compliance';
import { toast } from 'sonner';
import { fetchAllRows } from '@/lib/fetchAll';

export function useComplianceRecords(facilityId: string) {
  return useQuery({
    queryKey: ['compliance-records', facilityId],
    queryFn: async () => {
      const { data, error } = await fetchAllRows(() => supabase
        .from('compliance_records')
        .select(`
          *,
          requirements (
            *,
            requirement_sources (*)
          )
        `)
        .eq('facility_id', facilityId)
        .order('created_at', { ascending: true }));

      if (error) throw error;
      return data as ComplianceRecord[];
    },
    enabled: !!facilityId,
  });
}

export function useUpdateComplianceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      notes,
      evidence,
      evidence_url,
      justification,
      valid_until,
      assigned_role,
      verified_by_test_mapping_id,
    }: {
      id: string;
      status?: ComplianceStatus;
      notes?: string;
      evidence?: string;
      evidence_url?: string;
      justification?: string;
      valid_until?: string | null;
      assigned_role?: string;
      verified_by_test_mapping_id?: string | null;
    }) => {
      const updateData: Record<string, unknown> = {};
      if (status !== undefined) updateData.status = status;
      if (notes !== undefined) updateData.notes = notes;
      if (evidence !== undefined) updateData.evidence = evidence;
      if (evidence_url !== undefined) updateData.evidence_url = evidence_url;
      if (justification !== undefined) updateData.justification = justification;
      if (valid_until !== undefined) updateData.valid_until = valid_until;
      if (verified_by_test_mapping_id !== undefined) updateData.verified_by_test_mapping_id = verified_by_test_mapping_id;
      if (assigned_role !== undefined) updateData.assigned_role = assigned_role;
      if (status !== undefined && status !== 'Ej påbörjad') {
        updateData.assessed_at = new Date().toISOString();
        const { data: userData } = await supabase.auth.getUser();
        updateData.assessed_by = userData.user?.email ?? null;
      }

      const { data, error } = await supabase
        .from('compliance_records')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['compliance-records'] });
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      toast.success('Status uppdaterad');
    },
    onError: (error: { message?: string }) => {
      toast.error(error?.message || 'Kunde inte uppdatera status');
    },
  });
}

export function useRequirementSources() {
  return useQuery({
    queryKey: ['requirement-sources'],
    queryFn: async () => {
      const { data, error } = await fetchAllRows(() => supabase
        .from('requirement_sources')
        .select('*')
        .order('document_name'));

      if (error) throw error;
      return data;
    },
  });
}
