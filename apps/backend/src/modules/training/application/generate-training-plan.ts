import {
  createNvidiaModel,
  createOpenRouterModel,
  InstructorAgent,
  type InstructorModelConfig,
} from '../infra/instructor.js';
import type { DadosUsuario, PlanoTreino } from '../domain/index.js';

export type SupportedProvider = 'nvidia' | 'openrouter';

export type ModelAttempt = {
  provider: string;
  model: string;
  role: 'primary' | 'fallback';
  status: 'success' | 'error';
  durationMs: number;
  error?: string;
};

export type GenerateTrainingPlanSuccess = {
  provider: string;
  model: string;
  fallbackUsed: boolean;
  attempts: ModelAttempt[];
  durationMs: number;
  result: PlanoTreino;
};

export type GenerateTrainingPlanFailure = {
  fallbackUsed: boolean;
  attempts: ModelAttempt[];
  error: string;
};

export type GenerateTrainingPlanResult =
  | GenerateTrainingPlanSuccess
  | GenerateTrainingPlanFailure;

export type TrainingPlanGenerator = (
  input: DadosUsuario,
) => Promise<GenerateTrainingPlanResult>;

export type GenerateTrainingPlanDependencies = {
  env?: NodeJS.ProcessEnv;
  now?: () => number;
  modelTimeoutMs?: number;
  modelCandidates?: InstructorModelConfig[];
  createAgent?: (
    modelConfig: InstructorModelConfig,
  ) => Pick<InstructorAgent, 'createTrainingPlan'>;
  onModelEvent?: (event: string, payload: Record<string, unknown>) => void;
};

function getPrimaryProvider(env: NodeJS.ProcessEnv): SupportedProvider {
  const provider = env.PRIMARY_PROVIDER?.toLowerCase();

  if (provider === 'openrouter') {
    return 'openrouter';
  }

  return 'nvidia';
}

function createModelConfig(
  provider: SupportedProvider,
  env: NodeJS.ProcessEnv,
  timeoutMs: number,
): InstructorModelConfig {
  if (provider === 'openrouter') {
    return createOpenRouterModel(
      env.OPENROUTER_MODEL ?? 'openai/gpt-oss-120b',
      env,
      timeoutMs,
    );
  }

  return createNvidiaModel(
    env.NVIDIA_MODEL ?? 'openai/gpt-oss-120b',
    env,
    timeoutMs,
  );
}

function createModelCandidates(
  env: NodeJS.ProcessEnv,
  timeoutMs: number,
): InstructorModelConfig[] {
  const primaryProvider = getPrimaryProvider(env);
  const fallbackProvider: SupportedProvider =
    primaryProvider === 'nvidia' ? 'openrouter' : 'nvidia';

  return [
    createModelConfig(primaryProvider, env, timeoutMs),
    createModelConfig(fallbackProvider, env, timeoutMs),
  ];
}

function stringifyError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getModelTimeoutMs(
  env: NodeJS.ProcessEnv,
  override?: number,
): number {
  const timeoutMs = override ?? Number(env.TRAINING_PLAN_MODEL_TIMEOUT_MS);

  return Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 600_000;
}

function summarizeFailedAttempts(attempts: ModelAttempt[]): string {
  const details = attempts
    .filter((attempt) => attempt.status === 'error')
    .map((attempt) => {
      const error = attempt.error ?? 'erro desconhecido';
      const compactError =
        error.length > 240 ? `${error.slice(0, 237)}...` : error;

      return `${attempt.provider}/${attempt.model}: ${compactError}`;
    });

  if (details.length === 0) {
    return 'Todos os providers configurados falharam.';
  }

  return `Todos os providers configurados falharam: ${details.join('; ')}`;
}

async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  let didTimeout = false;
  const operationPromise = operation();
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      didTimeout = true;
      reject(new Error(`Model attempt timed out after ${timeoutMs}ms.`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([operationPromise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);

    if (didTimeout) {
      // Soft timeout: provider SDKs may keep their network call alive until settled.
      operationPromise.catch(() => undefined);
    }
  }
}

function getMissingCredentialError(
  env: NodeJS.ProcessEnv,
  provider: string,
): string | undefined {
  if (provider === 'nvidia' && !env.NVIDIA_API_KEY) {
    return 'Variavel de ambiente NVIDIA_API_KEY nao configurada.';
  }

  if (provider === 'openrouter' && !env.OPENROUTER_API_KEY) {
    return 'Variavel de ambiente OPENROUTER_API_KEY nao configurada.';
  }

  return undefined;
}

export async function generateTrainingPlan(
  input: DadosUsuario,
  dependencies: GenerateTrainingPlanDependencies = {},
): Promise<GenerateTrainingPlanResult> {
  const env = dependencies.env ?? process.env;
  const now = dependencies.now ?? Date.now;
  const createAgent =
    dependencies.createAgent ??
    ((modelConfig: InstructorModelConfig) => InstructorAgent.createAgent(modelConfig));
  const onModelEvent = dependencies.onModelEvent ?? (() => undefined);
  const modelTimeoutMs = getModelTimeoutMs(env, dependencies.modelTimeoutMs);
  const candidates = dependencies.modelCandidates ?? createModelCandidates(env, modelTimeoutMs);
  const generationStartedAt = now();
  const attempts: ModelAttempt[] = [];

  for (const [index, modelConfig] of candidates.entries()) {
    const role: ModelAttempt['role'] = index === 0 ? 'primary' : 'fallback';
    const startedAt = now();
    const baseLog = {
      provider: modelConfig.provider,
      model: modelConfig.modelName,
      role,
    };

    onModelEvent('model_attempt_started', baseLog);

    const missingCredentialError = getMissingCredentialError(env, modelConfig.provider);

    if (missingCredentialError) {
      const attempt: ModelAttempt = {
        ...baseLog,
        status: 'error',
        durationMs: now() - startedAt,
        error: missingCredentialError,
      };

      attempts.push(attempt);
      onModelEvent('model_attempt_failed', attempt);
      continue;
    }

    try {
      const agent = createAgent(modelConfig);
      const result = await withTimeout(
        () => agent.createTrainingPlan(input),
        modelTimeoutMs,
      );
      const attempt: ModelAttempt = {
        ...baseLog,
        status: 'success',
        durationMs: now() - startedAt,
      };

      attempts.push(attempt);
      onModelEvent('model_attempt_succeeded', attempt);

      return {
        provider: modelConfig.provider,
        model: modelConfig.modelName,
        fallbackUsed: role === 'fallback',
        attempts,
        durationMs: now() - generationStartedAt,
        result,
      };
    } catch (error) {
      const attempt: ModelAttempt = {
        ...baseLog,
        status: 'error',
        durationMs: now() - startedAt,
        error: stringifyError(error),
      };

      attempts.push(attempt);
      onModelEvent('model_attempt_failed', attempt);
    }
  }

  return {
    fallbackUsed: attempts.length > 1,
    attempts,
    error: summarizeFailedAttempts(attempts),
  };
}
