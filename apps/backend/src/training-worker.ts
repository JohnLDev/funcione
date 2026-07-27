import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { createInMemoryUserProfileRepository } from './modules/auth/index.js';
import {
  createSupabaseTrainingWorkerRepositories,
  generateTrainingPlan,
  processAvailableMonthlyTrainingPlanGenerationJobs,
  type MonthlyTrainingPlanServiceDependencies,
  type ProcessMonthlyTrainingPlanGenerationJobResult,
} from './modules/training/index.js';
import { getServerConfig, loadServerEnv } from './shared/config/env.js';

const defaultPollIntervalMs = 5_000;

export type TrainingWorkerConfig = {
  pollIntervalMs: number;
  runOnce: boolean;
};

export type TrainingWorkerLogger = {
  error?: (payload: unknown, message?: string) => void;
  info?: (payload: unknown, message?: string) => void;
};

export type RunTrainingWorkerOptions = TrainingWorkerConfig & {
  abortSignal?: AbortSignal;
  logger?: TrainingWorkerLogger;
  processAvailableJobs: () => Promise<ProcessMonthlyTrainingPlanGenerationJobResult[]>;
};

export type RunTrainingWorkerResult = {
  iterations: number;
};

export function getTrainingWorkerConfig(
  env: NodeJS.ProcessEnv = process.env,
): TrainingWorkerConfig {
  const pollIntervalMs = Number(env.TRAINING_PLAN_WORKER_INTERVAL_MS);

  return {
    pollIntervalMs:
      Number.isFinite(pollIntervalMs) && pollIntervalMs > 0
        ? pollIntervalMs
        : defaultPollIntervalMs,
    runOnce: env.TRAINING_PLAN_WORKER_RUN_ONCE === 'true',
  };
}

function createAbortControllerForProcess(): AbortController {
  const abortController = new AbortController();
  const abort = () => abortController.abort();

  process.once('SIGINT', abort);
  process.once('SIGTERM', abort);

  return abortController;
}

async function waitForNextPoll(
  pollIntervalMs: number,
  abortSignal?: AbortSignal,
): Promise<void> {
  if (abortSignal?.aborted) {
    return;
  }

  try {
    await sleep(pollIntervalMs, undefined, { signal: abortSignal });
  } catch (error) {
    if (!abortSignal?.aborted) {
      throw error;
    }
  }
}

export async function runTrainingGenerationWorker(
  options: RunTrainingWorkerOptions,
): Promise<RunTrainingWorkerResult> {
  let iterations = 0;

  while (!options.abortSignal?.aborted) {
    iterations += 1;

    try {
      const results = await options.processAvailableJobs();
      options.logger?.info?.({
        processed: results.length,
      }, 'Monthly training generation worker iteration completed.');
    } catch (error) {
      options.logger?.error?.({
        err: error,
      }, 'Monthly training generation worker iteration failed.');
    }

    if (options.runOnce || options.abortSignal?.aborted) {
      return { iterations };
    }

    await waitForNextPoll(options.pollIntervalMs, options.abortSignal);
  }

  return { iterations };
}

export function createTrainingWorkerDependencies(
  env: NodeJS.ProcessEnv = process.env,
): MonthlyTrainingPlanServiceDependencies {
  const config = getServerConfig(env);

  if (!config.supabaseUrl || !config.supabaseSecretKey) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SECRET_KEY are required to run the training worker.',
    );
  }

  return {
    ...createSupabaseTrainingWorkerRepositories({
      supabaseSecretKey: config.supabaseSecretKey,
      supabaseUrl: config.supabaseUrl,
    }),
    generationJobLeaseMs: config.trainingPlanGenerationJobLeaseMs,
    trainingPlanGenerator: (input) => generateTrainingPlan(input, { env }),
    userProfileRepository: createInMemoryUserProfileRepository(),
  };
}

export async function main(): Promise<void> {
  loadServerEnv();
  const workerConfig = getTrainingWorkerConfig();
  const dependencies = createTrainingWorkerDependencies();
  const abortController = createAbortControllerForProcess();

  await runTrainingGenerationWorker({
    ...workerConfig,
    abortSignal: abortController.signal,
    logger: console,
    processAvailableJobs: () =>
      processAvailableMonthlyTrainingPlanGenerationJobs(dependencies),
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
