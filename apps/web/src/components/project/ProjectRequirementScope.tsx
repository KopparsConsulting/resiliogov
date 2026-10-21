import { useMemo, useState } from 'react';
import { Plus, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRequirements, type RequirementWithDetails } from '@/hooks/useRequirements';
import {
  useAddProjectRequirements,
  useProjectRequirements,
  useRemoveProjectRequirements,
  useUpdateProjectRequirement,
} from '@/hooks/useProjectRequirements';
import {
  useApplyProfileToProject,
  useRequirementProfiles,
  useSaveProfileFromProject,
} from '@/hooks/useRequirementProfiles';
import { ProfileSaveDialog } from '@/components/project/ProfileSaveDialog';
import { ScopeRequirementList } from '@/components/project/ScopeRequirementList';
import { groupMeasuresByParent, useScopeMeasures } from '@/hooks/useCompensatingMeasures';
import { addressesAsset } from '@/lib/requirementAddressee';
import { SECURITY_LEVEL_LABELS, securityLevelCode } from '@/lib/securityLevel';

const ALL = 'all';

/** A requirement fits the target security level using the same rule as the matcher. */
function fitsTargetSl(requirement: RequirementWithDetails, targetSl: number) {
  if (requirement.sl_capability == null) return true;
  return targetSl >= requirement.sl_capability;
}

interface ProjectRequirementScopeProps {
  projectId: string;
  targetSl: number;
  componentTypeId: string | null;
  projectName: string;
}

