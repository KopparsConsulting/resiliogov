import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ProcurementProject, ProcurementProjectWithDetails, ProjectStatus } from '@/types/project';
import { fetchAllRows } from '@/lib/fetchAll';

interface ProjectRow extends ProcurementProject {
  facilities?: { name: string } | null;
  information_systems?: { name: string } | null;
  component_types?: { name: string } | null;
}

export function useProjects() {
  return useQuery({
    queryKey: ['procurement-projects'],
    queryFn: async (): Promise<ProcurementProjectWithDetails[]> => {
      const { data, error } = await fetchAllRows(() => supabase
        .from('procurement_projects')
        .select('*, facilities(name), information_systems(name), component_types(name)')
        .order('created_at', { ascending: false }));
      if (error) throw error;

      const rows = (data ?? []) as unknown as ProjectRow[];
      const ids = rows.map((row) => row.id);

      const scopeCounts = new Map<string, { total: number; notApplicable: number }>();
      const mappedCounts = new Map<string, number>();

      if (ids.length > 0) {
        const [{ data: scope }, { data: mappings }] = await Promise.all([
          fetchAllRows(() => supabase.from('project_requirements').select('project_id, applicability').in('project_id', ids)),
          fetchAllRows(() => supabase.from('requirement_test_mappings').select('project_id, requirement_id').in('project_id', ids)),
        ]);

        for (const row of scope ?? []) {
          const current = scopeCounts.get(row.project_id) ?? { total: 0, notApplicable: 0 };
          current.total += 1;
          if (row.applicability === 'not_applicable') current.notApplicable += 1;
          scopeCounts.set(row.project_id, current);
        }

        const seen = new Set<string>();
        for (const row of mappings ?? []) {
          if (!row.project_id) continue;
          const key = `${row.project_id}-${row.requirement_id}`;
          if (seen.has(key)) continue;
          seen.add(key);
          mappedCounts.set(row.project_id, (mappedCounts.get(row.project_id) ?? 0) + 1);
        }
      }

      return rows.map((row) => ({
        ...row,
        facility_name: row.facilities?.name ?? null,
        system_name: row.information_systems?.name ?? null,
        component_type_name: row.component_types?.name ?? null,
        requirement_count: scopeCounts.get(row.id)?.total ?? 0,
        not_applicable_count: scopeCounts.get(row.id)?.notApplicable ?? 0,
        mapped_count: mappedCounts.get(row.id) ?? 0,
      }));
    },
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ['procurement-project', id],
    enabled: !!id,
    queryFn: async (): Promise<ProcurementProjectWithDetails> => {
      const { data, error } = await supabase
        .from('procurement_projects')
        .select('*, facilities(name), information_systems(name), component_types(name)')
        .eq('id', id as string)
        .single();
      if (error) throw error;
      const row = data as unknown as ProjectRow;
      return {
        ...row,
        facility_name: row.facilities?.name ?? null,
        system_name: row.information_systems?.name ?? null,
        component_type_name: row.component_types?.name ?? null,
        requirement_count: 0,
        not_applicable_count: 0,
        mapped_count: 0,
      };
    },
  });
}

export type ProjectInput = {
  name: string;
  description?: string | null;
  facility_id?: string | null;
  system_id?: string | null;
  component_type_id?: string | null;
  unit_count?: number | null;
  target_sl?: number | null;
  owner_name?: string | null;
  supplier_name?: string | null;
  status?: ProjectStatus;
};

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: ProjectInput) => {
      const { data, error } = await supabase
        .from('procurement_projects')
        .insert(values)
        .select()
        .single();
      if (error) throw error;
      return data as ProcurementProject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurement-projects'] });
      toast.success('Projekt skapat');
    },
    onError: (error: { message?: string }) => toast.error(error?.message || 'Kunde inte skapa projekt'),
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: ProjectInput & { id: string }) => {
      const { error } = await supabase.from('procurement_projects').update(values).eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['procurement-projects'] });
      queryClient.invalidateQueries({ queryKey: ['procurement-project', id] });
      toast.success('Projekt uppdaterat');
    },
    onError: (error: { message?: string }) => toast.error(error?.message || 'Kunde inte uppdatera projekt'),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('procurement_projects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurement-projects'] });
      toast.success('Projekt borttaget');
    },
    onError: (error: { message?: string }) => toast.error(error?.message || 'Kunde inte ta bort projekt'),
  });
}
