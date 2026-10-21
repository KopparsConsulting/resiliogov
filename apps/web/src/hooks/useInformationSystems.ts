import { fetchObjectMetrics } from '@/lib/objectMetrics';
import { fetchSystemClassifications } from '@/hooks/useSystemClassification';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { 
  InformationSystem, 
  InformationSystemWithCompliance, 
  SystemFormData,
  SystemComplianceRecord,
  FacilitySystem,
  SystemAsset,
  PrimaryFacility,
} from '@/types/system';
import { syncRequirements, fetchApplicableRequirementIds } from '@/lib/requirementEngine';
import { toast } from 'sonner';
import { fetchAllRows } from '@/lib/fetchAll';
export function useInformationSystems() {
  return useQuery({
    queryKey: ['information-systems'],
    queryFn: async () => {
      // Fem frågor totalt, oavsett antal system (tidigare tre frågor per system)
      const [systemsResult, linksResult, assetsResult, metrics, classifications] = await Promise.all([
        fetchAllRows(() => supabase
          .from('information_systems')
          .select('*')
          .order('created_at', { ascending: false })),
        fetchAllRows(() => supabase
          .from('facility_systems')
          .select('id, system_id, is_primary, facilities(id, name, type, classification_level, is_critical_entity, owner_type)')),
        fetchAllRows(() => supabase.from('system_assets').select('id, system_id')),
        fetchObjectMetrics('system'),
        fetchSystemClassifications(),
      ]);

      if (systemsResult.error) throw systemsResult.error;
      if (linksResult.error) throw linksResult.error;
      if (assetsResult.error) throw assetsResult.error;

      const linksBySystem = groupBy(linksResult.data || [], l => l.system_id);
      const assetCount = countBy(assetsResult.data || [], a => a.system_id);

      return (systemsResult.data || []).map((system) => {
        const m = metrics.get(system.id);
        const links = linksBySystem.get(system.id) || [];
        const primaryLink = links.find(l => l.is_primary) || null;

        return {
          ...system,
          compliance_score: m.compliance ?? 0,
          coverage: m.coverage,
          compliance: m.compliance,
          assessed_count: m.assessed,
          fulfilled_count: m.fulfilled,
          not_applicable_count: m.notApplicable,
          open_requirements: m.needsAction,
          total_requirements: m.total,
          linked_facilities: links.length,
          assets_count: assetCount.get(system.id) || 0,
          primary_facility: (primaryLink?.facilities as PrimaryFacility | null) || null,
          classification: classifications.get(system.id) ?? null,
        } as InformationSystemWithCompliance;
      });
    },
  });
}

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    const list = map.get(k);
    if (list) list.push(row); else map.set(k, [row]);
  }
  return map;
}

function countBy<T>(rows: T[], key: (row: T) => string): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) map.set(key(row), (map.get(key(row)) || 0) + 1);
  return map;
}

/** Antal efterlevnadsposter för ett system (totalt och ärvda från anläggning). */
async function countSystemRecords(systemId: string): Promise<{ total: number; inherited: number }> {
  const [total, inherited] = await Promise.all([
    supabase.from('system_compliance_records').select('id', { count: 'exact', head: true })
      .eq('system_id', systemId).is('out_of_scope_since', null),
    supabase.from('system_compliance_records').select('id', { count: 'exact', head: true })
      .eq('system_id', systemId).is('out_of_scope_since', null).like('notes', 'Ärvt från:%'),
  ]);
  if (total.error) throw total.error;
  return { total: total.count ?? 0, inherited: inherited.count ?? 0 };
}

export function useInformationSystem(id: string) {
  return useQuery({
    queryKey: ['information-system', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('information_systems')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as InformationSystem;
    },
    enabled: !!id,
  });
}

export function useSystemComplianceRecords(systemId: string) {
  return useQuery({
    queryKey: ['system-compliance-records', systemId],
    queryFn: async () => {
      const { data, error } = await fetchAllRows(() => supabase
        .from('system_compliance_records')
        .select(`
          *,
          requirements(
            *,
            requirement_sources(*)
          )
        `)
        .eq('system_id', systemId)
        .order('created_at', { ascending: true }));

      if (error) throw error;
      return data as SystemComplianceRecord[];
    },
    enabled: !!systemId,
  });
}

