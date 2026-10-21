import type { FastifyPluginAsync } from 'fastify';
import * as oidc from 'openid-client';
import { config } from '../config.js';
import { getOidc, issueSession, readSession, provisionUser, SESSION_COOKIE } from '../lib/auth.js';
import { withActor } from '../lib/db.js';

const STATE_COOKIE = 'resiliogov_oidc';

export const authRoutes: FastifyPluginAsync = async (app) => {
  // Starta inloggning: skicka användaren till IdP:n
  app.get('/auth/login', async (req, reply) => {
    const c = await getOidc();
    const verifier = oidc.randomPKCECodeVerifier();
    const state = oidc.randomState();
    const url = oidc.buildAuthorizationUrl(c, {
      redirect_uri: `${config.PUBLIC_URL}/api/auth/callback`,
      scope: 'openid email profile',
      code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
      code_challenge_method: 'S256',
      state,
    });
    reply.setCookie(STATE_COOKIE, JSON.stringify({ verifier, state }), {
      httpOnly: true, sameSite: 'lax', secure: config.COOKIE_SECURE, path: '/api/auth', maxAge: 600,
    });
    return reply.redirect(url.href);
  });

  // Tillbaka från IdP:n: byt kod mot token, skapa/uppdatera användare, sätt session
  app.get('/auth/callback', async (req, reply) => {
    const raw = req.cookies?.[STATE_COOKIE];
    if (!raw) return reply.code(400).send({ error: 'Inloggningen gick ut, försök igen' });
    const { verifier, state } = JSON.parse(raw);
    const c = await getOidc();
    const current = new URL(req.url, config.PUBLIC_URL);
    const tokens = await oidc.authorizationCodeGrant(c, current, { pkceCodeVerifier: verifier, expectedState: state });
    const claims = tokens.claims();
    if (!claims?.sub) return reply.code(401).send({ error: 'Ingen identitet från IdP' });
    const userId = await provisionUser({
      sub: claims.sub, email: claims.email as string | undefined,
      name: claims.name as string | undefined, email_verified: claims.email_verified as boolean | undefined,
    });
    const session = await issueSession({ sub: userId, email: String(claims.email ?? ''), role: 'authenticated', name: claims.name as string | undefined });
    reply.clearCookie(STATE_COOKIE, { path: '/api/auth' });
    reply.setCookie(SESSION_COOKIE, session, {
      httpOnly: true, sameSite: 'lax', secure: config.COOKIE_SECURE, path: '/', maxAge: 8 * 60 * 60,
    });
    // Logga inloggningen genom databasen (samma händelse som prototypen)
    await withActor({ userId, role: 'authenticated' }, (db) =>
      db.query("SELECT public.log_app_event('login', 'auth', NULL, public._current_email(), '{}'::jsonb)")).catch(() => {});
    return reply.redirect('/');
  });

  app.post('/auth/logout', async (_req, reply) => {
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  });

  // Vem är jag? Används av webbappen i stället för supabase.auth.getUser()
  app.get('/auth/me', async (req, reply) => {
    const s = await readSession(req);
    if (!s) return reply.code(401).send({ error: 'Inloggning krävs' });
    const row = await withActor({ userId: s.sub, role: 'authenticated' }, async (db) => {
      const r = await db.query(
        `SELECT p.id, p.email, p.full_name, p.approved,
                coalesce((SELECT array_agg(role::text) FROM public.user_roles ur WHERE ur.user_id = p.id), '{}') AS roles
         FROM public.profiles p WHERE p.id = $1`, [s.sub]);
      return r.rows[0];
    });
    if (!row) return reply.code(401).send({ error: 'Profil saknas' });
    return { user: { id: row.id, email: row.email, full_name: row.full_name }, approved: row.approved, roles: row.roles,
             installation_role: config.INSTALLATION_ROLE };
  });

  // Session-token för klienter som vill prata med PostgREST-proxyn med Bearer
  app.get('/auth/token', async (req, reply) => {
    const s = await readSession(req);
    if (!s) return reply.code(401).send({ error: 'Inloggning krävs' });
    return { token: req.cookies[SESSION_COOKIE], expires_in: 8 * 60 * 60 };
  });
};
