import type {
  MonthlyTrainingPlan,
  MonthlyTrainingPlanRequest,
  MonthlyTrainingPlanState,
  TrainingPlanGateway,
} from './training-plan.js';

const storageKey = 'funcione-mock-training-plans';

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
