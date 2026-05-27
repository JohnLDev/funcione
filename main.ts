import 'dotenv/config';
import { writeFile } from 'node:fs/promises';

import {
  createOpenRouterModel,
  createNvidiaModel,
  DadosUsuario,
  InstructorAgent,
  InstructorModelConfig,
  LocalTreino,
  ModalidadeEsportiva,
  NivelExperiencia,
  TempoDisponivel,
} from './src/agents/instructor/instructor.js';

const input: DadosUsuario = {
  userId: 'user-2',
  modalidade: ModalidadeEsportiva.Volei,
  idade: '25',
  peso: '80kg',
  altura: '169cm',
  objetivo: 'Melhorar a performance na modalidade escolhida',
  nivelExperiencia: NivelExperiencia.Intermediario,
  tempoDisponivel: TempoDisponivel.TresVezesPorSemana,
  duracaoTreinoMinutos: 90,
  localTreino: LocalTreino.Academia,
  lesoes: [],
};

type SupportedProvider = 'nvidia' | 'openrouter';

type ModelAttempt = {
  provider: string;
  model: string;
  role: 'primary' | 'fallback';
  status: 'success' | 'error';
  durationMs: number;
  error?: string;
};

function getPrimaryProvider(): SupportedProvider {
  const provider = process.env.PRIMARY_PROVIDER?.toLowerCase();

  if (provider === 'openrouter') {
    return 'openrouter';
  }

  return 'nvidia';
}

function createModelConfig(provider: SupportedProvider): InstructorModelConfig {
  if (provider === 'openrouter') {
    return createOpenRouterModel(
      process.env.OPENROUTER_MODEL ?? 'openai/gpt-oss-120b',
    );
  }

  return createNvidiaModel(process.env.NVIDIA_MODEL ?? 'openai/gpt-oss-120b');
}

function createModelCandidates(): InstructorModelConfig[] {
  const primaryProvider = getPrimaryProvider();
  const fallbackProvider: SupportedProvider =
    primaryProvider === 'nvidia' ? 'openrouter' : 'nvidia';

  return [createModelConfig(primaryProvider), createModelConfig(fallbackProvider)];
}

function stringifyError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function logModelEvent(event: string, payload: Record<string, unknown>): void {
  console.log(JSON.stringify({ event, ...payload }));
}

function getMissingCredentialError(provider: string): string | undefined {
  if (provider === 'nvidia' && !process.env.NVIDIA_API_KEY) {
    return 'Variável de ambiente NVIDIA_API_KEY não configurada.';
  }

  if (provider === 'openrouter' && !process.env.OPENROUTER_API_KEY) {
    return 'Variável de ambiente OPENROUTER_API_KEY não configurada.';
  }

  return undefined;
}

async function runWithFallback(input: DadosUsuario) {
  const attempts: ModelAttempt[] = [];
  const candidates = createModelCandidates();

  for (const [index, modelConfig] of candidates.entries()) {
    const role: ModelAttempt['role'] = index === 0 ? 'primary' : 'fallback';
    const startedAt = Date.now();
    const baseLog = {
      provider: modelConfig.provider,
      model: modelConfig.modelName,
      role,
    };

    logModelEvent('model_attempt_started', baseLog);

    const missingCredentialError = getMissingCredentialError(modelConfig.provider);

    if (missingCredentialError) {
      const attempt: ModelAttempt = {
        ...baseLog,
        status: 'error',
        durationMs: Date.now() - startedAt,
        error: missingCredentialError,
      };

      attempts.push(attempt);
      logModelEvent('model_attempt_failed', attempt);
      continue;
    }

    try {
      const agent = InstructorAgent.createAgent(modelConfig);
      const result = await agent.createTrainingPlan(input);
      const attempt: ModelAttempt = {
        ...baseLog,
        status: 'success',
        durationMs: Date.now() - startedAt,
      };

      attempts.push(attempt);
      logModelEvent('model_attempt_succeeded', attempt);

      return {
        provider: modelConfig.provider,
        model: modelConfig.modelName,
        fallbackUsed: role === 'fallback',
        attempts,
        durationMs: attempt.durationMs,
        result,
      };
    } catch (error) {
      const attempt: ModelAttempt = {
        ...baseLog,
        status: 'error',
        durationMs: Date.now() - startedAt,
        error: stringifyError(error),
      };

      attempts.push(attempt);
      logModelEvent('model_attempt_failed', attempt);
    }
  }

  return {
    fallbackUsed: attempts.length > 1,
    attempts,
    error: 'Todos os providers configurados falharam.',
  };
}

const results = [await runWithFallback(input)];

console.log(JSON.stringify({ results }, null, 2));
await writeFile('output.json', JSON.stringify({ results }, null, 2));
