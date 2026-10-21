/**
 * Databasåtkomst från API:t. Varje anrop körs i en transaktion där
 * användaren sätts med app.user_id och rollen med SET LOCAL ROLE, så att
 * RLS, SECURITY DEFINER-funktioner och hashkedjan ser samma aktör som när
 * samma fråga går via PostgREST. Inget körs som superuser här.
 */
import pg from 'pg';
import { config } from '../config.js';

export const pool = new pg.Pool({ connectionString: config.DATABASE_URL, max: 10 });

export interface Actor { userId: string | null; role: 'anon' | 'authenticated' }

export async function withActor<T>(actor: Actor, fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.user_id', $1, true), set_config('app.role', $2, true)",
      [actor.userId ?? '', actor.role]);
    await client.query(`SET LOCAL ROLE ${actor.role}`);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/** Anrop till en databasfunktion med namngivna argument, som supabase.rpc. */
export async function rpc<T = unknown>(actor: Actor, fn: string, args: Record<string, unknown> = {}): Promise<T> {
  if (!/^[a-z_][a-z0-9_]*$/.test(fn)) throw new Error('Ogiltigt funktionsnamn');
  const keys = Object.keys(args);
  const params = keys.map((k, i) => `${k} := $${i + 1}`).join(', ');
  return withActor(actor, async (c) => {
    const r = await c.query(`SELECT public.${fn}(${params}) AS result`, keys.map((k) => args[k]));
    return r.rows[0]?.result as T;
  });
}
