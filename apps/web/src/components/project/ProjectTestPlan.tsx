import { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, Wand2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useDeleteTestActivity,
  useGenerateTestActivities,
  useProjectTestPlan,
  useSaveTestActivity,
  type TestActivity,
} from '@/hooks/useProjectTestPlan';
import { useSystemAssets } from '@/hooks/useInformationSystems';
import { ProjectSupplierExchange } from './ProjectSupplierExchange';

import {
  RESPONSIBLE_ORGS,
  RESPONSIBLE_ORG_LABELS,
  RESULT_STATUS_LABELS,
  TEST_PHASES,
  TEST_PHASE_LABELS,
  TEST_TYPES,
  TEST_TYPE_LABELS,
  type ResponsibleOrg,
  type TestPhase,
  type TestType,
} from '@/components/test-model/constants';

const NONE = 'none';

interface ProjectTestPlanProps {
  projectId: string;
  projectName: string;
  systemId: string | null;
}


interface ActivityDraft {
  id?: string;
  requirement_id: string;
  test_phase: TestPhase | null;
  test_type: TestType | null;
  test_method: string;
  acceptance_criteria: string;
  responsible_org: ResponsibleOrg | null;
  responsible_party: string;
  asset_id: string | null;
}

function emptyDraft(requirementId: string): ActivityDraft {
  return {
    requirement_id: requirementId,
    test_phase: null,
    test_type: null,
    test_method: '',
    acceptance_criteria: '',
    responsible_org: null,
    responsible_party: '',
    asset_id: null,
  };
}

function draftFromActivity(activity: TestActivity): ActivityDraft {
  return {
    id: activity.id,
    requirement_id: activity.requirement_id,
    test_phase: activity.test_phase,
    test_type: activity.test_type,
    test_method: activity.test_method ?? '',
    acceptance_criteria: activity.acceptance_criteria ?? '',
    responsible_org: activity.responsible_org,
    responsible_party: activity.responsible_party ?? '',
    asset_id: activity.asset_id,
  };
}

