import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ProfileSaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemCount: number;
  defaultName?: string;
  isSaving?: boolean;
  onSave: (values: { name: string; description: string }) => void;
}

export function ProfileSaveDialog({
  open,
  onOpenChange,
  itemCount,
  defaultName,
  isSaving,
  onSave,
}: ProfileSaveDialogProps) {
  const [name, setName] = useState(defaultName ?? '');
  const [description, setDescription] = useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Spara som kravprofil</DialogTitle>
          <DialogDescription>
            Profilen sparar {itemCount} krav med deras markeringar och kan återanvändas i nya projekt.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Profilnamn</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="t.ex. UMS Informationsskylt SL 2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-description">Beskrivning</Label>
            <Textarea
              id="profile-description"
              rows={2}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button
            disabled={!name.trim() || isSaving}
            onClick={() => onSave({ name: name.trim(), description: description.trim() })}
          >
            {isSaving ? 'Sparar...' : 'Spara profil'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
