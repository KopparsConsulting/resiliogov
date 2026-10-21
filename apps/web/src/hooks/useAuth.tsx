import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  approved: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isApproved: boolean;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const ADMIN_EMAIL = 'anders.runhem@gmail.com';
const AUTO_APPROVED_DOMAINS = ['addcontext.se'];

function isAutoApprovedEmail(email: string) {
  const normalized = email.toLowerCase();
  return AUTO_APPROVED_DOMAINS.some((domain) => normalized.endsWith(`@${domain}`));
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  isApproved: false,
  isAdmin: false,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const syncUserAccess = useCallback(async (currentUser: User) => {
    const email = currentUser.email ?? '';
    const normalizedEmail = email.toLowerCase();
    const isBootstrapAdmin = normalizedEmail === ADMIN_EMAIL;
    const autoApprove = isBootstrapAdmin || isAutoApprovedEmail(normalizedEmail);

    const { data: existingProfile, error: profileFetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .maybeSingle();

    if (profileFetchError) {
      console.error('Could not fetch profile', profileFetchError);
      setProfile(null);
    } else if (existingProfile) {
      setProfile(existingProfile);
    } else {
      const fullName = currentUser.user_metadata?.full_name ?? currentUser.user_metadata?.name ?? null;
      const { data: createdProfile, error: profileCreateError } = await supabase
        .from('profiles')
        .insert({
          id: currentUser.id,
          email,
          full_name: typeof fullName === 'string' ? fullName : null,
          approved: autoApprove,
        })
        .select('*')
        .single();

      if (profileCreateError) {
        console.error('Could not create missing profile', profileCreateError);
        setProfile(null);
      } else {
        setProfile(createdProfile);
      }
    }

    // Adminrollen sätts bara i databasen (klienten har inte skrivrätt till
    // user_roles). Vi läser den här – en e-postadress ger ingen behörighet.
    const { data: roleData, error: roleFetchError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', currentUser.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleFetchError) {
      console.error('Could not fetch admin role', roleFetchError);
      setIsAdmin(false);
      return;
    }

    setIsAdmin(!!roleData);
  }, []);

  const syncSessionState = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);

    if (!nextSession?.user) {
      setProfile(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    await syncUserAccess(nextSession.user);
    setLoading(false);
  }, [syncUserAccess]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setTimeout(() => {
          void syncSessionState(nextSession);
        }, 0);
      }
    );

    void supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
      void syncSessionState(nextSession);
    });

    return () => subscription.unsubscribe();
  }, [syncSessionState]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      isApproved: profile?.approved ?? isAdmin,
      isAdmin,
      loading,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
