import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Server, Check, ChevronDown, Building2, Link, Shield } from 'lucide-react';
import { ClassificationBadge } from '@/components/system/ClassificationBadge';
import { getEffectiveClassification } from '@/lib/effectiveClassification';
import { getSecurityLevelLabel } from '@/lib/securityLevel';
import type { ClassificationLevel } from '@/types/compliance';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useCreateInformationSystem } from '@/hooks/useInformationSystems';
import { useFacilities } from '@/hooks/useFacilities';
import { 
  categorizedSystemTypes, 
  systemCategoryLabels, 
  getSystemTypeDefinition,
  getSystemTypeCategory,
  relationTypeLabels,
  criticalityLabels,
  type SystemFormData,
  type SystemCategory,
  type SystemRelationType,
  type SystemCriticality,
} from '@/types/system';

const ownerTypes = [
  'Statlig Myndighet',
  'Region',
  'Kommun',
  'Privat Företag',
  'Offentligt Bolag',
];

const categoryDescriptions: Record<SystemCategory, string> = {
  tunnel_traffic_ot: 'Kritiska för drift, regleras av TSFS 2019:93 (OT/SCADA)',
  it_infrastructure: 'Underliggande system, NIS2/MSBFS 2020:7 krav',
  physical_security: 'Skyddar utrymmen enl. MSBFS 2020:7 Kap 4 & TSFS 2022:14',
  communication_crisis: 'Samverkan med blåljusmyndigheter vid incidenter',
};

