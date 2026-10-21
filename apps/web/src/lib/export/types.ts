/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ExportFilters {
  facilityIds?: string[];
  systemIds?: string[];
  sourceIds?: string[];
  domainIds?: string[];
  /** Väljs anläggningar tas deras kopplade system med (standard: ja) */
  includeLinkedSystems?: boolean;
}

export interface RequirementSnapshot {
  id: string;
  chapter_section: string;
  description: string;
  requirement_level: string | null;
  source_id: string | null;
  domain_id: string | null;
  source_name: string | null;
  domain_name: string | null;
}

export interface ExportDiffEntry extends RequirementSnapshot {
  change_type: string;
  changed_fields?: string;
  prev?: RequirementSnapshot;
}

export interface ExportDiff {
  previousExportDate: string;
  added: ExportDiffEntry[];
  removed: ExportDiffEntry[];
  changed: (ExportDiffEntry & { prev: RequirementSnapshot })[];
  summary: { added: number; removed: number; changed: number };
}

export interface ExportData {
  /** Registrerat av databasen innan data lämnades ut */
  exportId: string;
  fileName: string;
  filters: ExportFilters;
  facilities: any[];
  systems: any[];
  requirementSources: any[];
  requirements: any[];
  domains: any[];
  complianceRecords: any[];
  systemComplianceRecords: any[];
  facilitySystems: any[];
  exportedAt: string;
  diff?: ExportDiff | null;
}

export interface ExportProgress {
  step: string;
  percentage: number;
}
