import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useComponentTypes } from '@/hooks/useComponentTypes';
import type { ProfileValues } from '@/hooks/useRequirementProfiles';

const NONE = 'none';

interface ProfileFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initial?: Partial<ProfileValues>;
  isSaving?: boolean;
  onSave: (values: ProfileValues) => void;
}

/** Create or edit a requirement profile: name, description, component type, target SL and standard flag. */
export function ProfileFormDialog({ open, onOpenChange, title, initial, isSaving, onSave }: ProfileFormDialogProps) {
  const { data: componentTypes = [] } = useComponentTypes();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [componentTypeId, setComponentTypeId] = useState(NONE);
  const [targetSl, setTargetSl] = useState(NONE);
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setDescription(initial?.description ?? '');
    setComponentTypeId(initial?.component_type_id ?? NONE);
    setTargetSl(initial?.target_sl != null ? String(initial.target_sl) : NONE);
    setIsDefault(!!initial?.is_default);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const hasType = componentTypeId !== NONE;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            En standardprofil ger automatiskt sina krav till alla komponenter av samma komponenttyp.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-form-name">Namn</Label>
            <Input id="profile-form-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-form-description">Beskrivning</Label>
            <Textarea
              id="profile-form-description"
              rows={2}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="profile-form-type">Komponenttyp</Label>
              <Select
                value={componentTypeId}
                onValueChange={(value) => {
                  setComponentTypeId(value);
                  if (value === NONE) setIsDefault(false);
                }}
              >
                <SelectTrigger id="profile-form-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Ingen</SelectItem>
                  {componentTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-form-sl">Mål-SL</Label>
              <Select value={targetSl} onValueChange={setTargetSl}>
                <SelectTrigger id="profile-form-sl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Ingen</SelectItem>
                  {[1, 2, 3, 4].map((level) => (
                    <SelectItem key={level} value={String(level)}>SL {level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              className="mt-0.5"
              disabled={!hasType}
              checked={isDefault}
              onCheckedChange={(checked) => setIsDefault(checked === true)}
            />
            <span>
              Standardprofil för komponenttypen
              <span className="block text-xs text-muted-foreground">
                {hasType
                  ? 'Ersätter en eventuell tidigare standardprofil för samma typ.'
                  : 'Välj en komponenttyp först.'}
              </span>
            </span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
          <Button
            disabled={!name.trim() || isSaving}
            onClick={() =>
              onSave({
                name: name.trim(),
                description: description.trim() || null,
                component_type_id: hasType ? componentTypeId : null,
                target_sl: targetSl === NONE ? null : Number(targetSl),
                is_default: hasType && isDefault,
              })
            }
          >
            {isSaving ? 'Sparar...' : 'Spara'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