export function SystemWizard() {
  const navigate = useNavigate();
  const createSystem = useCreateInformationSystem();
  const { data: facilities } = useFacilities();
  const [searchParams] = useSearchParams();
  /** Set when the wizard is opened from a facility page (facility-driven flow) */
  const originFacilityId = searchParams.get('facilityId') || undefined;
  const [step, setStep] = useState(1);
  const [expandedCategories, setExpandedCategories] = useState<SystemCategory[]>(['tunnel_traffic_ot']);
  const [formData, setFormData] = useState<SystemFormData>({
    name: '',
    description: '',
    system_type: '',
    system_category: undefined,
    system_owner: '',
    is_critical_entity: false,
    is_externally_accessible: false,
    is_central_system: false,
    owner_type: '',
    linked_facility_id: originFacilityId,
    facility_relation_type: 'betjänar',
    facility_criticality: 'important',
    facility_class_override: null,
    override_reason: null,
  });

  const updateField = <K extends keyof SystemFormData>(
    field: K,
    value: SystemFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSystemTypeSelect = (typeValue: string) => {
    const category = getSystemTypeCategory(typeValue);
    setFormData((prev) => ({
      ...prev,
      system_type: typeValue,
      system_category: category,
    }));
  };

  const toggleCategory = (category: SystemCategory) => {
    setExpandedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleSubmit = async () => {
    await createSystem.mutateAsync(formData);
    navigate(originFacilityId ? `/facility/${originFacilityId}` : '/systems');
  };

  const selectedTypeDef = getSystemTypeDefinition(formData.system_type);
  const selectedFacility = facilities?.find(f => f.id === formData.linked_facility_id);
  const facilityLevel = selectedFacility?.classification_level ?? null;

  const previewClassification = getEffectiveClassification(
    {
      classification_source: selectedFacility
        ? (formData.facility_class_override ? 'overridden' : 'inherited')
        : 'own',
      facility_class_override: formData.facility_class_override,
      override_reason: formData.override_reason,
      own_classification_level: formData.own_classification_level,
      is_critical_entity: formData.is_critical_entity,
      owner_type: formData.owner_type,
    },
    selectedFacility
      ? {
          id: selectedFacility.id,
          name: selectedFacility.name,
          type: selectedFacility.type,
          classification_level: selectedFacility.classification_level,
          is_critical_entity: selectedFacility.is_critical_entity,
          owner_type: selectedFacility.owner_type,
        }
      : null,
  );

  const canProceed = () => {
    if (step === 1) return formData.name.length > 0 && formData.system_type.length > 0;
    // En avvikelse kräver motivering (minst 15 tecken, kontrolleras även i
    // databasen). Ett system utan anläggning behöver en egen klass.
    if (step === 2) {
      if (!formData.linked_facility_id) return !!formData.own_classification_level;
      return !formData.facility_class_override || (formData.override_reason || '').trim().length >= 15;
    }
    return true;
  };

  const totalSteps = 4;

  return (
    <div className="max-w-2xl mx-auto">
      <Button variant="ghost" className="mb-6" onClick={() => navigate('/systems')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Tillbaka till systemöversikt
      </Button>

      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-8">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
          <div
            key={s}
            className={`flex-1 h-2 rounded-full transition-colors ${
              s <= step ? 'bg-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <Card className="animate-fade-in">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Server className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Grundläggande information</CardTitle>
                <CardDescription>
                  Ange systemets namn och typ
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Systemnamn *</Label>
              <Input
                id="name"
                placeholder="t.ex. Trafikstyrningssystem Norra Länken"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <Label>Systemtyp *</Label>
              
              {/* Selected type display */}
              {selectedTypeDef && (
                <div className="p-3 rounded-lg border-2 border-primary bg-primary/5 mb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{selectedTypeDef.label}</span>
                      <p className="text-sm text-muted-foreground">{selectedTypeDef.description}</p>
                    </div>
                    <Badge variant="outline">
                      {systemCategoryLabels[selectedTypeDef.category]}
                    </Badge>
                  </div>
                </div>
              )}
              
              {/* Categorized system types */}
              <div className="space-y-2">
                {(Object.keys(categorizedSystemTypes) as SystemCategory[]).map((category) => (
                  <Collapsible
                    key={category}
                    open={expandedCategories.includes(category)}
                    onOpenChange={() => toggleCategory(category)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-between p-3 h-auto"
                      >
                        <div className="text-left">
                          <span className="font-medium">{systemCategoryLabels[category]}</span>
                          <p className="text-xs text-muted-foreground font-normal">
                            {categoryDescriptions[category]}
                          </p>
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            expandedCategories.includes(category) ? 'rotate-180' : ''
                          }`}
                        />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="grid gap-2 pl-4 pt-2 pb-2">
                        {categorizedSystemTypes[category].map((type) => (
                          <button
                            key={type.value}
                            onClick={() => handleSystemTypeSelect(type.value)}
                            className={`text-left p-3 rounded-lg border transition-colors ${
                              formData.system_type === type.value
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-primary/50 hover:bg-muted/50'
                            }`}
                          >
                            <span className="font-medium text-sm">{type.label}</span>
                            <p className="text-xs text-muted-foreground">{type.description}</p>
                          </button>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Beskrivning</Label>
              <Textarea
                id="description"
                placeholder="Kort beskrivning av systemets funktion..."
                value={formData.description || ''}
                onChange={(e) => updateField('description', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="system_owner">Systemägare</Label>
              <Input
                id="system_owner"
                placeholder="Namn på ansvarig person/enhet"
                value={formData.system_owner || ''}
                onChange={(e) => updateField('system_owner', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: System properties */}
      {step === 3 && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Klassificering</CardTitle>
            <CardDescription>
              Ange systemets egenskaper för korrekt kravmatchning
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="owner_type">Ägartyp</Label>
              <Select
                value={formData.owner_type || ''}
                onValueChange={(value) => updateField('owner_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Välj ägartyp" />
                </SelectTrigger>
                <SelectContent>
                  {ownerTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <Label className="text-base">Samhällsviktig verksamhet</Label>
                  <p className="text-sm text-muted-foreground">
                    NIS2/CER-krav aktiveras
                  </p>
                </div>
                <Switch
                  checked={formData.is_critical_entity}
                  onCheckedChange={(checked) => updateField('is_critical_entity', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <Label className="text-base">Externt tillgängligt</Label>
                  <p className="text-sm text-muted-foreground">
                    Systemet är åtkomligt via internet
                  </p>
                </div>
                <Switch
                  checked={formData.is_externally_accessible}
                  onCheckedChange={(checked) =>
                    updateField('is_externally_accessible', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <Label className="text-base">Centralt system (MSBFS)</Label>
                  <p className="text-sm text-muted-foreground">
                    Kvartalsvis återställningstest krävs
                  </p>
                </div>
                <Switch
                  checked={formData.is_central_system}
                  onCheckedChange={(checked) => updateField('is_central_system', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Facility (source of classification) */}
      {step === 2 && (
        <Card className="animate-fade-in">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Anläggning och klassificering</CardTitle>
                <CardDescription>
                  Anläggningen är utgångspunkten — systemet ärver dess klassificering och säkerhetsnivå
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="facility">Primär anläggning</Label>
              <Select
                value={formData.linked_facility_id || 'none'}
                onValueChange={(value) => {
                  updateField('linked_facility_id', value === 'none' ? undefined : value);
                  updateField('facility_class_override', null);
                  updateField('override_reason', null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Välj anläggning" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Fristående system (ingen anläggning)</SelectItem>
                  {facilities?.map((facility) => (
                    <SelectItem key={facility.id} value={facility.id}>
                      {facility.name} ({facility.type})
                      {facility.classification_level ? ` — Klass ${facility.classification_level}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Den primära anläggningen styr systemets klassificering. Fler anläggningar kan kopplas senare.
              </p>
            </div>

            {selectedFacility && (
              <div className="space-y-4 p-4 rounded-lg border border-primary/20 bg-primary/5">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Ärvd klassificering</span>
                </div>
                <ClassificationBadge classification={previewClassification} />

                {facilityLevel && facilityLevel > 1 && (
                  <div className="space-y-3 pt-2 border-t border-primary/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Avvikande klassificering</Label>
                        <p className="text-xs text-muted-foreground">
                          Endast lägre nivå än anläggningens är tillåten och kräver motivering
                        </p>
                      </div>
                      <Switch
                        checked={!!formData.facility_class_override}
                        onCheckedChange={(checked) => {
                          updateField('facility_class_override', checked ? facilityLevel - 1 : null);
                          if (!checked) updateField('override_reason', null);
                        }}
                      />
                    </div>

                    {!!formData.facility_class_override && (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label>Klass för systemet</Label>
                          <Select
                            value={String(formData.facility_class_override)}
                            onValueChange={(value) => updateField('facility_class_override', Number(value))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: facilityLevel - 1 }, (_, i) => i + 1).map((level) => (
                                <SelectItem key={level} value={String(level)}>
                                  Klass {level} — {getSecurityLevelLabel(level as ClassificationLevel)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="override_reason">Motivering *</Label>
                          <Textarea
                            id="override_reason"
                            placeholder="Varför avviker systemet från anläggningens klass?"
                            value={formData.override_reason || ''}
                            onChange={(e) => updateField('override_reason', e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">Minst 15 tecken.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}


            {formData.linked_facility_id && (
              <>
                <div className="space-y-2">
                  <Label>Relationstyp</Label>
                  <Select
                    value={formData.facility_relation_type || 'betjänar'}
                    onValueChange={(value) => updateField('facility_relation_type', value as SystemRelationType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(relationTypeLabels) as [SystemRelationType, string][]).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Hur relaterar systemet till anläggningen?
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Kritikalitet</Label>
                  <Select
                    value={formData.facility_criticality || 'important'}
                    onValueChange={(value) => updateField('facility_criticality', value as SystemCriticality)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(criticalityLabels) as [SystemCriticality, string][]).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Hur kritiskt är systemet för anläggningens drift?
                  </p>
                </div>

                <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
                  <div className="flex items-center gap-2">
                    <Link className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">Koppling förhandsvisning</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    <span className="font-medium">{formData.name || 'System'}</span>
                    {' → '}
                    <Badge variant="outline" className="mx-1">
                      {relationTypeLabels[formData.facility_relation_type || 'betjänar']}
                    </Badge>
                    {' → '}
                    <span className="font-medium">{selectedFacility?.name}</span>
                  </p>
                </div>
              </>
            )}

            {!formData.linked_facility_id && (
              <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Fristående system – välj egen klass *</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Utan anläggning behöver systemet en egen klass, annars får det fel krav.
                  Kopplas det senare till en anläggning gäller den högsta av egen och ärvd klass.
                </p>
                <div className="flex flex-wrap gap-2">
                  {([1, 2, 3, 4, 5] as ClassificationLevel[]).map((level) => (
                    <Button
                      key={level}
                      type="button"
                      size="sm"
                      variant={formData.own_classification_level === level ? 'default' : 'outline'}
                      onClick={() => updateField('own_classification_level', level)}
                    >
                      Klass {level} — {getSecurityLevelLabel(level)}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Confirmation */}
      {step === 4 && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Bekräfta och skapa</CardTitle>
            <CardDescription>
              Granska informationen innan systemet skapas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Namn:</span>
                  <span className="font-medium">{formData.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Typ:</span>
                  <div className="text-right">
                    <span className="font-medium">{selectedTypeDef?.label || formData.system_type}</span>
                    {formData.system_category && (
                      <Badge variant="outline" className="ml-2">
                        {systemCategoryLabels[formData.system_category]}
                      </Badge>
                    )}
                  </div>
                </div>
                {formData.system_owner && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Systemägare:</span>
                    <span className="font-medium">{formData.system_owner}</span>
                  </div>
                )}
                {formData.owner_type && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ägartyp:</span>
                    <span className="font-medium">{formData.owner_type}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Samhällsviktig:</span>
                  <span className="font-medium">
                    {formData.is_critical_entity ? 'Ja' : 'Nej'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Externt tillgängligt:</span>
                  <span className="font-medium">
                    {formData.is_externally_accessible ? 'Ja' : 'Nej'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Centralt system:</span>
                  <span className="font-medium">
                    {formData.is_central_system ? 'Ja' : 'Nej'}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center p-4 rounded-lg bg-muted/50">
                <span className="text-muted-foreground">Klassificering:</span>
                <ClassificationBadge classification={previewClassification} />
              </div>

              {/* Facility link summary */}
              {selectedFacility && (
                <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">Kopplad anläggning</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Anläggning:</span>
                    <span className="font-medium">{selectedFacility.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Relation:</span>
                    <Badge variant="outline">
                      {relationTypeLabels[formData.facility_relation_type || 'betjänar']}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Kritikalitet:</span>
                    <Badge 
                      variant={formData.facility_criticality === 'critical' ? 'destructive' : 'outline'}
                    >
                      {criticalityLabels[formData.facility_criticality || 'important']}
                    </Badge>
                  </div>
                </div>
              )}

              <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
                <p className="text-sm text-muted-foreground">
                  När systemet skapas kommer tillämpliga krav automatiskt att matchas
                  baserat på klassificeringen.
                  {!selectedFacility && ' Du kan sedan koppla systemet till fysiska anläggningar och lägga till komponenter.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 1}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tillbaka
        </Button>

        {step < totalSteps ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}>
            Nästa
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={createSystem.isPending}
          >
            <Check className="mr-2 h-4 w-4" />
            {createSystem.isPending ? 'Skapar...' : 'Skapa system'}
          </Button>
        )}
      </div>
    </div>
  );
}
