import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ComponentType } from '@/types/project';
import { fetchAllRows } from '@/lib/fetchAll';

export function useComponentTypes(systemId?: string | null) {
  return useQuery({
    queryKey: ['component-types', systemId ?? 'all'],
    queryFn: async (): Promise<ComponentType[]> => {
      const buildQuery = () => {
        let query = supabase.from('component_types').select('*').order('name');
        if (systemId) query = query.or(`system_id.eq.${systemId},system_id.is.null`);
        return query;
      };

      const { data, error } = await fetchAllRows(buildQuery);
      if (error) throw error;
      return (data ?? []) as ComponentType[];
    },
  });
}

export function useCreateComponentType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      name: string;
      system_id?: string | null;
      description?: string | null;
      manufacturer?: string | null;
      model?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('component_types')
        .insert(values)
        .select()
        .single();
      if (error) throw error;
      return data as ComponentType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['component-types'] });
      toast.success('Komponenttyp skapad');
    },
    onError: (error: { message?: string }) =>
      toast.error(error?.message || 'Kunde inte skapa komponenttyp'),
  });
}
