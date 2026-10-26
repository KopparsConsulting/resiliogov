import { ClassificationMatrix } from '@/components/requirements/ClassificationMatrix';
import { RequirementSourcesAdminCard } from '@/components/requirements/RequirementSourcesAdminCard';
import { useRequirements } from '@/hooks/useRequirements';

/**
 * Klassningsmodell – hur anläggningsklass översätts till Security Level och
 * vilka regelverk som riktar sig mot tillgångar. Sätts sällan och beslutas;
 * ligger därför utanför kravdatabasen.
 */
export default function ClassificationPage() {
  const { data: requirements = [], isLoading } = useRequirements();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Klassningsmodell</h1>
        <p className="text-muted-foreground">
          Anläggningsklass 1–5, motsvarande Security Level och vilka regelverk som matchas mot tillgångar.
        </p>
      </div>

      {isLoading
        ? <div className="h-64 bg-muted animate-pulse rounded" />
        : <ClassificationMatrix requirements={requirements} defaultOpen />}

      <RequirementSourcesAdminCard defaultOpen />
    </div>
  );
}
