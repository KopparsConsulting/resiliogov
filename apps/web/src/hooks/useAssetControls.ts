import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AssetControl, AssetComplianceRecord, TriggerLogic, ControlCategory } from '@/types/asset';
import { getApplicableControls, getAssetWarnings, calculateComplianceSummary } from '@/lib/assetControlMatcher';
import { fetchAllRows } from '@/lib/fetchAll';

// Fetch all asset controls with source requirement info
export function useAssetControls() {
  return useQuery({
    queryKey: ['asset-controls'],
    queryFn: async () => {
      const { data, error } = await fetchAllRows(() => supabase
        .from('asset_controls')
        .select(`
          *,
          source_requirement:requirements(
            id,
            chapter_section,
            description,
            source:requirement_sources(document_name)
          )
        `)
        .order('priority', { ascending: true }));

      if (error) throw error;
      
      return (data || []).map(item => ({
        ...item,
        control_category: item.control_category as ControlCategory,
        trigger_logic: item.trigger_logic as TriggerLogic | null,
      })) as AssetControl[];
    },
  });
}

// Fetch compliance records for a specific asset
export function useAssetComplianceRecords(assetId: string | undefined) {
  return useQuery({
    queryKey: ['asset-compliance-records', assetId],
    queryFn: async () => {
      if (!assetId) return [];

      const { data, error } = await fetchAllRows(() => supabase
        .from('asset_compliance_records')
        .select(`
          *,
          control:asset_controls(
            id,
            name,
            description,
            control_category,
            is_automated_check,
            source_requirement:requirements(
              id,
              chapter_section,
              description,
              source:requirement_sources(document_name)
            )
          )
        `)
        .eq('asset_id', assetId)
        .order('created_at', { ascending: true }));

      if (error) throw error;
      return data as unknown as AssetComplianceRecord[];
    },
    enabled: !!assetId,
  });
}

// Update or create a compliance record
export function useUpsertAssetCompliance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assetId,
      controlId,
      status,
      evidence,
      verifiedBy,
      notes,
    }: {
      assetId: string;
      controlId: string;
      status: 'Ej påbörjad' | 'Pågående' | 'Delvis uppfyllt' | 'Uppfyllt' | 'Ej uppfyllt' | 'Ej tillämpligt';
      evidence?: string;
      verifiedBy?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('asset_compliance_records')
        .upsert(
          {
            asset_id: assetId,
            control_id: controlId,
            status,
            evidence,
            verified_by: verifiedBy,
            verified_at: status === 'Uppfyllt' ? new Date().toISOString() : null,
            notes,
          },
          { onConflict: 'asset_id,control_id' }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['asset-compliance-records', variables.assetId] 
      });
      queryClient.invalidateQueries({ queryKey: ['asset-compliance-summary'] });
    },
  });
}

// Initialize compliance records for an asset based on applicable controls
export function useInitializeAssetCompliance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assetId,
      controlIds,
    }: {
      assetId: string;
      controlIds: string[];
    }) => {
      // Get existing records to avoid duplicates
      const { data: existing } = await fetchAllRows(() => supabase
        .from('asset_compliance_records')
        .select('control_id')
        .eq('asset_id', assetId));

      const existingControlIds = new Set((existing || []).map(r => r.control_id));
      const newControlIds = controlIds.filter(id => !existingControlIds.has(id));

      if (newControlIds.length === 0) return [];

      const records = newControlIds.map(controlId => ({
        asset_id: assetId,
        control_id: controlId,
        status: 'Ej påbörjad' as const,
      }));

      const { data, error } = await supabase
        .from('asset_compliance_records')
        .insert(records)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['asset-compliance-records', variables.assetId] 
      });
    },
  });
}

// Get compliance summary across all assets (for dashboard)
export function useAssetComplianceSummary() {
  return useQuery({
    queryKey: ['asset-compliance-summary'],
    queryFn: async () => {
      const { data, error } = await fetchAllRows(() => supabase
        .from('asset_compliance_records')
        .select(`
          status,
          asset:system_assets(
            id,
            criticality
          )
        `));

      if (error) throw error;

      const records = data || [];
      const summary = calculateComplianceSummary(records);

      // Count by criticality
      const criticalRecords = records.filter(
        r => (r.asset as any)?.criticality === 'critical'
      );
      const criticalSummary = calculateComplianceSummary(criticalRecords);

      return {
        overall: summary,
        critical: criticalSummary,
        totalAssets: new Set(records.map(r => (r.asset as any)?.id)).size,
      };
    },
  });
}

// Hook to get applicable controls for an asset with context
export function useApplicableControls(
  assetId: string | undefined,
  systemId: string | undefined
) {
  const { data: allControls } = useAssetControls();

  return useQuery({
    queryKey: ['applicable-controls', assetId, systemId],
    queryFn: async () => {
      if (!assetId || !systemId || !allControls) return [];

      // Fetch asset with system info
      const { data: asset, error: assetError } = await supabase
        .from('system_assets')
        .select(`
          *,
          system:information_systems(
            id,
            name,
            is_critical_entity,
            system_category
          )
        `)
        .eq('id', assetId)
        .single();

      if (assetError || !asset) return [];

      // Fetch facility criticality through system relationship
      const { data: facilityLinks } = await fetchAllRows(() => supabase
        .from('facility_systems')
        .select(`
          facility:facilities(is_critical_entity)
        `)
        .eq('system_id', systemId));

      const facilityIsCritical = facilityLinks?.some(
        link => (link.facility as any)?.is_critical_entity
      ) || false;

      const context = {
        asset: {
          ...asset,
          system: asset.system as any,
        },
        systemIsCritical: (asset.system as any)?.is_critical_entity || false,
        facilityIsCritical,
        systemCategory: (asset.system as any)?.system_category || null,
      };

      return getApplicableControls(allControls, context);
    },
    enabled: !!assetId && !!systemId && !!allControls,
  });
}

export { getAssetWarnings, calculateComplianceSummary };
