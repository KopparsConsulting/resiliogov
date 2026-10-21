import { useState } from 'react';
import { ShieldCheck, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import type { RequirementWithDetails } from '@/hooks/useRequirements';
import { AddresseeBadges } from '@/components/requirements/AddresseeBadges';
import { CompensatingMeasuresSheet } from '@/components/project/CompensatingMeasuresSheet';
import {
  APPLICABILITY_LABELS,
  APPLICABILITY_STATUS_LABELS,
  APPLICABILITY_VALUES,
  MEASURE_STATUS_LABELS,
  type CompensatingMeasure,
  type RequirementApplicability,
  type ScopeItem,
  type ScopeKind,
} from '@/types/project';
import { MIN_JUSTIFICATION_LENGTH } from '@/lib/complianceMetrics';
import {
  compareRequirementCodes,
  functionalRequirementLabel,
  functionalRequirementOf,
} from '@/lib/functionalRequirements';

const STATUS_VARIANT: Record<RequirementApplicability, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  applicable: 'default',
  not_applicable: 'outline',
  compensated: 'secondary',
  supplier_assessment: 'secondary',
  preliminary: 'outline',
};

interface ScopeRequirementListProps {
  kind: ScopeKind;
  items: ScopeItem[];
  requirementById: Map<string, RequirementWithDetails>;
  measuresByItem: Map<string, CompensatingMeasure[]>;
  onUpdate: (id: string, applicability: RequirementApplicability, justification: string | null, onDone?: () => void) => void;
  onRemove: (id: string) => void;
  /** Group rows by IEC 62443 Foundational Requirement (FR 1–7). */
  groupByFr?: boolean;
}

