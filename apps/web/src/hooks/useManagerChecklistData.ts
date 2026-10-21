import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAll';

export interface FacilityWarning {
  id: string;
  name: string;
  type: string;
  issue: 'missing_owner';
}

export interface SystemWarning {
  id: string;
  name: string;
  system_type: string;
  issue: 'missing_owner' | 'unclassified' | 'no_facility_link';
}

export interface TechDebtItem {
  id: string;
  description: string;
  system_id: string;
  system_name: string;
  requirement_description: string;
}

export interface ManagerChecklistData {
  facilitiesWithoutOwner: FacilityWarning[];
  systemsWithoutOwner: SystemWarning[];
  criticalSystemsWithoutFacility: SystemWarning[];
  centralSystems: { id: string; name: string; system_type: string }[];
  techDebtItems: TechDebtItem[];
  isLoading: boolean;
}

export function useManagerChecklistData(): ManagerChecklistData {
  // Fetch facilities without owner
  const { data: facilities, isLoading: facilitiesLoading } = useQuery({
    queryKey: ['manager-checklist-facilities'],
    queryFn: async () => {
      const { data, error } = await fetchAllRows(() => supabase
        .from('facilities')
        .select('id, name, type, owner_type')
        .order('name'));
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch systems without owner
  const { data: systems, isLoading: systemsLoading } = useQuery({
    queryKey: ['manager-checklist-systems'],
    queryFn: async () => {
      const { data, error } = await fetchAllRows(() => supabase
        .from('information_systems')
        .select('id, name, system_type, system_owner, is_critical_entity, is_central_system')
        .order('name'));
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch facility-system links to find unlinked systems
  const { data: facilityLinks, isLoading: linksLoading } = useQuery({
    queryKey: ['manager-checklist-facility-links'],
    queryFn: async () => {
      const { data, error } = await fetchAllRows(() => supabase
        .from('facility_systems')
        .select('system_id'));
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch tech debt items (network segmentation and MFA requirements with "Ej påbörjad")
  const { data: techDebt, isLoading: techDebtLoading } = useQuery({
    queryKey: ['manager-checklist-tech-debt'],
    queryFn: async () => {
      const { data, error } = await fetchAllRows(() => supabase
        .from('system_compliance_records')
        .select(`
          id,
          system_id,
          status,
          requirements (
            id,
            description,
            chapter_section
          ),
          information_systems (
            id,
            name
          )
        `)
        .eq('status', 'Ej påbörjad'));
      
      if (error) throw error;
      return data;
    },
  });

  const isLoading = facilitiesLoading || systemsLoading || linksLoading || techDebtLoading;

  // Process facilities without owner
  const facilitiesWithoutOwner: FacilityWarning[] = (facilities ?? [])
    .filter(f => !f.owner_type)
    .map(f => ({
      id: f.id,
      name: f.name,
      type: f.type,
      issue: 'missing_owner' as const,
    }));

  // Process systems without owner
  const systemsWithoutOwner: SystemWarning[] = (systems ?? [])
    .filter(s => !s.system_owner)
    .map(s => ({
      id: s.id,
      name: s.name,
      system_type: s.system_type,
      issue: 'missing_owner' as const,
    }));

  // Find critical systems without facility links
  const linkedSystemIds = new Set((facilityLinks ?? []).map(l => l.system_id));
  const criticalSystemsWithoutFacility: SystemWarning[] = (systems ?? [])
    .filter(s => s.is_critical_entity && !linkedSystemIds.has(s.id))
    .map(s => ({
      id: s.id,
      name: s.name,
      system_type: s.system_type,
      issue: 'no_facility_link' as const,
    }));

  // Find central systems (for MSBFS classification)
  const centralSystems = (systems ?? [])
    .filter(s => s.is_central_system)
    .map(s => ({
      id: s.id,
      name: s.name,
      system_type: s.system_type,
    }));

  // Process tech debt - filter for relevant requirements (network segmentation, MFA, etc.)
  const techDebtItems: TechDebtItem[] = (techDebt ?? [])
    .filter(record => {
      const desc = (record.requirements as any)?.description?.toLowerCase() ?? '';
      return desc.includes('nätverkssegmentering') || 
             desc.includes('mfa') || 
             desc.includes('flerfaktorsautentisering') ||
             desc.includes('åtkomstkontroll');
    })
    .slice(0, 10) // Limit to 10 items
    .map(record => ({
      id: record.id,
      description: (record.requirements as any)?.description ?? '',
      system_id: record.system_id,
      system_name: (record.information_systems as any)?.name ?? 'Okänt system',
      requirement_description: (record.requirements as any)?.description ?? '',
    }));

  return {
    facilitiesWithoutOwner,
    systemsWithoutOwner,
    criticalSystemsWithoutFacility,
    centralSystems,
    techDebtItems,
    isLoading,
  };
}
