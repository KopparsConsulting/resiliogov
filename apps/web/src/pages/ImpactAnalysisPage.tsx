import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { fetchApplicableRequirementIds, simulateFacilityRequirements } from '@/lib/requirementEngine';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  Download, 
  Filter, 
  Server, 
  Building2,
  Cpu,
  Network,
  HardDrive,
  Globe,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import type { AssetControl, TriggerLogic, ControlCategory } from '@/types/asset';
import { fetchAllRows } from '@/lib/fetchAll';

type AssetWithContext = {
  id: string;
  name: string;
  asset_type: string;
  manufacturer: string | null;
  model: string | null;
  network_zone: string | null;
  criticality: string | null;
  system: {
    id: string;
    name: string;
    is_critical_entity: boolean;
    system_category: string | null;
  } | null;
  facility_is_critical: boolean;
  compliance_status: {
    total: number;
    fulfilled: number;
    pending: number;
  };
};

type FacilityWithImpact = {
  id: string;
  name: string;
  type: string;
  is_critical_entity: boolean;
  length_meters: number | null;
  traffic_flow_adt: number | null;
  current_requirements: number;
  new_requirements: number;
  total_after: number;
};

const assetTypeIcons: Record<string, React.ReactNode> = {
  hardware: <Cpu className="h-4 w-4" />,
  software: <HardDrive className="h-4 w-4" />,
  network: <Network className="h-4 w-4" />,
  service: <Globe className="h-4 w-4" />,
};

const controlCategoryLabels: Record<ControlCategory, string> = {
  network_security: 'Nätverkssäkerhet',
  access_control: 'Åtkomstkontroll',
  patch_management: 'Patchhantering',
  logging: 'Loggning',
  encryption: 'Kryptering',
};

const facilityTypeLabels: Record<string, string> = {
  'Vägtunnel': 'Vägtunnel',
  'Järnvägstunnel': 'Järnvägstunnel',
  'Bro': 'Bro',
  'Datacenter': 'Datacenter',
  'Trafikledningscentral': 'Trafikledningscentral',
  'Spåranläggning': 'Spåranläggning',
  'Terminal': 'Terminal',
};