export function useSystemFacilities(systemId: string) {
  return useQuery({
    queryKey: ['system-facilities', systemId],
    queryFn: async () => {
      const { data, error } = await fetchAllRows(() => supabase
        .from('facility_systems')
        .select(`
          *,
          facilities(id, name, type, classification_level, is_critical_entity, owner_type)
        `)
        .eq('system_id', systemId));

      if (error) throw error;
      return data as FacilitySystem[];
    },
    enabled: !!systemId,
  });
}

/** All systems linked to a facility, including asset counts (facility-driven view) */
export function useFacilitySystems(facilityId: string) {
  return useQuery({
    queryKey: ['facility-systems', facilityId],
    queryFn: async () => {
      const { data, error } = await fetchAllRows(() => supabase
        .from('facility_systems')
        .select(`
          *,
          information_systems(*)
        `)
        .eq('facility_id', facilityId));

      if (error) throw error;

      const links = (data || []) as FacilitySystem[];
      const systemIds = links.map(l => l.system_id);
      if (systemIds.length === 0) return links;

      const [{ data: assets, error: assetsError }, metrics, classifications] = await Promise.all([
        fetchAllRows(() => supabase.from('system_assets').select('id, system_id').in('system_id', systemIds)),
        fetchObjectMetrics('system', systemIds),
        fetchSystemClassifications(systemIds),
      ]);
      if (assetsError) throw assetsError;
      const assetCount = countBy(assets || [], a => a.system_id);

      return links.map(link => {
        const m = metrics.get(link.system_id);
        return {
          ...link,
          assets_count: assetCount.get(link.system_id) || 0,
          total_requirements: m.total,
          compliance_score: m.compliance ?? 0,
          coverage: m.coverage,
          compliance: m.compliance,
          classification: classifications.get(link.system_id) ?? null,
        };
      });
    },
    enabled: !!facilityId,
  });
}



export function useSystemAssets(systemId: string) {
  return useQuery({
    queryKey: ['system-assets', systemId],
    queryFn: async () => {
      const { data, error } = await fetchAllRows(() => supabase
        .from('system_assets')
        .select('*')
        .eq('system_id', systemId)
        .order('created_at', { ascending: true }));

      if (error) throw error;
      return data as SystemAsset[];
    },
    enabled: !!systemId,
  });
}

export function useCreateInformationSystem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: SystemFormData) => {
      const hasFacility = !!formData.linked_facility_id;
      const hasOverride = hasFacility && !!formData.facility_class_override;

      // Create system. A facility-linked system inherits its classification;
      // a standalone system carries its own.
      const { data: system, error: systemError } = await supabase
        .from('information_systems')
        .insert({
          name: formData.name,
          description: formData.description || null,
          system_type: formData.system_type,
          system_category: formData.system_category || null,
          system_owner: formData.system_owner || null,
          is_critical_entity: formData.is_critical_entity,
          is_externally_accessible: formData.is_externally_accessible,
          is_central_system: formData.is_central_system,
          owner_type: formData.owner_type || null,
          classification_source: hasFacility
            ? (hasOverride ? 'overridden' : 'inherited')
            : 'own',
          facility_class_override: hasOverride ? formData.facility_class_override : null,
          override_reason: hasOverride ? formData.override_reason || null : null,
          own_classification_level: hasFacility ? null : formData.own_classification_level ?? null,
        })
        .select()
        .single();

      if (systemError) throw systemError;

      // Get linked facility details if specified
      let linkedFacility: { id: string; name: string; type: string } | null = null;
      if (formData.linked_facility_id) {
        const { data: facilityData, error: facilityError } = await supabase
          .from('facilities')
          .select('id, name, type')
          .eq('id', formData.linked_facility_id)
          .single();

        if (facilityError) throw facilityError;
        if (facilityData) {
          linkedFacility = facilityData;

          // Create facility link — the first facility becomes the primary one,
          // which is the source of the system's inherited classification.
          const { error: linkError } = await supabase
            .from('facility_systems')
            .insert({
              facility_id: formData.linked_facility_id,
              system_id: system.id,
              relation_type: formData.facility_relation_type || 'betjänar',
              criticality: formData.facility_criticality || 'important',
              is_primary: true,
            });

          // Utan kopplingen får systemet fel klass och därmed fel krav
          if (linkError) throw linkError;
        }
      }

      // Kravmotorn i databasen lägger till kraven automatiskt när systemet
      // skapas och kopplas (triggers). Anropet nedan är en säkerhetsåtgärd och
      // ger normalt 0 nya – därför räknas posterna i stället för att läsa svaret.
      await syncRequirements('system', system.id, 'add');
      const counts = await countSystemRecords(system.id);

      return { 
        system, 
        applicableRequirementsCount: counts.total,
        inheritedRequirementsCount: counts.inherited,
        linkedToFacility: !!formData.linked_facility_id,
        linkedFacilityName: linkedFacility?.name || linkedFacility?.type,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['information-systems'] });
      if (data.linkedToFacility) {
        queryClient.invalidateQueries({ queryKey: ['facility-systems'] });
      }
      const inheritedMsg = data.inheritedRequirementsCount > 0 
        ? ` (${data.inheritedRequirementsCount} ärvda från ${data.linkedFacilityName})`
        : '';
      toast.success(`${data.system.name} skapades med ${data.applicableRequirementsCount} krav${inheritedMsg}`);
    },
    onError: (error) => {
      toast.error('Kunde inte skapa informationssystem');
      console.error('Create system error:', error);
    },
  });
}

