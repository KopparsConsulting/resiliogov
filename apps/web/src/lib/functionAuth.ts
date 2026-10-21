/**
 * Headers för direkta fetch-anrop till API:ts funktioner (/api/functions/<namn>).
 *
 * Inloggningen bärs av en httpOnly-cookie på samma origin, så inga
 * auth-headers behövs längre. Funktionen behålls så att anropsställena
 * ser likadana ut; se till att fetch görs med `credentials: 'include'`.
 */
export async function functionAuthHeaders(): Promise<Record<string, string>> {
  return {};
}
