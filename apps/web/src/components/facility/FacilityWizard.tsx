import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { FacilityFormData, FacilityType, ConstructionType, ClassificationLevel } from '@/types/compliance';
import { CLASSIFICATION_LABELS } from '@/types/compliance';
import { SecurityLevelBadge } from '@/components/requirements/SecurityLevelBadge';
import { useCreateFacility } from '@/hooks/useFacilities';


const FACILITY_TYPES: { value: FacilityType; label: string; description: string }[] = [
  { value: 'Vägtunnel', label: 'Vägtunnel', description: 'Tunnel för vägtrafik' },
  { value: 'Järnvägstunnel', label: 'Järnvägstunnel', description: 'Tunnel för järnvägstrafik' },
  { value: 'Bro', label: 'Bro', description: 'Bro eller viadukt' },
  { value: 'Trafikledningscentral', label: 'Trafikledningscentral', description: 'Kritisk för NIS2' },
  { value: 'Datacenter', label: 'Datacenter/Serverhall', description: 'Kritisk för MSBFS/NIS2' },
  { value: 'Spåranläggning', label: 'Spåranläggning', description: 'Spårinfrastruktur' },
  { value: 'Signalanläggning', label: 'Signalanläggning', description: 'Signalsystem' },
  { value: 'Elkraftsanläggning', label: 'Elkraftsanläggning', description: 'T.ex. omformarstationer' },
  { value: 'Terminal', label: 'Terminal/Station', description: 'Terminal eller station' },
  { value: 'Trafikplats', label: 'Trafikplats', description: 'Trafikplats/korsning' },
];

const CONSTRUCTION_TYPES: { value: ConstructionType; label: string }[] = [
  { value: 'Berg', label: 'Bergtunnel' },
  { value: 'Betong', label: 'Betongtunnel' },
  { value: 'Sänktunnel', label: 'Sänktunnel' },
  { value: 'Överdäckning', label: 'Överdäckning' },
];

const initialFormData: FacilityFormData = {
  name: '',
  type: '',
  length_meters: undefined,
  traffic_flow_adt: undefined,
  is_critical_entity: false,
  has_dangerous_goods: false,
  construction_type: '',
  owner_type: '',
  classification_level: null,
};

