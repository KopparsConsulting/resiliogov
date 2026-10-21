# @resiliogov/web

Gränssnittet från prototypen `compliancemanager2` (React 18, Vite, shadcn/ui,
Tailwind), porterat till att tala med API:t i `apps/api` i stället för
Supabase. All affärslogik i hooks och sidor är oförändrad.

## Köra

```sh
npm install
npm run dev          # http://localhost:8080 – kräver att API:t kör på :3000
npm run typecheck    # tsc --noEmit -p tsconfig.app.json
npm test             # vitest
npm run build        # dist/
```

Vite-proxyn skickar `/api` till `http://localhost:3000` under utveckling.
I Docker (`docker compose up`) serveras `dist/` av nginx, som vidarebefordrar
`/api/` till tjänsten `api` (`nginx.conf`, buffring av för SSE).

Enda miljövariabeln är `VITE_API_BASE` (standard `/api`). Inga `VITE_SUPABASE_*`.

## Vad som ändrats mot prototypen

- **Inget Supabase/Lovable i klienten.** `@supabase/supabase-js`,
  `@lovable.dev/cloud-auth-js` och `lovable-tagger` är borttagna, liksom
  `src/integrations/lovable/` och `previewAuthStorage.ts`.
- **Kompatibilitetslager** i `src/integrations/supabase/client.ts` exporterar
  `supabase` med samma form som tidigare:
  - `from()`/`rpc()` → `PostgrestClient` (`@supabase/postgrest-js`) mot
    `/api/rest` – samma trådprotokoll som Supabase, typat med `types.ts`.
    Radgränsen 1 000/anrop gäller fortfarande; `fetchAllRows` är kvar.
  - `auth` → `GET /api/auth/me` (session), `GET /api/auth/login` (OIDC),
    `POST /api/auth/logout`. Sessionen är en httpOnly-cookie; `signInWith*`
    och `signUp` skickar bara webbläsaren till `/api/auth/login`.
  - `functions.invoke(namn, {body})` → `POST /api/functions/<namn>`.
  - `storage.from(bucket)` → `POST/GET/DELETE /api/files/<bucket>/<sökväg>`.
    Det finns inga publika filer längre: `getPublicUrl` och `createSignedUrl`
    ger `/api/files/...`, som kräver inloggning och svarar med 302 till en
    kortlivad signerad URL. `document_url` på regelverk sparas därför som en
    sådan same-origin-länk.
- **Inloggning och behörighet** (`src/hooks/useAuth.tsx`): `approved`,
  `isAdmin` (`roles` innehåller `admin`) och `installationRole` kommer från
  `/api/auth/me`. Den hårdkodade admin-adressen, auto-godkända domäner och
  klientens eget profil-insert är borttagna – klienten beslutar ingenting.
- **Inloggningssidan** är en knapp till `/api/auth/login`. E-post/lösenord,
  Google-knappen och `notify-admin-signup` är borta.
- **Edge-funktionsanrop** (`useRegulatoryChat`, `useAnalyticsChat`,
  `lib/export/fetchExportData`) går till `/api/functions/<namn>` med cookies;
  `functionAuthHeaders()` returnerar `{}`.
- **Inga externa CDN:er.** Geist/Geist Mono laddas lokalt via
  `@fontsource-variable/*`; pdf.js-workern bundlas från `pdfjs-dist`.
- **Borttaget:** sidan Driftsspecifikation (`/deployment`, RFI-text) och
  testet `migrations.test.ts` (gällde prototypens migreringskataloger).
