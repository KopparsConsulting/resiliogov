import { useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Printer } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DomainSuggestionsCard } from '@/components/requirements/DomainSuggestionsCard';
import { RequirementLinkSuggestionsCard } from '@/components/requirements/RequirementLinkSuggestionsCard';
import { ReviewStatusBadge } from '@/components/requirements/RequirementReviewActions';
import { useRequirements } from '@/hooks/useRequirements';
import { useReviewStatus, needsReview } from '@/hooks/useRequirementReviews';
import { useReviewQueueCounts } from '@/hooks/useReviewQueueCounts';
import { shortSourceName } from '@/hooks/useLinkSuggestions';

const TABS = ['krav', 'domaner', 'lankar'] as const;
type Tab = (typeof TABS)[number];

/** Krav som är ogranskade, flaggade eller ändrade sedan godkännandet */
function RequirementsToReview() {
  const navigate = useNavigate();
  const { data: requirements = [], isLoading } = useRequirements();
  const { data: reviewMap = new Map() } = useReviewStatus();

  const todo = useMemo(
    () => requirements.filter((r) => !r.repealed_at && needsReview(reviewMap.get(r.id))),
    [requirements, reviewMap],
  );

  if (isLoading) return <div className="h-64 bg-muted animate-pulse rounded" />;
  if (todo.length === 0) return <p className="text-sm text-muted-foreground">Alla krav är granskade.</p>;

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <p className="text-sm text-muted-foreground">
            {todo.length} krav är ogranskade, flaggade eller ändrade sedan de godkändes.
          </p>
          <div className="flex-1" />
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              sessionStorage.setItem('requirement-print-selection', JSON.stringify(todo.map((r) => r.id)));
              navigate('/requirements/print');
            }}
          >
            <Printer className="mr-2 h-4 w-4" />
            Skriv ut för granskning ({todo.length})
          </Button>
        </div>
        <div className="divide-y">
          {todo.map((r) => (
            <Link
              key={r.id}
              to={`/requirements/${r.id}/review`}
              className="grid gap-2 p-3 hover:bg-muted/40 md:grid-cols-[110px_1fr_auto] md:items-center"
            >
              <ReviewStatusBadge review={reviewMap.get(r.id)} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{shortSourceName(r.source_name)}</span>
                  <span className="font-mono text-foreground">{r.chapter_section}</span>
                </div>
                <p className="text-sm line-clamp-2">{r.description}</p>
              </div>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                Granska <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TabLabel({ label, count }: { label: string; count: number }) {
  return (
    <span className="flex items-center gap-2">
      {label}
      {count > 0 && <Badge variant="secondary" className="px-1.5 py-0 text-xs tabular-nums">{count}</Badge>}
    </span>
  );
}

/**
 * Granskning – arbetskön för kravägaren. Krav, domänförslag och kravlänkar
 * ligger i var sin flik och får hela sidans höjd. Inget gäller förrän det
 * godkänts; besluten fattas i databasen och loggas.
 */
export default function ReviewPage() {
  const [params, setParams] = useSearchParams();
  const counts = useReviewQueueCounts();
  const raw = params.get('tab');
  const tab: Tab = (TABS as readonly string[]).includes(raw ?? '') ? (raw as Tab) : 'krav';

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Granskning</h1>
        <p className="text-muted-foreground">
          Krav, domänförslag och kravlänkar som väntar på beslut. Inget blir gällande förrän det godkänts.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v }, { replace: true })}>
        <TabsList>
          <TabsTrigger value="krav"><TabLabel label="Krav" count={counts.requirements} /></TabsTrigger>
          <TabsTrigger value="domaner"><TabLabel label="Domänförslag" count={counts.domains} /></TabsTrigger>
          <TabsTrigger value="lankar"><TabLabel label="Kravlänkar" count={counts.links} /></TabsTrigger>
        </TabsList>
        <TabsContent value="krav" className="mt-4"><RequirementsToReview /></TabsContent>
        <TabsContent value="domaner" className="mt-4"><DomainSuggestionsCard layout="page" /></TabsContent>
        <TabsContent value="lankar" className="mt-4"><RequirementLinkSuggestionsCard layout="page" /></TabsContent>
      </Tabs>
    </div>
  );
}
