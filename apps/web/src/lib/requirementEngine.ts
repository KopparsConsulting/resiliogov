/**
 * Klient mot kravmotorn i databasen.
 *
 * All matchning av krav mot anläggningar och system sker i databasen
 * (get_applicable_requirements / sync_requirements). Här finns bara tunna
 * anrop – ingen matchningslogik får dupliceras i webbläsaren, eftersom
 * samma indata alltid ska ge samma svar oavsett var frågan ställs.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export type EngineObjectType = 'facility' | 'system';

/**
 * preview – visa planen utan att ändra något
 * add     – lägg bara till saknade krav (vid skapa/koppla)
 * full    – lägg till, ta bort orörda poster som inte längre gäller och
 *           flytta poster med arbete utanför omfattningen (bedömningen bevaras)
 *
 * I alla lägen utom preview återaktiveras poster utanför omfattningen vars
 * krav blivit tillämpliga igen.
 */
export type SyncMode = 'preview' | 'add' | 'full';

export interface SyncRow {
  action: 'add' | 'remove' | 'deactivate' | 'reactivate';
  requirementId: string;
  recordId: string | null;
  chapterSection: string;
  description: string;
  minClassificationLevel: number | null;
  inheritedFromFacilityId: string | null;
}

export interface SyncResult {
  rows: SyncRow[];
  added: SyncRow[];
  removed: SyncRow[];
  deactivated: SyncRow[];
  reactivated: SyncRow[];
  inheritedCount: number;
}

export async function syncRequirements(
  objectType: EngineObjectType,
  objectId: string,
  mode: SyncMode,
): Promise<SyncResult> {
  const { data, error } = await supabase.rpc('sync_requirements', {
    _object_type: objectType,
    _object_id: objectId,
    _mode: mode,
  });
  if (error) throw error;

  const rows: SyncRow[] = (data ?? []).map((r) => ({
    action: r.action as SyncRow['action'],
    requirementId: r.requirement_id,
    recordId: r.record_id,
    chapterSection: r.chapter_section,
    description: r.description,
    minClassificationLevel: r.min_classification_level,
    inheritedFromFacilityId: r.inherited_from_facility_id,
  }));

  const added = rows.filter((r) => r.action === 'add');
  return {
    rows,
    added,
    removed: rows.filter((r) => r.action === 'remove'),
    deactivated: rows.filter((r) => r.action === 'deactivate'),
    reactivated: rows.filter((r) => r.action === 'reactivate'),
    inheritedCount: added.filter((r) => r.inheritedFromFacilityId).length,
  };
}

/** Id:n för alla krav som gäller ett objekt just nu. */
export async function fetchApplicableRequirementIds(
  objectType: EngineObjectType,
  objectId: string,
): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_applicable_requirements', {
    object_type: objectType,
    object_id: objectId,
  });
  if (error) throw error;
  return (data ?? []).map((r) => r.requirement_id);
}

export interface RequirementMatch {
  objectType: EngineObjectType;
  objectId: string;
  inheritedFromFacilityId: string | null;
}

/** Vilka anläggningar och system gäller ett visst krav? */
export async function fetchRequirementMatches(requirementId: string): Promise<RequirementMatch[]> {
  const { data, error } = await supabase.rpc('get_requirement_matches', {
    _requirement_id: requirementId,
  });
  if (error) throw error;
  return (data ?? []).map((m) => ({
    objectType: m.object_type as EngineObjectType,
    objectId: m.object_id,
    inheritedFromFacilityId: m.inherited_from_facility_id,
  }));
}

/** Vilka krav skulle en anläggning få med ändrade attribut? (påverkansanalys) */
export async function simulateFacilityRequirements(
  facilityId: string,
  overrides: Record<string, unknown>,
): Promise<string[]> {
  const { data, error } = await supabase.rpc('simulate_facility_requirements', {
    _facility_id: facilityId,
    _overrides: overrides as Json,
  });
  if (error) throw error;
  return (data ?? []) as string[];
}

/** Valideringsfel för villkor, samma regler som databasen tillämpar vid sparande. */
export async function fetchTriggerLogicProblems(
  logic: unknown,
  targetType: string | null,
): Promise<string[]> {
  const { data, error } = await supabase.rpc('trigger_logic_problems', {
    _logic: (logic ?? null) as Json,
    _target_type: targetType ?? null,
  });
  if (error) throw error;
  return (data ?? []) as string[];
}
