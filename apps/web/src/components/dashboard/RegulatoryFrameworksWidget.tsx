import { BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useRequirementSources } from '@/hooks/useRequirementSources';

export function RegulatoryFrameworksWidget() {
  const { data: sources, isLoading } = useRequirementSources();

  if (isLoading) {
    return <Skeleton className="h-48" />;
  }

  if (!sources || sources.length === 0) return null;

  const totalRequirements = sources.reduce((sum, s) => sum + s.requirement_count, 0);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Regelverk</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sources.map((source) => (
          <Card key={source.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <BookOpen className="h-4 w-4 flex-shrink-0 text-primary" />
                  <CardTitle className="text-sm font-medium truncate">
                    {source.document_name}
                  </CardTitle>
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {source.category}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">{source.requirement_count}</span>
                <span className="text-sm text-muted-foreground">krav</span>
              </div>
              {source.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {source.description}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Totalt <span className="font-medium">{totalRequirements}</span> krav från{' '}
        <span className="font-medium">{sources.length}</span> regelverk
      </p>
    </div>
  );
}
