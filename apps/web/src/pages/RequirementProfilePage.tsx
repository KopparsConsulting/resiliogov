import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Plus, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRequirements } from '@/hooks/useRequirements';
import {
  useAddProfileItems,
  useProfileItems,
  useRemoveProfileItems,
  useRequirementProfiles,
  useUpdateProfileItem,
  useUpdateRequirementProfile,
} from '@/hooks/useRequirementProfiles';
import { groupMeasuresByParent, useScopeMeasures } from '@/hooks/useCompensatingMeasures';
import { ScopeRequirementList } from '@/components/project/ScopeRequirementList';
import { ProfileFormDialog } from '@/components/profiles/ProfileFormDialog';
import { addressesAsset } from '@/lib/requirementAddressee';
import { compareRequirementCodes } from '@/lib/functionalRequirements';
import { APPLICABILITY_STATUS_LABELS, APPLICABILITY_VALUES } from '@/types/project';

const ALL = 'all';

export default function RequirementProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { data: profiles = [] } = useRequirementProfiles();
  const profile = profiles.find((candidate) => candidate.id === id);
  const { data: requirements = [] } = useRequirements();
  const { data: items = [] } = useProfileItems(id);
  const { data: measures } = useScopeMeasures('profile', id);

  const updateProfile = useUpdateRequirementProfile();
  const addItems = useAddProfileItems();
  const updateItem = useUpdateProfileItem();
  const removeItems = useRemoveProfileItems();

  const [editOpen, setEditOpen] = useState(false);
  const [sourceFilter, setSourceFilter] = useState(ALL);
  const [onlyComponent, setOnlyComponent] = useState(true);
  const [onlyTargetSl, setOnlyTargetSl] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const requirementById = useMemo(() => new Map(requirements.map((r) => [r.id, r])), [requirements]);
  const inProfile = useMemo(() => new Set(items.map((item) => item.requirement_id)), [items]);
  const measuresByItem = useMemo(() => groupMeasuresByParent('profile', measures), [measures]);

  const sources = useMemo(() => {
    const unique = new Map<string, string>();
    for (const r of requirements) if (r.source_id && r.source_name) unique.set(r.source_id, r.source_name);
    return Array.from(unique.entries());
  }, [requirements]);

  const targetSl = profile?.target_sl ?? null;

  const candidates = useMemo(() => {
    const term = search.trim().toLowerCase();
    return requirements
      .filter((r) => {
        if (inProfile.has(r.id)) return false;
        if (!addressesAsset(r.source_addressee, r.target_type)) return false;
        if (sourceFilter !== ALL && r.source_id !== sourceFilter) return false;
        if (onlyComponent && r.target_type !== 'component') return false;
        if (onlyTargetSl && targetSl != null && r.sl_capability != null && r.sl_capability > targetSl) return false;
        if (!term) return true;
        return r.chapter_section.toLowerCase().includes(term) || r.description.toLowerCase().includes(term);
      })
      .sort((a, b) => compareRequirementCodes(a.chapter_section, b.chapter_section));
  }, [requirements, inProfile, sourceFilter, onlyComponent, onlyTargetSl, targetSl, search]);

  if (!profile) {
    return (
      <div className="p-6">
        <Link to="/profiles" className="text-sm text-muted-foreground hover:underline">← Kravprofiler</Link>
        <p className="mt-4 text-sm text-muted-foreground">Profilen hittades inte.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/profiles"><ArrowLeft className="mr-1 h-4 w-4" /> Kravprofiler</Link>
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{profile.name}</h1>
              {profile.is_default && (
                <Badge variant="secondary" className="gap-1"><Star className="h-3 w-3" /> Standardprofil</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {profile.component_type_name ? `Komponenttyp: ${profile.component_type_name}` : 'Ingen komponenttyp'}
              {' · '}
              {profile.target_sl != null ? `Mål-SL ${profile.target_sl}` : 'Ingen mål-SL'}
            </p>
            {profile.description && <p className="text-sm">{profile.description}</p>}
            {profile.is_default && (
              <p className="text-xs text-muted-foreground">
                Ändringar här synkas automatiskt till alla komponenter av typen {profile.component_type_name}.
              </p>
            )}
          </div>
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Redigera
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Krav</p>
            <p className="text-2xl font-semibold">{items.length}</p>
          </CardContent>
        </Card>
        {APPLICABILITY_VALUES.map((value) => (
          <Card key={value}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{APPLICABILITY_STATUS_LABELS[value]}</p>
              <p className="text-2xl font-semibold">{items.filter((item) => item.applicability === value).length}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Krav i profilen</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Inga krav ännu. Lägg till krav nedan.</p>
          ) : (
            <ScopeRequirementList
              kind="profile"
              groupByFr
              items={items}
              requirementById={requirementById}
              measuresByItem={measuresByItem}
              onUpdate={(itemId, applicability, justification, onDone) =>
                updateItem.mutate({ id: itemId, applicability, justification }, { onSuccess: () => onDone?.() })
              }
              onRemove={(itemId) => removeItems.mutate([itemId])}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lägg till krav</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label htmlFor="profile-source">Källa</Label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger id="profile-source" className="w-[260px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Alla källor</SelectItem>
                  {sources.map(([sourceId, name]) => (
                    <SelectItem key={sourceId} value={sourceId}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[200px] flex-1 space-y-2">
              <Label htmlFor="profile-search">Sök</Label>
              <Input
                id="profile-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Kravkod eller text"
              />
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <Checkbox checked={onlyComponent} onCheckedChange={(checked) => setOnlyComponent(checked === true)} />
              Endast komponentkrav
            </label>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <Checkbox
                disabled={targetSl == null}
                checked={onlyTargetSl && targetSl != null}
                onCheckedChange={(checked) => setOnlyTargetSl(checked === true)}
              />
              SL ≤ {targetSl != null ? `SL ${targetSl}` : 'mål-SL (saknas)'}
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={selected.length === 0 || addItems.isPending}
              onClick={() =>
                addItems.mutate(
                  { profileId: profile.id, requirementIds: selected },
                  { onSuccess: () => setSelected([]) },
                )
              }
            >
              <Plus className="mr-2 h-4 w-4" /> Lägg till valda ({selected.length})
            </Button>
            <Button
              variant="outline"
              disabled={candidates.length === 0}
              onClick={() => setSelected(candidates.map((r) => r.id))}
            >
              Markera alla ({candidates.length})
            </Button>
            {selected.length > 0 && (
              <Button variant="ghost" onClick={() => setSelected([])}>Avmarkera</Button>
            )}
          </div>

          <div className="max-h-[420px] space-y-1 overflow-y-auto rounded-lg border p-2">
            {candidates.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Inga fler krav matchar filtret.</p>
            ) : (
              candidates.map((r) => (
                <label key={r.id} className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-accent/50">
                  <Checkbox
                    className="mt-1"
                    checked={selected.includes(r.id)}
                    onCheckedChange={(checked) =>
                      setSelected((prev) => (checked === true ? [...prev, r.id] : prev.filter((x) => x !== r.id)))
                    }
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium font-mono">{r.chapter_section}</span>
                      {r.sl_capability != null && <Badge variant="secondary" className="text-xs">SL {r.sl_capability}</Badge>}
                      {r.source_name && <Badge variant="outline" className="text-xs">{r.source_name}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{r.description}</p>
                  </div>
                </label>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <ProfileFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Redigera profil"
        initial={{
          name: profile.name,
          description: profile.description,
          component_type_id: profile.component_type_id,
          target_sl: profile.target_sl,
          is_default: profile.is_default,
        }}
        isSaving={updateProfile.isPending}
        onSave={(values) => updateProfile.mutate({ id: profile.id, ...values }, { onSuccess: () => setEditOpen(false) })}
      />
    </div>
  );
}
