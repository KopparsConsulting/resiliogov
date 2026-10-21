/**
 * Filarkiv: källdokument (PDF) och bevis i testmodellen. Ersätter Supabase
 * Storage. Allt ligger bakom inloggning + godkänd profil; inga publika länkar.
 *
 * Standard: filer på disk (FILE_STORAGE=local, katalogen FILE_DIR – en volym i
 * Compose). Tillval: S3-kompatibel objektlagring (FILE_STORAGE=s3), t.ex.
 * Trafikverkets egen. Samma API utåt.
 */
import type { FastifyPluginAsync } from 'fastify';
import multipart from '@fastify/multipart';
import { createReadStream } from 'node:fs';
import { mkdir, writeFile, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import { requireApproved } from '../lib/guards.js';

const BUCKETS = new Set(['requirement-documents', 'test-evidence']);

interface Store {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<{ stream: NodeJS.ReadableStream; size: number; contentType?: string } | null>;
  remove(key: string): Promise<void>;
}

function localStore(root: string): Store {
  const full = (key: string) => path.join(root, key);
  return {
    async put(key, body, contentType) {
      await mkdir(path.dirname(full(key)), { recursive: true });
      await writeFile(full(key), body);
      await writeFile(full(key) + '.meta', JSON.stringify({ contentType }));
    },
    async get(key) {
      try {
        const s = await stat(full(key));
        let contentType: string | undefined;
        try { contentType = JSON.parse(await (await import('node:fs/promises')).readFile(full(key) + '.meta', 'utf8')).contentType; } catch { /* ingen meta */ }
        return { stream: createReadStream(full(key)), size: s.size, contentType };
      } catch { return null; }
    },
    async remove(key) {
      await unlink(full(key)).catch(() => {});
      await unlink(full(key) + '.meta').catch(() => {});
    },
  };
}

async function s3Store(): Promise<Store> {
  const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
  const s3 = new S3Client({
    endpoint: config.S3_ENDPOINT, region: config.S3_REGION ?? 'local', forcePathStyle: true,
    credentials: { accessKeyId: config.S3_ACCESS_KEY ?? '', secretAccessKey: config.S3_SECRET_KEY ?? '' },
  });
  const Bucket = config.S3_BUCKET;
  return {
    async put(Key, Body, ContentType) { await s3.send(new PutObjectCommand({ Bucket, Key, Body, ContentType })); },
    async get(Key) {
      try {
        const r = await s3.send(new GetObjectCommand({ Bucket, Key }));
        return { stream: r.Body as NodeJS.ReadableStream, size: r.ContentLength ?? 0, contentType: r.ContentType };
      } catch { return null; }
    },
    async remove(Key) { await s3.send(new DeleteObjectCommand({ Bucket, Key })); },
  };
}

export const fileRoutes: FastifyPluginAsync = async (app) => {
  const store = config.FILE_STORAGE === 's3' ? await s3Store() : localStore(config.FILE_DIR);
  app.log.info(`filarkiv: ${config.FILE_STORAGE === 's3' ? 'S3 ' + config.S3_ENDPOINT : 'disk ' + config.FILE_DIR}`);
  await app.register(multipart, { limits: { fileSize: 100 * 1024 * 1024 } });

  const key = (bucket: string, p: string) => {
    if (!BUCKETS.has(bucket)) throw Object.assign(new Error('Okänd hink'), { statusCode: 400 });
    const norm = path.posix.normalize(p);
    if (!p || norm.startsWith('..') || norm.startsWith('/') || norm.includes('/../')) throw Object.assign(new Error('Ogiltig sökväg'), { statusCode: 400 });
    return `${bucket}/${norm}`;
  };

  app.post('/files/:bucket/*', { preHandler: requireApproved }, async (req, reply) => {
    const { bucket } = req.params as { bucket: string };
    const p = (req.params as any)['*'] as string;
    const file = await req.file();
    if (!file) return reply.code(400).send({ error: 'Fil saknas' });
    const body = await file.toBuffer();
    await store.put(key(bucket, p), body, file.mimetype);
    return { path: p, size: body.length };
  });

  app.get('/files/:bucket/*', { preHandler: requireApproved }, async (req, reply) => {
    const { bucket } = req.params as { bucket: string };
    const p = (req.params as any)['*'] as string;
    const obj = await store.get(key(bucket, p));
    if (!obj) return reply.code(404).send({ error: 'Filen finns inte' });
    const name = path.posix.basename(p);
    return reply
      .header('Content-Type', obj.contentType ?? 'application/octet-stream')
      .header('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(name)}`)
      .header('Cache-Control', 'private, no-store')
      .send(obj.stream);
  });

  app.delete('/files/:bucket/*', { preHandler: requireApproved }, async (req) => {
    const { bucket } = req.params as { bucket: string };
    const p = (req.params as any)['*'] as string;
    await store.remove(key(bucket, p));
    return { ok: true };
  });
};
