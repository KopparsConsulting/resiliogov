// Type definitions for Information Systems and Assets

export type SystemRelationType = 'styr' | 'övervakar' | 'betjänar' | 'stödjer';
export type SystemCriticality = 'critical' | 'important' | 'supporting';
export type AssetType = 'hardware' | 'software' | 'network' | 'service';
export type SystemCategory = 'tunnel_traffic_ot' | 'it_infrastructure' | 'physical_security' | 'communication_crisis';
export type ClassificationSource = 'inherited' | 'own' | 'overridden';

/** The facility a system inherits its classification from */
export interface PrimaryFacility {
  id: string;
  name: string;
  type: string;
  classification_level?: number | null;
  is_critical_entity?: boolean | null;
  owner_type?: string | null;
}

export interface InformationSystem {
  id: string;
  name: string;
  description?: string;
  system_type: string;
  system_category?: SystemCategory;
  system_owner?: string;
  is_critical_entity: boolean;
  is_externally_accessible: boolean;
  is_central_system: boolean;
  owner_type?: string;
  classification_source?: ClassificationSource;
  facility_class_override?: number | null;
  override_reason?: string | null;
  /** Egen klass (1–5) för system som inte ärver från en anläggning */
  own_classification_level?: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Systemets klass enligt databasen (vyn system_classification).
 * Enda källan för klassen – samma regel som kravmotorn använder.
 */
export interface SystemClassificationRow {
  system_id: string;
  source: ClassificationSource;
  /** Högsta klassen bland kopplade anläggningar */
  inherited_level: number | null;
  driving_facility_id: string | null;
  driving_facility_name: string | null;
  linked_facilities: number;
  own_level: number | null;
  override_level: number | null;
  override_reason: string | null;
  effective_level: number;
  target_sl: number | null;
  is_deviation: boolean;
  is_missing: boolean;
}

export interface FacilitySystem {
  id: string;
  facility_id: string;
  system_id: string;
  relation_type: SystemRelationType;
  criticality: SystemCriticality;
  notes?: string;
  is_primary?: boolean;
  created_at: string;
  // Joined data
  information_systems?: InformationSystem;
  facilities?: PrimaryFacility;
  // Aggregates (facility-driven system list)
  assets_count?: number;
  total_requirements?: number;
  compliance_score?: number;
  coverage?: number;
  compliance?: number | null;
  classification?: SystemClassificationRow | null;
}

export interface SystemAsset {
  id: string;
  system_id: string;
  name: string;
  asset_type: AssetType;
  manufacturer?: string;
  model?: string;
  version?: string;
  firmware_version?: string;
  location?: string;
  is_vendor_managed: boolean;
  last_patched_at?: string;
  eol_date?: string;
  eos_date?: string;
  network_zone?: string;
  criticality?: 'critical' | 'important' | 'supporting';
  notes?: string;
  component_type_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SystemComplianceRecord {
  id: string;
  system_id: string;
  requirement_id: string;
  status: 'Ej påbörjad' | 'Pågående' | 'Delvis uppfyllt' | 'Uppfyllt' | 'Ej uppfyllt' | 'Ej tillämpligt';
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
  requirements?: {
    id: string;
    description: string;
    chapter_section: string;
    content_changed_at?: string;
    repealed_at?: string | null;
    requirement_sources?: {
      document_name: string;
      category: string;
    };
  };
}

export interface InformationSystemWithCompliance extends InformationSystem {
  compliance_score?: number;
  coverage?: number;
  compliance?: number | null;
  assessed_count?: number;
  fulfilled_count?: number;
  not_applicable_count?: number;
  open_requirements?: number;
  total_requirements?: number;
  linked_facilities?: number;
  assets_count?: number;
  primary_facility?: PrimaryFacility | null;
  classification?: SystemClassificationRow | null;
}

export interface SystemFormData {
  name: string;
  description?: string;
  system_type: string;
  system_category?: SystemCategory;
  system_owner?: string;
  is_critical_entity: boolean;
  is_externally_accessible: boolean;
  is_central_system: boolean;
  owner_type?: string;
  // Optional facility link during creation
  linked_facility_id?: string;
  facility_relation_type?: SystemRelationType;
  facility_criticality?: SystemCriticality;
  /** Lower-than-facility class, only allowed together with a motivation */
  facility_class_override?: number | null;
  override_reason?: string | null;
  /** Egen klass när systemet inte kopplas till någon anläggning */
  own_classification_level?: number | null;
}

// Relation type labels for UI
export const relationTypeLabels: Record<SystemRelationType, string> = {
  styr: 'Styr',
  övervakar: 'Övervakar',
  betjänar: 'Betjänar',
  stödjer: 'Stödjer',
};

export const criticalityLabels: Record<SystemCriticality, string> = {
  critical: 'Kritisk',
  important: 'Viktig',
  supporting: 'Stödjande',
};

export const assetTypeLabels: Record<AssetType, string> = {
  hardware: 'Hårdvara',
  software: 'Mjukvara',
  network: 'Nätverk',
  service: 'Tjänst',
};

export const systemCategoryLabels: Record<SystemCategory, string> = {
  tunnel_traffic_ot: 'Tunnel & Trafik (OT/SCADA)',
  it_infrastructure: 'IT-Infrastruktur',
  physical_security: 'Fysisk Säkerhet',
  communication_crisis: 'Kommunikation & Kris',
};

// Categorized system types based on TSFS 2019:93 and MSBFS
export interface SystemTypeDefinition {
  value: string;
  label: string;
  description: string;
  category: SystemCategory;
}

export const categorizedSystemTypes: Record<SystemCategory, SystemTypeDefinition[]> = {
  tunnel_traffic_ot: [
    { value: 'traffic_control', label: 'Trafikstyrning & Signaler', description: 'Trafiksignaler, bommar, system för att stänga tunnel', category: 'tunnel_traffic_ot' },
    { value: 'vms', label: 'VMS (Variabla Meddelandeskyltar)', description: 'Digitala skyltar för trafikantinfo', category: 'tunnel_traffic_ot' },
    { value: 'cctv', label: 'CCTV / TV-övervakning', description: 'Kameror för visuell övervakning av trafiken', category: 'tunnel_traffic_ot' },
    { value: 'aid', label: 'AID (Automatisk Incidentdetektering)', description: 'Larmar vid stillastående fordon, rök eller fotgängare', category: 'tunnel_traffic_ot' },
    { value: 'scada', label: 'SCADA / Styrsystem', description: 'Övergripande system för ventilation, belysning, larm', category: 'tunnel_traffic_ot' },
    { value: 'ventilation_control', label: 'Ventilationsstyrning', description: 'Styrning av fläktar, lufthastighet, brandgaser', category: 'tunnel_traffic_ot' },
    { value: 'fire_detection', label: 'Branddetektering', description: 'Automatiska system (linjedetektorer) för brandupptäckt', category: 'tunnel_traffic_ot' },
    { value: 'lighting_control', label: 'Belysningsstyrning', description: 'Normalbelysning, adaptiv belysning, utrymningsljus', category: 'tunnel_traffic_ot' },
    { value: 'pump_drainage', label: 'Pumpsystem / Dränering', description: 'Pumpar för vatten och farliga vätskor', category: 'tunnel_traffic_ot' },
  ],
  it_infrastructure: [
    { value: 'network_infrastructure', label: 'Nätverksinfrastruktur', description: 'Routrar, switchar, brandväggar, trådlösa nätverk', category: 'it_infrastructure' },
    { value: 'servers_virtualization', label: 'Servrar & Virtualisering', description: 'Fysiska och virtuella servrar', category: 'it_infrastructure' },
    { value: 'storage_backup', label: 'Lagring & Backup', description: 'Säkerhetskopiering och datalagring', category: 'it_infrastructure' },
    { value: 'iam_ad', label: 'Katalogtjänst (IAM/AD)', description: 'Identiteter och behörigheter (Active Directory)', category: 'it_infrastructure' },
    { value: 'siem_logs', label: 'Loggsystem (SIEM/LMS)', description: 'Insamling och analys av säkerhetsloggar', category: 'it_infrastructure' },
    { value: 'antivirus_endpoint', label: 'Antivirus / Endpoint Protection', description: 'Skydd mot skadlig kod', category: 'it_infrastructure' },
    { value: 'ntp_time', label: 'Tidstjänst (NTP)', description: 'Tidsynkronisering (spårbarhet till UTC)', category: 'it_infrastructure' },
  ],
  physical_security: [
    { value: 'access_control', label: 'Passersystem', description: 'Tillträdeskontroll och besöksregistrering', category: 'physical_security' },
    { value: 'intrusion_alarm', label: 'Inbrottslarm', description: 'Larmsystem för skal- och zonskydd', category: 'physical_security' },
    { value: 'building_automation', label: 'Fastighetsautomation', description: 'Kyla, värme, UPS/Reservkraft i teknikrum', category: 'physical_security' },
    { value: 'fire_suppression', label: 'Släcksystem (Fastighet)', description: 'Fast installerade släcksystem i teknikutrymmen', category: 'physical_security' },
  ],
  communication_crisis: [
    { value: 'emergency_phone', label: 'Nödtelefonisystem', description: 'Hjälptelefoner i tunnel', category: 'communication_crisis' },
    { value: 'rakel', label: 'RAKEL', description: 'Radiokommunikation för räddningstjänst och polis', category: 'communication_crisis' },
    { value: 'radio_broadcast', label: 'Radioåterutsändning', description: 'Meddelanden via bilradion (Public Radio Break-in)', category: 'communication_crisis' },
    { value: 'pa_system', label: 'PA-system (Public Address)', description: 'Högtalarsystem för utrop och utrymning', category: 'communication_crisis' },
    { value: 'sgsi', label: 'SGSI', description: 'Swedish Government Secure Intranet', category: 'communication_crisis' },
  ],
};

// Flat list for backwards compatibility
export const systemTypes = Object.values(categorizedSystemTypes)
  .flat()
  .map((t) => t.value);

// Helper to get system type definition by value
export function getSystemTypeDefinition(value: string): SystemTypeDefinition | undefined {
  for (const category of Object.values(categorizedSystemTypes)) {
    const found = category.find((t) => t.value === value);
    if (found) return found;
  }
  return undefined;
}

// Helper to get category for a system type
export function getSystemTypeCategory(value: string): SystemCategory | undefined {
  const def = getSystemTypeDefinition(value);
  return def?.category;
}
