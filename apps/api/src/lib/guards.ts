import type { FastifyReply, FastifyRequest } from 'fastify';
import { readSession, type SessionClaims } from './auth.js';
import { withActor } from './db.js';

declare module 'fastify' {
  interface FastifyRequest { session?: SessionClaims }
}

/** Kräver inloggad och godkänd användare – samma kontroll som prototypens edge-funktioner. */
export async function requireApproved(req: FastifyRequest, reply: FastifyReply) {
  const s = await readSession(req);
  if (!s) return reply.code(401).send({ error: 'Inloggning krävs' });
  const ok = await withActor({ userId: s.sub, role: 'authenticated' }, async (db) =>
    (await db.query('SELECT public.is_approved() AS ok')).rows[0]?.ok === true);
  if (!ok) return reply.code(403).send({ error: 'Kontot är inte godkänt' });
  req.session = s;
}

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  await requireApproved(req, reply);
  if (reply.sent) return;
  const s = req.session!;
  try {
    await withActor({ userId: s.sub, role: 'authenticated' }, (db) => db.query('SELECT public.require_admin()'));
  } catch {
    return reply.code(403).send({ error: 'Kräver administratör' });
  }
}
