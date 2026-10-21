import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { ExportFilters, ExportProgress } from '@/lib/export/types';
import { fetchExportData } from '@/lib/export/fetchExportData';
import { generateOfflinePackage } from '@/lib/export/generatePackage';

/**
 * Skapar ett rapportpaket. Exporten registreras och loggas av servern innan
 * data lämnas ut (record_compliance_export) – klienten skriver ingen historik.
 */
export function useOfflineExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);

  const startExport = useCallback(async (filters: ExportFilters) => {
    setIsExporting(true);
    setProgress({ step: 'Hämtar data...', percentage: 0 });

    const toastId = toast.loading('Förbereder exportpaket...');

    try {
      setProgress({ step: 'Hämtar data från databasen...', percentage: 5 });
      const data = await fetchExportData(filters);

      const result = await generateOfflinePackage(data, (p) => {
        setProgress(p);
        toast.loading(p.step, { id: toastId });
      });

      toast.success(`Exportpaket klart – ${result.fileName}`, { id: toastId });
      return result;
    } catch (error) {
      console.error('Export error:', error);
      const msg = error instanceof Error ? error.message : 'Ett fel uppstod';
      toast.error(`Export misslyckades: ${msg}`, { id: toastId });
      throw error;
    } finally {
      setIsExporting(false);
      setProgress(null);
    }
  }, []);

  return { isExporting, progress, startExport };
}
