import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useComponentRequirementMetrics } from '@/hooks/useComponentRequirements';

/** "Komponentkrav": status of requirements inherited by the system's components, kept separate from the system's own requirements. */
export function ComponentRequirementsSummary({ systemId }: { systemId: string }) {
  const { data: metrics } = useComponentRequirementMetrics(systemId);
  if (!metrics || metrics.total + metrics.out_of_scope === 0) return null;

  const items = [
    { label: 'Komponenter med krav', value: metrics.component_count },
    { label: 'Komponentkrav', value: metrics.total },
    { label: 'Bedömda', value: metrics.assessed },
    { label: 'Ej tillämpliga', value: metrics.not_applicable },
    { label: 'Täckning', value: `${metrics.coverage}%` },
    { label: 'Efterlevnad', value: `${metrics.compliance}%` },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Komponentkrav</CardTitle>
        <p className="text-xs text-muted-foreground">
          Krav som komponenterna ärver från standardprofiler. Räknas separat från systemets egna krav.
        </p>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-6">
        {items.map((item) => (
          <div key={item.label}>
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="text-xl font-semibold">{item.value}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
