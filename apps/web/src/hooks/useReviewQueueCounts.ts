import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useReviewStatus, needsReview } from '@/hooks/useRequirementReviews';
import { useRequirements } from '@/hooks/useRequirements';

export interface ReviewQueueCounts {
  requirements: number;
  domains: number;
  links: number;
  total: number;
}

/**
 * Hur mycket som väntar i granskningsköerna. Förslagen räknas i databasen
 * (count, inga rader hämtas); kraven med samma regel som kravdatabasens
 * filter "Kvar att granska".
 */
export function useReviewQueueCounts(): ReviewQueueCounts {
  const { data: requirements = [] } = useRequirements();
  const { data: reviewMap = new Map() } = useReviewStatus();

  const { data: domains = 0 } = useQuery({
    queryKey: ['domain-suggestions', 'count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('requirement_domain_suggestions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: links = 0 } = useQuery({
    queryKey: ['requirement-link-suggestions', 'count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('requirement_links')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (error) throw error;
      return count ?? 0;
    },
  });

  const reqCount = requirements.filter((r) => !r.repealed_at && needsReview(reviewMap.get(r.id))).length;
  return { requirements: reqCount, domains, links, total: reqCount + domains + links };
}
