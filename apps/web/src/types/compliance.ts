// Type definitions for Compliance Tool

export type FacilityType = 'Vägtunnel' | 'Bro' | 'Järnvägstunnel' | 'Trafikledningscentral' | 'Datacenter' | 'Spåranläggning' | 'Signalanläggning' | 'Elkraftsanläggning' | 'Terminal' | 'Trafikplats';
export type ConstructionType = 'Berg' | 'Betong' | 'Sänktunnel' | 'Överdäckning';
export type RequirementCategory = 'Fysisk Säkerhet' | 'Informationssäkerhet' | 'Krisberedskap';
export type ComplianceStatus = 'Ej påbörjad' | 'Pågående' | 'Delvis uppfyllt' | 'Uppfyllt' | 'Ej uppfyllt' | 'Ej tillämpligt';

export type ClassificationLevel = 1 | 2 | 3 | 4 | 5;

export const CLASSIFICATION_LABELS: Record<ClassificationLevel, string> = {
  1: 'Nivå 1 – Låg påverkan',
  2: 'Nivå 2 – Begränsad påverkan',
  3: 'Nivå 3 – Allvarlig påverkan',
  4: 'Nivå 4 – Mycket allvarlig påverkan',
  5: 'Nivå 5 – Kritisk samhällspåverkan',
};

export interface Facility {
  id: string;
  name: string;
  type: FacilityType;
  length_meters?: number;
  traffic_flow_adt?: number;
  is_critical_entity: boolean;
  has_dangerous_goods: boolean;
  construction_type?: ConstructionType;
  owner_type?: string;
  classification_level?: ClassificationLevel | null;
  created_at: string;
  updated_at: string;
}

export interface RequirementSource {
  id: string;
  document_name: string;
  category: RequirementCategory;
  description?: string;
  created_at: string;
}

export interface Requirement {
  id: string;
  source_id: string;
  chapter_section: string;
  description: string;
  trigger_logic?: unknown;
  is_general_advice: boolean;
  created_at: string;
  domain_id?: string;
  requirement_level?: 'strategic' | 'mandatory' | 'recommended';
  requirement_sources?: RequirementSource;
  target_type?: 'facility' | 'system';
  min_classification_level?: ClassificationLevel;
  sl_capability?: number | null;
  /** När kravets innehåll senast ändrades (text, villkor, nivåer) */
  content_changed_at?: string;
  /** Satt när kravet upphävts i ett importerat kravpaket */
  repealed_at?: string | null;
  /** Lokalt krav i driftmiljön – skrivs aldrig över av kravpaket */
  is_local?: boolean;
}

export interface ComplianceRecord {
  id: string;
  facility_id: string;
  requirement_id: string;
  status: ComplianceStatus;
  evidence?: string;
  assigned_role?: string;
  notes?: string;
  justification?: string | null;
  assessed_by?: string | null;
  assessed_at?: string | null;
  valid_until?: string | null;
  evidence_url?: string | null;
  evidence_file_name?: string | null;
  verified_by_test_mapping_id?: string | null;
  /** Satt när kravet inte längre gäller objektet; bedömningen bevaras. */
  out_of_scope_since?: string | null;
  out_of_scope_reason?: string | null;
  created_at: string;
  updated_at: string;
  requirements?: Requirement;
}

export interface FacilityWithCompliance extends Facility {
  compliance_records?: ComplianceRecord[];
  compliance_score?: number;
  /** Share of requirements with any status other than "Ej påbörjad" (0-100). */
  coverage?: number;
  assessed_count?: number;
  fulfilled_count?: number;
  not_applicable_count?: number;
  /** Uppfyllt / (assessed - Ej tillämpligt), null when nothing assessable. */
  compliance?: number | null;
  open_requirements?: number;
  /** Inklusive kopplade system */
  total_requirements?: number;
  own_requirements?: number;
  system_requirements?: number;
  linked_systems?: number;
}

// Wizard step data
export interface FacilityFormData {
  name: string;
  type: FacilityType | '';
  length_meters?: number;
  traffic_flow_adt?: number;
  is_critical_entity: boolean;
  has_dangerous_goods: boolean;
  construction_type?: ConstructionType | '';
  owner_type?: string;
  classification_level?: ClassificationLevel | null;
}
