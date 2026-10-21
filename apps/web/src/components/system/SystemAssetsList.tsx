import { CarriedMeasuresSection } from '@/components/project/CarriedMeasuresSection';
import { useState } from 'react';
import { ListChecks } from 'lucide-react';
import { ComponentRequirementsSheet } from './ComponentRequirementsSheet';
import { useComponentRequirements } from '@/hooks/useComponentRequirements';
import { Box, Plus, Trash2, HardDrive, Code, Network, Cloud, Shield, AlertTriangle, Server, Cpu, Radio, Camera, KeyRound, Database, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateSystemAsset, useDeleteSystemAsset } from '@/hooks/useInformationSystems';
import { useApplicableControls, useAssetComplianceRecords, calculateComplianceSummary } from '@/hooks/useAssetControls';
import type { SystemAsset, AssetType } from '@/types/system';
import { assetTypeLabels } from '@/types/system';
import type { AssetCriticality } from '@/types/asset';
import { assetCriticalityLabels, networkZoneLabels } from '@/types/asset';

interface SystemAssetsListProps {
  assets: SystemAsset[];
  systemId: string;
}

// Map asset_type strings to icons - supports both legacy types and database values
const getAssetIcon = (assetType: string): LucideIcon => {
  const iconMap: Record<string, LucideIcon> = {
    // Legacy types from AssetType
    hardware: HardDrive,
    software: Code,
    network: Network,
    service: Cloud,
    // Database asset types (Swedish)
    Server: Server,
    Arbetsstation: HardDrive,
    PLC: Cpu,
    Switch: Network,
    Sensor: Radio,
    Brandlarmcentral: AlertTriangle,
    Brandvägg: Shield,
    Lagring: Database,
    Kamera: Camera,
    Kortläsare: KeyRound,
  };
  return iconMap[assetType] || Box;
};

