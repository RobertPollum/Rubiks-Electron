/// <reference types="vite/client" />

// Build-time settings (from .env files or the environment). See docs/sync-api.md.
interface ImportMetaEnv {
    /** Base URL of the sync API, e.g. https://api.example.com. Sync is off when unset. */
    readonly VITE_SYNC_API_URL?: string;
    /** "true" to allow the development-only sign-in (for the mock server). Never set this in production. */
    readonly VITE_SYNC_DEV_AUTH?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
