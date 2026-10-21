import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RotateCcw, Plus, Trash2, Archive } from 'lucide-react';
import {
  useRequirementSyncPlan,
  useApplyRequirementSync,
  type SyncRequirementSummary,
} from '@/hooks/useSystemRequirementSync';

interface RequirementSyncDialogProps {
  systemId: string;
  systemName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function RequirementGroup({
  title,
  description,
  icon,
  items,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  items: SyncRequirementSummary[];
}) {
  if (items.length === 0) return null;

  return (
    <section className="rounded-lg border p-4">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <h3 className="font-medium">{title}</h3>
        <Badge variant="secondary">{items.length}</Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-3">{description}</p>
      <ul className="space-y-2">
        {items.slice(0, 25).map(item => (
          <li key={item.requirementId} className="text-sm">
            <span className="font-medium">{item.chapterSection}</span>
            <span className="text-muted-foreground"> — {item.description.slice(0, 140)}</span>
          </li>
        ))}
        {items.length > 25 && (
          <li className="text-sm text-muted-foreground">…och {items.length - 25} till</li>
        )}
      </ul>
    </section>
  );
}

export function RequirementSyncDialog({
  systemId,
  systemName,
  open,
  onOpenChange,
}: RequirementSyncDialogProps) {
  const { data: plan, isLoading } = useRequirementSyncPlan(systemId, open);
  const applySync = useApplyRequirementSync();

  const hasChanges =
    !!plan &&
    plan.additions.length + plan.removals.length + plan.deactivations.length + plan.reactivations.length > 0;

  const handleApply = async () => {
    if (!plan) return;
    await applySync.mutateAsync({ systemId, plan });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Uppdatera krav för {systemName}</DialogTitle>
          <DialogDescription>
            Förhandsvisning av vad synken gör. Inget sparas förrän du bekräftar.
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {plan && (
          <>
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Effektiv klass: </span>
                <span className="font-medium">Klass {plan.effectiveLevel}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Tillämpliga krav: </span>
                <span className="font-medium">{plan.totalApplicable}</span>
              </div>
            </div>

            <ScrollArea className="max-h-[45vh] pr-4">
              <div className="space-y-4">
                <RequirementGroup
                  title="Tillkommer"
                  description="Nya krav som blir tillämpliga och läggs till som Ej påbörjad."
                  icon={<Plus className="h-4 w-4 text-primary" />}
                  items={plan.additions}
                />
                <RequirementGroup
                  title="Återaktiveras"
                  description="Krav som legat utanför omfattningen men gäller igen. De återfår sin tidigare bedömning och räknas i måtten."
                  icon={<RotateCcw className="h-4 w-4 text-primary" />}
                  items={plan.reactivations}
                />
                <RequirementGroup
                  title="Flyttas utanför omfattningen"
                  description="Krav som inte längre gäller men har status, verifikat eller anteckningar. Bedömningen och historiken behålls, men kravet räknas inte i täckning och efterlevnad."
                  icon={<Archive className="h-4 w-4 text-muted-foreground" />}
                  items={plan.deactivations}
                />
                <RequirementGroup
                  title="Tas bort"
                  description="Krav utan påbörjat arbete som inte längre är tillämpliga."
                  icon={<Trash2 className="h-4 w-4 text-destructive" />}
                  items={plan.removals}
                />
                {!hasChanges && (
                  <p className="text-sm text-muted-foreground">
                    Kravlistan är redan i synk med systemets klassificering.
                  </p>
                )}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button onClick={handleApply} disabled={!hasChanges || applySync.isPending}>
            {applySync.isPending ? 'Synkar…' : 'Bekräfta synk'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
