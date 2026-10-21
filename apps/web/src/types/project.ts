export const PROJECT_STATUSES = [
  'planning',
  'tender_ready',
  'evaluation',
  'awarded',
  'ongoing',
  'closed',
] as const;

export type ProjectStatus = typeof PROJECT_STATUSES[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: 'Under planering',
  tender_ready: 'Underlag klart',
  evaluation: 'Utvärdering',
  awarded: 'Tilldelad',
  ongoing: 'Pågående',
  closed: 'Avslutad',
};

export const APPLICABILITY_VALUES = [
  'applicable',
  'not_applicable',
  'compensated',
  'supplier_assessment',
  'preliminary',
] as const;
export type RequirementApplicability = typeof APPLICABILITY_VALUES[number];

/** Long labels used in selectors. */
export const APPLICABILITY_LABELS: Record<RequirementApplicability, string> = {
  applicable: 'Ska ingå',
  not_applicable: 'Ej tillämpligt',
  compensated: 'Uppfylls via kompenserande åtgärd',
  supplier_assessment: 'Kräver leverantörens bedömning',
  preliminary: 'Preliminärt tillämpligt',
};

/** Short status labels used in lists. */
export const APPLICABILITY_STATUS_LABELS: Record<RequirementApplicability, string> = {
  applicable: 'Ska ingå',
  not_applicable: 'Ej tillämpligt',
  compensated: 'Kompenserad',
  supplier_assessment: 'Leverantörsbedömning',
  preliminary: 'Preliminär',
};

export const MEASURE_TYPES = ['technical', 'physical', 'organizational'] as const;
export type CompensatingMeasureType = typeof MEASURE_TYPES[number];
export const MEASURE_TYPE_LABELS: Record<CompensatingMeasureType, string> = {
  technical: 'Teknisk',
  physical: 'Fysisk',
  organizational: 'Organisatorisk',
};

export const MEASURE_STATUSES = ['proposed', 'accepted', 'rejected'] as const;
export type CompensatingMeasureStatus = typeof MEASURE_STATUSES[number];
export const MEASURE_STATUS_LABELS: Record<CompensatingMeasureStatus, string> = {
  proposed: 'Föreslagen',
  accepted: 'Accepterad',
  rejected: 'Avvisad',
};

/** Which scope table a requirement row (and its measures) belongs to. */
export type ScopeKind = 'project' | 'profile';

export interface CompensatingMeasure {
  id: string;
  profile_item_id: string | null;
  project_requirement_id: string | null;
  description: string;
  measure_type: CompensatingMeasureType;
  system_id: string | null;
  asset_id: string | null;
  facility_id: string | null;
  proposed_by: 'supplier' | 'client' | 'joint';
  status: CompensatingMeasureStatus;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
}

/** A requirement row in a project scope or a requirement profile. */
export interface ScopeItem {
  id: string;
  requirement_id: string;
  applicability: RequirementApplicability;
  justification: string | null;
}

export interface ComponentType {
  id: string;
  system_id: string | null;
  name: string;
  description: string | null;
  manufacturer: string | null;
  model: string | null;
  created_at: string;
}

export interface ProcurementProject {
  id: string;
  name: string;
  description: string | null;
  facility_id: string | null;
  system_id: string | null;
  component_type_id: string | null;
  unit_count: number | null;
  target_sl: number | null;
  owner_name: string | null;
  supplier_name: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface ProcurementProjectWithDetails extends ProcurementProject {
  facility_name: string | null;
  system_name: string | null;
  component_type_name: string | null;
  requirement_count: number;
  not_applicable_count: number;
  mapped_count: number;
}

export interface ProjectRequirement {
  id: string;
  project_id: string;
  requirement_id: string;
  applicability: RequirementApplicability;
  justification: string | null;
  created_at: string;
}

export interface RequirementProfile {
  id: string;
  name: string;
  description: string | null;
  component_type_id: string | null;
  component_type_name?: string | null;
  target_sl: number | null;
  /** Standard profile for its component type: components of that type inherit its requirements. */
  is_default?: boolean;
  created_at: string;
  item_count?: number;
  applicability_counts?: Record<RequirementApplicability, number>;
}