export function ProjectRequirementScope({
  projectId,
  targetSl,
  componentTypeId,
  projectName,
}: ProjectRequirementScopeProps) {
  const { data: requirements } = useRequirements();
  const { data: scope } = useProjectRequirements(projectId);
  const { data: profiles } = useRequirementProfiles();

  const addRequirements = useAddProjectRequirements();
  const removeRequirements = useRemoveProjectRequirements();
  const updateRequirement = useUpdateProjectRequirement();
  const saveProfile = useSaveProfileFromProject();
  const applyProfile = useApplyProfileToProject();

  const [sourceFilter, setSourceFilter] = useState(ALL);
  const [search, setSearch] = useState('');
  const [onlyMatching, setOnlyMatching] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [profileOpen, setProfileOpen] = useState(false);

  const scopeById = useMemo(
    () => new Map((scope ?? []).map((item) => [item.requirement_id, item])),
    [scope]
  );

  const requirementById = useMemo(
    () => new Map((requirements ?? []).map((requirement) => [requirement.id, requirement])),
    [requirements]
  );

  const sources = useMemo(() => {
    const unique = new Map<string, string>();
    for (const requirement of requirements ?? []) {
      if (requirement.source_id && requirement.source_name) {
        unique.set(requirement.source_id, requirement.source_name);
      }
    }
    return Array.from(unique.entries());
  }, [requirements]);

  const available = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (requirements ?? []).filter((requirement) => {
      if (scopeById.has(requirement.id)) return false;
      if (!addressesAsset(requirement.source_addressee, requirement.target_type)) return false;
      if (sourceFilter !== ALL && requirement.source_id !== sourceFilter) return false;
      if (onlyMatching && !fitsTargetSl(requirement, targetSl)) return false;
      if (!term) return true;
      return (
        requirement.chapter_section.toLowerCase().includes(term) ||
        requirement.description.toLowerCase().includes(term)
      );
    });
  }, [requirements, scopeById, sourceFilter, onlyMatching, targetSl, search]);

  const { data: measures } = useScopeMeasures('project', projectId);
  const measuresByItem = useMemo(() => groupMeasuresByParent('project', measures), [measures]);

  const counts = useMemo(() => {
    const total = scope?.length ?? 0;
    const notApplicable = (scope ?? []).filter((item) => item.applicability === 'not_applicable').length;
    const supplier = (scope ?? []).filter((item) => item.applicability === 'supplier_assessment').length;
    const compensated = (scope ?? []).filter((item) => item.applicability === 'compensated').length;
    return { total, notApplicable, supplier, compensated, included: total - notApplicable - supplier - compensated };
  }, [scope]);

  const suggestionIds = useMemo(
    () =>
      (requirements ?? [])
        .filter(
          (requirement) =>
            !scopeById.has(requirement.id) &&
            addressesAsset(requirement.source_addressee, requirement.target_type) &&
            fitsTargetSl(requirement, targetSl) &&
            requirement.sl_capability != null
        )
        .map((requirement) => requirement.id),
    [requirements, scopeById, targetSl]
  );

  const standardProfile = componentTypeId
    ? (profiles ?? []).find((profile) => profile.is_default && profile.component_type_id === componentTypeId)
    : undefined;

  return (
    <div className="space-y-6">
      {standardProfile && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div>
              <p className="text-sm font-medium">Föreslagen standardprofil: {standardProfile.name}</p>
              <p className="text-xs text-muted-foreground">
                {standardProfile.item_count} krav med tillämplighet, motiveringar och kompenserande åtgärder för komponenttypen
                {standardProfile.component_type_name ? ` ${standardProfile.component_type_name}` : ''}.
                Krav som redan finns i projektet ändras inte.
              </p>
            </div>
            <Button
              disabled={applyProfile.isPending}
              onClick={() => applyProfile.mutate({ profileId: standardProfile.id, projectId })}
            >
              Använd standardprofilen
            </Button>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-5">
        {[
          { label: 'Krav i omfattning', value: counts.total },
          { label: 'Ska ingå / preliminära', value: counts.included },
          { label: 'Kompenserade', value: counts.compensated },
          { label: 'Ej tillämpliga', value: counts.notApplicable },
          { label: 'Kräver leverantörens bedömning', value: counts.supplier },
        ].map((metric) => (
          <Card key={metric.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{metric.label}</p>
              <p className="text-2xl font-semibold">{metric.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-base">Kravomfattning</CardTitle>
            <p className="text-sm text-muted-foreground">
              Målnivå: {SECURITY_LEVEL_LABELS[securityLevelCode(targetSl)]}
            </p>
          </div>
          <div className="flex gap-2">
            {(profiles ?? []).length > 0 && (
              <Select
                onValueChange={(profileId) => applyProfile.mutate({ profileId, projectId })}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Hämta från profil" />
                </SelectTrigger>
                <SelectContent>
                  {(profiles ?? []).map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name} ({profile.item_count} krav)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              variant="outline"
              disabled={counts.total === 0}
              onClick={() => setProfileOpen(true)}
            >
              Spara som profil
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {(scope ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Inga krav valda ännu. Lägg till krav från kravbiblioteket nedan.
            </p>
          ) : (
            <ScopeRequirementList
              kind="project"
              items={scope ?? []}
              requirementById={requirementById}
              measuresByItem={measuresByItem}
              onUpdate={(id, applicability, justification, onDone) =>
                updateRequirement.mutate(
                  { id, projectId, applicability, justification },
                  { onSuccess: () => onDone?.() }
                )
              }
              onRemove={(id) => removeRequirements.mutate({ projectId, ids: [id] })}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lägg till krav från kravbiblioteket</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label htmlFor="scope-source">Regelverk</Label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger id="scope-source" className="w-[260px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Alla regelverk</SelectItem>
                  {sources.map(([id, name]) => (
                    <SelectItem key={id} value={id}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex-1 min-w-[200px]">
              <Label htmlFor="scope-search">Sök</Label>
              <Input
                id="scope-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Kravnummer eller text"
              />
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <Checkbox
                checked={onlyMatching}
                onCheckedChange={(checked) => setOnlyMatching(checked === true)}
              />
              Endast krav som gäller för {SECURITY_LEVEL_LABELS[securityLevelCode(targetSl)]}
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={suggestionIds.length === 0 || addRequirements.isPending}
              onClick={() => addRequirements.mutate({ projectId, requirementIds: suggestionIds })}
            >
              <Wand2 className="mr-2 h-4 w-4" />
              Föreslå urval för nivån ({suggestionIds.length})
            </Button>
            <Button
              disabled={selected.length === 0 || addRequirements.isPending}
              onClick={() =>
                addRequirements.mutate(
                  { projectId, requirementIds: selected },
                  { onSuccess: () => setSelected([]) }
                )
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Lägg till valda ({selected.length})
            </Button>
          </div>

          <div className="max-h-[420px] space-y-1 overflow-y-auto rounded-lg border p-2">
            {available.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                Inga fler krav matchar filtret.
              </p>
            ) : (
              available.map((requirement) => (
                <label
                  key={requirement.id}
                  className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-accent/50"
                >
                  <Checkbox
                    className="mt-1"
                    checked={selected.includes(requirement.id)}
                    onCheckedChange={(checked) =>
                      setSelected((prev) =>
                        checked === true
                          ? [...prev, requirement.id]
                          : prev.filter((id) => id !== requirement.id)
                      )
                    }
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium font-mono">{requirement.chapter_section}</span>
                      {requirement.source_name && (
                        <Badge variant="outline" className="text-xs">
                          {requirement.source_name}
                        </Badge>
                      )}
                      {requirement.sl_capability != null && (
                        <Badge variant="secondary" className="text-xs">
                          {SECURITY_LEVEL_LABELS[securityLevelCode(requirement.sl_capability)]}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {requirement.description}
                    </p>
                  </div>
                </label>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <ProfileSaveDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        itemCount={counts.total}
        defaultName={projectName}
        isSaving={saveProfile.isPending}
        onSave={({ name, description }) =>
          saveProfile.mutate(
            {
              name,
              description,
              projectId,
              componentTypeId,
              targetSl,
            },
            { onSuccess: () => setProfileOpen(false) }
          )
        }
      />

    </div>
  );
}
