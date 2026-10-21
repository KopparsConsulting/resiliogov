import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AssetType, SystemCategory } from '@/types/system';
import type { AssetCriticality } from '@/types/asset';
import { fetchAllRows } from '@/lib/fetchAll';

export interface AssetSearchFilters {
  assetType?: AssetType | 'all';
  systemType?: string | 'all';
  systemCategory?: SystemCategory | 'all';
  isSystemCritical?: boolean | 'all';
  isFacilityCritical?: boolean | 'all';
  isVendorManaged?: boolean | 'all';
  searchQuery?: string;
  // New filters
  assetCriticality?: AssetCriticality | 'all';
  eolWithinMonths?: number | 'all';
  patchingOverdueDays?: number | 'all';
  networkZone?: string | 'all';
}

export interface AssetSearchResult {
  id: string;
  name: string;
  asset_type: AssetType;
  manufacturer: string | null;
  model: string | null;
  version: string | null;
  location: string | null;
  is_vendor_managed: boolean;
  last_patched_at: string | null;
  eol_date: string | null;
  eos_date: string | null;
  network_zone: string | null;
  criticality: AssetCriticality | null;
  system_id: string;
  system_name: string;
  system_type: string;
  system_category: SystemCategory | null;
  system_is_critical: boolean;
  system_owner: string | null;
  linked_facilities: Array<{
    id: string;
    name: string;
    type: string;
    is_critical: boolean;
  }>;
  // Computed warnings
  warnings: {
    eolSoon: boolean;
    eosSoon: boolean;
    patchingOverdue: boolean;
  };
}