// Sub-component for individual asset cards with controls info
function AssetCard({ 
  asset, 
  systemId, 
  onDelete 
}: { 
  asset: SystemAsset; 
  systemId: string; 
  onDelete: ReturnType<typeof useDeleteSystemAsset>;
}) {
  const { data: applicableControls = [] } = useApplicableControls(asset.id, systemId);
  const { data: complianceRecords = [] } = useAssetComplianceRecords(asset.id);
  
  const compliance = calculateComplianceSummary(complianceRecords);
  const hasControls = applicableControls.length > 0;
  const hasPendingControls = compliance.pending > 0;
  const [requirementsOpen, setRequirementsOpen] = useState(false);
  const { data: componentRequirements = [] } = useComponentRequirements(asset.id);
  const activeRequirements = componentRequirements.filter((record) => !record.out_of_scope_since);
  const assessedRequirements = activeRequirements.filter(
    (record) => record.status !== 'Ej påbörjad' && record.status !== 'Pågående',
  ).length;

  return (
    <Card className={hasPendingControls ? 'border-status-warning/30' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">{asset.name}</p>
              {asset.criticality === 'critical' && (
                <Badge variant="destructive" className="text-xs">Kritisk</Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
              {asset.manufacturer && (
                <p className="truncate">{asset.manufacturer} {asset.model}</p>
              )}
              {asset.version && <p>v{asset.version}</p>}
              <div className="flex flex-wrap gap-1 mt-1">
                {asset.location && (
                  <Badge variant="outline" className="text-xs">
                    {asset.location}
                  </Badge>
                )}
                {asset.network_zone && (
                  <Badge variant="secondary" className="text-xs">
                    {networkZoneLabels[asset.network_zone] || asset.network_zone}
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Control status indicator */}
            {hasControls && (
              <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {compliance.fulfilled}/{applicableControls.length} kontroller
                </span>
                {hasPendingControls && (
                  <Badge variant="outline" className="text-xs bg-status-warning/10 text-status-warning border-status-warning/20">
                    {compliance.pending} kvar
                  </Badge>
                )}
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete.mutate({ 
              assetId: asset.id, 
              systemId 
            })}
          >
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 border-t pt-2">
          <span className="text-xs text-muted-foreground">
            {asset.component_type_id
              ? `${assessedRequirements}/${activeRequirements.length} komponentkrav bedömda`
              : 'Ingen komponenttyp'}
          </span>
          <Button variant="outline" size="sm" onClick={() => setRequirementsOpen(true)}>
            <ListChecks className="mr-1 h-4 w-4" />
            Komponentkrav
          </Button>
        </div>
        <CarriedMeasuresSection carrier="asset" carrierId={asset.id} compact />
        <ComponentRequirementsSheet open={requirementsOpen} onOpenChange={setRequirementsOpen} asset={asset} />
      </CardContent>
    </Card>
  );
}

export function SystemAssetsList({ assets, systemId }: SystemAssetsListProps) {
  const createAsset = useCreateSystemAsset();
  const deleteAsset = useDeleteSystemAsset();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    asset_type: 'hardware' as AssetType,
    manufacturer: '',
    model: '',
    version: '',
    location: '',
    network_zone: '',
    criticality: 'supporting' as AssetCriticality,
  });

  const handleCreate = async () => {
    await createAsset.mutateAsync({
      system_id: systemId,
      name: formData.name,
      asset_type: formData.asset_type,
      manufacturer: formData.manufacturer || undefined,
      model: formData.model || undefined,
      version: formData.version || undefined,
      location: formData.location || undefined,
      network_zone: formData.network_zone || undefined,
      criticality: formData.criticality,
      is_vendor_managed: false,
    });
    setOpen(false);
    setFormData({
      name: '',
      asset_type: 'hardware',
      manufacturer: '',
      model: '',
      version: '',
      location: '',
      network_zone: '',
      criticality: 'supporting',
    });
  };

  // Group assets by type
  const groupedAssets = assets.reduce((acc, asset) => {
    const type = asset.asset_type as AssetType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(asset);
    return acc;
  }, {} as Record<AssetType, SystemAsset[]>);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Lägg till komponent
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Lägg till komponent</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Namn *</Label>
                <Input
                  placeholder="t.ex. Dell PowerEdge R740"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Typ</Label>
                <Select 
                  value={formData.asset_type} 
                  onValueChange={(v) => setFormData({ ...formData, asset_type: v as AssetType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(assetTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tillverkare</Label>
                  <Input
                    placeholder="t.ex. Dell"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Modell</Label>
                  <Input
                    placeholder="t.ex. PowerEdge R740"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Version/Firmware</Label>
                  <Input
                    placeholder="t.ex. 2.1.3"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Placering</Label>
                  <Input
                    placeholder="t.ex. Serverrum A"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nätverkszon</Label>
                  <Select 
                    value={formData.network_zone} 
                    onValueChange={(v) => setFormData({ ...formData, network_zone: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Välj zon..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(networkZoneLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Kritikalitet</Label>
                  <Select 
                    value={formData.criticality} 
                    onValueChange={(v) => setFormData({ ...formData, criticality: v as AssetCriticality })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(assetCriticalityLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                className="w-full" 
                onClick={handleCreate}
                disabled={!formData.name || createAsset.isPending}
              >
                Lägg till
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {assets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="p-3 rounded-full bg-muted mb-3">
              <Box className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Inga komponenter registrerade</p>
            <p className="text-sm text-muted-foreground">
              Dokumentera hårdvara, mjukvara och tjänster
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedAssets).map(([type, typeAssets]) => {
            const Icon = getAssetIcon(type);
            return (
              <div key={type}>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {assetTypeLabels[type as AssetType]} ({typeAssets.length})
                </h3>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {typeAssets.map((asset) => (
                    <AssetCard key={asset.id} asset={asset} systemId={systemId} onDelete={deleteAsset} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
