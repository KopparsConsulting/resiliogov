/**
 * Ersätter prototypens edge-funktioner. Samma sökvägar och svar som förut
 * (/functions/v1/<namn> → /api/functions/<namn>), så att webbappens anrop
 * via supabase.functions.invoke() kan gå oförändrade genom klientshimmen.
 *
 *  export-compliance-package  ren databaslogik, porterad rakt av
 *  fetch-law-text             bara i katalogläge (yttre noden) – i driftläge
 *                             finns inget utgående nät
 *  extract-requirements       vidare till AI-tjänsten (lokal modell)
 *  regulatory-chat            vidare till AI-tjänsten, SSE
 *  analytics-chat             vidare till AI-tjänsten, spärrad av
 *                             installation_settings.ai_compliance_analysis
 *  notify-admin-signup        borttagen – godkännande sköts via IdP-grupp/admin
 */
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { withActor } from '../lib/db.js';
import { requireApproved, requireAdmin } from '../lib/guards.js';

const ids = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.length > 0) : [];

export const functionRoutes: FastifyPluginAsync = async (app) => {
  // ------------------------------------------------------------------
  // Efterlevnadspaket: registreras i revisionskedjan INNAN data lämnas ut
  // ------------------------------------------------------------------
  app.post('/functions/export-compliance-package', { preHandler: requireAdmin }, async (req, reply) => {
    const s = req.session!;
    const raw = ((req.body as any)?.filters ?? {}) as Record<string, unknown>;
    const filters = {
      facilityIds: ids(raw.facilityIds), systemIds: ids(raw.systemIds),
      sourceIds: ids(raw.sourceIds), domainIds: ids(raw.domainIds),
      includeLinkedSystems: raw.includeLinkedSystems !== false,
    };

    try {
      return await withActor({ userId: s.sub, role: 'authenticated' }, async (db) => {
        const q = async (sql: string) => (await db.query(sql)).rows as any[];
        let facilities = await q('SELECT * FROM public.facilities ORDER BY name');
        let systems = await q('SELECT * FROM public.information_systems ORDER BY name');
        let requirementSources = await q('SELECT * FROM public.requirement_sources ORDER BY document_name');
        let requirements = await q(`
          SELECT r.*, jsonb_build_object('document_name', s.document_name, 'category', s.category) AS requirement_sources,
                 CASE WHEN d.id IS NULL THEN NULL ELSE jsonb_build_object('name', d.name) END AS security_domains
          FROM public.requirements r
          JOIN public.requirement_sources s ON s.id = r.source_id
          LEFT JOIN public.security_domains d ON d.id = r.domain_id
          ORDER BY r.chapter_section`);
        let domains = await q('SELECT * FROM public.security_domains ORDER BY priority_order');
        const complianceAll = await q('SELECT * FROM public.compliance_records');
        const systemComplianceAll = await q('SELECT * FROM public.system_compliance_records');
        let facilitySystems = await q('SELECT id, facility_id, system_id, relation_type, criticality, is_primary FROM public.facility_systems');

        if (filters.facilityIds.length || filters.systemIds.length) {
          const facilitySet = new Set(filters.facilityIds);
          const systemSet = new Set(filters.systemIds);
          if (filters.includeLinkedSystems) {
            for (const link of facilitySystems) if (facilitySet.has(link.facility_id)) systemSet.add(link.system_id);
          }
          facilities = facilities.filter((f) => facilitySet.has(f.id));
          systems = systems.filter((x) => systemSet.has(x.id));
        }
        const facilityIdSet = new Set(facilities.map((f) => f.id));
        const systemIdSet = new Set(systems.map((x) => x.id));
        facilitySystems = facilitySystems.filter((fs) => facilityIdSet.has(fs.facility_id) && systemIdSet.has(fs.system_id));

        if (filters.sourceIds.length) { const set = new Set(filters.sourceIds); requirements = requirements.filter((r) => set.has(r.source_id)); }
        if (filters.domainIds.length) { const set = new Set(filters.domainIds); requirements = requirements.filter((r) => set.has(r.domain_id)); }
        const requirementIdSet = new Set(requirements.map((r) => r.id));
        if (filters.sourceIds.length || filters.domainIds.length) {
          const usedSources = new Set(requirements.map((r) => r.source_id));
          const usedDomains = new Set(requirements.map((r) => r.domain_id));
          requirementSources = requirementSources.filter((x) => usedSources.has(x.id));
          domains = domains.filter((d) => usedDomains.has(d.id));
        }
        const complianceRecords = complianceAll.filter((r) => facilityIdSet.has(r.facility_id) && requirementIdSet.has(r.requirement_id));
        const systemComplianceRecords = systemComplianceAll.filter((r) => systemIdSet.has(r.system_id) && requirementIdSet.has(r.requirement_id));

        const rowCounts = {
          facilities: facilities.length, systems: systems.length, requirementSources: requirementSources.length,
          requirements: requirements.length, complianceRecords: complianceRecords.length, systemComplianceRecords: systemComplianceRecords.length,
        };
        const exportId = randomUUID();
        const date = new Date().toISOString().slice(0, 10);
        const fileName = `Efterlevnadspaket_${date}_${exportId.slice(0, 8)}.zip`;
        const rec = await db.query(
          'SELECT public.record_compliance_export($1, $2, $3::jsonb, $4::jsonb) AS diff',
          [exportId, fileName, JSON.stringify(filters), JSON.stringify(rowCounts)]);

        return {
          exportId, fileName, filters, facilities, systems, requirementSources, requirements, domains,
          complianceRecords, systemComplianceRecords, facilitySystems,
          exportedAt: new Date().toISOString(), diff: rec.rows[0]?.diff ?? null,
        };
      });
    } catch (e) {
      req.log.error(e, 'export-compliance-package');
      return reply.code(500).send({ error: 'Exporten misslyckades. Försök igen eller kontakta administratören.' });
    }
  });

  // ------------------------------------------------------------------
  // Lagtext från riksdagen.se – bara i katalogläge
  // ------------------------------------------------------------------
  const ALLOWED_HOSTS = ['www.riksdagen.se', 'riksdagen.se', 'rkrattsbaser.gov.se', 'www.rkrattsbaser.gov.se'];
  app.post('/functions/fetch-law-text', { preHandler: requireApproved }, async (req, reply) => {
    if (config.INSTALLATION_ROLE === 'operations') {
      return reply.code(403).send({ error: 'Hämtning av lagtext görs i katalogmiljön. I driftläge importeras kravpaket.' });
    }
    const url = String((req.body as any)?.url ?? '').trim();
    let parsed: URL;
    try { parsed = new URL(url); } catch { return reply.code(400).send({ error: 'Ogiltig URL' }); }
    if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.includes(parsed.hostname)) {
      return reply.code(400).send({ error: `Endast https-länkar till ${ALLOWED_HOSTS.join(', ')} stöds` });
    }
    const page = await fetch(parsed.toString(), { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Resiliogov/2.0)' } });
    if (!page.ok) return reply.code(502).send({ error: `Kunde inte hämta dokumentet (HTTP ${page.status})` });
    const html = await page.text();

    let contentHtml: string | null = null;
    let title = '';
    const nextData = html.match(/id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (nextData) {
      try {
        const doc = JSON.parse(nextData[1])?.props?.pageProps?.contentApiData?.document;
        contentHtml = doc?.content?.html ?? null;
        title = doc?.title || doc?.subtitle || '';
      } catch { contentHtml = null; }
    }
    if (!contentHtml) contentHtml = html;
    if (!title) title = (html.match(/<title>([^<]*)<\/title>/i)?.[1] || '').split('|')[0].trim();

    const text = stripHtml(contentHtml);
    if (text.length < 200) return reply.code(422).send({ error: 'Hittade ingen läsbar lagtext på sidan' });
    return { title, url: parsed.toString(), charCount: text.length, chapters: splitIntoChapters(text) };
  });

  // ------------------------------------------------------------------
  // AI-funktioner: vidare till AI-tjänsten. Skickar bara det som skickades
  // förut (text + fråga), aldrig anläggningar eller bedömningar – utom
  // analytics-chat som är spärrad tills en administratör slår på den.
  // ------------------------------------------------------------------
  const forwardToAi = async (path: string, req: FastifyRequest, reply: FastifyReply, stream = false) => {
    if (!config.AI_BASE_URL) return reply.code(503).send({ error: 'AI-tjänsten är inte konfigurerad' });
    const res = await fetch(`${config.AI_BASE_URL}${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Id': req.session!.sub },
      body: JSON.stringify(req.body ?? {}),
    });
    if (stream && res.ok && res.body) {
      // Strömmen skrivs direkt på svaret; fel efter att huvudena skickats får
      // bara avsluta strömmen, inte kasta vidare (det kraschar processen).
      reply.hijack();
      reply.raw.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      try {
        for await (const chunk of res.body as any) reply.raw.write(chunk);
      } catch (e) {
        req.log.error(e, 'ai-ström avbröts');
        reply.raw.write(`data: ${JSON.stringify({ error: 'AI-tjänsten avbröt svaret' })}\n\n`);
      } finally {
        reply.raw.end();
      }
      return reply;
    }
    const body = await res.text();
    return reply.code(res.status).header('Content-Type', res.headers.get('content-type') ?? 'application/json').send(body);
  };

  app.post('/functions/extract-requirements', { preHandler: requireApproved }, (req, reply) => forwardToAi('/extract', req, reply));
  // Bygger det semantiska indexet för nya/ändrade krav (körs annars periodiskt i AI-tjänsten)
  app.post('/functions/reindex-embeddings', { preHandler: requireAdmin }, (req, reply) => forwardToAi('/reindex', req, reply));
  app.post('/functions/regulatory-chat', { preHandler: requireApproved }, (req, reply) => forwardToAi('/chat', req, reply, true));
  app.post('/functions/analytics-chat', { preHandler: requireApproved }, async (req, reply) => {
    const enabled = await withActor({ userId: req.session!.sub, role: 'authenticated' }, async (db) =>
      (await db.query('SELECT ai_compliance_analysis FROM public.installation_settings WHERE id = 1')).rows[0]?.ai_compliance_analysis === true);
    if (!enabled) return reply.code(403).send({ error: 'AI-analys av efterlevnadsdata är avstängd', code: 'ai_disabled' });
    return forwardToAi('/analytics', req, reply, true);
  });
};

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/(p|div|h[1-6]|li|tr|br)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_m, d) => String.fromCharCode(Number(d)))
    .replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function splitIntoChapters(text: string) {
  const headingRe = /^[ \t]*(\d+\s*kap\.[ \t]+[A-ZÅÄÖ][^\n§]{2,80})[ \t]*$/gm;
  const matches: { index: number; label: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = headingRe.exec(text)) !== null) matches.push({ index: m.index, label: m[1].trim() });
  const lastByLabel = new Map<string, { index: number; label: string }>();
  for (const item of matches) lastByLabel.set(item.label, item); // sista förekomsten – hoppar över innehållsförteckningen
  const starts = Array.from(lastByLabel.values()).sort((a, b) => a.index - b.index);
  if (starts.length === 0) return [{ label: 'Hela dokumentet', text, charCount: text.length }];
  const chapters: { label: string; text: string; charCount: number }[] = [];
  for (let i = 0; i < starts.length; i++) {
    const body = text.slice(starts[i].index, i + 1 < starts.length ? starts[i + 1].index : text.length).trim();
    if (body.length > 50) chapters.push({ label: starts[i].label, text: body, charCount: body.length });
  }
  return chapters;
}
