import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useTestMappings } from '@/hooks/useTestMappings';

/** Warning for test rows that cannot become an assessment. Decisions are made in the table rows. */
export function TestResultSuggestions() {
  const { data: mappings } = useTestMappings();
  const missingAsset = (mappings ?? []).filter((mapping) => !mapping.system_id && !mapping.asset_id);
  if (missingAsset.length === 0) return null;

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{missingAsset.length} mappningar saknar tillgång</AlertTitle>
      <AlertDescription>
        Dessa testmappningar är varken kopplade till ett system eller en komponent och kan därför inte kopplas
        till någon kravbedömning. Komplettera dem i tabellen nedan.
      </AlertDescription>
    </Alert>
  );
}
