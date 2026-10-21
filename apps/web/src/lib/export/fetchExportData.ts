import type { ExportFilters, ExportData } from './types';
import { functionAuthHeaders } from '@/lib/functionAuth';
import { API_BASE } from '@/integrations/supabase/client';

const EXPORT_URL = `${API_BASE}/functions/export-compliance-package`;

/**
 * Hämtar exportdata. Servern registrerar exporten i revisionskedjan innan
 * data lämnas ut. Efterlevnadsposterna kommer utan inbäddade krav (mindre
 * svar) – här kopplas kravet på igen från kravlistan.
 */
export async function fetchExportData(filters: ExportFilters): Promise<ExportData> {
  const response = await fetch(EXPORT_URL, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(await functionAuthHeaders()),
    },
    body: JSON.stringify({ filters }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  const data = (await response.json()) as ExportData;
  const requirementById = new Map(data.requirements.map((r) => [r.id, r]));
  const withRequirement = <T extends { requirement_id: string }>(rows: T[]) =>
    rows.map((row) => ({ ...row, requirements: requirementById.get(row.requirement_id) ?? null }));

  return {
    ...data,
    complianceRecords: withRequirement(data.complianceRecords),
    systemComplianceRecords: withRequirement(data.systemComplianceRecords),
  };
}
