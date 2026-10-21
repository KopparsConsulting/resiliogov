import { Plus, RefreshCw, ArrowRight, Archive } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { KPICards } from '@/components/dashboard/KPICards';
import { FacilitiesTable } from '@/components/dashboard/FacilitiesTable';
import { AssetWarningsWidget } from '@/components/dashboard/AssetWarningsWidget';
import { RegulatoryFrameworksWidget } from '@/components/dashboard/RegulatoryFrameworksWidget';

import { useFacilities } from '@/hooks/useFacilities';
import { useDomainCompliance } from '@/hooks/useDomainCompliance';
import { Skeleton } from '@/components/ui/skeleton';
import { DomainCard } from '@/components/executive/DomainCard';
const Dashboard = () => {
  const navigate = useNavigate();
  const { data: facilities, isLoading, refetch, isRefetching } = useFacilities();
  const { data: domains, isLoading: domainsLoading } = useDomainCompliance();

  // Get top 3 domains by priority
  const topDomains = domains?.slice(0, 3) ?? [];

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Översikt av säkerhet och efterlevnad
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2" asChild>
            <Link to="/export">
              <Archive className="h-4 w-4" />
              Export
            </Link>
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => navigate('/create')}>
            <Plus className="mr-2 h-4 w-4" />
            Ny anläggning
          </Button>
        </div>
      </div>

      {/* Asset Warnings Widget */}
      <AssetWarningsWidget />

      {/* Regulatory Frameworks */}
      <RegulatoryFrameworksWidget />

      {/* Quick Domain Overview */}
      {!domainsLoading && topDomains.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Säkerhetsdomäner</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/executive')}>
              Visa alla
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {topDomains.map((domain) => (
              <DomainCard key={domain.id} domain={domain} />
            ))}
          </div>
        </div>
      )}

      {/* Facilities Section */}
      {isLoading ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </>
      ) : (
        <>
          <KPICards facilities={facilities || []} />
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Senaste anläggningar</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/facilities')}>
                Visa alla
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <FacilitiesTable facilities={(facilities || []).slice(0, 5)} />
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
