import { supabase } from '@/integrations/supabase/client';

/**
 * Headers för direkta fetch-anrop till edge-funktioner.
 * Skickar den inloggade användarens token (inte den publika nyckeln),
 * så att funktionen kan verifiera att användaren är inloggad och godkänd.
 */
export async function functionAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error('Du är inte inloggad – logga in igen och försök på nytt.');
  }
  return {
    Authorization: `Bearer ${token}`,
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
}
