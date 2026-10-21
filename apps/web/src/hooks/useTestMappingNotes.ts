import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { fetchAllRows } from '@/lib/fetchAll';

export interface TestMappingNote {
  id: string;
  mapping_id: string;
  note: string;
  author_email: string | null;
  created_at: string;
}

/** Loads all notes once and groups them per mapping id. */
export function useTestMappingNotes() {
  return useQuery({
    queryKey: ['test-mapping-notes'],
    queryFn: async (): Promise<Map<string, TestMappingNote[]>> => {
      const { data, error } = await fetchAllRows(() => supabase
        .from('test_mapping_notes')
        .select('*')
        .order('created_at', { ascending: false }));
      if (error) throw error;

      const grouped = new Map<string, TestMappingNote[]>();
      for (const note of (data ?? []) as TestMappingNote[]) {
        const list = grouped.get(note.mapping_id);
        if (list) list.push(note);
        else grouped.set(note.mapping_id, [note]);
      }
      return grouped;
    },
  });
}

export function useAddTestMappingNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ mappingId, note }: { mappingId: string; note: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from('test_mapping_notes').insert({
        mapping_id: mappingId,
        note,
        author_email: userData.user?.email ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['test-mapping-notes'] }),
    onError: (error: any) => toast.error('Kunde inte spara anteckningen: ' + error.message),
  });
}
