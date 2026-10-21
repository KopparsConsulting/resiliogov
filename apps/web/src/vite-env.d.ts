/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Bas-URL till API:t (samma origin). Standard: /api */
  readonly VITE_API_BASE?: string;
}
