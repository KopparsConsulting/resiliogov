import { Building2, CheckCircle2, AlertCircle, Gauge } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { FacilityWithCompliance } from '@/types/compliance';
import { aggregateMetrics, formatCompliance, getComplianceLabel } from '@/lib/complianceMetrics';

interface KPICardsProps {
  facilities: FacilityWithCompliance[];
}

export function KPICards({ facilities }: KPICardsProps) {
  const totals = aggregateMetrics(facilities);
  const notAssessedFacilities = facilities.filter(
    (facility) => getComplianceLabel({ coverage: facility.coverage ?? 0, compliance: facility.compliance ?? null }) === 'Ej bedömd'
  ).length;

  const kpis = [
    {
      title: 'Anläggningar',
      value: facilities.length,
      icon: Building2,
      description: 'Registrerade objekt',
      color: 'text-foreground',
      bgColor: 'bg-muted',
    },
    {
      title: 'Täckning',
      value: `${totals.coverage}%`,
      icon: Gauge,
      description: `${totals.assessed} av ${totals.total} krav bedömda`,
      color: 'text-foreground',
      bgColor: 'bg-muted',
    },
    {
      title: 'Efterlevnad',
      value: formatCompliance(totals.compliance),
      icon: CheckCircle2,
      description: 'Uppfyllda av bedömda krav',
      color: 'text-foreground',
      bgColor: 'bg-muted',
    },
    {
      title: 'Ej bedömda objekt',
      value: notAssessedFacilities,
      icon: AlertCircle,
      description: 'Anläggningar utan bedömning',
      color: 'text-status-warning',
      bgColor: 'bg-muted',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi, index) => (
        <Card
          key={kpi.title}
          className="kpi-card animate-fade-in"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                <p className="text-3xl font-bold tracking-tight mt-1">{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{kpi.description}</p>
              </div>
              <div className={`p-3 rounded-lg ${kpi.bgColor}`}>
                <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
