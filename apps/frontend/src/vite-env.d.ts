/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADS_ENABLED?: string;
  readonly VITE_ADSENSE_CLIENT_ID?: string;
  readonly VITE_ADSENSE_SLOT_DESKTOP_SIDEBAR?: string;
  readonly VITE_ADSENSE_SLOT_PRE_FOOTER?: string;
  readonly VITE_ADSENSE_SLOT_TRAINING_PREPARATION?: string;
  readonly VITE_AUTH_MODE?: 'mock';
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_AUTH_REDIRECT_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_SUPABASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
