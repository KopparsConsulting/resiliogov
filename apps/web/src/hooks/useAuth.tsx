import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase, fetchMe, invalidateAuth } from '@/integrations/supabase/client';
import type { User, Session, InstallationRole } from '@/integrations/supabase/client';

/**
 * Inloggning och behörighet kommer från API:t (GET /api/auth/me).
 * Profilen skapas av API:t vid första OIDC-inloggningen; godkännande och
 * adminroll sätts bara i databasen. Klienten beslutar ingenting om behörighet.
 */

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  approved: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  /** Kontot är godkänt av en administratör (eller admin). */
  approved: boolean;
  /** Alias för `approved`, behålls för befintliga sidor. */
  isApproved: boolean;
  isAdmin: boolean;
  roles: string[];
  /** Installationens roll: katalognod, driftnod eller båda. */
  installationRole: InstallationRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  approved: false,
  isApproved: false,
  isAdmin: false,
  roles: [],
  installationRole: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [approved, setApproved] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [installationRole, setInstallationRole] = useState<InstallationRole | null>(null);
  const [loading, setLoading] = useState(true);

  const clear = useCallback(() => {
    setUser(null);
    setSession(null);
    setProfile(null);
    setApproved(false);
    setRoles([]);
  }, []);

  const syncSessionState = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);

    if (!nextSession?.user) {
      clear();
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const me = await fetchMe();
      if (!me) {
        clear();
        return;
      }
      setProfile({
        id: me.user.id,
        email: me.user.email,
        full_name: me.user.full_name,
        approved: me.approved,
      });
      setApproved(me.approved);
      setRoles(me.roles);
      setInstallationRole(me.installation_role);
    } catch (err) {
      console.error('Could not fetch current user', err);
      clear();
    } finally {
      setLoading(false);
    }
  }, [clear]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setTimeout(() => {
          void syncSessionState(nextSession);
        }, 0);
      }
    );

    return () => subscription.unsubscribe();
  }, [syncSessionState]);

  const signOut = async () => {
    clear();
    invalidateAuth();
    await supabase.auth.signOut();
  };

  const isAdmin = roles.includes('admin');

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      approved: approved || isAdmin,
      isApproved: approved || isAdmin,
      isAdmin,
      roles,
      installationRole,
      loading,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