export function useDeleteInformationSystem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('information_systems')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['information-systems'] });
      toast.success('Informationssystem borttaget');
    },
    onError: () => {
      toast.error('Kunde inte ta bort informationssystem');
    },
  });
}

export function useLinkFacilityToSystem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      facilityId,
      systemId,
      relationType,
      criticality,
    }: {
      facilityId: string;
      systemId: string;
      relationType: 'styr' | 'övervakar' | 'betjänar' | 'stödjer';
      criticality: 'critical' | 'important' | 'supporting';
    }) => {
      const before = await countSystemRecords(systemId);

      // Create the link
      const { error: linkError } = await supabase
        .from('facility_systems')
        .insert({
          facility_id: facilityId,
          system_id: systemId,
          relation_type: relationType,
          criticality: criticality,
        });

      if (linkError) throw linkError;

      // Kopplingen kan höja systemets klass och ge ärvda krav. Databasen lägger
      // till dem automatiskt; anropet är en säkerhetsåtgärd. Bara tillägg – en
      // ny koppling kan aldrig göra ett krav otillämpligt.
      await syncRequirements('system', systemId, 'add');
      const after = await countSystemRecords(systemId);

      const { data: facility } = await supabase
        .from('facilities')
        .select('name, type')
        .eq('id', facilityId)
        .single();

      return {
        addedCount: Math.max(0, after.total - before.total),
        inheritedCount: Math.max(0, after.inherited - before.inherited),
        facilityType: facility?.name || facility?.type || 'anläggningen',
      };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['system-facilities', variables.systemId] });
      queryClient.invalidateQueries({ queryKey: ['facility-systems', variables.facilityId] });
      queryClient.invalidateQueries({ queryKey: ['system-compliance-records', variables.systemId] });
      queryClient.invalidateQueries({ queryKey: ['information-systems'] });
      queryClient.invalidateQueries({ queryKey: ['system-classification', variables.systemId] });
      queryClient.invalidateQueries({ queryKey: ['requirement-sync-pending'] });
      
      if (data.addedCount > 0) {
        const inherited = data.inheritedCount > 0 ? `, varav ${data.inheritedCount} ärvda från ${data.facilityType}` : '';
        toast.success(`Anläggning kopplad – ${data.addedCount} nya krav${inherited}`);
      } else {
        toast.success('Anläggning kopplad till system');
      }
    },
    onError: () => {
      toast.error('Kunde inte koppla anläggning');
    },
  });
}

export function useUnlinkFacilityFromSystem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ facilityId, systemId }: { facilityId: string; systemId: string }) => {
      const { error } = await supabase
        .from('facility_systems')
        .delete()
        .eq('facility_id', facilityId)
        .eq('system_id', systemId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['system-facilities', variables.systemId] });
      queryClient.invalidateQueries({ queryKey: ['facility-systems', variables.facilityId] });
      queryClient.invalidateQueries({ queryKey: ['information-systems'] });
      queryClient.invalidateQueries({ queryKey: ['system-classification', variables.systemId] });
      queryClient.invalidateQueries({ queryKey: ['requirement-sync-pending'] });
      toast.success('Koppling borttagen');
    },
    onError: () => {
      toast.error('Kunde inte ta bort koppling');
    },
  });
}

