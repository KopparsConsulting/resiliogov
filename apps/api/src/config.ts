import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string(),
  DATABASE_ADMIN_URL: z.string().optional(),
  POSTGREST_URL: z.string().default('http://localhost:3001'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET måste vara minst 32 tecken'),
  INSTALLATION_ROLE: z.enum(['catalog', 'operations', 'combined']).default('operations'),
  OIDC_ISSUER: z.string().url(),
  OIDC_CLIENT_ID: z.string(),
  OIDC_CLIENT_SECRET: z.string().default(''),
  /** Om IdP:n nås på en annan adress från API-containern än från webbläsaren (Keycloak i Compose): bas-URL att byta till vid anrop. */
  OIDC_INTERNAL_BASE: z.string().url().optional(),
  PUBLIC_URL: z.string().url().default('http://localhost:8080'),
  FILE_STORAGE: z.enum(['local', 's3']).default('local'),
  FILE_DIR: z.string().default('/data/files'),
  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().default('resiliogov'),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  AI_BASE_URL: z.string().url().optional(),
  COOKIE_SECURE: z.coerce.boolean().default(false),
  /** Kommaseparerad lista: e-postadresser som blir administratör vid inloggning (första användaren blir det alltid). */
  BOOTSTRAP_ADMIN_EMAILS: z.string().default(''),
});

// Tomma miljövariabler (t.ex. S3_ENDPOINT= i Compose) räknas som ej satta
const env = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== ''));
export const config = schema.parse(env);
export type Config = typeof config;
