import { expect, test } from '@playwright/test';
import { createApiTrainingPlanGateway } from '../src/training/api-training-plan-gateway.js';
import { TrainingPlanGatewayError } from '../src/training/training-plan.js';
import type { MonthlyTrainingPlanRequest } from '../src/training/training-plan.js';

const payload: MonthlyTrainingPlanRequest = {
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
};

test.describe('API training plan gateway', () => {
  test('returns the accepted generation when monthly creation responds with 202', async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async () =>
      Response.json(
        {
          generation: {
            completedAt: null,
            createdAt: '2026-07-24T12:00:00.000Z',
            errorMessage: null,
            failedAt: null,
            id: 'generation-123',
            startedAt: null,
            status: 'queued',
            updatedAt: '2026-07-24T12:00:00.000Z',
            userId: 'user-123',
          },
        },
        { status: 202 },
      );

    try {
      const result = await createApiTrainingPlanGateway().createMonthlyPlan(
        'valid-token',
        payload,
      );

      expect(result).toEqual({
        generation: expect.objectContaining({
          id: 'generation-123',
          status: 'queued',
        }),
        ok: true,
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('reads a completed generation status with the generated plan', async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async () =>
      Response.json({
        generation: {
          completedAt: '2026-07-24T12:01:00.000Z',
          createdAt: '2026-07-24T12:00:00.000Z',
          errorMessage: null,
          failedAt: null,
          id: 'generation-123',
          startedAt: '2026-07-24T12:00:01.000Z',
          status: 'completed',
          updatedAt: '2026-07-24T12:01:00.000Z',
          userId: 'user-123',
        },
        plan: {
          availableForRegenerationAt: '2026-08-23T12:01:00.000Z',
          generatedAt: '2026-07-24T12:01:00.000Z',
          id: 'plan-123',
          result: { resumo: 'Plano pronto.', treinos: [] },
          snapshot: { ...payload, idade: 30, userId: 'user-123' },
          status: 'active',
          userId: 'user-123',
        },
      });

    try {
      const result = await createApiTrainingPlanGateway().getGenerationStatus(
        'valid-token',
        'generation-123',
      );

      expect(result.generation.status).toBe('completed');
      expect(result.plan?.id).toBe('plan-123');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('preserves missing authentication token error codes without localizing the gateway', async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async () =>
      Response.json(
        {
          error: {
            code: 'AUTH_TOKEN_MISSING',
            message: 'Authentication token is required.',
          },
        },
        { status: 401 },
      );

    try {
      const result = await createApiTrainingPlanGateway().createMonthlyPlan(
        '',
        payload,
      );

      expect(result).toEqual({
        code: 'AUTH_TOKEN_MISSING',
        error: {
          code: 'AUTH_TOKEN_MISSING',
          message: 'Authentication token is required.',
          source: 'training',
        },
        message: 'Authentication token is required.',
        ok: false,
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('throws active-plan auth errors with a code for UI localization', async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async () =>
      Response.json(
        {
          error: {
            code: 'AUTH_TOKEN_INVALID',
            message: 'Authentication token is invalid.',
          },
        },
        { status: 401 },
      );

    try {
      let thrownError: unknown;

      try {
        await createApiTrainingPlanGateway().getActivePlan('expired-token');
      } catch (error) {
        thrownError = error;
      }

      expect(thrownError).toBeInstanceOf(TrainingPlanGatewayError);
      expect(thrownError).toMatchObject({
        code: 'AUTH_TOKEN_INVALID',
        message: 'Authentication token is invalid.',
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
