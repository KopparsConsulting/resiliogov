// Asset control types for NIS2 requirement inheritance to component level

export type ControlCategory = 
  | 'network_security'
  | 'access_control'
  | 'patch_management'
  | 'logging'
  | 'encryption';

export type AssetCriticality = 'critical' | 'important' | 'supporting';

export const controlCategoryLabels: Record<ControlCategory, string> = {
  network_security: 'Nätverkssäkerhet',
  access_control: 'Åtkomstkontroll',
  patch_management: 'Patchhantering',
  logging: 'Loggning',
  encryption: 'Kryptering',
};

export const assetCriticalityLabels: Record<AssetCriticality, string> = {
  critical: 'Kritisk',
  important: 'Viktig',
  supporting: 'Stödjande',
};

export interface AssetControl {
  id: string;
  name: string;
  description: string | null;
  control_category: ControlCategory;
  asset_type_filter: string[];
  asset_model_filter: string[];
  source_requirement_id: string | null;
  is_automated_check: boolean;
  check_logic: CheckLogic | null;
  trigger_logic: TriggerLogic | null;
  priority: number;
  created_at: string;
  // Joined data
  source_requirement?: {
    id: string;
    chapter_section: string;
    description: string;
    source?: {
      document_name: string;
    };
  };
}

export interface AssetComplianceRecord {
  id: string;
  asset_id: string;
  control_id: string;
  status: 'Ej påbörjad' | 'Pågående' | 'Delvis uppfyllt' | 'Uppfyllt' | 'Ej uppfyllt' | 'Ej tillämpligt';
  evidence: string | null;
  verified_at: string | null;
  verified_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  control?: AssetControl;
}

export interface CheckLogic {
  field?: string;
  max_age_days?: number;
  required_value?: string | boolean;
  pattern?: string;
}

export interface TriggerLogic {
  system_is_critical?: boolean;
  facility_is_critical?: boolean;
  asset_type?: string[];
  system_category?: string[];
  network_zone?: string[];
}

export interface ExtendedSystemAsset {
  id: string;
  system_id: string;
  name: string;
  asset_type: string;
  manufacturer: string | null;
  model: string | null;
  version: string | null;
  firmware_version: string | null;
  location: string | null;
  is_vendor_managed: boolean;
  last_patched_at: string | null;
  eol_date: string | null;
  eos_date: string | null;
  network_zone: string | null;
  criticality: AssetCriticality | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Computed/joined
  compliance_records?: AssetComplianceRecord[];
  system?: {
    id: string;
    name: string;
    is_critical_entity: boolean;
    system_category: string | null;
  };
}

export interface AssetWithContext extends ExtendedSystemAsset {
  applicableControls: AssetControl[];
  complianceStatus: {
    total: number;
    fulfilled: number;
    pending: number;
    notApplicable: number;
  };
  warnings: AssetWarning[];
}

export interface AssetWarning {
  type: 'eol' | 'eos' | 'patching' | 'control_gap';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  dueDate?: string;
}

export const networkZoneLabels: Record<string, string> = {
  dmz: 'DMZ',
  ot: 'OT (Operativ Teknologi)',
  it: 'IT',
  internet: 'Internet',
  isolated: 'Isolerad',
};
