import { Plus, RefreshCw, Archive } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { KPICards } from '@/components/dashboard/KPICards';
import { FacilitiesTable } from '@/components/dashboard/FacilitiesTable';

import { useFacilities } from '@/hooks/useFacilities';
import { Skeleton } from '@/components/ui/skeleton';

const FacilitiesPage = () => {
  const navigate = useNavigate();
  const { data: facilities, isLoading, refetch, isRefetching } = useFacilities();

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Anläggningar</h1>
          <p className="text-muted-foreground">
            Hantera infrastrukturanläggningar och deras efterlevnad
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
              <h2 className="text-lg font-semibold">Alla anläggningar</h2>
              <span className="text-sm text-muted-foreground">
                {(facilities || []).length} objekt
              </span>
            </div>
            <FacilitiesTable facilities={facilities || []} />
          </div>
        </>
      )}
    </div>
  );
};

export default FacilitiesPage;