export function useAssetSearch(filters: AssetSearchFilters) {
  return useQuery({
    queryKey: ['asset-search', filters],
    queryFn: async () => {
      // First, get all assets with their system info
      const buildQuery = () => {
        let query = supabase
          .from('system_assets')
          .select(`
            id,
            name,
            asset_type,
            manufacturer,
            model,
            version,
            location,
            is_vendor_managed,
            last_patched_at,
            eol_date,
            eos_date,
            network_zone,
            criticality,
            system_id,
            information_systems!inner (
              id,
              name,
              system_type,
              system_category,
              is_critical_entity,
              system_owner
            )
          `);

        // Apply asset type filter
        if (filters.assetType && filters.assetType !== 'all') {
          query = query.eq('asset_type', filters.assetType);
        }

        // Apply asset criticality filter
        if (filters.assetCriticality && filters.assetCriticality !== 'all') {
          query = query.eq('criticality', filters.assetCriticality);
        }

        // Apply network zone filter
        if (filters.networkZone && filters.networkZone !== 'all') {
          query = query.eq('network_zone', filters.networkZone);
        }

        // Apply system type filter
        if (filters.systemType && filters.systemType !== 'all') {
          query = query.eq('information_systems.system_type', filters.systemType);
        }

        // Apply system category filter
        if (filters.systemCategory && filters.systemCategory !== 'all') {
          query = query.eq('information_systems.system_category', filters.systemCategory);
        }

        // Apply system criticality filter
        if (filters.isSystemCritical !== undefined && filters.isSystemCritical !== 'all') {
          query = query.eq('information_systems.is_critical_entity', filters.isSystemCritical);
        }

        // Apply vendor managed filter
        if (filters.isVendorManaged !== undefined && filters.isVendorManaged !== 'all') {
          query = query.eq('is_vendor_managed', filters.isVendorManaged);
        }

        // Apply search query
        if (filters.searchQuery) {
          query = query.or(`name.ilike.%${filters.searchQuery}%,manufacturer.ilike.%${filters.searchQuery}%,model.ilike.%${filters.searchQuery}%`);
        }
        return query.order('name');
      };

      const { data: assets, error } = await fetchAllRows(buildQuery);

      if (error) throw error;

      // Get facility links for each system
      const systemIds = [...new Set((assets || []).map(a => a.system_id))];
      
      const { data: facilityLinks } = await fetchAllRows(() => supabase
        .from('facility_systems')
        .select(`
          system_id,
          facilities (
            id,
            name,
            type,
            is_critical_entity
          )
        `)
        .in('system_id', systemIds));

      // Build a map of system_id -> facilities
      const facilityMap = new Map<string, Array<{ id: string; name: string; type: string; is_critical: boolean }>>();
      (facilityLinks || []).forEach(link => {
        if (link.facilities) {
          const existing = facilityMap.get(link.system_id) || [];
          existing.push({
            id: link.facilities.id,
            name: link.facilities.name,
            type: link.facilities.type,
            is_critical: link.facilities.is_critical_entity || false,
          });
          facilityMap.set(link.system_id, existing);
        }
      });

      const now = new Date();

      // Transform the results
      let results: AssetSearchResult[] = (assets || []).map(asset => {
        const system = asset.information_systems as any;
        
        // Calculate warnings
        const eolDate = asset.eol_date ? new Date(asset.eol_date) : null;
        const eosDate = asset.eos_date ? new Date(asset.eos_date) : null;
        const lastPatched = asset.last_patched_at ? new Date(asset.last_patched_at) : null;
        const twelveMonthsFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
        
        const eolSoon = eolDate ? eolDate <= twelveMonthsFromNow : false;
        const eosSoon = eosDate ? eosDate <= twelveMonthsFromNow : false;
        const patchingOverdue = lastPatched 
          ? (now.getTime() - lastPatched.getTime()) > 90 * 24 * 60 * 60 * 1000
          : false;

        return {
          id: asset.id,
          name: asset.name,
          asset_type: asset.asset_type as AssetType,
          manufacturer: asset.manufacturer,
          model: asset.model,
          version: asset.version,
          location: asset.location,
          is_vendor_managed: asset.is_vendor_managed || false,
          last_patched_at: asset.last_patched_at,
          eol_date: asset.eol_date,
          eos_date: asset.eos_date,
          network_zone: asset.network_zone,
          criticality: asset.criticality as AssetCriticality | null,
          system_id: asset.system_id,
          system_name: system.name,
          system_type: system.system_type,
          system_category: system.system_category,
          system_is_critical: system.is_critical_entity || false,
          system_owner: system.system_owner,
          linked_facilities: facilityMap.get(asset.system_id) || [],
          warnings: {
            eolSoon,
            eosSoon,
            patchingOverdue,
          },
        };
      });

      // Apply facility criticality filter (post-fetch since it's a many-to-many)
      if (filters.isFacilityCritical !== undefined && filters.isFacilityCritical !== 'all') {
        results = results.filter(r => 
          r.linked_facilities.some(f => f.is_critical === filters.isFacilityCritical)
        );
      }

      // Apply EoL filter
      if (filters.eolWithinMonths !== undefined && filters.eolWithinMonths !== 'all') {
        const monthsFromNow = new Date(now.getTime() + filters.eolWithinMonths * 30 * 24 * 60 * 60 * 1000);
        results = results.filter(r => {
          if (!r.eol_date) return false;
          const eolDate = new Date(r.eol_date);
          return eolDate <= monthsFromNow;
        });
      }

      // Apply patching overdue filter
      if (filters.patchingOverdueDays !== undefined && filters.patchingOverdueDays !== 'all') {
        const thresholdDate = new Date(now.getTime() - filters.patchingOverdueDays * 24 * 60 * 60 * 1000);
        results = results.filter(r => {
          if (!r.last_patched_at) return true; // No patching info = include
          const lastPatched = new Date(r.last_patched_at);
          return lastPatched < thresholdDate;
        });
      }

      return results;
    },
  });
}

// Get distinct values for filter dropdowns
export function useAssetFilterOptions() {
  return useQuery({
    queryKey: ['asset-filter-options'],
    queryFn: async () => {
      const [assetsResult, systemsResult] = await Promise.all([
        fetchAllRows(() => supabase.from('system_assets').select('asset_type, network_zone, criticality')),
        fetchAllRows(() => supabase.from('information_systems').select('system_type, system_category')),
      ]);

      const assetTypes = [...new Set((assetsResult.data || []).map(a => a.asset_type))];
      const networkZones = [...new Set((assetsResult.data || [])
        .map(a => a.network_zone)
        .filter(Boolean))] as string[];
      const systemTypes = [...new Set((systemsResult.data || []).map(s => s.system_type))];
      const systemCategories = [...new Set((systemsResult.data || [])
        .map(s => s.system_category)
        .filter(Boolean))] as SystemCategory[];

      return {
        assetTypes,
        systemTypes,
        systemCategories,
        networkZones,
      };
    },
  });
}
