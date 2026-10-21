import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  DEFAULT_THRESHOLDS,
  setScoringThresholds,
  type ScoringThresholds,
} from '@/lib/complianceMetrics';

export function useScoringThresholds() {
  return useQuery({
    queryKey: ['scoring-thresholds'],
    queryFn: async (): Promise<ScoringThresholds> => {
      const { data, error } = await supabase.from('scoring_thresholds').select('key, value');
      if (error) throw error;

      const thresholds = { ...DEFAULT_THRESHOLDS };
      (data || []).forEach(row => {
        if (row.key in thresholds) {
          thresholds[row.key as keyof ScoringThresholds] = Number(row.value);
        }
      });
      return thresholds;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Loads configurable thresholds once and keeps the shared cache in sync. */
export function ScoringThresholdsLoader() {
  const { data } = useScoringThresholds();

  useEffect(() => {
    if (data) setScoringThresholds(data);
  }, [data]);

  return null;
}
