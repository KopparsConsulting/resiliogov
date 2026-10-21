import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  ResponsibleOrg,
  ResultStatus,
  TestPhase,
  TestType,
} from '@/components/test-model/constants';
import { fetchAllRows } from '@/lib/fetchAll';

export interface TestActivity {
  id: string;
  requirement_id: string;
  project_id: string | null;
  system_id: string | null;
  asset_id: string | null;
  test_phase: TestPhase | null;
  test_type: TestType | null;
  test_method: string | null;
  acceptance_criteria: string | null;
  responsible_org: ResponsibleOrg | null;
  responsible_party: string | null;
  result_status: ResultStatus;
}

export interface TestPlanRow {
  requirement_id: string;
  chapter_section: string;
  description: string;
  source_name: string | null;
  applicability: string;
  /** Compensating measures the test can address instead of the requirement itself. */
  measures: Array<{ id: string; description: string; measure_type: string; status: string }>;
  activities: TestActivity[];
}

export interface ProjectTestPlan {
  rows: TestPlanRow[];
  /** Requirements marked not applicable: excluded from the test plan. */
  excludedNotApplicable: number;
  withoutActivity: number;
  withoutCriteria: number;
  readyToRun: number;
}

/** Requirement scope of a project joined with its planned test activities. */
export function useProjectTestPlan(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-test-plan', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<ProjectTestPlan> => {
      const { data: scope, error: scopeError } = await fetchAllRows(() => supabase
        .from('project_requirements')
        .select('requirement_id, applicability, compensating_measures(id, description, measure_type, status), requirements(chapter_section, description, requirement_sources(document_name))')
        .eq('project_id', projectId as string));
      if (scopeError) throw scopeError;

      const { data: activities, error: activityError } = await fetchAllRows(() => supabase
        .from('requirement_test_mappings')
        .select(
          'id, requirement_id, project_id, system_id, asset_id, test_phase, test_type, test_method, acceptance_criteria, responsible_org, responsible_party, result_status',
        )
        .eq('project_id', projectId as string));
      if (activityError) throw activityError;

      const byRequirement = new Map<string, TestActivity[]>();
      for (const activity of (activities ?? []) as TestActivity[]) {
        const list = byRequirement.get(activity.requirement_id) ?? [];
        list.push(activity);
        byRequirement.set(activity.requirement_id, list);
      }

      const applicableScope = (scope ?? []).filter((row: Record<string, any>) => row.applicability !== 'not_applicable');
      const rows: TestPlanRow[] = applicableScope.map((row: Record<string, any>) => ({
        requirement_id: row.requirement_id,
        chapter_section: row.requirements?.chapter_section ?? '',
        description: row.requirements?.description ?? '',
        source_name: row.requirements?.requirement_sources?.document_name ?? null,
        applicability: row.applicability,
        measures: row.compensating_measures ?? [],
        activities: byRequirement.get(row.requirement_id) ?? [],
      }));
      rows.sort((a, b) => a.chapter_section.localeCompare(b.chapter_section, 'sv'));

      const allActivities = rows.flatMap((row) => row.activities);
      return {
        rows,
        excludedNotApplicable: (scope ?? []).length - applicableScope.length,
        withoutActivity: rows.filter((row) => row.activities.length === 0).length,
        withoutCriteria: allActivities.filter((a) => !a.acceptance_criteria?.trim()).length,
        readyToRun: allActivities.filter(
          (a) =>
            !!a.acceptance_criteria?.trim() &&
            !!a.test_phase &&
            !!a.test_type &&
            (!!a.system_id || !!a.asset_id) &&
            a.result_status === 'not_tested',
        ).length,
      };
    },
  });
}

export interface TestActivityInput {
  id?: string;
  requirement_id: string;
  project_id: string;
  system_id: string | null;
  asset_id: string | null;
  test_phase: TestPhase | null;
  test_type: TestType | null;
  test_method: string | null;
  acceptance_criteria: string | null;
  responsible_org: ResponsibleOrg | null;
  responsible_party: string | null;
}

export function useSaveTestActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: TestActivityInput) => {
      const { id, ...values } = input;
      if (id) {
        const { error } = await supabase
          .from('requirement_test_mappings')
          .update(values)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('requirement_test_mappings').insert(values);
        if (error) throw error;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-test-plan', variables.project_id] });
      queryClient.invalidateQueries({ queryKey: ['project-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['test-mappings'] });
      toast.success('Testaktivitet sparad');
    },
    onError: (error: { message?: string }) =>
      toast.error(error?.message || 'Kunde inte spara testaktiviteten'),
  });
}

export function useDeleteTestActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; projectId: string }) => {
      const { error } = await supabase.from('requirement_test_mappings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-test-plan', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['test-mappings'] });
      toast.success('Testaktivitet borttagen');
    },
  });
}

/** Creates one activity per requirement that still lacks a test activity. */
export function useGenerateTestActivities() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      requirementIds,
      systemId,
      assetId,
      testPhase,
      testType,
      responsibleOrg,
    }: {
      projectId: string;
      requirementIds: string[];
      systemId: string | null;
      assetId: string | null;
      testPhase: TestPhase;
      testType: TestType;
      responsibleOrg: ResponsibleOrg;
    }) => {
      if (requirementIds.length === 0) return 0;
      const rows = requirementIds.map((requirement_id) => ({
        requirement_id,
        project_id: projectId,
        system_id: systemId,
        asset_id: assetId,
        test_phase: testPhase,
        test_type: testType,
        responsible_org: responsibleOrg,
      }));
      const { error } = await supabase.from('requirement_test_mappings').insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (count, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-test-plan', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['test-mappings'] });
      toast.success(count ? `${count} testaktiviteter skapade` : 'Alla krav har redan aktiviteter');
    },
    onError: (error: { message?: string }) =>
      toast.error(error?.message || 'Kunde inte skapa testaktiviteter'),
  });
}

export interface SupplierResultUpdate {
  mappingId: string;
  resultStatus: ResultStatus;
  testedAt: string | null;
  testedBy: string | null;
  deviation: string | null;
  evidence: string | null;
  comment: string | null;
}

/** Writes supplier-reported test results onto the project's existing test activities. */
export function useImportSupplierResults() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      updates,
    }: {
      projectId: string;
      updates: SupplierResultUpdate[];
    }) => {
      for (const update of updates) {
        const { error } = await supabase
          .from('requirement_test_mappings')
          .update({
            result_status: update.resultStatus,
            tested_at: update.testedAt,
            tested_by: update.testedBy,
            deviation: update.deviation,
            evidence: update.evidence,
            comment: update.comment,
          })
          .eq('id', update.mappingId);
        if (error) throw error;
      }
      return updates.length;
    },
    onSuccess: (count, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-test-plan', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['test-mappings'] });
      toast.success(`${count} testresultat importerade`);
    },
    onError: (error: { message?: string }) =>
      toast.error(error?.message || 'Kunde inte importera leverantörssvaren'),
  });
}

