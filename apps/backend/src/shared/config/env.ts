export type ServerConfig = {
  host: string;
  port: number;
};

export function getServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const port = Number(env.PORT ?? 3000);

  return {
    host: env.HOST ?? '0.0.0.0',
    port: Number.isFinite(port) ? port : 3000,
  };
}
