import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import { config } from './config.js';
import { pool } from './lib/db.js';
import { authRoutes } from './routes/auth.js';
import { restRoutes } from './routes/rest.js';
import { fileRoutes } from './routes/files.js';
import { functionRoutes } from './routes/functions.js';

export async function buildServer() {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' }, bodyLimit: 20 * 1024 * 1024 });
  await app.register(cookie);

  app.get('/api/health', async () => {
    const db = await pool.query('SELECT 1 AS ok').then(() => 'ok').catch((e) => `fel: ${e.message}`);
    return { status: 'ok', db, installation_role: config.INSTALLATION_ROLE };
  });

  await app.register(async (api) => {
    await api.register(authRoutes);
    await api.register(restRoutes);
    await api.register(fileRoutes);
    await api.register(functionRoutes);
  }, { prefix: '/api' });

  return app;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^.*\//, ''))) {
  buildServer().then((app) => app.listen({ port: config.PORT, host: '0.0.0.0' })).catch((e) => {
    console.error(e); process.exit(1);
  });
}
