import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAll';
import type { MeasureScale, RequirementAddressee } from '@/lib/requirementAddressee';

export interface RequirementSourceWithCount {
  id: string;
  document_name: string;
  category: string;
  description: string | null;
  document_url: string | null;
  addressee: RequirementAddressee;
  measure_scale: MeasureScale;
  requirement_count: number;
}

export function useRequirementSources() {
  return useQuery({
    queryKey: ['requirement-sources-with-counts'],
    queryFn: async (): Promise<RequirementSourceWithCount[]> => {
      const { data: sources, error: srcError } = await fetchAllRows(() => supabase
        .from('requirement_sources')
        .select('id, document_name, category, description, document_url, addressee, measure_scale'));

      if (srcError) throw srcError;

      const { data: requirements, error: reqError } = await fetchAllRows(() => supabase
        .from('requirements')
        .select('source_id'));

      if (reqError) throw reqError;

      const countMap = new Map<string, number>();
      for (const requirement of requirements || []) {
        if (requirement.source_id) {
          countMap.set(requirement.source_id, (countMap.get(requirement.source_id) || 0) + 1);
        }
      }

      return (sources || []).map((source) => ({
        ...source,
        addressee: source.addressee as RequirementAddressee,
        measure_scale: source.measure_scale as MeasureScale,
        requirement_count: countMap.get(source.id) || 0,
      }));
    },
  });
}

export function useUpdateRequirementSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...values
    }: {
      id: string;
      addressee?: RequirementAddressee;
      measure_scale?: MeasureScale;
    }) => {
      const { error } = await supabase.from('requirement_sources').update(values).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requirement-sources-with-counts'] });
      queryClient.invalidateQueries({ queryKey: ['requirements-explorer'] });
      toast.success('Regelverket uppdaterat');
    },
    onError: (error: { message?: string }) => toast.error(error?.message || 'Kunde inte uppdatera regelverket'),
  });
}
