import { TrainingPlanGatewayError } from './training-plan.js';
import type {
  MonthlyTrainingPlanGeneration,
  MonthlyTrainingPlan,
  MonthlyTrainingPlanRequest,
  MonthlyTrainingPlanState,
  TrainingPlanGateway,
} from './training-plan.js';

const storageKey = 'funcione-mock-training-plans';
const generationStorageKey = 'funcione-mock-training-generations';
const scenarioStorageKey = 'funcione-mock-training-plan-scenarios';

type MockTrainingPlanScenario = {
  createDelayMs?: number;
  createError?: string;
  createErrorCode?: string;
  createThrows?: string;
  generationError?: string;
  generationPollsBeforeComplete?: number;
  getDelayMs?: number;
  getError?: string;
  getErrorCode?: string;
  pending?: boolean;
};

type StoredGeneration = {
  accessToken: string;
  generation: MonthlyTrainingPlanGeneration;
  payload: MonthlyTrainingPlanRequest;
  pollCount: number;
};

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function readScenario(accessToken: string): MockTrainingPlanScenario | null {
  const scenarios = JSON.parse(
    window.localStorage.getItem(scenarioStorageKey) ?? '{}',
  ) as Record<string, MockTrainingPlanScenario>;

  return scenarios[accessToken] ?? null;
}

function readPlans(): Record<string, MonthlyTrainingPlan> {
  return JSON.parse(window.localStorage.getItem(storageKey) ?? '{}') as Record<
    string,
    MonthlyTrainingPlan
  >;
}

function writePlans(plans: Record<string, MonthlyTrainingPlan>) {
  window.localStorage.setItem(storageKey, JSON.stringify(plans));
}

function readGenerations(): Record<string, StoredGeneration> {
  return JSON.parse(
    window.localStorage.getItem(generationStorageKey) ?? '{}',
  ) as Record<string, StoredGeneration>;
}

function writeGenerations(generations: Record<string, StoredGeneration>) {
  window.localStorage.setItem(generationStorageKey, JSON.stringify(generations));
}

function isActivePlan(plan: MonthlyTrainingPlan, now: Date): boolean {
  return (
    plan.status === 'active' &&
    new Date(plan.availableForRegenerationAt).getTime() > now.getTime()
  );
}

function createMockPlan(
  accessToken: string,
  payload: MonthlyTrainingPlanRequest,
): MonthlyTrainingPlan {
  const generatedAt = new Date();
  const availableForRegenerationAt = new Date(generatedAt);
  availableForRegenerationAt.setUTCDate(generatedAt.getUTCDate() + 30);

  return {
    availableForRegenerationAt: availableForRegenerationAt.toISOString(),
    generatedAt: generatedAt.toISOString(),
    id: `${accessToken}-monthly-plan`,
    result: {
      resumo: 'Plano semanal base para evoluir performance com seguranca.',
      treinos: [
        {
          alongamentos: [
            {
              duracaoSegundos: 45,
              instrucoesExecucao:
                'Fique em posicao atletica, avance o joelho com o calcanhar no chao e respire de forma continua.',
              motivoEscolha: 'Prepara tornozelos para aterrissagens.',
              nome: 'Mobilidade de tornozelo',
              observacoes: 'Mobilidade controlada, sem forcar a amplitude.',
            },
          ],
          dia: 'Segunda-feira',
          duracaoMinutos: payload.duracaoTreinoMinutos,
          exercicios: [
            {
              instrucoesExecucao:
                'Agache com base firme, salte baixo e aterrisse com joelhos alinhados aos pes.',
              motivoEscolha: 'Desenvolve potencia com controle de impacto.',
              nome: 'Agachamento com salto controlado',
              observacoes:
                'Priorize uma aterrissagem sem dor e interrompa a serie se houver desconforto.',
              repeticoes: '4x6',
              series: 4,
            },
          ],
          foco: 'potencia e aterrissagem',
        },
        {
          alongamentos: [],
          dia: 'Quarta-feira',
          duracaoMinutos: payload.duracaoTreinoMinutos,
          exercicios: [],
          foco: 'agilidade lateral',
        },
      ],
    },
    snapshot: {
      ...payload,
      idade: 30,
      userId: accessToken,
    },
    status: 'active',
    userId: accessToken,
  };
}

function createMockGeneration(
  accessToken: string,
): MonthlyTrainingPlanGeneration {
  const now = new Date().toISOString();

  return {
    attemptCount: 0,
    completedAt: null,
    createdAt: now,
    errorMessage: null,
    failedAt: null,
    id: `${accessToken}-monthly-generation-${Date.now()}`,
    maxAttempts: 3,
    planId: null,
    startedAt: null,
    status: 'queued',
    updatedAt: now,
    userId: accessToken,
  };
}

function findPendingGeneration(
  accessToken: string,
): MonthlyTrainingPlanGeneration | null {
  const generations = Object.values(readGenerations());
  const pendingGeneration = generations.find(
    (storedGeneration) =>
      storedGeneration.accessToken === accessToken &&
      ['queued', 'running'].includes(storedGeneration.generation.status),
  );

  return pendingGeneration?.generation ?? null;
}

