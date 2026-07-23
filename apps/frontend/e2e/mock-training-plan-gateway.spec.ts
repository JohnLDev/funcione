import { expect, test } from '@playwright/test';

test.describe('mock training plan gateway', () => {
  test('treats expired plans as regenerable and creates a current monthly plan', async ({
    page,
  }) => {
    await page.goto('/login');

    const result = await page.evaluate(async () => {
      const accessToken = 'mock-training-window-token';
      const now = Date.now();
      const expiredPlan = {
        availableForRegenerationAt: new Date(now - 1_000).toISOString(),
        generatedAt: new Date(now - 30 * 24 * 60 * 60 * 1_000).toISOString(),
        id: 'expired-plan',
        result: { resumo: '', treinos: [] },
        snapshot: {},
        status: 'expired',
        userId: accessToken,
      };

      window.localStorage.setItem(
        'funcione-mock-training-plans',
        JSON.stringify({ [accessToken]: expiredPlan }),
      );

      const { createMockTrainingPlanGateway } = await import(
        '/src/training/mock-training-plan-gateway.ts'
      );
      const gateway = createMockTrainingPlanGateway();
      const expiredState = await gateway.getActivePlan(accessToken);
      const created = await gateway.createMonthlyPlan(accessToken, {
        alturaCm: 180,
        duracaoTreinoMinutos: 60,
        equipamentos: [{ tipo: 'nenhum' }],
        lesoes: [],
        localTreino: 'casa',
        modalidade: 'volei',
        nivelExperiencia: 'intermediario',
        objetivos: ['performance'],
        pesoKg: 80,
        tempoDisponivel: '3x_semana',
      });
      const activeState = await gateway.getActivePlan(accessToken);

      return {
        activeCanGenerate: activeState.canGenerate,
        activePlanId: activeState.activePlan?.id,
        createdAt: created.ok ? created.plan.generatedAt : null,
        createdOk: created.ok,
        expiredCanGenerate: expiredState.canGenerate,
        expiredPlan: expiredState.activePlan,
        now,
      };
    });

    expect(result.expiredPlan).toBeNull();
    expect(result.expiredCanGenerate).toBe(true);
    expect(result.createdOk).toBe(true);
    expect(result.activeCanGenerate).toBe(false);
    expect(result.activePlanId).toBe('mock-training-window-token-monthly-plan');
    expect(new Date(result.createdAt ?? '').getTime()).toBeGreaterThanOrEqual(
      result.now,
    );
  });
});
