import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { RequirementApplicability, RequirementProfile, ScopeItem } from '@/types/project';
import { APPLICABILITY_VALUES } from '@/types/project';
import { fetchAllRows } from '@/lib/fetchAll';

function emptyCounts(): Record<RequirementApplicability, number> {
  return Object.fromEntries(APPLICABILITY_VALUES.map((value) => [value, 0])) as Record<RequirementApplicability, number>;
}

export function useRequirementProfiles() {
  return useQuery({
    queryKey: ['requirement-profiles'],
    queryFn: async (): Promise<RequirementProfile[]> => {
      const { data, error } = await fetchAllRows(() => supabase
        .from('requirement_profiles')
        .select('*, requirement_profile_items(id, applicability), component_types(name)')
        .order('name'));
      if (error) throw error;
      return (data ?? []).map((row: Record<string, any>) => {
        const items: { applicability: RequirementApplicability }[] = Array.isArray(row.requirement_profile_items)
          ? row.requirement_profile_items
          : [];
        const counts = emptyCounts();
        for (const item of items) counts[item.applicability] = (counts[item.applicability] ?? 0) + 1;
        return {
          id: row.id,
          name: row.name,
          description: row.description ?? null,
          component_type_id: row.component_type_id ?? null,
          component_type_name: row.component_types?.name ?? null,
          target_sl: row.target_sl ?? null,
          is_default: !!row.is_default,
          created_at: row.created_at,
          item_count: items.length,
          applicability_counts: counts,
        } as RequirementProfile;
      });
    },
  });
}

export function useProfileItems(profileId: string | undefined) {
  return useQuery({
    queryKey: ['requirement-profile-items', profileId],
    enabled: !!profileId,
    queryFn: async (): Promise<ScopeItem[]> => {
      const { data, error } = await fetchAllRows(() => supabase
        .from('requirement_profile_items')
        .select('id, requirement_id, applicability, justification')
        .eq('profile_id', profileId as string));
      if (error) throw error;
      return (data ?? []) as ScopeItem[];
    },
  });
}

function invalidateProfiles(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['requirement-profiles'] });
  queryClient.invalidateQueries({ queryKey: ['requirement-profile-items'] });
  // Standard profiles drive component requirements via database triggers.
  queryClient.invalidateQueries({ queryKey: ['component-requirements'] });
  queryClient.invalidateQueries({ queryKey: ['component-requirement-metrics'] });
}

export interface ProfileValues {
  name: string;
  description: string | null;
  component_type_id: string | null;
  target_sl: number | null;
  is_default: boolean;
}

export function useCreateRequirementProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: ProfileValues) => {
      const { data, error } = await supabase.from('requirement_profiles').insert(values).select('id').single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      invalidateProfiles(queryClient);
      toast.success('Profil skapad');
    },
    onError: (error: { message?: string }) => toast.error(error?.message || 'Kunde inte skapa profilen'),
  });
}

export function useUpdateRequirementProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<ProfileValues> & { id: string }) => {
      // Only one standard profile per component type: clear the previous one first.
      if (values.is_default && values.component_type_id) {
        const { error: clearError } = await supabase
          .from('requirement_profiles')
          .update({ is_default: false })
          .eq('component_type_id', values.component_type_id)
          .eq('is_default', true)
          .neq('id', id);
        if (clearError) throw clearError;
      }
      const { error } = await supabase.from('requirement_profiles').update(values).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateProfiles(queryClient);
      toast.success('Profilen uppdaterad');
    },
    onError: (error: { message?: string }) => toast.error(error?.message || 'Kunde inte uppdatera profilen'),
  });
}

export function useCopyRequirementProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ profileId, name }: { profileId: string; name: string }) => {
      const { data, error } = await supabase.rpc('copy_requirement_profile', { _profile_id: profileId, _name: name });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      invalidateProfiles(queryClient);
      toast.success('Profilen kopierad med motiveringar och kompenserande åtgärder');
    },
    onError: (error: { message?: string }) => toast.error(error?.message || 'Kunde inte kopiera profilen'),
  });
}

export function useAddProfileItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ profileId, requirementIds }: { profileId: string; requirementIds: string[] }) => {
      if (requirementIds.length === 0) return;
      const { error } = await supabase.from('requirement_profile_items').upsert(
        requirementIds.map((requirementId) => ({
          profile_id: profileId,
          requirement_id: requirementId,
          applicability: 'preliminary' as const,
        })),
        { onConflict: 'profile_id,requirement_id', ignoreDuplicates: true },
      );
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      invalidateProfiles(queryClient);
      toast.success(`${variables.requirementIds.length} krav tillagda`);
    },
    onError: (error: { message?: string }) => toast.error(error?.message || 'Kunde inte lägga till krav'),
  });
}

export function useUpdateProfileItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id, applicability, justification,
    }: { id: string; applicability: RequirementApplicability; justification: string | null }) => {
      const { error } = await supabase
        .from('requirement_profile_items')
        .update({ applicability, justification })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateProfiles(queryClient),
    onError: (error: { message?: string }) => toast.error(error?.message || 'Kunde inte uppdatera kravet'),
  });
}

export function useRemoveProfileItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('requirement_profile_items').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateProfiles(queryClient);
      toast.success('Kravet borttaget ur profilen');
    },
    onError: (error: { message?: string }) => toast.error(error?.message || 'Kunde inte ta bort kravet'),
  });
}

/** Saves the current project scope as a reusable profile, including justifications and compensating measures. */
export function useSaveProfileFromProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      name,
      description,
      componentTypeId,
      targetSl,
    }: {
      projectId: string;
      name: string;
      description?: string | null;
      componentTypeId?: string | null;
      targetSl?: number | null;
    }) => {
      const { data, error } = await supabase.rpc('save_project_as_profile', {
        _project_id: projectId,
        _name: name,
        _description: description ?? '',
        _component_type_id: componentTypeId ?? (null as unknown as string),
        _target_sl: targetSl ?? (null as unknown as number),
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      invalidateProfiles(queryClient);
      toast.success('Profil sparad med tillämplighet, motiveringar och kompenserande åtgärder');
    },
    onError: (error: { message?: string }) => toast.error(error?.message || 'Kunde inte spara profilen'),
  });
}

/** Copies a profile's requirements, applicability, justifications and compensating measures into a project scope. */
export function useApplyProfileToProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ profileId, projectId }: { profileId: string; projectId: string }) => {
      const { data, error } = await supabase.rpc('apply_profile_to_project', {
        _profile_id: profileId,
        _project_id: projectId,
      });
      if (error) throw error;
      return (data as number) ?? 0;
    },
    onSuccess: (count, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-requirements', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['compensating-measures'] });
      queryClient.invalidateQueries({ queryKey: ['procurement-projects'] });
      queryClient.invalidateQueries({ queryKey: ['project-metrics'] });
      toast.success(`${count} krav hämtade från profilen`);
    },
    onError: (error: { message?: string }) => toast.error(error?.message || 'Kunde inte använda profilen'),
  });
}

export function useDeleteRequirementProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('requirement_profiles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateProfiles(queryClient);
      toast.success('Profil borttagen');
    },
    onError: (error: { message?: string }) => toast.error(error?.message || 'Kunde inte ta bort profilen'),
  });
}
