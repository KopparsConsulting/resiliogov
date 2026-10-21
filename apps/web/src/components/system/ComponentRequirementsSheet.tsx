import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusEditDialog } from '@/components/compliance/StatusEditDialog';
import { STATUS_STYLES } from '@/components/compliance/statusConfig';
import { OutOfScopeBadge } from '@/components/compliance/OutOfScopeBadge';
import { useComponentTypes } from '@/hooks/useComponentTypes';
import { useRequirementProfiles } from '@/hooks/useRequirementProfiles';
import { groupMeasuresByParent, useScopeMeasures } from '@/hooks/useCompensatingMeasures';
import {
  useComponentRequirements,
  useSetAssetComponentType,
  useSyncComponentRequirements,
  useUpdateComponentAssessment,
  type ComponentRequirementRecord,
} from '@/hooks/useComponentRequirements';
import {
  compareRequirementCodes,
  functionalRequirementLabel,
  functionalRequirementOf,
} from '@/lib/functionalRequirements';
import { APPLICABILITY_STATUS_LABELS, MEASURE_STATUS_LABELS, type RequirementApplicability } from '@/types/project';
import type { SystemAsset } from '@/types/system';

const NONE = 'none';

interface ComponentRequirementsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: SystemAsset;
}

/** Requirements a component inherits from its type's standard profile, with per-component assessments. */
export function ComponentRequirementsSheet({ open, onOpenChange, asset }: ComponentRequirementsSheetProps) {
  const { data: componentTypes = [] } = useComponentTypes();
  const { data: profiles = [] } = useRequirementProfiles();
  const { data: records = [] } = useComponentRequirements(open ? asset.id : undefined);
  const setType = useSetAssetComponentType();
  const sync = useSyncComponentRequirements();
  const [editing, setEditing] = useState<ComponentRequirementRecord | null>(null);
  const updateAssessment = useUpdateComponentAssessment();

  const standardProfile = profiles.find((p) => p.is_default && p.component_type_id === asset.component_type_id);
  const { data: measures } = useScopeMeasures('profile', standardProfile?.id);
  const measuresByItem = useMemo(() => groupMeasuresByParent('profile', measures), [measures]);

  const groups = useMemo(() => {
    const sorted = [...records].sort((a, b) => compareRequirementCodes(a.chapter_section, b.chapter_section));
    const map = new Map<number | null, ComponentRequirementRecord[]>();
    for (const record of sorted) {
      const fr = functionalRequirementOf(record.chapter_section);
      map.set(fr, [...(map.get(fr) ?? []), record]);
    }
    return Array.from(map).sort(([a], [b]) => (a ?? 99) - (b ?? 99));
  }, [records]);

  const inScope = records.filter((r) => !r.out_of_scope_since);
  const notApplicable = inScope.filter((r) => r.status === 'Ej tillämpligt').length;
  const assessed = inScope.filter((r) => r.status !== 'Ej påbörjad' && r.status !== 'Pågående').length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Komponentkrav – {asset.name}</SheetTitle>
          <SheetDescription>
            Kraven ärvs från standardprofilen för komponentens typ. Ej tillämpliga krav följer med med profilens motivering.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label htmlFor="asset-component-type">Komponenttyp</Label>
              <Select
                value={asset.component_type_id ?? NONE}
                onValueChange={(value) =>
                  setType.mutate({ assetId: asset.id, componentTypeId: value === NONE ? null : value })
                }
              >
                <SelectTrigger id="asset-component-type" className="w-[240px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Ingen</SelectItem>
                  {componentTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" disabled={sync.isPending} onClick={() => sync.mutate(asset.id)}>
              <RefreshCw className={`mr-2 h-4 w-4 ${sync.isPending ? 'animate-spin' : ''}`} />
              Synka krav
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            {standardProfile ? (
              <>Standardprofil: <Link className="underline" to={`/profiles/${standardProfile.id}`}>{standardProfile.name}</Link></>
            ) : asset.component_type_id ? (
              'Komponenttypen har ingen standardprofil.'
            ) : (
              'Välj en komponenttyp för att få komponentkrav.'
            )}
          </p>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Krav', value: inScope.length },
              { label: 'Bedömda', value: assessed },
              { label: 'Ej tillämpliga', value: notApplicable },
            ].map((metric) => (
              <div key={metric.label} className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">{metric.label}</p>
                <p className="text-xl font-semibold">{metric.value}</p>
              </div>
            ))}
          </div>

          {groups.map(([fr, rows]) => (
            <section key={fr ?? 'other'} className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">
                {functionalRequirementLabel(fr)} <span className="font-normal">({rows.length})</span>
              </h3>
              {rows.map((record) => {
                const style = STATUS_STYLES[record.status];
                const itemMeasures = record.profile_item_id ? measuresByItem.get(record.profile_item_id) ?? [] : [];
                return (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => setEditing(record)}
                    className="w-full rounded-md border p-3 text-left hover:bg-accent/50"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium font-mono">{record.chapter_section}</span>
                      {record.sl_capability != null && <Badge variant="secondary" className="text-xs">SL {record.sl_capability}</Badge>}
                      <Badge variant="outline" className={`text-xs ${style?.badgeClass ?? ''}`}>{record.status}</Badge>
                      {record.applicability && (
                        <Badge variant="outline" className="text-xs">
                          Profil: {APPLICABILITY_STATUS_LABELS[record.applicability as RequirementApplicability] ?? record.applicability}
                        </Badge>
                      )}
                      {record.out_of_scope_since && <OutOfScopeBadge reason={record.out_of_scope_reason} since={record.out_of_scope_since} />}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{record.description}</p>
                    {record.justification && (
                      <p className="mt-1 text-xs"><span className="text-muted-foreground">Motivering: </span>{record.justification}</p>
                    )}
                    {itemMeasures.length > 0 && (
                      <ul className="mt-1 space-y-0.5 text-xs">
                        {itemMeasures.map((measure) => (
                          <li key={measure.id} className="flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3 text-muted-foreground" />
                            <span>Kompenserande åtgärd: {measure.description}</span>
                            <span className="text-muted-foreground">({MEASURE_STATUS_LABELS[measure.status].toLowerCase()})</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </button>
                );
              })}
            </section>
          ))}
        </div>

        <StatusEditDialog
          open={!!editing}
          onOpenChange={(value) => !value && setEditing(null)}
          title={editing ? `${editing.chapter_section} · ${asset.name}` : ''}
          description={editing?.description}
          initial={{
            status: editing?.status,
            justification: editing?.justification ?? '',
            evidence: editing?.evidence ?? '',
            evidence_url: editing?.evidence_url ?? '',
            valid_until: editing?.valid_until ?? null,
            notes: editing?.notes ?? '',
          }}
          isSaving={updateAssessment.isPending}
          onSave={(values) =>
            editing && updateAssessment.mutate({ id: editing.id, values }, { onSuccess: () => setEditing(null) })
          }
        />
      </SheetContent>
    </Sheet>
  );
}
