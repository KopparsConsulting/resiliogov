/**
 * Inloggning via OIDC (Keycloak i utveckling, Trafikverkets IdP i drift) och
 * sessions-JWT som PostgREST förstår. JWT:n bär samma claims som prototypens
 * Supabase-token (sub, role, email) så att databasens auth.uid()/auth.jwt()
 * fungerar oförändrade.
 */
import * as oidc from 'openid-client';
import { SignJWT, jwtVerify } from 'jose';
import type { FastifyRequest } from 'fastify';
import { config } from '../config.js';
import { pool } from './db.js';

const secret = new TextEncoder().encode(config.JWT_SECRET);
export const SESSION_COOKIE = 'resiliogov_session';
const SESSION_TTL_SECONDS = 8 * 60 * 60;

let oidcConfig: oidc.Configuration | null = null;
export async function getOidc(): Promise<oidc.Configuration> {
  if (!oidcConfig) {
    // I Compose når webbläsaren Keycloak på t.ex. http://localhost:8081 men
    // API-containern på http://keycloak:8080. Issuer och redirect använder den
    // publika adressen; själva anropen skrivs om till den interna.
    const rewrite: oidc.CustomFetch = (url, options) => {
      let target = url;
      if (config.OIDC_INTERNAL_BASE) {
        const pub = new URL(config.OIDC_ISSUER).origin;
        if (target.startsWith(pub)) target = config.OIDC_INTERNAL_BASE.replace(/\/$/, '') + target.slice(pub.length);
      }
      return fetch(target, { method: options.method, headers: options.headers, body: options.body as any, redirect: options.redirect, signal: options.signal });
    };
    const isHttp = config.OIDC_ISSUER.startsWith('http:');
    oidcConfig = await oidc.discovery(new URL(config.OIDC_ISSUER), config.OIDC_CLIENT_ID, config.OIDC_CLIENT_SECRET || undefined,
      config.OIDC_CLIENT_SECRET ? undefined : oidc.None(),
      { [oidc.customFetch]: rewrite, execute: isHttp ? [oidc.allowInsecureRequests] : [] });
  }
  return oidcConfig;
}

export interface SessionClaims { sub: string; email: string; role: 'authenticated'; name?: string }

export async function issueSession(claims: SessionClaims): Promise<string> {
  return new SignJWT({ email: claims.email, role: claims.role, name: claims.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret);
}

export async function readSession(req: FastifyRequest): Promise<SessionClaims | null> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
    if (!payload.sub || payload.role !== 'authenticated') return null;
    return { sub: payload.sub, email: String(payload.email ?? ''), role: 'authenticated', name: payload.name as string | undefined };
  } catch {
    return null;
  }
}

/**
 * Skapar eller uppdaterar användaren vid inloggning. auth.users ägs av API:t;
 * triggern handle_new_user skapar profilen (ej godkänd) och en administratör
 * godkänner i gränssnittet – samma flöde som i prototypen.
 */
export async function provisionUser(idToken: { sub: string; email?: string; name?: string; email_verified?: boolean }): Promise<string> {
  const r = await pool.query<{ id: string }>(
    `INSERT INTO auth.users (external_subject, email, email_confirmed_at, raw_user_meta_data, last_sign_in_at)
     VALUES ($1, lower($2), CASE WHEN $3 THEN now() END, jsonb_build_object('full_name', $4::text), now())
     ON CONFLICT (external_subject) DO UPDATE
       SET email = EXCLUDED.email, last_sign_in_at = now(),
           raw_user_meta_data = auth.users.raw_user_meta_data || EXCLUDED.raw_user_meta_data
     RETURNING id`,
    [idToken.sub, idToken.email ?? '', idToken.email_verified ?? true, idToken.name ?? idToken.email ?? '']);
  const userId = r.rows[0].id;
  // Första användaren, eller en adress i bootstrap-listan, blir administratör (loggas i kedjan)
  const bootstrap = config.BOOTSTRAP_ADMIN_EMAILS.split(',').map((e) => e.trim()).filter(Boolean);
  await pool.query('SELECT public.bootstrap_admin($1, $2::text[])', [userId, bootstrap]);
  return userId;
}