export function useCreateSystemAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (asset: Omit<SystemAsset, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('system_assets')
        .insert(asset)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['system-assets', data.system_id] });
      queryClient.invalidateQueries({ queryKey: ['information-systems'] });
      toast.success('Komponent tillagd');
    },
    onError: () => {
      toast.error('Kunde inte lägga till komponent');
    },
  });
}

export function useDeleteSystemAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assetId, systemId }: { assetId: string; systemId: string }) => {
      const { error } = await supabase
        .from('system_assets')
        .delete()
        .eq('id', assetId);

      if (error) throw error;
      return systemId;
    },
    onSuccess: (systemId) => {
      queryClient.invalidateQueries({ queryKey: ['system-assets', systemId] });
      queryClient.invalidateQueries({ queryKey: ['information-systems'] });
      toast.success('Komponent borttagen');
    },
    onError: () => {
      toast.error('Kunde inte ta bort komponent');
    },
  });
}

export function useSyncSystemRequirements() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (systemId: string) => {
      const result = await syncRequirements('system', systemId, 'add');
      const applicable = await fetchApplicableRequirementIds('system', systemId);
      return { addedCount: result.added.length, totalApplicable: applicable.length };
    },
    onSuccess: (data, systemId) => {
      queryClient.invalidateQueries({ queryKey: ['system-compliance-records', systemId] });
      queryClient.invalidateQueries({ queryKey: ['information-systems'] });

      if (data.addedCount > 0) {
        toast.success(`${data.addedCount} nya krav tillagda (totalt ${data.totalApplicable} tillämpliga)`);
      } else {
        toast.info('Inga nya krav att lägga till');
      }
    },
    onError: () => {
      toast.error('Kunde inte synkronisera krav');
    },
  });
}

/**
 * Update a system's classification.
 * Ett kopplat system ärver (högsta klassen bland anläggningarna) eller avviker
 * nedåt med obligatorisk motivering. Ett system utan anläggning har en egen
 * klass. Databasen kontrollerar reglerna och lägger till nya krav automatiskt;
 * krav som inte längre gäller granskas i dialogen "Uppdatera krav".
 */
export function useUpdateSystemClassification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      systemId,
      classificationSource,
      facilityClassOverride,
      overrideReason,
      ownClassificationLevel,
    }: {
      systemId: string;
      classificationSource: 'inherited' | 'overridden' | 'own';
      facilityClassOverride: number | null;
      overrideReason: string | null;
      ownClassificationLevel?: number | null;
    }) => {
      const isOverride = classificationSource === 'overridden';
      const isOwn = classificationSource === 'own';

      if (isOverride && (!facilityClassOverride || (overrideReason?.trim().length ?? 0) < 15)) {
        throw new Error('En avvikande klassificering kräver nivå och en motivering på minst 15 tecken');
      }
      if (isOwn && !ownClassificationLevel) {
        throw new Error('Välj en klass för systemet');
      }

      const { error } = await supabase
        .from('information_systems')
        .update({
          classification_source: classificationSource,
          facility_class_override: isOverride ? facilityClassOverride : null,
          override_reason: isOverride ? overrideReason : null,
          own_classification_level: isOwn ? ownClassificationLevel : null,
        })
        .eq('id', systemId);

      if (error) throw error;
      return { systemId, classificationSource };
    },
    onSuccess: ({ systemId, classificationSource }) => {
      queryClient.invalidateQueries({ queryKey: ['information-system', systemId] });
      queryClient.invalidateQueries({ queryKey: ['information-systems'] });
      queryClient.invalidateQueries({ queryKey: ['facility-systems'] });
      queryClient.invalidateQueries({ queryKey: ['system-classification', systemId] });
      queryClient.invalidateQueries({ queryKey: ['system-compliance-records', systemId] });
      queryClient.invalidateQueries({ queryKey: ['requirement-sync-pending', 'system', systemId] });
      toast.success(
        classificationSource === 'overridden'
          ? 'Avvikande klassificering sparad'
          : classificationSource === 'own'
            ? 'Systemets egen klass sparad'
            : 'Systemet ärver nu anläggningarnas klassificering',
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Kunde inte uppdatera klassificeringen');
    },
  });
}
