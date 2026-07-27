import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateTrainingPlan,
  type GenerateTrainingPlanResult,
} from './generate-training-plan.js';
import type { InstructorModelConfig } from '../infra/instructor.js';
import type { DadosUsuario, PlanoTreino } from '../domain/index.js';
import {
  EquipamentoTreino,
  LocalTreino,
  ModalidadeEsportiva,
  NivelExperiencia,
  ObjetivoTreino,
  TempoDisponivel,
} from '../domain/enums.js';

const input: DadosUsuario = {
  alturaCm: 180,
  duracaoTreinoMinutos: 60,
  equipamentos: [{ tipo: EquipamentoTreino.Nenhum }],
  idade: 30,
  lesoes: [],
  localTreino: LocalTreino.Casa,
  modalidade: ModalidadeEsportiva.Volei,
  nivelExperiencia: NivelExperiencia.Intermediario,
  objetivos: [ObjetivoTreino.Performance],
  pesoKg: 82,
  tempoDisponivel: TempoDisponivel.TresVezesPorSemana,
  userId: 'user-123',
};

const generatedPlan: PlanoTreino = {
  resumo: 'Plano teste.',
  treinos: [
    {
      alongamentos: [],
      dia: 'Segunda-feira',
      duracaoMinutos: 60,
      exercicios: [],
      foco: 'potencia',
    },
    {
      alongamentos: [],
      dia: 'Quarta-feira',
      duracaoMinutos: 60,
      exercicios: [],
      foco: 'agilidade',
    },
  ],
};

function modelCandidate(provider: string): InstructorModelConfig {
  return {
    model: {} as InstructorModelConfig['model'],
    modelName: `${provider}-model`,
    provider,
  };
}

describe('generateTrainingPlan', () => {
  it('reports total duration across failed primary and successful fallback attempts', async () => {
    let elapsedMs = 0;
    const result = await generateTrainingPlan(input, {
      createAgent: (modelConfig) => ({
        createTrainingPlan: async () => {
          if (modelConfig.provider === 'primary') {
            elapsedMs += 7;
            throw new Error('primary unavailable');
          }

          elapsedMs += 13;

          return generatedPlan;
        },
      }),
      modelCandidates: [modelCandidate('primary'), modelCandidate('fallback')],
      now: () => elapsedMs,
    });

    assert.equal('result' in result, true);
    assert.equal(
      (result as Extract<GenerateTrainingPlanResult, { result: PlanoTreino }>)
        .durationMs,
      20,
    );
    assert.equal(result.attempts[0]?.durationMs, 7);
    assert.equal(result.attempts[1]?.durationMs, 13);
  });

  it('times out a stalled primary model attempt and uses the fallback', async () => {
    const calls: string[] = [];
    const events: string[] = [];
    const result = await generateTrainingPlan(input, {
      createAgent: (modelConfig) => ({
        createTrainingPlan: async () => {
          calls.push(modelConfig.provider);

          if (modelConfig.provider === 'primary') {
            await new Promise(() => undefined);
          }

          return generatedPlan;
        },
      }),
      modelCandidates: [modelCandidate('primary'), modelCandidate('fallback')],
      modelTimeoutMs: 1,
      onModelEvent: (event) => events.push(event),
    });

    assert.equal(result.fallbackUsed, true);
    assert.deepEqual(calls, ['primary', 'fallback']);
    assert.deepEqual(events, [
      'model_attempt_started',
      'model_attempt_failed',
      'model_attempt_started',
      'model_attempt_succeeded',
    ]);
    assert.equal('result' in result, true);
    assert.equal(
      (result as Extract<GenerateTrainingPlanResult, { result: PlanoTreino }>)
        .result,
      generatedPlan,
    );
    assert.equal(result.attempts[0]?.status, 'error');
    assert.match(result.attempts[0]?.error ?? '', /timed out/i);
    assert.equal(result.attempts[1]?.status, 'success');
  });

  it('returns a provider-level failure summary when every model attempt fails', async () => {
    const result = await generateTrainingPlan(input, {
      createAgent: (modelConfig) => ({
        createTrainingPlan: async () => {
          throw new Error(`${modelConfig.provider} unavailable`);
        },
      }),
      modelCandidates: [modelCandidate('primary'), modelCandidate('fallback')],
    });

    assert.equal('result' in result, false);
    assert.match(
      (result as Extract<GenerateTrainingPlanResult, { error: string }>).error,
      /primary\/primary-model: primary unavailable/,
    );
    assert.match(
      (result as Extract<GenerateTrainingPlanResult, { error: string }>).error,
      /fallback\/fallback-model: fallback unavailable/,
    );
  });
});
