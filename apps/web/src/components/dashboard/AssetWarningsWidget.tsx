import { AlertTriangle, AlertCircle, Wrench, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useAssetComplianceSummary } from '@/hooks/useAssetControls';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { fetchAllRows } from '@/lib/fetchAll';

export function AssetWarningsWidget() {
  // Fetch assets with warnings (EoL, patching issues)
  const { data: warningData } = useQuery({
    queryKey: ['asset-warnings-summary'],
    queryFn: async () => {
      const now = new Date();
      const twelveMonthsFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      // Fetch all assets with relevant fields
      const { data: assets, error } = await fetchAllRows(() => supabase
        .from('system_assets')
        .select(`
          id,
          criticality,
          eol_date,
          eos_date,
          last_patched_at,
          system:information_systems(is_critical_entity)
        `));

      if (error) throw error;

      const criticalAssets = (assets || []).filter(
        a => a.criticality === 'critical' || (a.system as any)?.is_critical_entity
      );

      // Count warnings
      let eolWithin12Months = 0;
      let patchingOverdue = 0;
      let criticalActions = 0;

      for (const asset of assets || []) {
        const isCritical = asset.criticality === 'critical' || (asset.system as any)?.is_critical_entity;

        // EoL check
        if (asset.eol_date) {
          const eolDate = new Date(asset.eol_date);
          if (eolDate <= now) {
            if (isCritical) criticalActions++;
          } else if (eolDate <= twelveMonthsFromNow) {
            eolWithin12Months++;
          }
        }

        // EoS check for critical components
        if (asset.eos_date && isCritical) {
          const eosDate = new Date(asset.eos_date);
          if (eosDate <= now) {
            criticalActions++;
          }
        }

        // Patching check for critical components
        if (isCritical) {
          if (!asset.last_patched_at) {
            patchingOverdue++;
          } else {
            const lastPatched = new Date(asset.last_patched_at);
            if (lastPatched < ninetyDaysAgo) {
              patchingOverdue++;
            }
          }
        }
      }

      return {
        criticalActions,
        eolWithin12Months,
        patchingOverdue,
        totalCriticalAssets: criticalAssets.length,
      };
    },
  });

  const { data: complianceSummary } = useAssetComplianceSummary();

  if (!warningData && !complianceSummary) {
    return null;
  }

  const { criticalActions = 0, eolWithin12Months = 0, patchingOverdue = 0 } = warningData || {};
  const pendingControls = complianceSummary?.critical?.pending || 0;

  // Don't show widget if there are no warnings
  if (criticalActions === 0 && eolWithin12Months === 0 && patchingOverdue === 0 && pendingControls === 0) {
    return null;
  }

  return (
    <Card className="border-status-warning/30 bg-subtle">
      <CardContent className="p-4">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-status-warning" />
          Komponentvarningar
        </h3>
        <div className="grid gap-2">
          {criticalActions > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="w-6 h-6 rounded-full bg-muted text-status-warning flex items-center justify-center text-xs font-bold">
                {criticalActions}
              </span>
              <span className="text-muted-foreground">Kritiska åtgärder krävs</span>
            </div>
          )}
          {eolWithin12Months > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="w-6 h-6 rounded-full bg-muted text-status-warning flex items-center justify-center text-xs font-bold">
                {eolWithin12Months}
              </span>
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">EoL inom 12 månader</span>
            </div>
          )}
          {patchingOverdue > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="w-6 h-6 rounded-full bg-muted text-status-warning flex items-center justify-center text-xs font-bold">
                {patchingOverdue}
              </span>
              <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Patching &gt; 90 dagar</span>
            </div>
          )}
          {pendingControls > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="w-6 h-6 rounded-full bg-muted text-status-warning flex items-center justify-center text-xs font-bold">
                {pendingControls}
              </span>
              <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Kontroller ej verifierade</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
