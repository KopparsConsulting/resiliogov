import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useScoringThresholds } from '@/hooks/useScoringThresholds';
import { DEFAULT_THRESHOLDS, type ScoringThresholds } from '@/lib/complianceMetrics';

const FIELDS: { key: keyof ScoringThresholds; label: string; description: string }[] = [
  {
    key: 'not_assessed_coverage',
    label: 'Gräns för "Ej bedömd" (täckning %)',
    description: 'Objekt med lägre täckning än detta märks som Ej bedömd.',
  },
  {
    key: 'critical_compliance',
    label: 'Gräns för "Kritisk" (efterlevnad %)',
    description: 'Efterlevnad under detta värde kan ge etiketten Kritisk.',
  },
  {
    key: 'critical_min_coverage',
    label: 'Minsta täckning för "Kritisk" (%)',
    description: 'Ett objekt märks aldrig Kritisk innan så här stor andel är bedömd.',
  },
  {
    key: 'good_compliance',
    label: 'Gräns för "God" (efterlevnad %)',
    description: 'Efterlevnad på eller över detta värde ger etiketten God.',
  },
];

export function ScoringThresholdsCard() {
  const { data } = useScoringThresholds();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<ScoringThresholds>(DEFAULT_THRESHOLDS);

  useEffect(() => {
    if (data) setValues(data);
  }, [data]);

  const save = useMutation({
    mutationFn: async (next: ScoringThresholds) => {
      for (const [key, value] of Object.entries(next)) {
        const { error } = await supabase
          .from('scoring_thresholds')
          .update({ value })
          .eq('key', key);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scoring-thresholds'] });
      toast.success('Gränsvärden sparade');
    },
    onError: (error: { message?: string }) => {
      toast.error(error?.message || 'Kunde inte spara gränsvärden');
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gränsvärden för bedömning</CardTitle>
        <CardDescription>
          Styr när ett objekt märks som Ej bedömd, Kritisk, Behöver åtgärd eller God.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {FIELDS.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key}>{field.label}</Label>
              <Input
                id={field.key}
                type="number"
                min={0}
                max={100}
                value={values[field.key]}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, [field.key]: Number(event.target.value) }))
                }
              />
              <p className="text-xs text-muted-foreground">{field.description}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => save.mutate(values)} disabled={save.isPending}>
            Spara gränsvärden
          </Button>
          <Button variant="outline" onClick={() => setValues(DEFAULT_THRESHOLDS)}>
            Återställ standard
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
