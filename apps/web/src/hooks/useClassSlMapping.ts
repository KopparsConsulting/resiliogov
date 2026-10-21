import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { setClassSlMapping, type ClassSlMappingRow } from '@/lib/securityLevel';

/**
 * Loads the configurable mapping between facility classification level and
 * IEC 62443-3-3 target Security Level, and keeps the runtime cache in sync so
 * that the synchronous helpers in @/lib/securityLevel return live values.
 */
export function useClassSlMapping() {
  return useQuery({
    queryKey: ['class-sl-mapping'],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<ClassSlMappingRow[]> => {
      const { data, error } = await supabase
        .from('class_sl_mapping')
        .select('classification_level, target_sl, label, description')
        .order('classification_level');

      if (error) throw error;
      const rows = (data ?? []) as ClassSlMappingRow[];
      setClassSlMapping(rows);
      return rows;
    },
  });
}
