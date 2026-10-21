import { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAll';
import { useInformationSystems } from '@/hooks/useInformationSystems';
import { useFacilities } from '@/hooks/useFacilities';
import { useDeleteMeasure, useSaveMeasure, type MeasureInput } from '@/hooks/useCompensatingMeasures';
import { RESPONSIBLE_ORGS, RESPONSIBLE_ORG_LABELS } from '@/components/test-model/constants';
import {
  MEASURE_STATUSES,
  MEASURE_STATUS_LABELS,
  MEASURE_TYPES,
  MEASURE_TYPE_LABELS,
  type CompensatingMeasure,
  type ScopeItem,
  type ScopeKind,
} from '@/types/project';

const NONE = 'none';

interface CompensatingMeasuresSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: ScopeKind;
  item: ScopeItem | null;
  requirementLabel: string;
  measures: CompensatingMeasure[];
  /** Offered after the first measure exists, when the row is not yet compensated. */
  onMarkCompensated?: () => void;
}

function emptyMeasure(): MeasureInput {
  return {
    description: '',
    measure_type: 'physical',
    system_id: null,
    asset_id: null,
    facility_id: null,
    proposed_by: 'supplier',
    status: 'proposed',
  };
}

/** Encodes the carrier as "system:<id>", "asset:<id>" or "facility:<id>". */
function carrierValue(measure: MeasureInput) {
  if (measure.system_id) return `system:${measure.system_id}`;
  if (measure.asset_id) return `asset:${measure.asset_id}`;
  if (measure.facility_id) return `facility:${measure.facility_id}`;
  return NONE;
}

function withCarrier(measure: MeasureInput, value: string): MeasureInput {
  const [type, id] = value === NONE ? [null, null] : value.split(':');
  return {
    ...measure,
    system_id: type === 'system' ? id : null,
    asset_id: type === 'asset' ? id : null,
    facility_id: type === 'facility' ? id : null,
  };
}

function useAssetOptions(enabled: boolean) {
  return useQuery({
    queryKey: ['asset-options'],
    enabled,
    queryFn: async () => {
      const { data, error } = await fetchAllRows(() => supabase
        .from('system_assets')
        .select('id, name, information_systems(name)')
        .order('name'));
      if (error) throw error;
      return (data ?? []).map((row: Record<string, any>) => ({
        id: row.id as string,
        name: row.information_systems?.name ? `${row.name} (${row.information_systems.name})` : (row.name as string),
      }));
    },
  });
}

