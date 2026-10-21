/**
 * Kompatibilitetslager mot API:t i apps/api.
 *
 * Prototypen (Lovable) talade direkt med Supabase via `supabase-js`. Här
 * exporteras ett objekt med samma form (`from`, `rpc`, `auth`, `functions`,
 * `storage`) så att hooks och sidor kan behållas, men allt går via API:t på
 * samma origin:
 *
 *   /api/rest/*          PostgREST (samma trådprotokoll som Supabase /rest/v1)
 *   /api/functions/<n>   ersätter supabase.functions.invoke
 *   /api/files/<bucket>  ersätter supabase.storage
 *   /api/auth/*          OIDC-session (httpOnly-cookie)
 *
 * Inloggningen bärs av en cookie; ingen token hanteras i klienten.
 * Realtime/channels används inte och finns inte här.
 */
import { PostgrestClient } from '@supabase/postgrest-js';
import type { Database } from './types';

export const API_BASE: string = (import.meta.env.VITE_API_BASE as string | undefined) || '/api';

/** fetch med cookies (same-origin är standard, men vi är uttryckliga). */
export const apiFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, credentials: 'include' });

// ---------------------------------------------------------------------------
// Typer (minimal ersättning för supabase-js User/Session)
// ---------------------------------------------------------------------------

export type InstallationRole = 'catalog' | 'operations' | 'combined';

export interface User {
  id: string;
  email: string;
  /** Behålls för kompatibilitet med kod som läste user_metadata.full_name. */
  user_metadata: { full_name: string | null; name?: string | null };
  app_metadata: Record<string, unknown>;
}

export interface Session {
  user: User;
  /** Ingen riktig token – sessionen ligger i en httpOnly-cookie. */
  access_token: 'cookie';
}

/** Svaret från GET /api/auth/me. */
export interface AuthMe {
  user: { id: string; email: string; full_name: string | null };
  approved: boolean;
  roles: string[];
  installation_role: InstallationRole;
}

export type AuthChangeEvent = 'INITIAL_SESSION' | 'SIGNED_IN' | 'SIGNED_OUT';

