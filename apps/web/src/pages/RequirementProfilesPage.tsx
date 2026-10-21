import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Copy, Plus, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  useCopyRequirementProfile,
  useCreateRequirementProfile,
  useDeleteRequirementProfile,
  useRequirementProfiles,
  useUpdateRequirementProfile,
} from '@/hooks/useRequirementProfiles';
import { ProfileFormDialog } from '@/components/profiles/ProfileFormDialog';
import type { RequirementApplicability, RequirementProfile } from '@/types/project';

const COUNT_COLUMNS: { key: RequirementApplicability; label: string }[] = [
  { key: 'applicable', label: 'Ska ingå' },
  { key: 'compensated', label: 'Kompenserad' },
  { key: 'supplier_assessment', label: 'Leverantörsbed.' },
  { key: 'not_applicable', label: 'Ej tillämpligt' },
  { key: 'preliminary', label: 'Preliminär' },
];

export default function RequirementProfilesPage() {
  const navigate = useNavigate();
  const { data: profiles = [], isLoading } = useRequirementProfiles();
  const createProfile = useCreateRequirementProfile();
  const updateProfile = useUpdateRequirementProfile();
  const copyProfile = useCopyRequirementProfile();
  const deleteProfile = useDeleteRequirementProfile();

  const [createOpen, setCreateOpen] = useState(false);
  const [copyOf, setCopyOf] = useState<{ profile: RequirementProfile; name: string } | null>(null);
  const [deleteOf, setDeleteOf] = useState<RequirementProfile | null>(null);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kravprofiler</h1>
          <p className="text-sm text-muted-foreground">
            Återanvändbara kravurval per komponenttyp. Standardprofilen ger automatiskt sina krav till alla komponenter av typen.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Ny profil
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profil</TableHead>
                <TableHead>Komponenttyp</TableHead>
                <TableHead>Mål-SL</TableHead>
                <TableHead className="text-right">Krav</TableHead>
                {COUNT_COLUMNS.map((column) => (
                  <TableHead key={column.key} className="text-right">{column.label}</TableHead>
                ))}
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={10} className="text-muted-foreground">Laddar...</TableCell></TableRow>
              ) : profiles.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-muted-foreground">Inga profiler ännu.</TableCell></TableRow>
              ) : (
                profiles.map((profile) => (
                  <TableRow key={profile.id} className="cursor-pointer" onClick={() => navigate(`/profiles/${profile.id}`)}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/profiles/${profile.id}`}
                          className="font-medium hover:underline"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {profile.name}
                        </Link>
                        {profile.is_default && (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <Star className="h-3 w-3" /> Standard
                          </Badge>
                        )}
                      </div>
                      {profile.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{profile.description}</p>
                      )}
                    </TableCell>
                    <TableCell>{profile.component_type_name ?? <span className="text-muted-foreground">–</span>}</TableCell>
                    <TableCell>{profile.target_sl != null ? `SL ${profile.target_sl}` : '–'}</TableCell>
                    <TableCell className="text-right font-medium">{profile.item_count ?? 0}</TableCell>
                    {COUNT_COLUMNS.map((column) => (
                      <TableCell key={column.key} className="text-right tabular-nums">
                        {profile.applicability_counts?.[column.key] ?? 0}
                      </TableCell>
                    ))}
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Kopiera profil"
                          onClick={() => setCopyOf({ profile, name: `${profile.name} (kopia)` })}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Ta bort profil" onClick={() => setDeleteOf(profile)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ProfileFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Ny kravprofil"
        isSaving={createProfile.isPending || updateProfile.isPending}
        onSave={async (values) => {
          // Create without the flag first so the previous standard profile can be cleared safely.
          const id = await createProfile.mutateAsync({ ...values, is_default: false });
          if (values.is_default) {
            await updateProfile.mutateAsync({ id, is_default: true, component_type_id: values.component_type_id });
          }
          setCreateOpen(false);
          navigate(`/profiles/${id}`);
        }}
      />

      <Dialog open={!!copyOf} onOpenChange={(open) => !open && setCopyOf(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kopiera profil</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="copy-name">Namn på kopian</Label>
            <Input
              id="copy-name"
              value={copyOf?.name ?? ''}
              onChange={(event) => setCopyOf((prev) => (prev ? { ...prev, name: event.target.value } : prev))}
            />
            <p className="text-xs text-muted-foreground">
              Krav, tillämplighet, motiveringar och kompenserande åtgärder kopieras. Kopian blir inte standardprofil.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyOf(null)}>Avbryt</Button>
            <Button
              disabled={!copyOf?.name.trim() || copyProfile.isPending}
              onClick={() => {
                if (!copyOf) return;
                copyProfile.mutate(
                  { profileId: copyOf.profile.id, name: copyOf.name.trim() },
                  { onSuccess: (id) => { setCopyOf(null); navigate(`/profiles/${id}`); } },
                );
              }}
            >
              Kopiera
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteOf} onOpenChange={(open) => !open && setDeleteOf(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort "{deleteOf?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Profilens krav och kompenserande åtgärder tas bort. Projekt som redan hämtat kraven påverkas inte.
              {deleteOf?.is_default &&
                ' Profilen är standardprofil: komponenternas orörda krav tas bort och bedömda krav markeras som utanför omfattning.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteOf && deleteProfile.mutate(deleteOf.id, { onSuccess: () => setDeleteOf(null) })}
            >
              Ta bort
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