export function ProjectTestPlan({ projectId, projectName, systemId }: ProjectTestPlanProps) {
  const { data: plan, isLoading } = useProjectTestPlan(projectId);
  const { data: assets = [] } = useSystemAssets(systemId ?? '');
  const saveActivity = useSaveTestActivity();
  const deleteActivity = useDeleteTestActivity();
  const generateActivities = useGenerateTestActivities();

  const [draft, setDraft] = useState<ActivityDraft | null>(null);
  const [generatePhase, setGeneratePhase] = useState<TestPhase>('FAT2');
  const [generateType, setGenerateType] = useState<TestType>('functional_test');
  const [generateOrg, setGenerateOrg] = useState<ResponsibleOrg>('supplier');
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false);

  const rows = useMemo(() => {
    const all = plan?.rows ?? [];
    if (!showOnlyIncomplete) return all;
    return all.filter(
      (row) =>
        row.activities.length === 0 ||
        row.activities.some((activity) => !activity.acceptance_criteria?.trim()),
    );
  }, [plan, showOnlyIncomplete]);

  const missingIds = (plan?.rows ?? [])
    .filter((row) => row.activities.length === 0)
    .map((row) => row.requirement_id);

  if (isLoading) return <p className="text-sm text-muted-foreground">Laddar testplan...</p>;
  if (!plan || plan.rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {plan?.excludedNotApplicable
          ? 'Alla krav i omfattningen är markerade som ej tillämpliga och ger inga testaktiviteter.'
          : 'Projektet har inga krav i omfattningen ännu. Lägg till krav under Kravomfattning först.'}
      </p>
    );
  }

  const handleSave = () => {
    if (!draft) return;
    saveActivity.mutate(
      {
        id: draft.id,
        requirement_id: draft.requirement_id,
        project_id: projectId,
        system_id: systemId,
        asset_id: draft.asset_id,
        test_phase: draft.test_phase,
        test_type: draft.test_type,
        test_method: draft.test_method.trim() || null,
        acceptance_criteria: draft.acceptance_criteria.trim() || null,
        responsible_org: draft.responsible_org,
        responsible_party: draft.responsible_party.trim() || null,
      },
      { onSuccess: () => setDraft(null) },
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Krav utan testaktivitet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{plan.withoutActivity}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aktiviteter utan acceptanskriterium
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{plan.withoutCriteria}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Redo att genomföras
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{plan.readyToRun}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Skapa aktiviteter för krav som saknar test</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label>Testtillfälle</Label>
            <Select value={generatePhase} onValueChange={(value) => setGeneratePhase(value as TestPhase)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TEST_PHASES.map((phase) => (
                  <SelectItem key={phase} value={phase}>{TEST_PHASE_LABELS[phase]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Testtyp</Label>
            <Select value={generateType} onValueChange={(value) => setGenerateType(value as TestType)}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TEST_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{TEST_TYPE_LABELS[type]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Ansvarig part</Label>
            <Select value={generateOrg} onValueChange={(value) => setGenerateOrg(value as ResponsibleOrg)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RESPONSIBLE_ORGS.map((org) => (
                  <SelectItem key={org} value={org}>{RESPONSIBLE_ORG_LABELS[org]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() =>
              generateActivities.mutate({
                projectId,
                requirementIds: missingIds,
                systemId,
                assetId: null,
                testPhase: generatePhase,
                testType: generateType,
                responsibleOrg: generateOrg,
              })
            }
            disabled={missingIds.length === 0 || generateActivities.isPending}
          >
            <Wand2 className="mr-2 h-4 w-4" />
            Skapa {missingIds.length} aktiviteter
          </Button>
          <Button variant="outline" onClick={() => setShowOnlyIncomplete((value) => !value)}>
            {showOnlyIncomplete ? 'Visa alla krav' : 'Visa bara ofullständiga'}
          </Button>
        </CardContent>
      </Card>

      <ProjectSupplierExchange
        projectId={projectId}
        projectName={projectName}
        rows={plan.rows}
        assets={assets as { id: string; name: string }[]}
      />



      {plan.excludedNotApplicable > 0 && (
        <p className="text-sm text-muted-foreground">
          {plan.excludedNotApplicable} krav är markerade som ej tillämpliga och ingår inte i testplanen.
        </p>
      )}
      <div className="rounded-lg border border-border divide-y divide-border">
        {rows.map((row) => (
          <div key={row.requirement_id} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">
                  {row.chapter_section}
                  {row.source_name && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {row.source_name}
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground line-clamp-2">{row.description}</p>
                {row.applicability === 'compensated' && row.measures.length > 0 && (
                  <div className="mt-1 rounded-md border border-dashed p-2 text-xs">
                    <span className="font-medium">Kompenserad – testet kan avse åtgärden:</span>
                    <ul className="mt-1 list-disc pl-4">
                      {row.measures.map((measure) => (
                        <li key={measure.id}>{measure.description}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => setDraft(emptyDraft(row.requirement_id))}>
                <Plus className="mr-2 h-4 w-4" />
                Aktivitet
              </Button>
            </div>

            {row.activities.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Ingen testaktivitet definierad — kravet räknas som ej testplanerat.
              </p>
            ) : (
              <div className="space-y-2">
                {row.activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start justify-between gap-4 rounded-md border border-border p-3"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">
                          {activity.test_phase ? TEST_PHASE_LABELS[activity.test_phase] : 'Tillfälle saknas'}
                        </Badge>
                        <Badge variant="outline">
                          {activity.test_type ? TEST_TYPE_LABELS[activity.test_type] : 'Testtyp saknas'}
                        </Badge>
                        {activity.responsible_org && (
                          <Badge variant="secondary">
                            {RESPONSIBLE_ORG_LABELS[activity.responsible_org]}
                          </Badge>
                        )}
                        <Badge variant="secondary">
                          {RESULT_STATUS_LABELS[activity.result_status]}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {activity.acceptance_criteria?.trim()
                          ? `Acceptanskriterium: ${activity.acceptance_criteria}`
                          : 'Acceptanskriterium saknas'}
                      </p>
                      {activity.test_method && (
                        <p className="text-xs text-muted-foreground">Metod: {activity.test_method}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDraft(draftFromActivity(activity))}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteActivity.mutate({ id: activity.id, projectId })}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={!!draft} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft?.id ? 'Redigera testaktivitet' : 'Ny testaktivitet'}</DialogTitle>
            <DialogDescription>
              Aktiviteten kopplar kravet till ett testtillfälle med acceptanskriterium och ansvarig part.
            </DialogDescription>
          </DialogHeader>

          {draft && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Testtillfälle</Label>
                  <Select
                    value={draft.test_phase ?? NONE}
                    onValueChange={(value) =>
                      setDraft({ ...draft, test_phase: value === NONE ? null : (value as TestPhase) })
                    }
                  >
                    <SelectTrigger><SelectValue placeholder="Välj" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Ej valt</SelectItem>
                      {TEST_PHASES.map((phase) => (
                        <SelectItem key={phase} value={phase}>{TEST_PHASE_LABELS[phase]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Testtyp</Label>
                  <Select
                    value={draft.test_type ?? NONE}
                    onValueChange={(value) =>
                      setDraft({ ...draft, test_type: value === NONE ? null : (value as TestType) })
                    }
                  >
                    <SelectTrigger><SelectValue placeholder="Välj" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Ej valt</SelectItem>
                      {TEST_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{TEST_TYPE_LABELS[type]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Acceptanskriterium</Label>
                <Textarea
                  value={draft.acceptance_criteria}
                  onChange={(event) =>
                    setDraft({ ...draft, acceptance_criteria: event.target.value })
                  }
                  placeholder="Vad ska uppfyllas för att testet ska räknas som godkänt?"
                  rows={3}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Metod</Label>
                <Input
                  value={draft.test_method}
                  onChange={(event) => setDraft({ ...draft, test_method: event.target.value })}
                  placeholder="Hur genomförs testet?"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Ansvarig part</Label>
                  <Select
                    value={draft.responsible_org ?? NONE}
                    onValueChange={(value) =>
                      setDraft({
                        ...draft,
                        responsible_org: value === NONE ? null : (value as ResponsibleOrg),
                      })
                    }
                  >
                    <SelectTrigger><SelectValue placeholder="Välj" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Ej valt</SelectItem>
                      {RESPONSIBLE_ORGS.map((org) => (
                        <SelectItem key={org} value={org}>{RESPONSIBLE_ORG_LABELS[org]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Ansvarig person</Label>
                  <Input
                    value={draft.responsible_party}
                    onChange={(event) =>
                      setDraft({ ...draft, responsible_party: event.target.value })
                    }
                    placeholder="Namn eller roll"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Komponent</Label>
                <Select
                  value={draft.asset_id ?? NONE}
                  onValueChange={(value) =>
                    setDraft({ ...draft, asset_id: value === NONE ? null : value })
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Hela systemet" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Hela systemet</SelectItem>
                    {assets.map((asset: { id: string; name: string }) => (
                      <SelectItem key={asset.id} value={asset.id}>{asset.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>Avbryt</Button>
            <Button onClick={handleSave} disabled={saveActivity.isPending}>Spara</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
