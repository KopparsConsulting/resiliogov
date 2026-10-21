/**
 * Proxy till PostgREST. Webbappen anropar /api/rest/<tabell>?... precis som
 * den anropade Supabases /rest/v1/. Sessionens JWT läggs på här; webbläsaren
 * ser aldrig PostgREST direkt och kan inte välja roll själv.
 */
import type { FastifyPluginAsync } from 'fastify';
import proxy from '@fastify/http-proxy';
import { config } from '../config.js';
import { SESSION_COOKIE } from '../lib/auth.js';

export const restRoutes: FastifyPluginAsync = async (app) => {
  await app.register(proxy, {
    upstream: config.POSTGREST_URL,
    prefix: '/rest',
    rewritePrefix: '/',
    replyOptions: {
      rewriteRequestHeaders: (req, headers) => {
        const token = (req as any).cookies?.[SESSION_COOKIE] as string | undefined;
        const out: Record<string, any> = { ...headers };
        delete out.cookie;
        if (token) out.authorization = `Bearer ${token}`;
        else delete out.authorization;
        return out;
      },
    },
  });
};
