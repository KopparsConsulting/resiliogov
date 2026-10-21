import { useEffect, useState } from 'react';
import { AlertTriangle, Building2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { getSecurityLevelLabel } from '@/lib/securityLevel';
import type { EffectiveClassification } from '@/lib/effectiveClassification';
import { useUpdateSystemClassification } from '@/hooks/useInformationSystems';
import type { PrimaryFacility, SystemClassificationRow } from '@/types/system';

const MIN_REASON_LENGTH = 15;

interface SystemClassificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  systemId: string;
  systemName: string;
  classification: EffectiveClassification;
  primaryFacility: PrimaryFacility | null;
  /** Klassen enligt databasen – ger ärvd klass från ALLA kopplade anläggningar */
  dbClassification?: SystemClassificationRow | null;
}

const ALL_LEVELS = [1, 2, 3, 4, 5];
type Mode = 'inherited' | 'overridden' | 'own';

/**
 * Explicit edit dialog for a system's classification.
 * Kopplat system: den högsta klassen bland anläggningarna är taket – systemet
 * får bara avvika nedåt och måste motiveras (kontrolleras även i databasen).
 * System utan anläggning: egen klass 1–5.
 */
export function SystemClassificationDialog({
  open,
  onOpenChange,
  systemId,
  systemName,
  classification,
  primaryFacility,
  dbClassification,
}: SystemClassificationDialogProps) {
  const updateClassification = useUpdateSystemClassification();

  const linkedCount = dbClassification?.linked_facilities ?? (primaryFacility ? 1 : 0);
  const hasFacility = linkedCount > 0;
  const inheritedLevel = dbClassification
    ? dbClassification.inherited_level
    : primaryFacility?.classification_level ?? null;
  const drivingFacilityName = dbClassification?.driving_facility_name ?? primaryFacility?.name ?? null;

  const initialMode = (): Mode =>
    !hasFacility ? 'own' : classification.isDeviation ? 'overridden' : 'inherited';
  const initialLevel = (): number | null =>
    !hasFacility
      ? dbClassification?.own_level ?? null
      : classification.isDeviation ? classification.classificationLevel : null;

  const [mode, setMode] = useState<Mode>(initialMode);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(initialLevel);
  const [reason, setReason] = useState(classification.overrideReason ?? '');
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode(initialMode());
    setSelectedLevel(initialLevel());
    setReason(classification.overrideReason ?? '');
    setShowErrors(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, hasFacility, classification.isDeviation, classification.classificationLevel,
    classification.overrideReason, dbClassification?.own_level]);

  const lowerLevels = inheritedLevel
    ? Array.from({ length: inheritedLevel - 1 }, (_, index) => index + 1)
    : [];

  const reasonTooShort = reason.trim().length < MIN_REASON_LENGTH;
  const overrideInvalid = mode === 'overridden' && (!selectedLevel || reasonTooShort);
  const ownInvalid = mode === 'own' && !selectedLevel;

  const handleSave = () => {
    if (overrideInvalid || ownInvalid) {
      setShowErrors(true);
      return;
    }

    updateClassification.mutate(
      {
        systemId,
        classificationSource: mode,
        facilityClassOverride: mode === 'overridden' ? selectedLevel : null,
        overrideReason: mode === 'overridden' ? reason.trim() : null,
        ownClassificationLevel: mode === 'own' ? selectedLevel : null,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ändra klassificering</DialogTitle>
          <DialogDescription>
            {hasFacility
              ? `Den högsta klassen bland kopplade anläggningar styr systemets säkerhetsnivå. ${systemName} kan bara avvika nedåt, och avvikelsen måste motiveras.`
              : `${systemName} är inte kopplat till någon anläggning och behöver en egen klass.`}
            {' '}Nya krav läggs till automatiskt; krav som inte längre gäller granskas under "Uppdatera krav".
          </DialogDescription>
        </DialogHeader>

        {!hasFacility ? (
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Om systemet kopplas till en anläggning ärver det anläggningens klass i stället
                (eller den egna klassen, om den är högre).
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label>Systemets klass</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_LEVELS.map(level => (
                  <Button
                    key={level}
                    type="button"
                    variant={selectedLevel === level ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedLevel(level)}
                  >
                    Klass {level} · {getSecurityLevelLabel(level as 1 | 2 | 3 | 4 | 5)}
                  </Button>
                ))}
              </div>
              {showErrors && !selectedLevel && (
                <p className="text-sm text-destructive">Välj en klass för systemet.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Building2 className="h-4 w-4" />
                Ärvd från {drivingFacilityName ?? 'kopplad anläggning'}
                {linkedCount > 1 && ` (högsta klassen av ${linkedCount} kopplade anläggningar)`}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {inheritedLevel ? `Klass ${inheritedLevel}` : 'Klass saknas'}
                </Badge>
                {inheritedLevel && (
                  <Badge variant="outline">{getSecurityLevelLabel(inheritedLevel as 1 | 2 | 3 | 4 | 5)}</Badge>
                )}
              </div>
            </div>

            <RadioGroup
              value={mode}
              onValueChange={value => setMode(value as Mode)}
              className="space-y-3"
            >
              <div className="flex items-start gap-3 rounded-lg border border-border p-4">
                <RadioGroupItem value="inherited" id="mode-inherited" className="mt-1" />
                <div>
                  <Label htmlFor="mode-inherited" className="font-medium">
                    Ärv anläggningarnas klass
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Systemet följer automatiskt anläggningarna om klassen ändras.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-border p-4">
                <RadioGroupItem
                  value="overridden"
                  id="mode-overridden"
                  className="mt-1"
                  disabled={lowerLevels.length === 0}
                />
                <div className="flex-1">
                  <Label htmlFor="mode-overridden" className="font-medium">
                    Avvikande klassificering (endast lägre)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {lowerLevels.length === 0
                      ? 'Ingen lägre nivå finns att sänka till.'
                      : 'Sänk systemets klass och ange en motivering.'}
                  </p>
                </div>
              </div>
            </RadioGroup>

            {mode === 'overridden' && lowerLevels.length > 0 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Klass för systemet</Label>
                  <div className="flex flex-wrap gap-2">
                    {lowerLevels.map(level => (
                      <Button
                        key={level}
                        type="button"
                        variant={selectedLevel === level ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedLevel(level)}
                      >
                        Klass {level} · {getSecurityLevelLabel(level as 1 | 2 | 3 | 4 | 5)}
                      </Button>
                    ))}
                  </div>
                  {showErrors && !selectedLevel && (
                    <p className="text-sm text-destructive">Välj en klass för avvikelsen.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="override-reason">Motivering *</Label>
                  <Textarea
                    id="override-reason"
                    value={reason}
                    onChange={event => setReason(event.target.value)}
                    placeholder="Beskriv varför systemet klassas lägre än anläggningen, t.ex. avgränsat nätverk utan trafikpåverkan."
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minst {MIN_REASON_LENGTH} tecken. Motiveringen loggas och visas på systemet.
                  </p>
                  {showErrors && reasonTooShort && (
                    <p className="text-sm text-destructive">
                      Motiveringen måste vara minst {MIN_REASON_LENGTH} tecken.
                    </p>
                  )}
                </div>

                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    En avvikelse markeras tydligt i systemlistor och rapporter.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateClassification.isPending}
          >
            Spara klassificering
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
