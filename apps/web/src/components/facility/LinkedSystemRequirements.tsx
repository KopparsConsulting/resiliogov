import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Server, ExternalLink } from 'lucide-react';
import { fetchAllRows } from '@/lib/fetchAll';

interface Props {
  facilityId: string;
}

interface Row {
  system_id: string;
  system_name: string;
  total: number;
  bySource: Record<string, number>;
}

export function LinkedSystemRequirements({ facilityId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['facility-linked-system-requirements', facilityId],
    queryFn: async (): Promise<Row[]> => {
      const { data: links } = await fetchAllRows(() => supabase
        .from('facility_systems')
        .select('system_id, information_systems(id, name)')
        .eq('facility_id', facilityId));

      const systems = (links || [])
        .map((l: any) => l.information_systems)
        .filter(Boolean) as Array<{ id: string; name: string }>;

      if (systems.length === 0) return [];

      const systemIds = systems.map(s => s.id);
      const { data: records } = await fetchAllRows(() => supabase
        .from('system_compliance_records')
        .select('system_id, requirements(requirement_sources(document_name))')
        .in('system_id', systemIds));

      return systems.map(sys => {
        const sysRecords = (records || []).filter((r: any) => r.system_id === sys.id);
        const bySource: Record<string, number> = {};
        for (const r of sysRecords as any[]) {
          const source = r.requirements?.requirement_sources?.document_name || 'Okänd källa';
          bySource[source] = (bySource[source] ?? 0) + 1;
        }
        return {
          system_id: sys.id,
          system_name: sys.name,
          total: sysRecords.length,
          bySource,
        };
      });
    },
  });

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground text-sm">
          Inga informationssystem är kopplade till denna anläggning.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Cybersäkerhetskrav (IEC 62443-3-3 m.fl.) är kopplade till systemen under anläggningen, inte direkt till anläggningen. Klicka på ett system för att granska och åtgärda kraven.
      </p>
      {data.map(row => (
        <Card key={row.system_id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Server className="h-5 w-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <Link
                    to={`/systems/${row.system_id}`}
                    className="font-medium text-sm hover:underline flex items-center gap-1"
                  >
                    {row.system_name}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(row.bySource).map(([src, count]) => (
                      <Badge key={src} variant="outline" className="text-xs font-normal">
                        {src}: {count}
                      </Badge>
                    ))}
                    {row.total === 0 && (
                      <span className="text-xs italic text-muted-foreground">
                        Inga krav synkade ännu — öppna systemet och klicka "Uppdatera krav".
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl font-bold">{row.total}</div>
                <div className="text-xs text-muted-foreground">krav</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
