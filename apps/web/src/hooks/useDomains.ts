import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SecurityDomain, DomainChecklist, ActionItem } from '@/types/domain';
import type { Json } from '@/integrations/supabase/types';
import { fetchAllRows } from '@/lib/fetchAll';

export function useDomains() {
  return useQuery({
    queryKey: ['security_domains'],
    queryFn: async () => {
      const { data, error } = await fetchAllRows(() => supabase
        .from('security_domains')
        .select('*')
        .order('priority_order', { ascending: true }));

      if (error) throw error;
      return data as SecurityDomain[];
    },
  });
}

export function useDomain(slug: string) {
  return useQuery({
    queryKey: ['security_domains', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_domains')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) throw error;
      return data as SecurityDomain;
    },
    enabled: !!slug,
  });
}

export function useDomainChecklists(domainId?: string) {
  return useQuery({
    queryKey: ['domain_checklists', domainId],
    queryFn: async () => {
      const buildQuery = () => {
        let query = supabase
          .from('domain_checklists')
          .select('*, security_domains(*)')
          .order('priority', { ascending: true });

        if (domainId) {
          query = query.eq('domain_id', domainId);
        }
        return query;
      };

      const { data, error } = await fetchAllRows(buildQuery);

      if (error) throw error;
      
      // Transform the data to match our types
      return (data ?? []).map(item => ({
        ...item,
        action_items: (item.action_items as unknown as ActionItem[]) ?? [],
      })) as DomainChecklist[];
    },
  });
}

export function useUpdateChecklistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      checklistId,
      actionItems,
    }: {
      checklistId: string;
      actionItems: ActionItem[];
    }) => {
      const { data, error } = await supabase
        .from('domain_checklists')
        .update({ action_items: JSON.parse(JSON.stringify(actionItems)) as Json })
        .eq('id', checklistId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domain_checklists'] });
    },
  });
}
