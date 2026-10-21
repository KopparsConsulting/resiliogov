import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFacilities } from '@/hooks/useFacilities';
import { useInformationSystems } from '@/hooks/useInformationSystems';
import { useComponentTypes, useCreateComponentType } from '@/hooks/useComponentTypes';
import { getTargetSecurityLevel, SECURITY_LEVEL_LABELS, securityLevelCode } from '@/lib/securityLevel';
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS, type ProjectStatus } from '@/types/project';
import type { ProjectInput } from '@/hooks/useProjects';

const NONE = 'none';

interface ProjectFormProps {
  initial?: Partial<ProjectInput>;
  submitLabel: string;
  isSaving?: boolean;
  onSubmit: (values: ProjectInput) => void;
  onCancel?: () => void;
}

export function ProjectForm({ initial, submitLabel, isSaving, onSubmit, onCancel }: ProjectFormProps) {
  const { data: facilities } = useFacilities();
  const { data: systems } = useInformationSystems();
  const createComponentType = useCreateComponentType();

  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [facilityId, setFacilityId] = useState(initial?.facility_id ?? NONE);
  const [systemId, setSystemId] = useState(initial?.system_id ?? NONE);
  const [componentTypeId, setComponentTypeId] = useState(initial?.component_type_id ?? NONE);
  const [unitCount, setUnitCount] = useState(initial?.unit_count?.toString() ?? '');
  const [targetSl, setTargetSl] = useState((initial?.target_sl ?? 0).toString());
  const [ownerName, setOwnerName] = useState(initial?.owner_name ?? '');
  const [supplierName, setSupplierName] = useState(initial?.supplier_name ?? '');
  const [status, setStatus] = useState<ProjectStatus>(initial?.status ?? 'planning');
  const [newTypeName, setNewTypeName] = useState('');

  const { data: componentTypes } = useComponentTypes(systemId === NONE ? null : systemId);

  const handleFacilityChange = (value: string) => {
    setFacilityId(value);
    const facility = facilities?.find((f) => f.id === value);
    if (facility?.classification_level) {
      setTargetSl(getTargetSecurityLevel(facility.classification_level).toString());
    }
  };

  const handleCreateType = async () => {
    if (!newTypeName.trim()) return;
    const created = await createComponentType.mutateAsync({
      name: newTypeName.trim(),
      system_id: systemId === NONE ? null : systemId,
    });
    setComponentTypeId(created.id);
    setNewTypeName('');
  };

  const submit = () => {
    onSubmit({
      name: name.trim(),
      description: description.trim() || null,
      facility_id: facilityId === NONE ? null : facilityId,
      system_id: systemId === NONE ? null : systemId,
      component_type_id: componentTypeId === NONE ? null : componentTypeId,
      unit_count: unitCount ? Number(unitCount) : null,
      target_sl: Number(targetSl),
      owner_name: ownerName.trim() || null,
      supplier_name: supplierName.trim() || null,
      status,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Grunduppgifter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Projektnamn</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="t.ex. Upphandling av 110 informationsskyltar till UMS"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-description">Beskrivning</Label>
            <Textarea
              id="project-description"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="project-owner">Ansvarig</Label>
              <Input
                id="project-owner"
                value={ownerName}
                onChange={(event) => setOwnerName(event.target.value)}
                placeholder="Namn eller roll"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-status">Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as ProjectStatus)}>
                <SelectTrigger id="project-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {PROJECT_STATUS_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leveransens omfattning</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="project-facility">Anläggning (frivillig)</Label>
              <Select value={facilityId} onValueChange={handleFacilityChange}>
                <SelectTrigger id="project-facility">
                  <SelectValue placeholder="Fristående upphandling" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Fristående upphandling</SelectItem>
                  {(facilities ?? []).map((facility) => (
                    <SelectItem key={facility.id} value={facility.id}>
                      {facility.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Kan kopplas till en anläggning senare, t.ex. vid leverans.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-system">System</Label>
              <Select
                value={systemId}
                onValueChange={(value) => {
                  setSystemId(value);
                  setComponentTypeId(NONE);
                }}
              >
                <SelectTrigger id="project-system">
                  <SelectValue placeholder="Välj system" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Inget system valt</SelectItem>
                  {(systems ?? []).map((system) => (
                    <SelectItem key={system.id} value={system.id}>
                      {system.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-component-type">Komponenttyp</Label>
            <Select value={componentTypeId} onValueChange={setComponentTypeId}>
              <SelectTrigger id="project-component-type">
                <SelectValue placeholder="Välj komponenttyp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Ingen komponenttyp</SelectItem>
                {(componentTypes ?? []).map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input
                value={newTypeName}
                onChange={(event) => setNewTypeName(event.target.value)}
                placeholder="Ny komponenttyp, t.ex. Informationsskylt"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleCreateType}
                disabled={!newTypeName.trim() || createComponentType.isPending}
              >
                Lägg till
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Komponenttypen beskriver produkten som upphandlas. Enskilda exemplar och serienummer
              registreras vid testtillfället.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="project-units">Antal enheter</Label>
              <Input
                id="project-units"
                type="number"
                min={0}
                value={unitCount}
                onChange={(event) => setUnitCount(event.target.value)}
                placeholder="t.ex. 110"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-sl">Avsedd säkerhetsnivå</Label>
              <Select value={targetSl} onValueChange={setTargetSl}>
                <SelectTrigger id="project-sl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4].map((level) => (
                    <SelectItem key={level} value={level.toString()}>
                      {SECURITY_LEVEL_LABELS[securityLevelCode(level)]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Förifylls från anläggningens klass när en anläggning väljs.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-supplier">Leverantör (efter tilldelning)</Label>
            <Input
              id="project-supplier"
              value={supplierName}
              onChange={(event) => setSupplierName(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={submit} disabled={!name.trim() || isSaving}>
          {isSaving ? 'Sparar...' : submitLabel}
        </Button>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Avbryt
          </Button>
        )}
      </div>
    </div>
  );
}
