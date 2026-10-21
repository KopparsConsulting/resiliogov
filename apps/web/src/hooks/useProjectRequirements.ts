import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ProjectRequirement, RequirementApplicability } from '@/types/project';
import { fetchAllRows } from '@/lib/fetchAll';

export function useProjectRequirements(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-requirements', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<ProjectRequirement[]> => {
      const { data, error } = await fetchAllRows(() => supabase
        .from('project_requirements')
        .select('*')
        .eq('project_id', projectId as string));
      if (error) throw error;
      return (data ?? []) as ProjectRequirement[];
    },
  });
}

/** Adds requirements to the project scope, ignoring duplicates. */
export function useAddProjectRequirements() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      requirementIds,
      applicability = 'preliminary',
    }: {
      projectId: string;
      requirementIds: string[];
      applicability?: RequirementApplicability;
    }) => {
      if (requirementIds.length === 0) return 0;
      const rows = requirementIds.map((requirement_id) => ({
        project_id: projectId,
        requirement_id,
        applicability,
      }));
      const { error } = await supabase
        .from('project_requirements')
        .upsert(rows, { onConflict: 'project_id,requirement_id', ignoreDuplicates: true });
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (count, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-requirements', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['procurement-projects'] });
      queryClient.invalidateQueries({ queryKey: ['project-metrics'] });
      if (count) toast.success(`${count} krav tillagda i omfattningen`);
    },
    onError: (error: { message?: string }) => toast.error(error?.message || 'Kunde inte lägga till krav'),
  });
}

export function useUpdateProjectRequirement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      applicability,
      justification,
    }: {
      id: string;
      projectId: string;
      applicability: RequirementApplicability;
      justification?: string | null;
    }) => {
      const { error } = await supabase
        .from('project_requirements')
        .update({ applicability, justification: justification ?? null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-requirements', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['procurement-projects'] });
      queryClient.invalidateQueries({ queryKey: ['project-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['project-test-plan'] });
      toast.success('Kravet uppdaterat');
    },
    onError: (error: { message?: string }) => toast.error(error?.message || 'Kunde inte uppdatera kravet'),
  });
}

export function useRemoveProjectRequirements() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids }: { projectId: string; ids: string[] }) => {
      if (ids.length === 0) return 0;
      const { error } = await supabase.from('project_requirements').delete().in('id', ids);
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (count, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-requirements', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['procurement-projects'] });
      queryClient.invalidateQueries({ queryKey: ['project-metrics'] });
      if (count) toast.success(`${count} krav borttagna från omfattningen`);
    },
    onError: (error: { message?: string }) => toast.error(error?.message || 'Kunde inte ta bort krav'),
  });
}
