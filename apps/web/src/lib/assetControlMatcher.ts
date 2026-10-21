// Asset control matching logic - determines which controls apply to which assets
// based on asset type, system context, and facility criticality

import type { AssetControl, TriggerLogic, ExtendedSystemAsset, AssetWarning } from '@/types/asset';
import { calculateMetrics, needsAction, type ScorableRecord } from '@/lib/complianceMetrics';

interface MatchContext {
  asset: ExtendedSystemAsset;
  systemIsCritical: boolean;
  facilityIsCritical: boolean;
  systemCategory: string | null;
}

/**
 * Check if a control's trigger logic matches the given context
 */
export function matchesTriggerLogic(
  triggerLogic: TriggerLogic | null,
  context: MatchContext
): boolean {
  // If no trigger logic, control applies universally to matching asset types
  if (!triggerLogic) return true;

  const { asset, systemIsCritical, facilityIsCritical, systemCategory } = context;

  // Check system criticality condition
  if (triggerLogic.system_is_critical !== undefined) {
    if (triggerLogic.system_is_critical && !systemIsCritical) {
      return false;
    }
  }

  // Check facility criticality condition
  if (triggerLogic.facility_is_critical !== undefined) {
    if (triggerLogic.facility_is_critical && !facilityIsCritical) {
      return false;
    }
  }

  // Check asset type filter
  if (triggerLogic.asset_type && triggerLogic.asset_type.length > 0) {
    if (!triggerLogic.asset_type.includes(asset.asset_type)) {
      return false;
    }
  }

  // Check system category filter
  if (triggerLogic.system_category && triggerLogic.system_category.length > 0) {
    if (!systemCategory || !triggerLogic.system_category.includes(systemCategory)) {
      return false;
    }
  }

  // Check network zone filter
  if (triggerLogic.network_zone && triggerLogic.network_zone.length > 0) {
    if (!asset.network_zone || !triggerLogic.network_zone.includes(asset.network_zone)) {
      return false;
    }
  }

  return true;
}

/**
 * Check if a control's asset type filter matches the asset
 */
export function matchesAssetTypeFilter(
  assetTypeFilter: string[],
  assetType: string
): boolean {
  // Empty filter means it applies to all types
  if (!assetTypeFilter || assetTypeFilter.length === 0) return true;
  return assetTypeFilter.includes(assetType);
}

/**
 * Check if a control's model filter matches the asset (supports wildcards)
 */
export function matchesModelFilter(
  modelFilter: string[],
  manufacturer: string | null,
  model: string | null
): boolean {
  // Empty filter means it applies to all models
  if (!modelFilter || modelFilter.length === 0) return true;

  const combinedName = `${manufacturer || ''} ${model || ''}`.trim().toLowerCase();
  
  return modelFilter.some(pattern => {
    const normalizedPattern = pattern.toLowerCase();
    
    // Support wildcard matching with *
    if (normalizedPattern.includes('*')) {
      const regex = new RegExp(
        '^' + normalizedPattern.replace(/\*/g, '.*') + '$'
      );
      return regex.test(combinedName);
    }
    
    // Simple substring match
    return combinedName.includes(normalizedPattern);
  });
}

/**
 * Filter controls that apply to a specific asset given its context
 */
export function getApplicableControls(
  controls: AssetControl[],
  context: MatchContext
): AssetControl[] {
  const { asset } = context;

  return controls.filter(control => {
    // Check asset type filter
    if (!matchesAssetTypeFilter(control.asset_type_filter, asset.asset_type)) {
      return false;
    }

    // Check model filter
    if (!matchesModelFilter(control.asset_model_filter, asset.manufacturer, asset.model)) {
      return false;
    }

    // Check trigger logic
    if (!matchesTriggerLogic(control.trigger_logic as TriggerLogic | null, context)) {
      return false;
    }

    return true;
  });
}

/**
 * Generate warnings for an asset based on dates and compliance
 */
export function getAssetWarnings(asset: ExtendedSystemAsset): AssetWarning[] {
  const warnings: AssetWarning[] = [];
  const now = new Date();
  const threeMonths = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const twelveMonths = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  // Check End-of-Life
  if (asset.eol_date) {
    const eolDate = new Date(asset.eol_date);
    if (eolDate <= now) {
      warnings.push({
        type: 'eol',
        severity: 'critical',
        message: 'Komponenten har passerat End-of-Life',
        dueDate: asset.eol_date,
      });
    } else if (eolDate <= twelveMonths) {
      warnings.push({
        type: 'eol',
        severity: 'warning',
        message: `End-of-Life inom ${Math.ceil((eolDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000 * 30))} månader`,
        dueDate: asset.eol_date,
      });
    }
  }

  // Check End-of-Support
  if (asset.eos_date) {
    const eosDate = new Date(asset.eos_date);
    if (eosDate <= now) {
      warnings.push({
        type: 'eos',
        severity: 'critical',
        message: 'Komponenten har passerat End-of-Support',
        dueDate: asset.eos_date,
      });
    } else if (eosDate <= twelveMonths) {
      warnings.push({
        type: 'eos',
        severity: 'warning',
        message: `End-of-Support inom ${Math.ceil((eosDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000 * 30))} månader`,
        dueDate: asset.eos_date,
      });
    }
  }

  // Check patching status
  if (asset.last_patched_at) {
    const lastPatched = new Date(asset.last_patched_at);
    const daysSincePatching = Math.floor((now.getTime() - lastPatched.getTime()) / (24 * 60 * 60 * 1000));
    
    if (daysSincePatching > 180) {
      warnings.push({
        type: 'patching',
        severity: 'critical',
        message: `Inte patchad på ${daysSincePatching} dagar`,
        dueDate: asset.last_patched_at,
      });
    } else if (daysSincePatching > 90) {
      warnings.push({
        type: 'patching',
        severity: 'warning',
        message: `Inte patchad på ${daysSincePatching} dagar`,
        dueDate: asset.last_patched_at,
      });
    }
  } else if (asset.criticality === 'critical') {
    // Critical assets without any patching record
    warnings.push({
      type: 'patching',
      severity: 'warning',
      message: 'Ingen patchhistorik registrerad',
    });
  }

  return warnings;
}

/**
 * Sammanfattning för komponenters kontroller – samma definition som för
 * anläggningar och system (src/lib/complianceMetrics.ts).
 * pending = kontroller som kräver åtgärd (ej bedömda, delvis/ej uppfyllda, utgångna).
 * percentage = efterlevnad, null när inget är bedömt (tidigare 100 %).
 */
export function calculateComplianceSummary(
  records: ScorableRecord[]
): {
  total: number;
  fulfilled: number;
  pending: number;
  notApplicable: number;
  percentage: number | null;
} {
  const metrics = calculateMetrics(records);
  return {
    total: metrics.total,
    fulfilled: metrics.fulfilled,
    pending: records.filter((r) => needsAction(r)).length,
    notApplicable: metrics.notApplicable,
    percentage: metrics.compliance,
  };
}