export function createMockTrainingPlanGateway(): TrainingPlanGateway {
  return {
    createMonthlyPlan: async (accessToken, payload) => {
      const scenario = readScenario(accessToken);

      if (scenario?.createDelayMs) {
        await wait(scenario.createDelayMs);
      }

      if (scenario?.createThrows) {
        throw new Error(scenario.createThrows);
      }

      if (scenario?.createError) {
        const code = scenario.createErrorCode ?? 'TRAINING_PLAN_REQUEST_FAILED';

        return {
          code,
          error: {
            code,
            message: scenario.createError,
            source: 'training',
          },
          message: scenario.createError,
          ok: false,
        };
      }

      const plans = readPlans();
      const existingPlan = plans[accessToken];

      if (existingPlan && isActivePlan(existingPlan, new Date())) {
        return {
          code: 'TRAINING_MONTHLY_PLAN_ALREADY_ACTIVE',
          error: {
            code: 'TRAINING_MONTHLY_PLAN_ALREADY_ACTIVE',
            message: 'A monthly training plan is already active.',
            source: 'training',
          },
          message: 'A monthly training plan is already active.',
          ok: false,
        };
      }

      const generation = createMockGeneration(accessToken);
      const generations = readGenerations();

      writeGenerations({
        ...generations,
        [generation.id]: {
          accessToken,
          generation,
          payload,
          pollCount: 0,
        },
      });

      return { generation, ok: true };
    },
    getActivePlan: async (accessToken): Promise<MonthlyTrainingPlanState> => {
      const scenario = readScenario(accessToken);

      if (scenario?.getDelayMs) {
        await wait(scenario.getDelayMs);
      }

      if (scenario?.getError) {
        throw new TrainingPlanGatewayError({
          code: scenario.getErrorCode ?? 'TRAINING_PLAN_REQUEST_FAILED',
          message: scenario.getError,
        });
      }

      if (scenario?.pending) {
        return {
          activePlan: null,
          athleticProfile: null,
          canGenerate: false,
          nextGenerationAvailableAt: null,
          pendingGeneration:
            findPendingGeneration(accessToken) ?? createMockGeneration(accessToken),
        };
      }

      const storedPlan = readPlans()[accessToken] ?? null;
      const activePlan =
        storedPlan && isActivePlan(storedPlan, new Date()) ? storedPlan : null;
      const pendingGeneration = activePlan ? null : findPendingGeneration(accessToken);

      return {
        activePlan,
        athleticProfile: null,
        canGenerate: !activePlan && !pendingGeneration,
        nextGenerationAvailableAt: activePlan?.availableForRegenerationAt ?? null,
        pendingGeneration,
      };
    },
    getGenerationStatus: async (accessToken, generationId) => {
      const generations = readGenerations();
      const storedGeneration = generations[generationId];

      if (!storedGeneration || storedGeneration.accessToken !== accessToken) {
        throw new TrainingPlanGatewayError({
          code: 'TRAINING_GENERATION_UNAVAILABLE',
          message: 'Generation not found.',
        });
      }

      const scenario = readScenario(accessToken);
      const now = new Date().toISOString();

      if (scenario?.generationError) {
        const failedGeneration = {
          ...storedGeneration.generation,
          attemptCount: Math.max(storedGeneration.generation.attemptCount, 1),
          errorMessage: scenario.generationError,
          failedAt: now,
          status: 'failed' as const,
          updatedAt: now,
        };

        writeGenerations({
          ...generations,
          [generationId]: {
            ...storedGeneration,
            generation: failedGeneration,
          },
        });

        return { generation: failedGeneration, plan: null };
      }

      const nextPollCount = storedGeneration.pollCount + 1;
      const pollsBeforeComplete = scenario?.generationPollsBeforeComplete ?? 0;

      if (nextPollCount <= pollsBeforeComplete) {
        const runningGeneration = {
          ...storedGeneration.generation,
          attemptCount: Math.max(storedGeneration.generation.attemptCount, 1),
          startedAt: storedGeneration.generation.startedAt ?? now,
          status: 'running' as const,
          updatedAt: now,
        };

        writeGenerations({
          ...generations,
          [generationId]: {
            ...storedGeneration,
            generation: runningGeneration,
            pollCount: nextPollCount,
          },
        });

        return { generation: runningGeneration, plan: null };
      }

      const plan = createMockPlan(accessToken, storedGeneration.payload);
      const completedGeneration = {
        ...storedGeneration.generation,
        attemptCount: Math.max(storedGeneration.generation.attemptCount, 1),
        completedAt: now,
        planId: plan.id,
        startedAt: storedGeneration.generation.startedAt ?? now,
        status: 'completed' as const,
        updatedAt: now,
      };

      writePlans({ ...readPlans(), [accessToken]: plan });
      writeGenerations({
        ...generations,
        [generationId]: {
          ...storedGeneration,
          generation: completedGeneration,
          pollCount: nextPollCount,
        },
      });

      return { generation: completedGeneration, plan };
    },
  };
}
