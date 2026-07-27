import { existsSync } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

export type ServerConfig = {
  trainingPlanGenerationJobLeaseMs?: number;
  host: string;
  port: number;
  supabasePublishableKey?: string;
  supabaseSecretKey?: string;
  supabaseUrl?: string;
};

export type LoadServerEnvOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
};

function findNearestEnvFile(cwd: string): string | null {
  let currentDir = path.resolve(cwd);
  const rootDir = path.parse(currentDir).root;

  while (true) {
    const candidate = path.join(currentDir, '.env');

    if (existsSync(candidate)) {
      return candidate;
    }

    if (currentDir === rootDir) {
      return null;
    }

    currentDir = path.dirname(currentDir);
  }
}

export function loadServerEnv(options: LoadServerEnvOptions = {}): string | null {
  const envFile = findNearestEnvFile(options.cwd ?? process.cwd());

  if (!envFile) {
    return null;
  }

  dotenv.config({
    path: envFile,
    processEnv: options.env ?? process.env,
  });

  return envFile;
}

export function getServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const port = Number(env.PORT ?? 3000);
  const trainingPlanGenerationJobLeaseMs = Number(
    env.TRAINING_PLAN_JOB_LEASE_MS,
  );

  return {
    ...(Number.isFinite(trainingPlanGenerationJobLeaseMs) &&
    trainingPlanGenerationJobLeaseMs > 0
      ? { trainingPlanGenerationJobLeaseMs }
      : {}),
    host: env.HOST ?? '0.0.0.0',
    port: Number.isFinite(port) ? port : 3000,
    supabasePublishableKey:
      env.SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_ANON_KEY,
    supabaseSecretKey: env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY,
    supabaseUrl: env.SUPABASE_URL,
  };
}
