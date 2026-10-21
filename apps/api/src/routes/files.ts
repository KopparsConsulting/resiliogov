/**
 * Filarkiv: källdokument (PDF) och bevis i testmodellen. Ersätter Supabase
 * Storage. Allt ligger bakom inloggning + godkänd profil; inga publika länkar.
 */
import type { FastifyPluginAsync } from 'fastify';
import multipart from '@fastify/multipart';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config.js';
import { requireApproved } from '../lib/guards.js';

const BUCKETS = new Set(['requirement-documents', 'test-evidence']);

export const fileRoutes: FastifyPluginAsync = async (app) => {
  if (!config.S3_ENDPOINT) { app.log.warn('S3_ENDPOINT saknas – filarkivet är avstängt'); return; }
  const s3 = new S3Client({
    endpoint: config.S3_ENDPOINT, region: 'local', forcePathStyle: true,
    credentials: { accessKeyId: config.S3_ACCESS_KEY ?? '', secretAccessKey: config.S3_SECRET_KEY ?? '' },
  });
  await app.register(multipart, { limits: { fileSize: 100 * 1024 * 1024 } });

  const key = (bucket: string, path: string) => {
    if (!BUCKETS.has(bucket)) throw new Error('Okänd hink');
    if (path.includes('..') || path.startsWith('/')) throw new Error('Ogiltig sökväg');
    return `${bucket}/${path}`;
  };

  app.post('/files/:bucket/*', { preHandler: requireApproved }, async (req, reply) => {
    const { bucket } = req.params as { bucket: string };
    const path = (req.params as any)['*'] as string;
    const file = await req.file();
    if (!file) return reply.code(400).send({ error: 'Fil saknas' });
    const body = await file.toBuffer();
    await s3.send(new PutObjectCommand({ Bucket: config.S3_BUCKET, Key: key(bucket, path), Body: body, ContentType: file.mimetype }));
    return { path, size: body.length };
  });

  app.get('/files/:bucket/*', { preHandler: requireApproved }, async (req, reply) => {
    const { bucket } = req.params as { bucket: string };
    const path = (req.params as any)['*'] as string;
    const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: config.S3_BUCKET, Key: key(bucket, path) }), { expiresIn: 300 });
    return reply.redirect(url);
  });

  app.delete('/files/:bucket/*', { preHandler: requireApproved }, async (req) => {
    const { bucket } = req.params as { bucket: string };
    const path = (req.params as any)['*'] as string;
    await s3.send(new DeleteObjectCommand({ Bucket: config.S3_BUCKET, Key: key(bucket, path) }));
    return { ok: true };
  });
};