export interface AuthError {
  message: string;
  status?: number;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

let meCache: Promise<AuthMe | null> | null = null;

/** Hämtar den inloggade användaren; null vid 401. Resultatet cachas tills invalidateAuth(). */
export async function fetchMe(force = false): Promise<AuthMe | null> {
  if (!meCache || force) {
    meCache = (async () => {
      const res = await apiFetch(`${API_BASE}/auth/me`, { headers: { Accept: 'application/json' } });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error(`Kunde inte hämta inloggning (${res.status})`);
      return (await res.json()) as AuthMe;
    })().catch((err) => {
      meCache = null;
      throw err;
    });
  }
  return meCache;
}

export function invalidateAuth() {
  meCache = null;
}

function toSession(me: AuthMe | null): Session | null {
  if (!me) return null;
  return {
    user: {
      id: me.user.id,
      email: me.user.email,
      user_metadata: { full_name: me.user.full_name, name: me.user.full_name },
      app_metadata: {},
    },
    access_token: 'cookie',
  };
}

function redirectToLogin() {
  window.location.href = `${API_BASE}/auth/login`;
  return new Promise<{ data: { user: null; session: null }; error: null }>(() => {
    /* sidan byts ut */
  });
}

const auth = {
  async getSession(): Promise<{ data: { session: Session | null }; error: AuthError | null }> {
    try {
      return { data: { session: toSession(await fetchMe()) }, error: null };
    } catch (err) {
      return { data: { session: null }, error: { message: (err as Error).message } };
    }
  },

  async getUser(): Promise<{ data: { user: User | null }; error: AuthError | null }> {
    const { data, error } = await auth.getSession();
    return { data: { user: data.session?.user ?? null }, error };
  },

  /**
   * Ingen riktig prenumeration finns (cookie-session). Callbacken anropas en
   * gång när /api/auth/me har svarat, så att befintlig kod får sitt INITIAL_SESSION.
   */
  onAuthStateChange(cb: (event: AuthChangeEvent, session: Session | null) => void) {
    let active = true;
    void auth.getSession().then(({ data }) => {
      if (active) cb('INITIAL_SESSION', data.session);
    });
    return {
      data: {
        subscription: {
          unsubscribe() {
            active = false;
          },
        },
      },
    };
  },

  async signOut(): Promise<{ error: AuthError | null }> {
    try {
      await apiFetch(`${API_BASE}/auth/logout`, { method: 'POST' });
    } catch (err) {
      return { error: { message: (err as Error).message } };
    } finally {
      invalidateAuth();
      window.location.href = '/auth';
    }
    return { error: null };
  },

  // Alla inloggningsvägar går via OIDC-leverantören.
  signInWithOAuth: (_opts?: unknown) => redirectToLogin(),
  signInWithPassword: (_opts?: unknown) => redirectToLogin(),
  signUp: (_opts?: unknown) => redirectToLogin(),
};

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

export interface FunctionsError {
  message: string;
  status?: number;
  context?: unknown;
}

async function invokeFunction<T = any>(
  name: string,
  options: { body?: unknown; headers?: Record<string, string> } = {},
): Promise<{ data: T | null; error: FunctionsError | null }> {
  try {
    const res = await apiFetch(`${API_BASE}/functions/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(options.headers ?? {}) },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const text = await res.text();
    let parsed: unknown = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }
    if (!res.ok) {
      const msg =
        (parsed && typeof parsed === 'object' && typeof (parsed as { error?: unknown }).error === 'string'
          ? (parsed as { error: string }).error
          : null) ??
        (parsed && typeof parsed === 'object' && typeof (parsed as { message?: unknown }).message === 'string'
          ? (parsed as { message: string }).message
          : null) ??
        (typeof parsed === 'string' && parsed ? parsed : `Funktionen ${name} svarade ${res.status}`);
      return { data: null, error: { message: msg, status: res.status, context: parsed } };
    }
    return { data: parsed as T, error: null };
  } catch (err) {
    return { data: null, error: { message: (err as Error).message } };
  }
}

const functions = { invoke: invokeFunction };

// ---------------------------------------------------------------------------
// Storage (filarkivet i API:t)
// ---------------------------------------------------------------------------

export interface StorageError {
  message: string;
  status?: number;
}

function encodeObjectPath(path: string) {
  return path
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/');
}

/** Same-origin-länk till en fil. API:t svarar med 302 till en kortlivad signerad URL. */
export function fileUrl(bucket: string, path: string) {
  return `${API_BASE}/files/${bucket}/${encodeObjectPath(path)}`;
}

function storageFrom(bucket: string) {
  return {
    async upload(
      path: string,
      file: File | Blob,
      _options?: { upsert?: boolean; contentType?: string; cacheControl?: string },
    ): Promise<{ data: { path: string } | null; error: StorageError | null }> {
      try {
        const form = new FormData();
        form.append('file', file, file instanceof File ? file.name : path.split('/').pop() ?? 'file');
        const res = await apiFetch(fileUrl(bucket, path), { method: 'POST', body: form });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          return { data: null, error: { message: text || `Uppladdningen misslyckades (${res.status})`, status: res.status } };
        }
        const json = (await res.json().catch(() => ({}))) as { path?: string };
        return { data: { path: json.path ?? path }, error: null };
      } catch (err) {
        return { data: null, error: { message: (err as Error).message } };
      }
    },

    /**
     * Det finns inga publika filer längre. Länken går via API:t och fungerar
     * bara för inloggade användare, vilket är avsikten.
     */
    getPublicUrl(path: string): { data: { publicUrl: string } } {
      return { data: { publicUrl: fileUrl(bucket, path) } };
    },

    async createSignedUrl(
      path: string,
      _expiresIn?: number,
    ): Promise<{ data: { signedUrl: string } | null; error: StorageError | null }> {
      return { data: { signedUrl: fileUrl(bucket, path) }, error: null };
    },

    async remove(paths: string[]): Promise<{ data: { path: string }[] | null; error: StorageError | null }> {
      const removed: { path: string }[] = [];
      for (const path of paths) {
        try {
          const res = await apiFetch(fileUrl(bucket, path), { method: 'DELETE' });
          if (!res.ok && res.status !== 404) {
            return { data: removed, error: { message: `Kunde inte ta bort ${path} (${res.status})`, status: res.status } };
          }
          removed.push({ path });
        } catch (err) {
          return { data: removed, error: { message: (err as Error).message } };
        }
      }
      return { data: removed, error: null };
    },
  };
}

const storage = { from: storageFrom };

// ---------------------------------------------------------------------------
// PostgREST
// ---------------------------------------------------------------------------

const postgrest = new PostgrestClient<Database>(`${API_BASE}/rest`, {
  fetch: apiFetch,
  headers: { Accept: 'application/json' },
});

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = {
  from: postgrest.from.bind(postgrest) as typeof postgrest.from,
  rpc: postgrest.rpc.bind(postgrest) as typeof postgrest.rpc,
  auth,
  functions,
  storage,
};

export type SupabaseShim = typeof supabase;
