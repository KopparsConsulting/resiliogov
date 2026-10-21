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
    oidcConfig = await oidc.discovery(new URL(config.OIDC_ISSUER), config.OIDC_CLIENT_ID, config.OIDC_CLIENT_SECRET || undefined,
      config.OIDC_CLIENT_SECRET ? undefined : oidc.None());
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
  return r.rows[0].id;
}