export function CompensatingMeasuresSheet({
  open,
  onOpenChange,
  kind,
  item,
  requirementLabel,
  measures,
  onMarkCompensated,
}: CompensatingMeasuresSheetProps) {
  const { data: systems = [] } = useInformationSystems();
  const { data: facilities = [] } = useFacilities();
  const { data: assets = [] } = useAssetOptions(open);
  const saveMeasure = useSaveMeasure();
  const deleteMeasure = useDeleteMeasure();
  const [draft, setDraft] = useState<MeasureInput | null>(null);

  const carrierNames = useMemo(() => {
    const names = new Map<string, string>();
    for (const system of systems) names.set(`system:${system.id}`, `System: ${system.name}`);
    for (const asset of assets) names.set(`asset:${asset.id}`, `Komponent: ${asset.name}`);
    for (const facility of facilities) names.set(`facility:${facility.id}`, `Anläggning: ${facility.name}`);
    return names;
  }, [systems, assets, facilities]);

  const isCompensated = item?.applicability === 'compensated';
  const draftInvalid =
    !draft ||
    !draft.description.trim() ||
    (draft.measure_type === 'technical' && carrierValue(draft) === NONE);

  const handleSave = () => {
    if (!item || !draft || draftInvalid) return;
    saveMeasure.mutate(
      { kind, parentId: item.id, measure: { ...draft, description: draft.description.trim() } },
      { onSuccess: () => setDraft(null) },
    );
  };

  return (
    <Sheet open={open} onOpenChange={(value) => { if (!value) setDraft(null); onOpenChange(value); }}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Kompenserande åtgärder</SheetTitle>
          <SheetDescription>{requirementLabel}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {measures.length === 0 && !draft && (
            <p className="text-sm text-muted-foreground">
              Inga kompenserande åtgärder ännu. Ett krav kan markeras som kompenserat först när minst en åtgärd finns.
            </p>
          )}

          {measures.map((measure) => (
            <div key={measure.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm">{measure.description}</p>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Redigera åtgärd"
                    onClick={() => setDraft({
                      id: measure.id,
                      description: measure.description,
                      measure_type: measure.measure_type,
                      system_id: measure.system_id,
                      asset_id: measure.asset_id,
                      facility_id: measure.facility_id,
                      proposed_by: measure.proposed_by,
                      status: measure.status,
                    })}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Ta bort åtgärd"
                    disabled={isCompensated && measures.length === 1}
                    title={isCompensated && measures.length === 1 ? 'Ändra tillämpligheten innan sista åtgärden tas bort' : undefined}
                    onClick={() => deleteMeasure.mutate(measure.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-xs">{MEASURE_TYPE_LABELS[measure.measure_type]}</Badge>
                <Badge
                  variant={measure.status === 'accepted' ? 'default' : measure.status === 'rejected' ? 'destructive' : 'secondary'}
                  className="text-xs"
                >
                  {MEASURE_STATUS_LABELS[measure.status]}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  Föreslagen av {RESPONSIBLE_ORG_LABELS[measure.proposed_by].toLowerCase()}
                </Badge>
                {carrierValue(measure) !== NONE && (
                  <Badge variant="outline" className="text-xs">
                    Bärs av {carrierNames.get(carrierValue(measure)) ?? 'okänd tillgång'}
                  </Badge>
                )}
              </div>
              {measure.decided_at && (
                <p className="text-xs text-muted-foreground">
                  {MEASURE_STATUS_LABELS[measure.status]} av {measure.decided_by ?? 'okänd'} den{' '}
                  {new Date(measure.decided_at).toLocaleDateString('sv-SE')}
                </p>
              )}
            </div>
          ))}

          {draft ? (
            <div className="rounded-lg border p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="measure-description">Beskrivning</Label>
                <Textarea
                  id="measure-description"
                  rows={3}
                  value={draft.description}
                  placeholder='T.ex. "Låst skåp med larm" (CR 1.4) eller "Hanteras i överordnat system (LASSI)" (CR 2.1)'
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Typ av åtgärd</Label>
                  <Select
                    value={draft.measure_type}
                    onValueChange={(value) => setDraft({ ...draft, measure_type: value as MeasureInput['measure_type'] })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MEASURE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{MEASURE_TYPE_LABELS[type]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Föreslagen av</Label>
                  <Select
                    value={draft.proposed_by}
                    onValueChange={(value) => setDraft({ ...draft, proposed_by: value as MeasureInput['proposed_by'] })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RESPONSIBLE_ORGS.map((org) => (
                        <SelectItem key={org} value={org}>{RESPONSIBLE_ORG_LABELS[org]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>
                  Bärare {draft.measure_type === 'technical' ? '(krävs för tekniska åtgärder)' : '(valfri)'}
                </Label>
                <Select value={carrierValue(draft)} onValueChange={(value) => setDraft(withCarrier(draft, value))}>
                  <SelectTrigger><SelectValue placeholder="Välj tillgång som utför åtgärden" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Ingen bärare</SelectItem>
                    {Array.from(carrierNames.entries()).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {draft.measure_type === 'technical' && carrierValue(draft) === NONE && (
                  <p className="text-xs text-destructive">Välj system, komponent eller anläggning som utför åtgärden.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Beslut</Label>
                <Select
                  value={draft.status}
                  onValueChange={(value) => setDraft({ ...draft, status: value as MeasureInput['status'] })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MEASURE_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>{MEASURE_STATUS_LABELS[status]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Vem som beslutat och när registreras automatiskt.</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDraft(null)}>Avbryt</Button>
                <Button disabled={draftInvalid || saveMeasure.isPending} onClick={handleSave}>Spara åtgärd</Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setDraft(emptyMeasure())}>
              <Plus className="mr-2 h-4 w-4" />
              Lägg till kompenserande åtgärd
            </Button>
          )}

          {!isCompensated && measures.length > 0 && onMarkCompensated && (
            <div className="rounded-lg border border-dashed p-3 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">Kravet är inte markerat som kompenserat.</p>
              <Button size="sm" onClick={onMarkCompensated}>Markera som kompenserad</Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
