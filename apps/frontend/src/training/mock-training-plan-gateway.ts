import type {
  MonthlyTrainingPlan,
  MonthlyTrainingPlanRequest,
  MonthlyTrainingPlanState,
  TrainingPlanGateway,
} from './training-plan.js';

const storageKey = 'funcione-mock-training-plans';
const scenarioStorageKey = 'funcione-mock-training-plan-scenarios';

type MockTrainingPlanScenario = {
  createError?: string;
  createThrows?: string;
  getError?: string;
  pending?: boolean;
};

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

export function createMockTrainingPlanGateway(): TrainingPlanGateway {
  return {
    createMonthlyPlan: async (accessToken, payload) => {
      const scenario = readScenario(accessToken);

      if (scenario?.createThrows) {
        throw new Error(scenario.createThrows);
      }

      if (scenario?.createError) {
        return { message: scenario.createError, ok: false };
      }

      const plans = readPlans();
      const existingPlan = plans[accessToken];

      if (existingPlan && isActivePlan(existingPlan, new Date())) {
        return {
          message: 'A monthly training plan is already active.',
          ok: false,
        };
      }

      const plan = createMockPlan(accessToken, payload);
      writePlans({ ...plans, [accessToken]: plan });

      return { ok: true, plan };
    },
    getActivePlan: async (accessToken): Promise<MonthlyTrainingPlanState> => {
      const scenario = readScenario(accessToken);

      if (scenario?.getError) {
        throw new Error(scenario.getError);
      }

      if (scenario?.pending) {
        return {
          activePlan: null,
          athleticProfile: null,
          canGenerate: false,
          nextGenerationAvailableAt: null,
        };
      }

      const storedPlan = readPlans()[accessToken] ?? null;
      const activePlan =
        storedPlan && isActivePlan(storedPlan, new Date()) ? storedPlan : null;

      return {
        activePlan,
        athleticProfile: null,
        canGenerate: !activePlan,
        nextGenerationAvailableAt: activePlan?.availableForRegenerationAt ?? null,
      };
    },
  };
}