/** Requirement rows in a project scope or profile, with applicability status, justification and measures. */
export function ScopeRequirementList({
  kind, items, requirementById, measuresByItem, onUpdate, onRemove, groupByFr = false,
}: ScopeRequirementListProps) {
  const [justifyFor, setJustifyFor] = useState<{ id: string; text: string } | null>(null);
  const [measuresFor, setMeasuresFor] = useState<string | null>(null);

  const rows = items
    .map((item) => ({ item, requirement: requirementById.get(item.requirement_id) }))
    .filter((row): row is { item: ScopeItem; requirement: RequirementWithDetails } => !!row.requirement)
    .sort((a, b) => compareRequirementCodes(a.requirement.chapter_section, b.requirement.chapter_section));

  const groups = groupByFr
    ? Array.from(
        rows.reduce((map, row) => {
          const fr = functionalRequirementOf(row.requirement.chapter_section);
          const list = map.get(fr) ?? [];
          list.push(row);
          map.set(fr, list);
          return map;
        }, new Map<number | null, typeof rows>()),
      ).sort(([a], [b]) => (a ?? 99) - (b ?? 99))
    : [[null, rows] as [number | null, typeof rows]];

  const handleChange = (item: ScopeItem, value: RequirementApplicability) => {
    if (value === 'not_applicable') {
      setJustifyFor({ id: item.id, text: item.justification ?? '' });
      return;
    }
    if (value === 'compensated' && (measuresByItem.get(item.id) ?? []).length === 0) {
      setMeasuresFor(item.id);
      return;
    }
    onUpdate(item.id, value, value === 'compensated' ? item.justification : null);
  };

  const sheetItem = items.find((item) => item.id === measuresFor) ?? null;
  const sheetRequirement = sheetItem ? requirementById.get(sheetItem.requirement_id) : undefined;

  return (
    <>
      <div className="space-y-6">
        {groups.map(([fr, groupRows]) => (
        <section key={fr ?? 'other'} className="space-y-2">
          {groupByFr && (
            <h3 className="text-sm font-semibold text-muted-foreground">
              {functionalRequirementLabel(fr)} <span className="font-normal">({groupRows.length})</span>
            </h3>
          )}
        {groupRows.map(({ item, requirement }) => {
          const measures = measuresByItem.get(item.id) ?? [];
          return (
            <div key={item.id} className="flex items-start justify-between gap-4 rounded-lg border p-3">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={STATUS_VARIANT[item.applicability]} className="text-xs">
                    {APPLICABILITY_STATUS_LABELS[item.applicability]}
                  </Badge>
                  <span className="text-sm font-medium font-mono">{requirement.chapter_section}</span>
                  {requirement.source_name && (
                    <Badge variant="outline" className="text-xs">{requirement.source_name}</Badge>
                  )}
                  <AddresseeBadges
                    addressee={requirement.source_addressee}
                    measureScale={requirement.source_measure_scale}
                    targetType={requirement.target_type}
                    slCapability={requirement.sl_capability}
                    mlCapability={requirement.ml_capability}
                    hideAsset
                  />
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{requirement.description}</p>
                {item.justification && (
                  <p className="text-xs">
                    <span className="text-muted-foreground">Motivering: </span>{item.justification}
                    {item.applicability === 'not_applicable' && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 ml-2 text-xs"
                        onClick={() => setJustifyFor({ id: item.id, text: item.justification ?? '' })}
                      >
                        Ändra
                      </Button>
                    )}
                  </p>
                )}
                {measures.length > 0 && (
                  <ul className="text-xs space-y-0.5">
                    {measures.map((measure) => (
                      <li key={measure.id} className="flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3 text-muted-foreground" />
                        <span>{measure.description}</span>
                        <span className="text-muted-foreground">({MEASURE_STATUS_LABELS[measure.status].toLowerCase()})</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Select
                  value={item.applicability}
                  onValueChange={(value) => handleChange(item, value as RequirementApplicability)}
                >
                  <SelectTrigger className="w-[250px]" aria-label="Tillämplighet">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPLICABILITY_VALUES.map((value) => (
                      <SelectItem key={value} value={value}>{APPLICABILITY_LABELS[value]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMeasuresFor(item.id)}
                  title="Kompenserande åtgärder"
                >
                  <ShieldCheck className="mr-1 h-4 w-4" />
                  {measures.length}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onRemove(item.id)} title="Ta bort kravet">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
        </section>
        ))}
      </div>

      <CompensatingMeasuresSheet
        open={!!measuresFor}
        onOpenChange={(open) => !open && setMeasuresFor(null)}
        kind={kind}
        item={sheetItem}
        requirementLabel={sheetRequirement ? `${sheetRequirement.chapter_section} – ${sheetRequirement.description}` : ''}
        measures={sheetItem ? measuresByItem.get(sheetItem.id) ?? [] : []}
        onMarkCompensated={sheetItem ? () => onUpdate(sheetItem.id, 'compensated', sheetItem.justification) : undefined}
      />

      <Dialog open={!!justifyFor} onOpenChange={(open) => !open && setJustifyFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivering krävs</DialogTitle>
            <DialogDescription>
              Beskriv varför kravet inte är tillämpligt. Minst {MIN_JUSTIFICATION_LENGTH} tecken.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={3}
            aria-label="Motivering"
            placeholder='T.ex. "Skylten saknar PKI", "Ingen trådlös kommunikation" eller "Ingen mänsklig inloggning"'
            value={justifyFor?.text ?? ''}
            onChange={(event) => setJustifyFor((prev) => (prev ? { ...prev, text: event.target.value } : prev))}
          />
          <p className="text-xs text-muted-foreground">
            {justifyFor?.text.trim().length ?? 0} / {MIN_JUSTIFICATION_LENGTH} tecken
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJustifyFor(null)}>Avbryt</Button>
            <Button
              disabled={(justifyFor?.text.trim().length ?? 0) < MIN_JUSTIFICATION_LENGTH}
              onClick={() => {
                if (!justifyFor) return;
                onUpdate(justifyFor.id, 'not_applicable', justifyFor.text.trim(), () => setJustifyFor(null));
              }}
            >
              Spara
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
