import { useState } from 'react';
import { ChevronDown, BookOpen, Building2, Server, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useRequirementSources } from '@/hooks/useRequirementSources';
import { useFacilities } from '@/hooks/useFacilities';
import { useInformationSystems } from '@/hooks/useInformationSystems';
import { cn } from '@/lib/utils';

export interface ContextItem {
  type: 'regelverk' | 'anläggning' | 'system';
  id: string;
  name: string;
}

interface AnalyticsContextPanelProps {
  selectedItems: ContextItem[];
  onSelect: (item: ContextItem) => void;
}

export function AnalyticsContextPanel({ selectedItems, onSelect }: AnalyticsContextPanelProps) {
  const [search, setSearch] = useState('');
  const { data: sources } = useRequirementSources();
  const { data: facilities } = useFacilities();
  const { data: systems } = useInformationSystems();

  const isSelected = (id: string) => selectedItems.some(i => i.id === id);
  const lowerSearch = search.toLowerCase();

  const filteredSources = (sources || []).filter(s => 
    s.document_name.toLowerCase().includes(lowerSearch)
  );
  const filteredFacilities = (facilities || []).filter(f => 
    f.name.toLowerCase().includes(lowerSearch)
  );
  const filteredSystems = (systems || []).filter(s => 
    s.name.toLowerCase().includes(lowerSearch)
  );

  return (
    <div className="w-[280px] shrink-0 border-r bg-muted/30 flex flex-col h-full">
      <div className="p-3 border-b">
        <h3 className="text-sm font-semibold mb-2">Kontext</h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Sök..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* Regelverk */}
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-muted text-sm font-medium">
              <BookOpen className="h-4 w-4 text-foreground" />
              <span className="flex-1 text-left">Regelverk</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{filteredSources.length}</Badge>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-2 space-y-0.5">
                {filteredSources.map(source => (
                  <button
                    key={source.id}
                    onClick={() => onSelect({ type: 'regelverk', id: source.id, name: source.document_name })}
                    className={cn(
                      "flex items-center justify-between w-full px-2 py-1.5 rounded text-xs hover:bg-muted transition-colors text-left",
                      isSelected(source.id) && "bg-muted text-foreground"
                    )}
                  >
                    <span className="truncate flex-1">{source.document_name}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-1 shrink-0">
                      {source.requirement_count} krav
                    </Badge>
                  </button>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Anläggningar */}
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-muted text-sm font-medium">
              <Building2 className="h-4 w-4 text-foreground" />
              <span className="flex-1 text-left">Anläggningar</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{filteredFacilities.length}</Badge>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-2 space-y-0.5">
                {filteredFacilities.map(facility => (
                  <button
                    key={facility.id}
                    onClick={() => onSelect({ type: 'anläggning', id: facility.id, name: facility.name })}
                    className={cn(
                      "flex items-center justify-between w-full px-2 py-1.5 rounded text-xs hover:bg-muted transition-colors text-left",
                      isSelected(facility.id) && "bg-muted text-foreground"
                    )}
                  >
                    <div className="truncate flex-1">
                      <span>{facility.name}</span>
                      <span className="text-muted-foreground ml-1">({facility.type})</span>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-[10px] px-1.5 py-0 ml-1 shrink-0",
                        facility.compliance_score >= 80 && "border-status-success/30 text-status-success",
                        facility.compliance_score >= 50 && facility.compliance_score < 80 && "border-status-warning/30 text-status-warning",
                        facility.compliance_score < 50 && "border-destructive/30 text-destructive"
                      )}
                    >
                      {facility.compliance_score}%
                    </Badge>
                  </button>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* System */}
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-muted text-sm font-medium">
              <Server className="h-4 w-4 text-foreground" />
              <span className="flex-1 text-left">Informationssystem</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{filteredSystems.length}</Badge>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-2 space-y-0.5">
                {filteredSystems.map(system => (
                  <button
                    key={system.id}
                    onClick={() => onSelect({ type: 'system', id: system.id, name: system.name })}
                    className={cn(
                      "flex items-center justify-between w-full px-2 py-1.5 rounded text-xs hover:bg-muted transition-colors text-left",
                      isSelected(system.id) && "bg-muted text-foreground"
                    )}
                  >
                    <div className="truncate flex-1">
                      <span>{system.name}</span>
                      <span className="text-muted-foreground ml-1">({system.system_type})</span>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-[10px] px-1.5 py-0 ml-1 shrink-0",
                        system.compliance_score >= 80 && "border-status-success/30 text-status-success",
                        system.compliance_score >= 50 && system.compliance_score < 80 && "border-status-warning/30 text-status-warning",
                        system.compliance_score < 50 && "border-destructive/30 text-destructive"
                      )}
                    >
                      {system.compliance_score}%
                    </Badge>
                  </button>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  );
}