export function FacilityWizard() {
  const navigate = useNavigate();
  const createFacility = useCreateFacility();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FacilityFormData>(initialFormData);

  const totalSteps = formData.type === 'Vägtunnel' ? 4 : 3;
  const progress = (step / totalSteps) * 100;

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.name.trim() !== '' && formData.type !== '';
      case 2:
        if (formData.type === 'Vägtunnel') {
          return formData.length_meters !== undefined && formData.length_meters > 0;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    await createFacility.mutateAsync(formData);
    navigate('/');
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-2">
              <Label htmlFor="name">Namn på anläggning</Label>
              <Input
                id="name"
                placeholder="t.ex. Norra länken-tunneln"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-12"
              />
            </div>

            <div className="space-y-3">
              <Label>Typ av anläggning</Label>
              <RadioGroup
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value as FacilityType })}
                className="grid gap-3"
              >
                {FACILITY_TYPES.map((type) => (
                  <div key={type.value} className="relative">
                    <RadioGroupItem
                      value={type.value}
                      id={type.value}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={type.value}
                      className="flex items-center gap-4 rounded-lg border-2 border-border p-4 cursor-pointer transition-all hover:border-primary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                    >
                      <div className="p-2 rounded-lg bg-muted">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{type.label}</p>
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        );

      case 2:
        if (formData.type === 'Vägtunnel') {
          return (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-2">
                <Label htmlFor="length">Tunnellängd (meter)</Label>
                <Input
                  id="length"
                  type="number"
                  placeholder="t.ex. 1500"
                  value={formData.length_meters || ''}
                  onChange={(e) => setFormData({ ...formData, length_meters: parseInt(e.target.value) || undefined })}
                  className="h-12"
                />
                <p className="text-sm text-muted-foreground">
                  Tunnlar över 500m omfattas av TSFS 2019:93. Över 3000m krävs trafikledningscentral.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="traffic">Årsdygnstrafik (ÅDT)</Label>
                <Input
                  id="traffic"
                  type="number"
                  placeholder="t.ex. 25000"
                  value={formData.traffic_flow_adt || ''}
                  onChange={(e) => setFormData({ ...formData, traffic_flow_adt: parseInt(e.target.value) || undefined })}
                  className="h-12"
                />
              </div>

              <div className="space-y-3">
                <Label>Konstruktionstyp</Label>
                <RadioGroup
                  value={formData.construction_type}
                  onValueChange={(value) => setFormData({ ...formData, construction_type: value as ConstructionType })}
                  className="grid grid-cols-2 gap-3"
                >
                  {CONSTRUCTION_TYPES.map((type) => (
                    <div key={type.value} className="relative">
                      <RadioGroupItem
                        value={type.value}
                        id={type.value}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={type.value}
                        className="flex items-center justify-center rounded-lg border-2 border-border p-3 cursor-pointer transition-all hover:border-primary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                      >
                        {type.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>
          );
        }
        // For non-tunnel types, go straight to criticality
        return renderCriticalityStep();

      case 3:
        if (formData.type === 'Vägtunnel') {
          return (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div className="space-y-1">
                  <Label htmlFor="dangerous-goods">Transport av farligt gods</Label>
                  <p className="text-sm text-muted-foreground">
                    Påverkar krav på dräneringssystem
                  </p>
                </div>
                <Switch
                  id="dangerous-goods"
                  checked={formData.has_dangerous_goods}
                  onCheckedChange={(checked) => setFormData({ ...formData, has_dangerous_goods: checked })}
                />
              </div>

              {renderCriticalityStep()}
            </div>
          );
        }
        return renderOwnerStep();

      case 4:
        return renderOwnerStep();

      default:
        return null;
    }
  };

  const renderCriticalityStep = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 rounded-lg border border-border">
        <div className="space-y-1">
          <Label htmlFor="critical">Samhällsviktig verksamhet</Label>
          <p className="text-sm text-muted-foreground">
            Är anläggningen del av en samhällsviktig tjänst? (NIS2/TSFS 2022:14)
          </p>
        </div>
        <Switch
          id="critical"
          checked={formData.is_critical_entity}
          onCheckedChange={(checked) => setFormData({ ...formData, is_critical_entity: checked })}
        />
      </div>

      <div className="space-y-2 p-4 rounded-lg border border-border">
        <Label htmlFor="classification">Säkerhetsklassificering</Label>
        <p className="text-sm text-muted-foreground">
          Styr vilka krav som blir tillämpliga. Anläggningsklassen bestämmer automatiskt IEC 62443 Security Level.
        </p>
        <Select
          value={formData.classification_level ? String(formData.classification_level) : ''}
          onValueChange={(v) => setFormData({ ...formData, classification_level: (v ? Number(v) : null) as ClassificationLevel | null })}
        >
          <SelectTrigger id="classification" className="h-12">
            <SelectValue placeholder="Välj nivå..." />
          </SelectTrigger>
          <SelectContent>
            {([1, 2, 3, 4, 5] as ClassificationLevel[]).map((lvl) => (
              <SelectItem key={lvl} value={String(lvl)}>{CLASSIFICATION_LABELS[lvl]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <SecurityLevelBadge classificationLevel={formData.classification_level} showDescription className="pt-1" />
      </div>

    </div>
  );

  const renderOwnerStep = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-3">
        <Label>Ägare/Förvaltare</Label>
        <RadioGroup
          value={formData.owner_type}
          onValueChange={(value) => setFormData({ ...formData, owner_type: value })}
          className="grid gap-3"
        >
          {['Statlig Myndighet', 'Region', 'Kommun', 'Privat'].map((owner) => (
            <div key={owner} className="relative">
              <RadioGroupItem
                value={owner}
                id={owner}
                className="peer sr-only"
              />
              <Label
                htmlFor={owner}
                className="flex items-center justify-center rounded-lg border-2 border-border p-3 cursor-pointer transition-all hover:border-primary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
              >
                {owner}
              </Label>
            </div>
          ))}
        </RadioGroup>
        <p className="text-sm text-muted-foreground">
          Statliga myndigheter omfattas av MSBFS 2020:7
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tillbaka
        </Button>

        <Card className="animate-fade-in">
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Steg {step} av {totalSteps}</span>
              </div>
              <Progress value={progress} className="w-24 h-2" />
            </div>
            <CardTitle className="text-2xl">
              {step === 1 && 'Grunduppgifter'}
              {step === 2 && formData.type === 'Vägtunnel' && 'Dimensioner'}
              {step === 2 && formData.type !== 'Vägtunnel' && 'Kritikalitet'}
              {step === 3 && formData.type === 'Vägtunnel' && 'Säkerhetsparametrar'}
              {step === 3 && formData.type !== 'Vägtunnel' && 'Ägare'}
              {step === 4 && 'Ägare'}
            </CardTitle>
            <CardDescription>
              {step === 1 && 'Ange namn och typ för din anläggning'}
              {step === 2 && formData.type === 'Vägtunnel' && 'Dessa uppgifter påverkar vilka krav som gäller'}
              {step === 2 && formData.type !== 'Vägtunnel' && 'Är anläggningen samhällsviktig?'}
              {step === 3 && formData.type === 'Vägtunnel' && 'Ytterligare parametrar för tunnelsäkerhet'}
              {step >= 3 && 'Vem äger eller förvaltar anläggningen?'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {renderStep()}

            <div className="flex justify-between pt-6 border-t border-border">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={step === 1}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Tillbaka
              </Button>

              {step < totalSteps ? (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed()}
                >
                  Nästa
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={createFacility.isPending}
                >
                  <Check className="mr-2 h-4 w-4" />
                  {createFacility.isPending ? 'Skapar...' : 'Skapa anläggning'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
