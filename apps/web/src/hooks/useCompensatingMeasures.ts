import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAll';
import type {
  CompensatingMeasure,
  CompensatingMeasureStatus,
  CompensatingMeasureType,
  ScopeKind,
} from '@/types/project';

const PARENT_COLUMN: Record<ScopeKind, 'project_requirement_id' | 'profile_item_id'> = {
  project: 'project_requirement_id',
  profile: 'profile_item_id',
};

/** All compensating measures within one project scope or one requirement profile. */
export function useScopeMeasures(kind: ScopeKind, ownerId: string | undefined) {
  return useQuery({
    queryKey: ['compensating-measures', kind, ownerId],
    enabled: !!ownerId,
    queryFn: async (): Promise<CompensatingMeasure[]> => {
      const { data, error } =
        kind === 'project'
          ? await fetchAllRows(() => supabase
              .from('compensating_measures')
              .select('*, project_requirements!inner(project_id)')
              .eq('project_requirements.project_id', ownerId as string)
              .order('created_at'))
          : await fetchAllRows(() => supabase
              .from('compensating_measures')
              .select('*, requirement_profile_items!inner(profile_id)')
              .eq('requirement_profile_items.profile_id', ownerId as string)
              .order('created_at'));
      if (error) throw error;
      return (data ?? []) as unknown as CompensatingMeasure[];
    },
  });
}

/** Groups measures by the scope row they belong to. */
export function groupMeasuresByParent(kind: ScopeKind, measures: CompensatingMeasure[] | undefined) {
  const column = PARENT_COLUMN[kind];
  const grouped = new Map<string, CompensatingMeasure[]>();
  for (const measure of measures ?? []) {
    const parentId = measure[column];
    if (!parentId) continue;
    const list = grouped.get(parentId) ?? [];
    list.push(measure);
    grouped.set(parentId, list);
  }
  return grouped;
}

export interface MeasureInput {
  id?: string;
  description: string;
  measure_type: CompensatingMeasureType;
  system_id: string | null;
  asset_id: string | null;
  facility_id: string | null;
  proposed_by: 'supplier' | 'client' | 'joint';
  status: CompensatingMeasureStatus;
}

function invalidateMeasures(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['compensating-measures'] });
  queryClient.invalidateQueries({ queryKey: ['carried-measures'] });
  queryClient.invalidateQueries({ queryKey: ['project-test-plan'] });
}

export function useSaveMeasure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      kind,
      parentId,
      measure,
    }: {
      kind: ScopeKind;
      parentId: string;
      measure: MeasureInput;
    }) => {
      const { id, ...values } = measure;
      if (id) {
        const { error } = await supabase.from('compensating_measures').update(values).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('compensating_measures')
          .insert({ ...values, [PARENT_COLUMN[kind]]: parentId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidateMeasures(queryClient);
      toast.success('Kompenserande åtgärd sparad');
    },
    onError: (error: { message?: string }) => toast.error(error?.message || 'Kunde inte spara åtgärden'),
  });
}

export function useDeleteMeasure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('compensating_measures').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateMeasures(queryClient);
      toast.success('Kompenserande åtgärd borttagen');
    },
    onError: (error: { message?: string }) => toast.error(error?.message || 'Kunde inte ta bort åtgärden'),
  });
}

export interface CarriedMeasure extends CompensatingMeasure {
  origin_kind: ScopeKind;
  origin_id: string | null;
  origin_name: string;
  requirement_id: string | null;
  chapter_section: string;
  requirement_description: string;
}

/** Measures carried by a system, asset or facility, with the requirement and project/profile they come from. */
export function useCarriedMeasures(carrier: 'system' | 'asset' | 'facility', carrierId: string | undefined) {
  return useQuery({
    queryKey: ['carried-measures', carrier, carrierId],
    enabled: !!carrierId,
    queryFn: async (): Promise<CarriedMeasure[]> => {
      const column = carrier === 'system' ? 'system_id' : carrier === 'asset' ? 'asset_id' : 'facility_id';
      const { data, error } = await fetchAllRows(() => supabase
        .from('compensating_measures')
        .select(`*,
          project_requirements(project_id, requirement_id, requirements(chapter_section, description), procurement_projects(name)),
          requirement_profile_items(profile_id, requirement_id, requirements(chapter_section, description), requirement_profiles(name))`)
        .eq(column, carrierId as string)
        .order('created_at'));
      if (error) throw error;
      return (data ?? []).map((row: Record<string, any>) => {
        const project = row.project_requirements;
        const profile = row.requirement_profile_items;
        const origin = project ?? profile;
        return {
          ...(row as CompensatingMeasure),
          origin_kind: project ? 'project' : 'profile',
          origin_id: project ? project.project_id : profile?.profile_id ?? null,
          origin_name: project ? project.procurement_projects?.name ?? 'Projekt' : profile?.requirement_profiles?.name ?? 'Profil',
          requirement_id: origin?.requirement_id ?? null,
          chapter_section: origin?.requirements?.chapter_section ?? '',
          requirement_description: origin?.requirements?.description ?? '',
        } as CarriedMeasure;
      });
    },
  });
}
