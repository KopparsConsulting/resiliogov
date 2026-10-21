-- Referensdata som plattformen förutsätter. Hämtad från produktionsdatabasen
-- 2026-10-21. Idempotent.

-- Hashkedjans huvud (en rad; seq 0, prev_hash för första raden = 'genesis')
INSERT INTO public.audit_chain_head (id, seq, hash) VALUES (true, 0, 'genesis') ON CONFLICT (id) DO NOTHING;

-- Installationsinställningar (en rad). role sätts per nod: catalog | operations | combined
INSERT INTO public.installation_settings (id, role, ai_compliance_analysis)
VALUES (1, 'combined', false) ON CONFLICT (id) DO NOTHING;

-- Klass 1–5 → IEC 62443 Security Level
INSERT INTO public.class_sl_mapping (classification_level, target_sl, label, description) VALUES
 (1, 0, 'Klass 1 — Grundnivå',  'Endast generella baskrav. Inga cybersäkerhetskrav från IEC 62443-3-3.'),
 (2, 1, 'Klass 2 — Förhöjd',    'Skydd mot oavsiktliga eller tillfälliga överträdelser.'),
 (3, 2, 'Klass 3 — Hög',        'Skydd mot avsiktliga överträdelser med enkla medel och låg motivation.'),
 (4, 3, 'Klass 4 — Mycket hög', 'Skydd mot avsiktliga överträdelser med sofistikerade medel och IACS-specifik kunskap.'),
 (5, 3, 'Klass 5 — Maximal',    'Skydd mot avsiktliga överträdelser med sofistikerade medel och IACS-specifik kunskap.')
ON CONFLICT (classification_level) DO UPDATE SET target_sl = EXCLUDED.target_sl, label = EXCLUDED.label, description = EXCLUDED.description;

-- Trösklar för etiketter i ledningsvyn
INSERT INTO public.scoring_thresholds (key, value, label, description) VALUES
 ('critical_compliance',   50, 'Kritisk – gräns för efterlevnad (%)', 'Efterlevnad under detta värde ger "Kritisk" (kräver täckning över gränsen nedan).'),
 ('critical_min_coverage', 50, 'Kritisk – lägsta täckning (%)',       'Täckning måste nå detta värde för att ett objekt ska kunna märkas "Kritisk".'),
 ('good_compliance',       80, 'God – gräns för efterlevnad (%)',     'Efterlevnad på eller över detta värde ger etiketten "God".'),
 ('not_assessed_coverage', 10, 'Ej bedömd – gräns för täckning (%)',  'Täckning under detta värde ger etiketten "Ej bedömd".')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, label = EXCLUDED.label, description = EXCLUDED.description;

-- Säkerhetsdomäner (samma id som produktion så kravpaket matchar på slug och id)
INSERT INTO public.security_domains (id, slug, name, description, icon, color, priority_order, is_local) VALUES
 ('c77ea636-086a-49a6-a5c2-fd6a00af99b8', 'styrning',          'Styrning och riskhantering',        'Ledningens ansvar, riskanalys, riskhantering, leveranskedja, kompetens och tillsyn.', 'Shield', '#2563eb', 1, false),
 ('0fc3fc4b-6f36-4e1e-8f95-73270a20127a', 'atkomst',           'Identitet och åtkomst',             'Identifiering, autentisering, behörigheter, sessioner och åtkomst från externa nät.', 'Lock', '#7c3aed', 2, false),
 ('4ba4134a-9eba-4b48-a098-0281df6080e2', 'natverk',           'Nätverk och dataskydd',             'Segmentering, zongränser, skyddad kommunikation, konfidentialitet och kryptografi.', 'Network', '#0891b2', 3, false),
 ('d351d46d-6c1d-4c73-81a4-ed1c794bc637', 'systemintegritet',  'Systemintegritet och härdning',     'Skydd mot skadlig kod, sårbarheter, ändringshantering, konfiguration och komponentinventering.', 'Server', '#0d9488', 4, false),
 ('b411b7eb-8426-41f4-9836-ff976293e5ba', 'loggning',          'Loggning och övervakning',          'Händelseloggar, tidsstämplar, skydd av loggar och kontinuerlig övervakning.', 'Activity', '#ea580c', 5, false),
 ('2892e355-0ac3-457e-a29d-026d3bd83723', 'incident',          'Incidenthantering och rapportering','Incidentprocesser, rapportering av betydande incidenter och information till mottagare.', 'Siren', '#dc2626', 6, false),
 ('ffe7fcc7-bc34-4006-a9da-29700f970691', 'kontinuitet',       'Kontinuitet och återställning',     'Kontinuitetsplaner, säkerhetskopiering, återställning, reservkraft och tålighet mot överbelastning.', 'LifeBuoy', '#16a34a', 7, false),
 ('1fff0bca-2bbc-4e4d-92d1-14478b6637a3', 'manager-checklist', 'Chefens checklista',                'Översikt för chefer över anläggningar, system och teknisk skuld.', 'ClipboardCheck', '#64748b', 99, false)
ON CONFLICT (id) DO NOTHING;
