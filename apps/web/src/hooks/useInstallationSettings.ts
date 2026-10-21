import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

/** Installationens inställningar (en rad, id = 1). Ändringar loggas i revisionskedjan. */
export function useInstallationSettings() {
  return useQuery({
    queryKey: ['installation-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('installation_settings').select('*').eq('id', 1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSetAiComplianceAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase.from('installation_settings').update({ ai_compliance_analysis: enabled }).eq('id', 1);
      if (error) throw error;
      return enabled;
    },
    onSuccess: (enabled) => {
      queryClient.invalidateQueries({ queryKey: ['installation-settings'] });
      toast.success(enabled ? 'AI-analys av efterlevnadsdata påslagen' : 'AI-analys av efterlevnadsdata avstängd');
    },
    onError: (e: Error) => toast.error(`Kunde inte spara: ${e.message}`),
  });
}
