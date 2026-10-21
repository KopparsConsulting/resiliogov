import { metricCompliance, metricCoverage } from '@/lib/complianceMetrics';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DomainWithStats } from '@/types/domain';
import type { Requirement } from '@/types/compliance';
import { fetchAllRows } from '@/lib/fetchAll';

export function useDomainCompliance() {
  return useQuery({
    queryKey: ['domain_compliance'],
    queryFn: async () => {
      // Fetch all domains
      const { data: domains, error: domainsError } = await fetchAllRows(() => supabase
        .from('security_domains')
        .select('*')
        .order('priority_order', { ascending: true }));

      if (domainsError) throw domainsError;

      // Antal krav per domän (upphävda krav räknas inte)
      const { data: requirements, error: reqError } = await fetchAllRows(() => supabase
        .from('requirements')
        .select('id, domain_id, repealed_at'));

      if (reqError) throw reqError;

      // Mått per domän över ALLA bedömningar – anläggningar och system –
      // från databasvyn (samma definition som överallt). Varje post räknas
      // en gång, så system kopplade till flera anläggningar dubbelräknas inte.
      const { data: rows, error: metricsError } = await fetchAllRows(() => supabase
        .from('compliance_domain_metrics')
        .select('*'), { stableOrderColumn: 'object_id' });

      if (metricsError) throw metricsError;

      const sums = new Map<string, { total: number; assessed: number; notApplicable: number; fulfilled: number }>();
      for (const row of rows || []) {
        if (!row.domain_id) continue;
        const acc = sums.get(row.domain_id) ?? { total: 0, assessed: 0, notApplicable: 0, fulfilled: 0 };
        acc.total += row.total ?? 0;
        acc.assessed += row.assessed ?? 0;
        acc.notApplicable += row.not_applicable ?? 0;
        acc.fulfilled += row.fulfilled ?? 0;
        sums.set(row.domain_id, acc);
      }

      const domainsWithStats: DomainWithStats[] = domains.map((domain) => {
        const requirementCount = requirements.filter(
          (r) => r.domain_id === domain.id && !r.repealed_at
        ).length;
        const acc = sums.get(domain.id) ?? { total: 0, assessed: 0, notApplicable: 0, fulfilled: 0 };
        const coverage = metricCoverage(acc.assessed, acc.total);
        const compliance = metricCompliance(acc.fulfilled, acc.assessed, acc.notApplicable);

        return {
          ...domain,
          total_requirements: requirementCount,
          compliant_count: acc.fulfilled,
          pending_count: acc.total - acc.assessed,
          compliance_percentage: compliance ?? 0,
          coverage_percentage: coverage,
          compliance_value: compliance,
        };
      });

      return domainsWithStats;
    },
  });
}

export function useRequirementsByDomain(domainId?: string) {
  return useQuery({
    queryKey: ['requirements_by_domain', domainId],
    queryFn: async () => {
      const buildQuery = () => {
        let query = supabase
          .from('requirements')
          .select('*, requirement_sources(*)');

        if (domainId) {
          query = query.eq('domain_id', domainId);
        }
        return query;
      };

      const { data, error } = await fetchAllRows(buildQuery);

      if (error) throw error;
      return data as Requirement[];
    },
    enabled: !!domainId,
  });
}
