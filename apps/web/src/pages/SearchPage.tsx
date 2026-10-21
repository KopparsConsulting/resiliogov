import { useState } from 'react';
import { Search, Filter, HardDrive, Server, Building2, AlertTriangle, Package, X, Calendar, Wrench, Cloud } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useAssetSearch, useAssetFilterOptions, type AssetSearchFilters } from '@/hooks/useAssetSearch';
import { assetTypeLabels, systemCategoryLabels, getSystemTypeDefinition } from '@/types/system';
import { assetCriticalityLabels, networkZoneLabels } from '@/types/asset';
import { useNavigate } from 'react-router-dom';

export default function SearchPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<AssetSearchFilters>({
    assetType: 'all',
    systemType: 'all',
    systemCategory: 'all',
    isSystemCritical: 'all',
    isFacilityCritical: 'all',
    isVendorManaged: 'all',
    searchQuery: '',
    assetCriticality: 'all',
    eolWithinMonths: 'all',
    patchingOverdueDays: 'all',
    networkZone: 'all',
  });

  const { data: results, isLoading } = useAssetSearch(filters);
  const { data: filterOptions } = useAssetFilterOptions();

  const updateFilter = (key: keyof AssetSearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      assetType: 'all',
      systemType: 'all',
      systemCategory: 'all',
      isSystemCritical: 'all',
      isFacilityCritical: 'all',
      isVendorManaged: 'all',
      searchQuery: '',
      assetCriticality: 'all',
      eolWithinMonths: 'all',
      patchingOverdueDays: 'all',
      networkZone: 'all',
    });
  };

  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => value !== 'all' && value !== '' && value !== undefined
  ).length;

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'hardware': return <HardDrive className="h-4 w-4" />;
      case 'software': return <Package className="h-4 w-4" />;
      case 'network': return <Server className="h-4 w-4" />;
      case 'service': return <Cloud className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const warningCounts = results ? {
    eol: results.filter(r => r.warnings.eolSoon).length,
    patching: results.filter(r => r.warnings.patchingOverdue).length,
  } : { eol: 0, patching: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Search className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Avancerad Sökning</h1>
            <p className="text-muted-foreground">
              Sök och filtrera komponenter baserat på typ, systemkoppling och kritikalitet
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter
              {activeFilterCount > 0 && (
                <Badge variant="secondary">{activeFilterCount} aktiva</Badge>
              )}
            </CardTitle>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Rensa filter
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Sök på namn, tillverkare eller modell..."
              value={filters.searchQuery || ''}
              onChange={(e) => updateFilter('searchQuery', e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter row 1 */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Komponenttyp</label>
              <Select value={filters.assetType as string} onValueChange={(v) => updateFilter('assetType', v)}>
                <SelectTrigger><SelectValue placeholder="Alla typer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla typer</SelectItem>
                  {Object.entries(assetTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Komponentkritikalitet</label>
              <Select value={filters.assetCriticality as string} onValueChange={(v) => updateFilter('assetCriticality', v)}>
                <SelectTrigger><SelectValue placeholder="Alla" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla</SelectItem>
                  {Object.entries(assetCriticalityLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Nätverkszon</label>
              <Select value={filters.networkZone as string} onValueChange={(v) => updateFilter('networkZone', v)}>
                <SelectTrigger><SelectValue placeholder="Alla zoner" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla zoner</SelectItem>
                  {Object.entries(networkZoneLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />EoL inom
              </label>
              <Select
                value={filters.eolWithinMonths === 'all' ? 'all' : String(filters.eolWithinMonths)}
                onValueChange={(v) => updateFilter('eolWithinMonths', v === 'all' ? 'all' : Number(v))}
              >
                <SelectTrigger><SelectValue placeholder="Alla" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla</SelectItem>
                  <SelectItem value="3">3 månader</SelectItem>
                  <SelectItem value="6">6 månader</SelectItem>
                  <SelectItem value="12">12 månader</SelectItem>
                  <SelectItem value="24">24 månader</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Wrench className="h-3.5 w-3.5" />Patching över
              </label>
              <Select
                value={filters.patchingOverdueDays === 'all' ? 'all' : String(filters.patchingOverdueDays)}
                onValueChange={(v) => updateFilter('patchingOverdueDays', v === 'all' ? 'all' : Number(v))}
              >
                <SelectTrigger><SelectValue placeholder="Alla" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla</SelectItem>
                  <SelectItem value="30">30 dagar</SelectItem>
                  <SelectItem value="60">60 dagar</SelectItem>
                  <SelectItem value="90">90 dagar</SelectItem>
                  <SelectItem value="180">180 dagar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filter row 2 */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Systemtyp</label>
              <Select value={filters.systemType as string} onValueChange={(v) => updateFilter('systemType', v)}>
                <SelectTrigger><SelectValue placeholder="Alla system" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla system</SelectItem>
                  {(filterOptions?.systemTypes || []).map((type) => {
                    const def = getSystemTypeDefinition(type);
                    return <SelectItem key={type} value={type}>{def?.label || type}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Systemkategori</label>
              <Select value={filters.systemCategory as string} onValueChange={(v) => updateFilter('systemCategory', v)}>
                <SelectTrigger><SelectValue placeholder="Alla kategorier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla kategorier</SelectItem>
                  {Object.entries(systemCategoryLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">System samhällsviktigt</label>
              <Select
                value={filters.isSystemCritical === 'all' ? 'all' : String(filters.isSystemCritical)}
                onValueChange={(v) => updateFilter('isSystemCritical', v === 'all' ? 'all' : v === 'true')}
              >
                <SelectTrigger><SelectValue placeholder="Alla" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla</SelectItem>
                  <SelectItem value="true">Ja</SelectItem>
                  <SelectItem value="false">Nej</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Anläggning samhällsviktig</label>
              <Select
                value={filters.isFacilityCritical === 'all' ? 'all' : String(filters.isFacilityCritical)}
                onValueChange={(v) => updateFilter('isFacilityCritical', v === 'all' ? 'all' : v === 'true')}
              >
                <SelectTrigger><SelectValue placeholder="Alla" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla</SelectItem>
                  <SelectItem value="true">Ja</SelectItem>
                  <SelectItem value="false">Nej</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Leverantörshanterad</label>
              <Select
                value={filters.isVendorManaged === 'all' ? 'all' : String(filters.isVendorManaged)}
                onValueChange={(v) => updateFilter('isVendorManaged', v === 'all' ? 'all' : v === 'true')}
              >
                <SelectTrigger><SelectValue placeholder="Alla" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla</SelectItem>
                  <SelectItem value="true">Ja</SelectItem>
                  <SelectItem value="false">Nej</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Warning summary */}
          {results && (warningCounts.eol > 0 || warningCounts.patching > 0) && (
            <div className="flex items-center gap-4 pt-2 border-t">
              <span className="text-sm text-muted-foreground">Varningar i resultat:</span>
              {warningCounts.eol > 0 && (
                <Badge variant="outline" className="text-status-warning border-status-warning/30">
                  <Calendar className="h-3 w-3 mr-1" />{warningCounts.eol} EoL
                </Badge>
              )}
              {warningCounts.patching > 0 && (
                <Badge variant="outline" className="text-status-warning border-status-warning/30">
                  <Wrench className="h-3 w-3 mr-1" />{warningCounts.patching} patching
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Sökresultat
            {results && <Badge variant="outline" className="ml-2">{results.length} komponenter</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : results && results.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Komponent</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>System</TableHead>
                    <TableHead>Kritikalitet</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tillverkare</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((asset) => (
                    <TableRow 
                      key={asset.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/systems/${asset.system_id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getAssetIcon(asset.asset_type)}
                          <div>
                            <div className="font-medium">{asset.name}</div>
                            {asset.model && <div className="text-sm text-muted-foreground">{asset.model}</div>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{assetTypeLabels[asset.asset_type] || asset.asset_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Server className="h-4 w-4 text-muted-foreground" />
                          <span>{asset.system_name}</span>
                        </div>
                        {asset.system_category && (
                          <div className="text-xs text-muted-foreground mt-1">{systemCategoryLabels[asset.system_category]}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {asset.criticality === 'critical' && (
                            <Badge variant="destructive" className="w-fit text-xs">Kritisk</Badge>
                          )}
                          {asset.system_is_critical && (
                            <Badge variant="outline" className="w-fit text-xs border-destructive text-destructive">
                              <AlertTriangle className="h-3 w-3 mr-1" />System
                            </Badge>
                          )}
                          {asset.linked_facilities.some(f => f.is_critical) && (
                            <Badge variant="outline" className="w-fit text-xs border-destructive/50 text-destructive/80">
                              <Building2 className="h-3 w-3 mr-1" />Anläggning
                            </Badge>
                          )}
                          {!asset.criticality && !asset.system_is_critical && !asset.linked_facilities.some(f => f.is_critical) && (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {asset.warnings.eolSoon && (
                            <Badge variant="outline" className="text-xs bg-status-warning/10 text-status-warning border-status-warning/30">
                              <Calendar className="h-3 w-3 mr-1" />EoL
                            </Badge>
                          )}
                          {asset.warnings.patchingOverdue && (
                            <Badge variant="outline" className="text-xs bg-status-warning/10 text-status-warning border-status-warning/30">
                              <Wrench className="h-3 w-3 mr-1" />Patching
                            </Badge>
                          )}
                          {asset.network_zone && (
                            <Badge variant="secondary" className="text-xs">
                              {networkZoneLabels[asset.network_zone] || asset.network_zone}
                            </Badge>
                          )}
                          {!asset.warnings.eolSoon && !asset.warnings.patchingOverdue && !asset.network_zone && (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{asset.manufacturer || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Inga komponenter hittades</h3>
              <p className="text-muted-foreground">Försök med andra filter eller sökord</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
