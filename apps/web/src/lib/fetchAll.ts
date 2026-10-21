/**
 * Hämtar ALLA rader för en Supabase-fråga, sida för sida.
 *
 * Supabase (PostgREST) returnerar som mest 1 000 rader per anrop och
 * kapar resten utan att säga något. Alla listfrågor i appen ska därför gå
 * via fetchAllRows, så att listor, statistik och exporter aldrig tyst
 * tappar data när volymen växer.
 *
 * Användning – byt
 *   const { data, error } = await supabase.from('x').select('*').eq(...);
 * mot
 *   const { data, error } = await fetchAllRows(() => supabase.from('x').select('*').eq(...));
 *
 * Frågan byggs om för varje sida (därför en funktion). En stabil sortering
 * på `id` läggs till efter frågans egen sortering, så att sidorna inte
 * överlappar eller hoppar över rader.
 */
import type { PostgrestError } from '@supabase/supabase-js';

/** Måste vara <= projektets max_rows (Supabase standard: 1000). */
export const PAGE_SIZE = 1000;

/** Skydd mot oändliga loopar: 1 000 sidor = 1 000 000 rader. */
const MAX_PAGES = 1000;

type PageResult<T> = { data: T[] | null; error: PostgrestError | null };

interface Pageable<T> {
  order: (column: string, options?: { ascending?: boolean }) => Pageable<T>;
  range: (from: number, to: number) => PromiseLike<PageResult<T>>;
}

export interface FetchAllOptions {
  /** Kolumn för stabil sortering mellan sidor. Sätt null för tabeller utan id. */
  stableOrderColumn?: string | null;
  pageSize?: number;
}

export async function fetchAllRows<T>(
  build: () => Pageable<T>,
  { stableOrderColumn = 'id', pageSize = PAGE_SIZE }: FetchAllOptions = {},
): Promise<{ data: T[]; error: PostgrestError | null }> {
  const rows: T[] = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * pageSize;
    let query = build();
    if (stableOrderColumn) query = query.order(stableOrderColumn, { ascending: true });

    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) return { data: rows, error };

    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) {
      return { data: dedupeById(rows), error: null };
    }
  }

  return {
    data: dedupeById(rows),
    error: {
      message: `Frågan returnerade fler än ${MAX_PAGES * pageSize} rader och avbröts`,
      details: '',
      hint: '',
      code: 'too_many_rows',
    } as PostgrestError,
  };
}

/** Om data ändras mellan två sidor kan en rad komma med två gånger – ta bort dubbletter. */
function dedupeById<T>(rows: T[]): T[] {
  const first = rows[0] as { id?: unknown } | undefined;
  if (!first || typeof first !== 'object' || !('id' in first)) return rows;
  const seen = new Set<unknown>();
  return rows.filter((r) => {
    const id = (r as { id?: unknown }).id;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}
