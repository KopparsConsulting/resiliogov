import { TestResultSuggestions } from '@/components/test-model/TestResultSuggestions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TestModelTable } from '@/components/test-model/TestModelTable';
import { TestModelImport } from '@/components/test-model/TestModelImport';
import { TestModelOverview } from '@/components/test-model/TestModelOverview';
import { TestModelManual } from '@/components/test-model/TestModelManual';
import { TestTube2 } from 'lucide-react';

export default function TestModelPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <TestTube2 className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Testmodell</h1>
          <p className="text-muted-foreground text-sm">
            Korskoppla krav mot system, komponent och teststeg (FAT 1–3, SAT, OSAT) för spårbar verifiering
          </p>
        </div>
      </div>

      <Tabs defaultValue="mapping">
        <TabsList>
          <TabsTrigger value="mapping">Mappning</TabsTrigger>
          <TabsTrigger value="import">Importera</TabsTrigger>
          <TabsTrigger value="overview">Översikt</TabsTrigger>
          <TabsTrigger value="manual">Manual</TabsTrigger>
        </TabsList>

        <TabsContent value="mapping" className="mt-4 space-y-4">
          <TestResultSuggestions />
          <TestModelTable />
        </TabsContent>
        <TabsContent value="import" className="mt-4"><TestModelImport /></TabsContent>
        <TabsContent value="overview" className="mt-4"><TestModelOverview /></TabsContent>
        <TabsContent value="manual" className="mt-4"><TestModelManual /></TabsContent>
      </Tabs>
    </div>
  );
}
