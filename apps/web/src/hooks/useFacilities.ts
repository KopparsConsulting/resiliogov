import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Facility, FacilityFormData, FacilityWithCompliance } from '@/types/compliance';
import { syncRequirements, fetchApplicableRequirementIds } from '@/lib/requirementEngine';
import { fetchFacilityRollup } from '@/lib/objectMetrics';
import { toast } from 'sonner';
import { fetchAllRows } from '@/lib/fetchAll';

export function useFacilities() {
  return useQuery({
    queryKey: ['facilities'],
    queryFn: async () => {
      const { data: facilities, error: facilitiesError } = await fetchAllRows(() => supabase
        .from('facilities')
        .select('*')
        .order('created_at', { ascending: false }));

      if (facilitiesError) throw facilitiesError;

      // Måtten för alla anläggningar i en fråga, inklusive kopplade system
      const metrics = await fetchFacilityRollup();

      const facilitiesWithCompliance = (facilities || []).map((facility) => {
        const m = metrics.get(facility.id);
        return {
          ...facility,
          type: facility.type as 'Vägtunnel' | 'Bro',
          compliance_score: m.compliance ?? 0,
          coverage: m.coverage,
          compliance: m.compliance,
          assessed_count: m.assessed,
          fulfilled_count: m.fulfilled,
          not_applicable_count: m.notApplicable,
          open_requirements: m.needsAction,
          total_requirements: m.total,
          own_requirements: m.ownTotal,
          system_requirements: m.systemsTotal,
          linked_systems: m.linkedSystems,
        } as FacilityWithCompliance;
      });

      return facilitiesWithCompliance;
    },
  });
}

export function useFacility(id: string) {
  return useQuery({
    queryKey: ['facility', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Facility;
    },
    enabled: !!id,
  });
}

export function useCreateFacility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FacilityFormData) => {
      // Create facility using properly typed insert
      const { data: facility, error: facilityError } = await supabase
        .from('facilities')
        .insert({
          name: formData.name,
          type: formData.type as 'Vägtunnel' | 'Bro' | 'IT-System' | 'Ledningscentral',
          is_critical_entity: formData.is_critical_entity,
          has_dangerous_goods: formData.has_dangerous_goods,
          length_meters: formData.length_meters || null,
          traffic_flow_adt: formData.traffic_flow_adt || null,
          construction_type: (formData.construction_type || null) as 'Berg' | 'Betong' | 'Sänktunnel' | 'Överdäckning' | null,
          owner_type: formData.owner_type || null,
          classification_level: formData.classification_level ?? null,
        })
        .select()
        .single();

      if (facilityError) throw facilityError;

      // Databasen lägger till kraven automatiskt när anläggningen skapas
      // (trigger). Anropet är en säkerhetsåtgärd och ger normalt 0 nya, så
      // posterna räknas i stället.
      await syncRequirements('facility', facility.id, 'add');
      const { count, error: countError } = await supabase
        .from('compliance_records')
        .select('id', { count: 'exact', head: true })
        .eq('facility_id', facility.id)
        .is('out_of_scope_since', null);
      if (countError) throw countError;

      return { facility, applicableRequirementsCount: count ?? 0 };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      toast.success(`${data.facility.name} skapades med ${data.applicableRequirementsCount} krav`);
    },
    onError: (error) => {
      toast.error('Kunde inte skapa anläggning');
      console.error('Create facility error:', error);
    },
  });
}

export function useDeleteFacility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('facilities')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      toast.success('Anläggning borttagen');
    },
    onError: () => {
      toast.error('Kunde inte ta bort anläggning');
    },
  });
}

export function useUpdateFacility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<Facility>) => {
      const { data, error } = await supabase
        .from('facilities')
        .update(patch as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      queryClient.invalidateQueries({ queryKey: ['facility', vars.id] });
      queryClient.invalidateQueries({ queryKey: ['compliance-records', vars.id] });
      queryClient.invalidateQueries({ queryKey: ['facility-rollup', vars.id] });
      // Ändrad klass eller attribut slår igenom på kopplade system (klass och krav)
      for (const key of ['information-systems', 'facility-systems', 'system-classification',
        'system-compliance-records', 'requirement-sync-pending']) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      toast.success('Anläggning uppdaterad');
    },
    onError: () => toast.error('Kunde inte uppdatera anläggning'),
  });
}

export function useSyncFacilityRequirements() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (facilityId: string) => {
      // Kravmotorn i databasen lägger till krav som saknas
      const result = await syncRequirements('facility', facilityId, 'add');
      const applicable = await fetchApplicableRequirementIds('facility', facilityId);
      return { addedCount: result.added.length, totalApplicable: applicable.length };
    },
    onSuccess: (data, facilityId) => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      queryClient.invalidateQueries({ queryKey: ['facility', facilityId] });
      queryClient.invalidateQueries({ queryKey: ['compliance-records', facilityId] });
      
      if (data.addedCount > 0) {
        toast.success(`${data.addedCount} nya krav tillagda`);
      } else {
        toast.info('Inga nya krav att lägga till');
      }
    },
    onError: () => {
      toast.error('Kunde inte synkronisera krav');
    },
  });
}
