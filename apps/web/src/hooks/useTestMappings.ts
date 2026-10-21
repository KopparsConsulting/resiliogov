import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { TestPhase, TestType, Testability, ResultStatus, ResponsibleOrg } from '@/components/test-model/constants';
import { fetchAllRows } from '@/lib/fetchAll';

export interface TestMapping {
  id: string;
  requirement_id: string;
  system_id: string | null;
  asset_id: string | null;
  project_id: string | null;
  is_applicable: boolean | null;
  testability: Testability | null;
  test_phase: TestPhase | null;
  test_type: TestType | null;
  responsible_party: string | null;
  evidence: string | null;
  comment: string | null;
  result_status: ResultStatus;
  tested_at: string | null;
  tested_by: string | null;
  deviation: string | null;
  evidence_url: string | null;
  evidence_file_name: string | null;
  acceptance_criteria: string | null;
  test_method: string | null;
  responsible_org: ResponsibleOrg | null;
  suggestion_dismissed_at: string | null;
  suggestion_dismissed_by: string | null;
  suggestion_dismiss_reason: string | null;
  created_at: string;
  updated_at: string;
}


export interface TestMappingWithDetails extends TestMapping {
  requirement_chapter: string | null;
  requirement_description: string | null;
  requirement_page: number | null;
  requirement_excerpt: string | null;
  requirement_sl: number | null;
  source_name: string | null;
  source_url: string | null;
  system_name: string | null;
  asset_name: string | null;
  project_name: string | null;
  classification_level: number | null;
}

export function useTestMappings() {
  return useQuery({
    queryKey: ['test-mappings'],
    queryFn: async (): Promise<TestMappingWithDetails[]> => {
      const { data, error } = await fetchAllRows(() => supabase
        .from('requirement_test_mappings')
        .select(`
          *,
          requirements!inner(chapter_section, description, source_page, source_excerpt, sl_capability, requirement_sources(document_name, document_url)),
          information_systems(name),
          system_assets(name),
          procurement_projects(name)
        `)
        .order('created_at', { ascending: false }));


      if (error) throw error;

      // Get classification levels via facility_systems for each system
      const systemIds = Array.from(new Set((data || []).map((r: any) => r.system_id).filter(Boolean)));
      const classMap = new Map<string, number>();
      if (systemIds.length > 0) {
        const { data: links } = await fetchAllRows(() => supabase
          .from('facility_systems')
          .select('system_id, facilities(classification_level)')
          .in('system_id', systemIds));
        for (const link of (links || []) as any[]) {
          const lvl = link.facilities?.classification_level;
          if (lvl) {
            const cur = classMap.get(link.system_id) ?? 0;
            if (lvl > cur) classMap.set(link.system_id, lvl);
          }
        }
      }

      return (data || []).map((r: any) => ({
        ...r,
        requirement_chapter: r.requirements?.chapter_section ?? null,
        requirement_description: r.requirements?.description ?? null,
        requirement_page: r.requirements?.source_page ?? null,
        requirement_excerpt: r.requirements?.source_excerpt ?? null,
        requirement_sl: r.requirements?.sl_capability ?? null,
        source_name: r.requirements?.requirement_sources?.document_name ?? null,
        source_url: r.requirements?.requirement_sources?.document_url ?? null,
        system_name: r.information_systems?.name ?? null,
        asset_name: r.system_assets?.name ?? null,
        project_name: r.procurement_projects?.name ?? null,
        classification_level: r.system_id ? classMap.get(r.system_id) ?? null : null,
      }));
    },
  });
}

export function useUpsertTestMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: Partial<TestMapping> & { requirement_id: string; silent?: boolean }) => {
      const { silent, ...payload } = m as any;
      if (payload.id) {
        const { id, created_at, updated_at, ...rest } = payload;
        const { error } = await supabase
          .from('requirement_test_mappings')
          .update(rest)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('requirement_test_mappings')
          .insert(payload);
        if (error) throw error;
      }
      return { silent: !!silent };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['test-mappings'] });
      if (!res?.silent) toast.success('Mappning sparad');
    },
    onError: (e: any) => toast.error('Fel vid sparande: ' + e.message),
  });
}

/** Creates additional test rounds (copies of a mapping) for the given test phases. */
export function useCreateTestRounds() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ mappings, phases }: { mappings: TestMapping[]; phases: string[] }) => {
      const rows: any[] = [];
      for (const m of mappings) {
        for (const phase of phases) {
          if (m.test_phase === phase) continue;
          rows.push({
            requirement_id: m.requirement_id,
            system_id: m.system_id,
            asset_id: m.asset_id,
            is_applicable: m.is_applicable,
            testability: m.testability,
            test_phase: phase,
            test_type: m.test_type,
            responsible_party: m.responsible_party,
            comment: m.comment,
          });
        }
      }
      if (rows.length === 0) return 0;
      const { error } = await supabase.from('requirement_test_mappings').insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ['test-mappings'] });
      toast.success(n ? `${n} testomgångar skapade` : 'Inga nya testomgångar behövdes');
    },
    onError: (e: any) => toast.error('Fel vid skapande av testomgångar: ' + e.message),
  });
}

export function useDeleteTestMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('requirement_test_mappings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['test-mappings'] });
      toast.success('Mappning borttagen');
    },
  });
}

export function useBulkInsertTestMappings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: Array<Partial<TestMapping> & { requirement_id: string }>) => {
      const { error } = await supabase.from('requirement_test_mappings').insert(rows as any);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ['test-mappings'] });
      toast.success(`${n} mappningar importerade`);
    },
    onError: (e: any) => toast.error('Importfel: ' + e.message),
  });
}

export function useBulkUpdateTestMappings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, values }: { ids: string[]; values: Partial<TestMapping> }) => {
      const { error } = await supabase
        .from('requirement_test_mappings')
        .update(values as any)
        .in('id', ids);
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ['test-mappings'] });
      toast.success(`${n} rader uppdaterade`);
    },
    onError: (e: any) => toast.error('Fel vid massuppdatering: ' + e.message),
  });
}
