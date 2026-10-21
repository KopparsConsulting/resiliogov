import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ActivityLogRow {
  id: string;
  created_at: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_label: string | null;
  metadata: Record<string, unknown> | null;
  seq: number;
  source: string | null;
  row_hash: string;
}

export interface ActivityFilters {
  userId?: string;
  action?: string;
  entityType?: string;
  search?: string;
  since?: string; // ISO date
  limit?: number;
}

export function useActivityLog(filters: ActivityFilters = {}) {
  return useQuery({
    queryKey: ['activity_log', filters],
    queryFn: async () => {
      let q = supabase
        .from('activity_log')
        .select('*')
        .order('seq', { ascending: false })
        .limit(filters.limit ?? 200);

      if (filters.userId) q = q.eq('user_id', filters.userId);
      if (filters.action) q = q.eq('action', filters.action);
      if (filters.entityType) q = q.eq('entity_type', filters.entityType);
      if (filters.since) q = q.gte('created_at', filters.since);
      if (filters.search) {
        q = q.or(
          `entity_label.ilike.%${filters.search}%,user_email.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ActivityLogRow[];
    },
  });
}

/**
 * Loggar en app-händelse (inloggning, testimport m.m.).
 * Databasen sätter tid, användare och e-post själv och förseglar raden i
 * loggkedjan – klienten kan inte ange vem som gjorde vad.
 */
export async function logActivity(entry: {
  action: string;
  entity_type?: string;
  entity_id?: string | null;
  entity_label?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    const { error } = await supabase.rpc('log_app_event', {
      _action: entry.action,
      _entity_type: entry.entity_type ?? undefined,
      _entity_id: entry.entity_id ?? undefined,
      _entity_label: entry.entity_label ?? undefined,
      _metadata: (entry.metadata ?? {}) as never,
    });
    if (error) throw error;
  } catch (err) {
    console.error('logActivity failed', err);
  }
}

export interface ChainStatus {
  intact: boolean;
  checked: number;
  firstBrokenSeq: number | null;
  problem: string | null;
  headSeq: number;
  headHash: string;
}

/** Räknar om hela loggkedjan i databasen och rapporterar om något ändrats. */
export function useActivityChainStatus() {
  return useQuery({
    queryKey: ['activity_chain_status'],
    queryFn: async (): Promise<ChainStatus> => {
      const { data, error } = await supabase.rpc('verify_activity_chain');
      if (error) throw error;
      const r = data?.[0];
      return {
        intact: !!r?.intact,
        checked: r?.checked ?? 0,
        firstBrokenSeq: r?.first_broken_seq ?? null,
        problem: r?.problem ?? null,
        headSeq: r?.head_seq ?? 0,
        headHash: r?.head_hash ?? '',
      };
    },
    staleTime: 60_000,
  });
}