export default function ImpactAnalysisPage() {
  // Simulation filters - Components
  const [simulateSystemCritical, setSimulateSystemCritical] = useState(false);
  const [simulateFacilityCritical, setSimulateFacilityCritical] = useState(false);
  const [selectedAssetTypes, setSelectedAssetTypes] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<ControlCategory[]>([]);
  
  // Simulation filters - Facilities
  const [simulateCriticalEntity, setSimulateCriticalEntity] = useState(false);
  const [simulateDangerousGoods, setSimulateDangerousGoods] = useState(false);
  const [selectedFacilityTypes, setSelectedFacilityTypes] = useState<string[]>([]);

  // Fetch all asset controls
  const { data: controls = [] } = useQuery({
    queryKey: ['asset-controls'],
    queryFn: async () => {
      const { data, error } = await fetchAllRows(() => supabase
        .from('asset_controls')
        .select('*')
        .order('priority', { ascending: true }));
      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        control_category: item.control_category as ControlCategory,
        trigger_logic: item.trigger_logic as TriggerLogic | null,
      })) as AssetControl[];
    },
  });

  // Fetch all assets with system and facility context
  const { data: assetsWithContext = [] } = useQuery({
    queryKey: ['assets-with-context'],
    queryFn: async () => {
      const { data: assets, error: assetsError } = await fetchAllRows(() => supabase
        .from('system_assets')
        .select(`
          id,
          name,
          asset_type,
          manufacturer,
          model,
          network_zone,
          criticality,
          system:information_systems(
            id,
            name,
            is_critical_entity,
            system_category
          )
        `));

      if (assetsError) throw assetsError;

      const { data: complianceRecords } = await fetchAllRows(() => supabase
        .from('asset_compliance_records')
        .select('asset_id, status'));

      const systemIds = [...new Set(assets?.map(a => (a.system as any)?.id).filter(Boolean))];
      const { data: facilityLinks } = await fetchAllRows(() => supabase
        .from('facility_systems')
        .select(`
          system_id,
          facility:facilities(is_critical_entity)
        `)
        .in('system_id', systemIds));

      const facilityCriticalityMap = new Map<string, boolean>();
      facilityLinks?.forEach(link => {
        const systemId = link.system_id;
        const isCritical = (link.facility as any)?.is_critical_entity || false;
        if (isCritical) {
          facilityCriticalityMap.set(systemId, true);
        } else if (!facilityCriticalityMap.has(systemId)) {
          facilityCriticalityMap.set(systemId, false);
        }
      });

      const complianceMap = new Map<string, { total: number; fulfilled: number; pending: number }>();
      complianceRecords?.forEach(record => {
        if (!complianceMap.has(record.asset_id)) {
          complianceMap.set(record.asset_id, { total: 0, fulfilled: 0, pending: 0 });
        }
        const stats = complianceMap.get(record.asset_id)!;
        stats.total++;
        if (record.status === 'Uppfyllt') {
          stats.fulfilled++;
        } else if (record.status !== 'Ej tillämpligt') {
          stats.pending++;
        }
      });

      return (assets || []).map(asset => ({
        ...asset,
        system: asset.system as any,
        facility_is_critical: facilityCriticalityMap.get((asset.system as any)?.id) || false,
        compliance_status: complianceMap.get(asset.id) || { total: 0, fulfilled: 0, pending: 0 },
      })) as AssetWithContext[];
    },
  });

  // Fetch facilities with compliance data
  const { data: facilities = [] } = useQuery({
    queryKey: ['facilities-for-impact'],
    queryFn: async () => {
      const { data, error } = await fetchAllRows(() => supabase
        .from('facilities')
        .select('*')
        .order('name'));
      if (error) throw error;
      return data || [];
    },
  });

  // Simulering via kravmotorn i databasen: vilka krav tillkommer om
  // anläggningarnas attribut ändras? Samma regler som när posterna skapas.
  const simulationActive = simulateCriticalEntity || simulateDangerousGoods || selectedFacilityTypes.length > 0;
  const { data: simulatedNewCounts = {} } = useQuery({
    queryKey: ['facility-impact-simulation', simulateCriticalEntity, simulateDangerousGoods, facilities.map(f => f.id).join(',')],
    enabled: simulationActive && facilities.length > 0,
    queryFn: async () => {
      const overrides: Record<string, unknown> = {};
      if (simulateCriticalEntity) overrides.is_critical_entity = true;
      if (simulateDangerousGoods) overrides.has_dangerous_goods = true;
      const entries = await Promise.all(
        facilities.map(async (f) => {
          const [current, simulated] = await Promise.all([
            fetchApplicableRequirementIds('facility', f.id),
            simulateFacilityRequirements(f.id, overrides),
          ]);
          const currentIds = new Set(current);
          return [f.id, simulated.filter((id) => !currentIds.has(id)).length] as const;
        }),
      );
      return Object.fromEntries(entries) as Record<string, number>;
    },
  });

  // Fetch existing compliance records count per facility
  const { data: complianceCounts = {} } = useQuery({
    queryKey: ['compliance-counts'],
    queryFn: async () => {
      const { data, error } = await fetchAllRows(() => supabase
        .from('compliance_records')
        .select('facility_id'));
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data?.forEach(record => {
        if (record.facility_id) {
          counts[record.facility_id] = (counts[record.facility_id] || 0) + 1;
        }
      });
      return counts;
    },
  });

  // Get unique asset types and facility types
  const assetTypes = useMemo(() => {
    return [...new Set(assetsWithContext.map(a => a.asset_type))];
  }, [assetsWithContext]);

  const facilityTypes = useMemo(() => {
    return [...new Set(facilities.map(f => f.type))];
  }, [facilities]);

  // Facility impact analysis
  const facilityImpactAnalysis = useMemo(() => {
    const hasSimulation = simulateCriticalEntity || simulateDangerousGoods || selectedFacilityTypes.length > 0;
    
    if (!hasSimulation) {
      return {
        affectedFacilities: [],
        totalNewRequirements: 0,
        hasSimulation: false,
      };
    }

    const affectedFacilities: FacilityWithImpact[] = facilities
      .filter(facility => {
        // Filter by selected types
        if (selectedFacilityTypes.length > 0 && !selectedFacilityTypes.includes(facility.type)) {
          return false;
        }
        return true;
      })
      .map(facility => {
        const newRequirements = simulatedNewCounts[facility.id] ?? 0;

        const currentReqs = complianceCounts[facility.id] || 0;

        return {
          id: facility.id,
          name: facility.name,
          type: facility.type,
          is_critical_entity: facility.is_critical_entity,
          length_meters: facility.length_meters,
          traffic_flow_adt: facility.traffic_flow_adt,
          current_requirements: currentReqs,
          new_requirements: newRequirements,
          total_after: currentReqs + newRequirements,
        };
      })
      .filter(f => f.new_requirements > 0)
      .sort((a, b) => b.new_requirements - a.new_requirements);

    return {
      affectedFacilities,
      totalNewRequirements: affectedFacilities.reduce((sum, f) => sum + f.new_requirements, 0),
      hasSimulation: true,
    };
  }, [facilities, simulatedNewCounts, complianceCounts, simulateCriticalEntity, simulateDangerousGoods, selectedFacilityTypes]);

  // Component impact analysis (existing)
  const componentImpactAnalysis = useMemo(() => {
    const triggeredControls = controls.filter(control => {
      const trigger = control.trigger_logic;
      if (!trigger) return false;

      if (simulateSystemCritical && trigger.system_is_critical) return true;
      if (simulateFacilityCritical && trigger.facility_is_critical) return true;
      if (selectedAssetTypes.length > 0 && trigger.asset_type?.some(t => selectedAssetTypes.includes(t))) return true;
      if (selectedCategories.length > 0 && selectedCategories.includes(control.control_category)) return true;

      return false;
    });

    const affectedAssets = assetsWithContext.filter(asset => {
      if (selectedAssetTypes.length > 0 && !selectedAssetTypes.includes(asset.asset_type)) {
        return false;
      }

      return triggeredControls.some(control => {
        if (control.asset_type_filter && control.asset_type_filter.length > 0) {
          if (!control.asset_type_filter.includes(asset.asset_type)) {
            return false;
          }
        }

        const trigger = control.trigger_logic;
        if (!trigger) return true;

        if (trigger.system_is_critical && !asset.system?.is_critical_entity) {
          if (!simulateSystemCritical) return false;
        }

        if (trigger.facility_is_critical && !asset.facility_is_critical) {
          if (!simulateFacilityCritical) return false;
        }

        return true;
      });
    });

    const nonCompliantCount = affectedAssets.filter(
      a => a.compliance_status.pending > 0 || a.compliance_status.total === 0
    ).length;

    return {
      triggeredControls,
      affectedAssets,
      nonCompliantCount,
      hasSimulation: simulateSystemCritical || simulateFacilityCritical || selectedAssetTypes.length > 0 || selectedCategories.length > 0,
    };
  }, [controls, assetsWithContext, simulateSystemCritical, simulateFacilityCritical, selectedAssetTypes, selectedCategories]);

  const toggleAssetType = (type: string) => {
    setSelectedAssetTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleCategory = (category: ControlCategory) => {
    setSelectedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const toggleFacilityType = (type: string) => {
    setSelectedFacilityTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const exportFacilityImpact = () => {
    const headers = ['Anläggning', 'Typ', 'Samhällsviktig', 'Nuvarande krav', 'Nya krav', 'Totalt efter'];
    const rows = facilityImpactAnalysis.affectedFacilities.map(f => [
      f.name,
      f.type,
      f.is_critical_entity ? 'Ja' : 'Nej',
      f.current_requirements,
      f.new_requirements,
      f.total_after,
    ]);

    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `facility-impact-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportComponentImpact = () => {
    const headers = ['Komponent', 'Typ', 'Tillverkare', 'Modell', 'System', 'Kritisk anläggning', 'Kontroller totalt', 'Uppfyllda', 'Ej uppfyllda'];
    const rows = componentImpactAnalysis.affectedAssets.map(asset => [
      asset.name,
      asset.asset_type,
      asset.manufacturer || '-',
      asset.model || '-',
      asset.system?.name || '-',
      asset.facility_is_critical ? 'Ja' : 'Nej',
      asset.compliance_status.total,
      asset.compliance_status.fulfilled,
      asset.compliance_status.pending,
    ]);

    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `component-impact-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const resetFacilitySimulation = () => {
    setSimulateCriticalEntity(false);
    setSimulateDangerousGoods(false);
    setSelectedFacilityTypes([]);
  };

  const resetComponentSimulation = () => {
    setSimulateSystemCritical(false);
    setSimulateFacilityCritical(false);
    setSelectedAssetTypes([]);
    setSelectedCategories([]);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            Impact Analysis
          </h1>
          <p className="text-muted-foreground">
            Simulera regeländringar och se vilka anläggningar och komponenter som påverkas
          </p>
        </div>
      </div>

      <Tabs defaultValue="facilities" className="space-y-6">
        <TabsList>
          <TabsTrigger value="facilities" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Anläggningskrav ({facilityImpactAnalysis.affectedFacilities.length})
          </TabsTrigger>
          <TabsTrigger value="components" className="flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            Komponentkontroller ({componentImpactAnalysis.affectedAssets.length})
          </TabsTrigger>
        </TabsList>

        {/* Facilities Tab */}
        <TabsContent value="facilities" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Simulation Controls */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Simulera regeländring
                </CardTitle>
                <CardDescription>
                  Välj villkor för att se nya krav som skulle tillkomma
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Klassificering</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="critical-entity"
                        checked={simulateCriticalEntity}
                        onCheckedChange={(checked) => setSimulateCriticalEntity(checked as boolean)}
                      />
                      <Label htmlFor="critical-entity" className="text-sm cursor-pointer">
                        Klassas som samhällsviktig
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="dangerous-goods"
                        checked={simulateDangerousGoods}
                        onCheckedChange={(checked) => setSimulateDangerousGoods(checked as boolean)}
                      />
                      <Label htmlFor="dangerous-goods" className="text-sm cursor-pointer">
                        Tillåter farligt gods
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Anläggningstyp</Label>
                  <div className="space-y-2">
                    {facilityTypes.map(type => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={`ftype-${type}`}
                          checked={selectedFacilityTypes.includes(type)}
                          onCheckedChange={() => toggleFacilityType(type)}
                        />
                        <Label htmlFor={`ftype-${type}`} className="text-sm cursor-pointer">
                          {facilityTypeLabels[type] || type}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {facilityImpactAnalysis.hasSimulation && (
                  <Button variant="outline" className="w-full" onClick={resetFacilitySimulation}>
                    Återställ simulering
                  </Button>
                )}

                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
                  <p className="font-medium mb-1">Tillgängliga regelverk:</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">TSFS 2019:93</Badge>
                    <Badge variant="outline" className="text-xs">TSFS 2022:14</Badge>
                    <Badge variant="outline" className="text-xs">TRVK Bro</Badge>
                    <Badge variant="outline" className="text-xs">MSBFS 2020:6</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            <div className="lg:col-span-2 space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary">
                        {facilities.length}
                      </div>
                      <p className="text-sm text-muted-foreground">Anläggningar totalt</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-status-warning">
                        {facilityImpactAnalysis.affectedFacilities.length}
                      </div>
                      <p className="text-sm text-muted-foreground">Påverkade</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-destructive">
                        +{facilityImpactAnalysis.totalNewRequirements}
                      </div>
                      <p className="text-sm text-muted-foreground">Nya krav</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Affected Facilities Table */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-status-warning" />
                      Påverkade anläggningar
                    </CardTitle>
                    <CardDescription>
                      Anläggningar som skulle få nya krav vid simulerad regeländring
                    </CardDescription>
                  </div>
                  {facilityImpactAnalysis.affectedFacilities.length > 0 && (
                    <Button variant="outline" size="sm" onClick={exportFacilityImpact}>
                      <Download className="h-4 w-4 mr-2" />
                      Exportera CSV
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {!facilityImpactAnalysis.hasSimulation ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Välj villkor för att se påverkade anläggningar
                    </div>
                  ) : facilityImpactAnalysis.affectedFacilities.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Inga anläggningar matchar de valda villkoren
                    </div>
                  ) : (
                    <div className="scroll-x-visible h-[400px] overflow-auto">
                      <Table containerClassName="overflow-visible">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Anläggning</TableHead>
                            <TableHead>Typ</TableHead>
                            <TableHead className="text-center">Nuvarande</TableHead>
                            <TableHead className="text-center">Nya krav</TableHead>
                            <TableHead className="text-center">Totalt efter</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {facilityImpactAnalysis.affectedFacilities.map(facility => (
                            <TableRow key={facility.id}>
                              <TableCell>
                                <div>
                                  <div className="font-medium flex items-center gap-2">
                                    {facility.name}
                                    {facility.is_critical_entity && (
                                      <AlertTriangle className="h-4 w-4 text-status-warning" />
                                    )}
                                  </div>
                                  {facility.length_meters && (
                                    <div className="text-xs text-muted-foreground">
                                      {facility.length_meters} m
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{facility.type}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                {facility.current_requirements}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="destructive">+{facility.new_requirements}</Badge>
                              </TableCell>
                              <TableCell className="text-center font-bold">
                                {facility.total_after}
                              </TableCell>
                              <TableCell>
                                <Link 
                                  to={`/facility/${facility.id}`}
                                  className="text-primary hover:underline flex items-center gap-1"
                                >
                                  Visa <ChevronRight className="h-4 w-4" />
                                </Link>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Components Tab */}
        <TabsContent value="components" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Simulation Controls */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Simulera regeländring
                </CardTitle>
                <CardDescription>
                  Välj villkor för att se vilka komponenter som skulle påverkas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Kritikalitetsvillkor</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="system-critical"
                        checked={simulateSystemCritical}
                        onCheckedChange={(checked) => setSimulateSystemCritical(checked as boolean)}
                      />
                      <Label htmlFor="system-critical" className="text-sm cursor-pointer">
                        Systemet är kritiskt
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="facility-critical"
                        checked={simulateFacilityCritical}
                        onCheckedChange={(checked) => setSimulateFacilityCritical(checked as boolean)}
                      />
                      <Label htmlFor="facility-critical" className="text-sm cursor-pointer">
                        Kopplad anläggning är samhällsviktig
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Komponenttyper</Label>
                  <div className="space-y-2">
                    {assetTypes.map(type => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={`type-${type}`}
                          checked={selectedAssetTypes.includes(type)}
                          onCheckedChange={() => toggleAssetType(type)}
                        />
                        <Label htmlFor={`type-${type}`} className="text-sm cursor-pointer flex items-center gap-2">
                          {assetTypeIcons[type]}
                          <span className="capitalize">{type}</span>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Kontrollkategorier</Label>
                  <div className="space-y-2">
                    {(Object.keys(controlCategoryLabels) as ControlCategory[]).map(category => (
                      <div key={category} className="flex items-center space-x-2">
                        <Checkbox
                          id={`category-${category}`}
                          checked={selectedCategories.includes(category)}
                          onCheckedChange={() => toggleCategory(category)}
                        />
                        <Label htmlFor={`category-${category}`} className="text-sm cursor-pointer">
                          {controlCategoryLabels[category]}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {componentImpactAnalysis.hasSimulation && (
                  <Button variant="outline" className="w-full" onClick={resetComponentSimulation}>
                    Återställ simulering
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Results */}
            <div className="lg:col-span-2 space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary">
                        {componentImpactAnalysis.triggeredControls.length}
                      </div>
                      <p className="text-sm text-muted-foreground">Triggrade kontroller</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-status-warning">
                        {componentImpactAnalysis.affectedAssets.length}
                      </div>
                      <p className="text-sm text-muted-foreground">Påverkade komponenter</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-destructive">
                        {componentImpactAnalysis.nonCompliantCount}
                      </div>
                      <p className="text-sm text-muted-foreground">Saknar efterlevnad</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Triggered Controls */}
              {componentImpactAnalysis.triggeredControls.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Triggrade kontroller</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {componentImpactAnalysis.triggeredControls.map(control => (
                        <Badge key={control.id} variant="secondary" className="py-1">
                          {control.name}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Affected Assets Table */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-status-warning" />
                      Påverkade komponenter
                    </CardTitle>
                    <CardDescription>
                      {componentImpactAnalysis.affectedAssets.length} komponenter skulle påverkas av denna regeländring
                    </CardDescription>
                  </div>
                  {componentImpactAnalysis.affectedAssets.length > 0 && (
                    <Button variant="outline" size="sm" onClick={exportComponentImpact}>
                      <Download className="h-4 w-4 mr-2" />
                      Exportera CSV
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {componentImpactAnalysis.affectedAssets.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {componentImpactAnalysis.hasSimulation 
                        ? 'Inga komponenter matchar de valda villkoren'
                        : 'Välj villkor för att se påverkade komponenter'
                      }
                    </div>
                  ) : (
                    <div className="scroll-x-visible h-[400px] overflow-auto">
                      <Table containerClassName="overflow-visible">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Komponent</TableHead>
                            <TableHead>Typ</TableHead>
                            <TableHead>System</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {componentImpactAnalysis.affectedAssets.map(asset => (
                            <TableRow key={asset.id}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{asset.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {asset.manufacturer} {asset.model}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {assetTypeIcons[asset.asset_type]}
                                  <span className="capitalize">{asset.asset_type}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Server className="h-4 w-4 text-muted-foreground" />
                                  <span>{asset.system?.name || '-'}</span>
                                  {asset.facility_is_critical && (
                                    <Badge variant="destructive" className="text-xs">
                                      <Building2 className="h-3 w-3 mr-1" />
                                      Kritisk
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {asset.compliance_status.total === 0 ? (
                                  <Badge variant="outline" className="text-muted-foreground">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Ej initierad
                                  </Badge>
                                ) : asset.compliance_status.pending === 0 ? (
                                  <Badge variant="default" className="bg-status-success">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    {asset.compliance_status.fulfilled}/{asset.compliance_status.total}
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    {asset.compliance_status.pending} kvarstår
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
