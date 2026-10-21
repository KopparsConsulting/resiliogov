import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAll';
import type { ComplianceStatus } from '@/types/compliance';
import type { AssessmentValues } from '@/components/compliance/StatusEditDialog';

export interface ComponentRequirementRecord {
  id: string;
  asset_id: string;
  requirement_id: string;
  profile_id: string | null;
  profile_item_id: string | null;
  status: ComplianceStatus;
  evidence: string | null;
  evidence_url: string | null;
  justification: string | null;
  inherited_justification: string | null;
  notes: string | null;
  assessed_by: string | null;
  assessed_at: string | null;
  valid_until: string | null;
  out_of_scope_since: string | null;
  out_of_scope_reason: string | null;
  chapter_section: string;
  description: string;
  sl_capability: number | null;
  profile_name: string | null;
  applicability: string | null;
}

/** Requirements a component inherits from the standard profile of its component type. */
export function useComponentRequirements(assetId: string | undefined) {
  return useQuery({
    queryKey: ['component-requirements', assetId],
    enabled: !!assetId,
    queryFn: async (): Promise<ComponentRequirementRecord[]> => {
      const { data, error } = await fetchAllRows(() => supabase
        .from('component_compliance_records')
        .select(`*, requirements(chapter_section, description, sl_capability),
          requirement_profiles(name), requirement_profile_items(applicability)`)
        .eq('asset_id', assetId as string)
        .order('created_at'));
      if (error) throw error;
      return (data ?? []).map((row: Record<string, any>) => ({
        ...row,
        chapter_section: row.requirements?.chapter_section ?? '',
        description: row.requirements?.description ?? '',
        sl_capability: row.requirements?.sl_capability ?? null,
        profile_name: row.requirement_profiles?.name ?? null,
        applicability: row.requirement_profile_items?.applicability ?? null,
      })) as ComponentRequirementRecord[];
    },
  });
}

export interface ComponentRequirementMetrics {
  system_id: string;
  component_count: number;
  total: number;
  assessed: number;
  not_applicable: number;
  fulfilled: number;
  expired: number;
  out_of_scope: number;
  coverage: number;
  compliance: number;
}

/** Component requirement metrics for one system (separate from the system's own requirements). */
export function useComponentRequirementMetrics(systemId: string | undefined) {
  return useQuery({
    queryKey: ['component-requirement-metrics', systemId],
    enabled: !!systemId,
    queryFn: async (): Promise<ComponentRequirementMetrics | null> => {
      const { data, error } = await supabase
        .from('component_requirement_metrics')
        .select('*')
        .eq('system_id', systemId as string)
        .maybeSingle();
      if (error) throw error;
      return (data as ComponentRequirementMetrics | null) ?? null;
    },
  });
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['component-requirements'] });
  queryClient.invalidateQueries({ queryKey: ['component-requirement-metrics'] });
}

export function useSyncComponentRequirements() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (assetId: string) => {
      const { data, error } = await supabase.rpc('sync_component_requirements', { _asset_id: assetId, _mode: 'full' });
      if (error) throw error;
      return (data ?? []) as { action: string }[];
    },
    onSuccess: (rows) => {
      invalidate(queryClient);
      const count = (action: string) => rows.filter((row) => row.action === action).length;
      const parts = [
        count('add') && `${count('add')} tillagda`,
        count('remove') && `${count('remove')} borttagna`,
        count('deactivate') && `${count('deactivate')} utanför omfattning`,
        count('refresh') && `${count('refresh')} uppdaterade`,
        count('reactivate') && `${count('reactivate')} återaktiverade`,
      ].filter(Boolean);
      toast.success(parts.length ? `Krav synkade: ${parts.join(', ')}` : 'Kraven är redan synkade');
    },
    onError: (error: { message?: string }) => toast.error(error?.message || 'Kunde inte synka kraven'),
  });
}

export function useUpdateComponentAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: AssessmentValues }) => {
      const { error } = await supabase
        .from('component_compliance_records')
        .update({
          status: values.status,
          justification: values.justification.trim() || null,
          evidence: values.evidence.trim() || null,
          evidence_url: values.evidence_url.trim() || null,
          valid_until: values.valid_until || null,
          notes: values.notes.trim() || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate(queryClient);
      toast.success('Bedömningen sparad');
    },
    onError: (error: { message?: string }) => toast.error(error?.message || 'Kunde inte spara bedömningen'),
  });
}

export function useSetAssetComponentType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ assetId, componentTypeId }: { assetId: string; componentTypeId: string | null }) => {
      // The database syncs the component's requirements when its type changes.
      const { error } = await supabase
        .from('system_assets')
        .update({ component_type_id: componentTypeId })
        .eq('id', assetId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-assets'] });
      invalidate(queryClient);
      toast.success('Komponenttyp sparad och krav synkade');
    },
    onError: (error: { message?: string }) => toast.error(error?.message || 'Kunde inte spara komponenttypen'),
  });
}
