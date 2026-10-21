import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Lock, 
  Server, 
  Mountain, 
  Activity, 
  ClipboardCheck,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { DomainWithStats } from '@/types/domain';
import { ComplianceLabelBadge, MetricPair } from '@/components/compliance/ComplianceMetricsDisplay';
import { domainIcon } from '@/lib/domainIcons';


function getStatusColor(percentage: number): string {
  if (percentage >= 80) return 'bg-status-success';
  if (percentage >= 50) return 'bg-status-warning';
  return 'bg-destructive';
}


interface DomainCardProps {
  domain: DomainWithStats;
}

export function DomainCard({ domain }: DomainCardProps) {
  const navigate = useNavigate();
  const IconComponent = domainIcon(domain.icon);
  const coverage = domain.coverage_percentage ?? 0;
  const compliance = domain.compliance_value ?? null;

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow group"
      onClick={() => navigate(`/domain/${domain.slug}`)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-lg bg-muted text-foreground"
            >
              <IconComponent 
                className="h-5 w-5" 
              />
            </div>
            <div>
              <CardTitle className="text-base">{domain.name}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {domain.description}
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <ComplianceLabelBadge coverage={coverage} compliance={compliance} />
            <MetricPair coverage={coverage} compliance={compliance} />
          </div>
          <Progress value={coverage} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{domain.compliant_count} uppfyllda</span>
            <span>{domain.pending_count} ej bedömda</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
