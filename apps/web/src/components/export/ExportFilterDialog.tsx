import { useState, useEffect } from 'react';
import { Archive, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useOfflineExport } from '@/hooks/useOfflineExport';
import type { ExportFilters } from '@/lib/export/types';
import { fetchAllRows } from '@/lib/fetchAll';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface FilterOption {
  id: string;
  name: string;
  extra?: string;
}

export function ExportFilterDialog({ onExportComplete }: { onExportComplete?: () => void } = {}) {
  const [open, setOpen] = useState(false);
  const { isAdmin } = useAuth();
  const { isExporting, progress, startExport } = useOfflineExport();
  const [includeLinkedSystems, setIncludeLinkedSystems] = useState(true);

  // Filter options from DB
  const [facilities, setFacilities] = useState<FilterOption[]>([]);
  const [systems, setSystems] = useState<FilterOption[]>([]);
  const [sources, setSources] = useState<FilterOption[]>([]);
  const [domains, setDomains] = useState<FilterOption[]>([]);

  // Selected IDs
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [selectedSystems, setSelectedSystems] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);

  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  useEffect(() => {
    if (!open) return;
    setIsLoadingOptions(true);
    Promise.all([
      fetchAllRows(() => supabase.from('facilities').select('id, name, type').order('name')),
      fetchAllRows(() => supabase.from('information_systems').select('id, name, system_type').order('name')),
      fetchAllRows(() => supabase.from('requirement_sources').select('id, document_name, category').order('document_name')),
      fetchAllRows(() => supabase.from('security_domains').select('id, name').order('priority_order')),
    ]).then(([fRes, sRes, srcRes, dRes]) => {
      const failed = [fRes, sRes, srcRes, dRes].find((r) => r.error);
      if (failed?.error) throw failed.error;
      setFacilities((fRes.data || []).map((f: any) => ({ id: f.id, name: f.name, extra: f.type })));
      setSystems((sRes.data || []).map((s: any) => ({ id: s.id, name: s.name, extra: s.system_type })));
      setSources((srcRes.data || []).map((s: any) => ({ id: s.id, name: s.document_name, extra: s.category })));
      setDomains((dRes.data || []).map((d: any) => ({ id: d.id, name: d.name })));
    }).catch((error) => {
      console.error('Export filter options error:', error);
      toast.error('Kunde inte ladda filteralternativen');
    }).finally(() => setIsLoadingOptions(false));
  }, [open]);

  const toggleItem = (list: string[], setList: (v: string[]) => void, id: string) => {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const totalSelected =
    selectedFacilities.length + selectedSystems.length + selectedSources.length + selectedDomains.length;

  const handleExport = async () => {
    const filters: ExportFilters = {};
    if (selectedFacilities.length) filters.facilityIds = selectedFacilities;
    if (selectedSystems.length) filters.systemIds = selectedSystems;
    if (selectedSources.length) filters.sourceIds = selectedSources;
    if (selectedDomains.length) filters.domainIds = selectedDomains;
    if (selectedFacilities.length) filters.includeLinkedSystems = includeLinkedSystems;

    try {
      await startExport(filters);
      onExportComplete?.();
      setOpen(false);
    } catch {
      // error handled in hook
    }
  };

  const clearAll = () => {
    setSelectedFacilities([]);
    setSelectedSystems([]);
    setSelectedSources([]);
    setSelectedDomains([]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2" disabled={!isAdmin} title={isAdmin ? undefined : 'Endast administratörer får exportera'}>
          <Archive className="h-4 w-4" />
          Exportpaket
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-primary" />
            Exportera efterlevnadspaket
          </DialogTitle>
          <DialogDescription>
            Välj vilken data som ska ingå. Lämna allt tomt för att exportera all data. Paketet visar
            vilka krav som inte är uppfyllda och är skyddsvärt – exporten loggas med ditt namn.
          </DialogDescription>
        </DialogHeader>

        {isExporting ? (
          <div className="py-8 space-y-4">
            <div className="flex items-center gap-3 justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm font-medium">{progress?.step || 'Förbereder...'}</span>
            </div>
            <Progress value={progress?.percentage || 0} className="h-2" />
          </div>
        ) : isLoadingOptions ? (
          <div className="py-8 flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Laddar filteralternativ...</span>
          </div>
        ) : (
          <ScrollArea className="flex-1 max-h-[50vh] pr-4">
            <div className="space-y-6">
              <FilterSection
                title="Anläggningar"
                items={facilities}
                selected={selectedFacilities}
                onToggle={(id) => toggleItem(selectedFacilities, setSelectedFacilities, id)}
              />
              {selectedFacilities.length > 0 && (
                <label className="flex items-center gap-2 text-sm px-2">
                  <Checkbox
                    checked={includeLinkedSystems}
                    onCheckedChange={(v) => setIncludeLinkedSystems(v === true)}
                  />
                  Ta med system som är kopplade till valda anläggningar
                </label>
              )}
              <Separator />
              <FilterSection
                title="Informationssystem"
                items={systems}
                selected={selectedSystems}
                onToggle={(id) => toggleItem(selectedSystems, setSelectedSystems, id)}
              />
              <Separator />
              <FilterSection
                title="Regelverk"
                items={sources}
                selected={selectedSources}
                onToggle={(id) => toggleItem(selectedSources, setSelectedSources, id)}
              />
              <Separator />
              <FilterSection
                title="Säkerhetsdomäner"
                items={domains}
                selected={selectedDomains}
                onToggle={(id) => toggleItem(selectedDomains, setSelectedDomains, id)}
              />
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <div className="flex items-center gap-2">
            {totalSelected > 0 && (
              <>
                <Badge variant="secondary">{totalSelected} filter valda</Badge>
                <Button variant="ghost" size="sm" onClick={clearAll}>
                  Rensa
                </Button>
              </>
            )}
            {totalSelected === 0 && (
              <span className="text-xs text-muted-foreground">All data exporteras</span>
            )}
          </div>
          <Button onClick={handleExport} disabled={isExporting} className="gap-2">
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Archive className="h-4 w-4" />
            )}
            Exportera paket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FilterSection({
  title,
  items,
  selected,
  onToggle,
}: {
  title: string;
  items: FilterOption[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">{title}</h4>
        <span className="text-xs text-muted-foreground">
          {selected.length}/{items.length} valda
        </span>
      </div>
      <div className="grid gap-1.5 max-h-40 overflow-y-auto">
        {items.map((item) => (
          <label
            key={item.id}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 cursor-pointer text-sm"
          >
            <Checkbox
              checked={selected.includes(item.id)}
              onCheckedChange={() => onToggle(item.id)}
            />
            <span className="flex-1 truncate">{item.name}</span>
            {item.extra && (
              <Badge variant="outline" className="text-xs shrink-0">
                {item.extra}
              </Badge>
            )}
          </label>
        ))}
      </div>
    </div>
  );
}
