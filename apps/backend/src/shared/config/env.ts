export type ServerConfig = {
  host: string;
  port: number;
  supabasePublishableKey?: string;
  supabaseUrl?: string;
};

export function getServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const port = Number(env.PORT ?? 3000);

  return {
    host: env.HOST ?? '0.0.0.0',
    port: Number.isFinite(port) ? port : 3000,
    supabasePublishableKey:
      env.SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_ANON_KEY,
    supabaseUrl: env.SUPABASE_URL,
  };
}
