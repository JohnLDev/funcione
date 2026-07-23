import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../../../app.js';
import {
  EquipamentoTreino,
  LocalTreino,
  ModalidadeEsportiva,
  NivelExperiencia,
  ObjetivoTreino,
  TempoDisponivel,
  type DadosUsuario,
  type PlanoTreino,
} from '../domain/index.js';
import type { GenerateTrainingPlanResult } from '../application/generate-training-plan.js';

const validInput: DadosUsuario = {
  userId: 'user-2',
  modalidade: ModalidadeEsportiva.Volei,
  idade: 25,
  pesoKg: 80,
  alturaCm: 169,
  objetivos: [ObjetivoTreino.Performance],
  nivelExperiencia: NivelExperiencia.Intermediario,
  tempoDisponivel: TempoDisponivel.TresVezesPorSemana,
  duracaoTreinoMinutos: 90,
  localTreino: LocalTreino.Academia,
  equipamentos: [{ tipo: EquipamentoTreino.Halteres }],
  lesoes: [],
};

const generatedPlan: PlanoTreino = {
  resumo: 'Plano de teste para performance no volei.',
  treinos: [
    {
      dia: 'Segunda-feira',
      foco: 'potencia de salto',
      duracaoMinutos: 90,
      alongamentos: [
        {
          nome: 'Mobilidade de tornozelo na parede',
          duracaoSegundos: 45,
          motivoEscolha: 'Prepara tornozelos para aterrissagens.',
          instrucoesExecucao:
            'Comece de frente para a parede e avance o joelho sem tirar o calcanhar do chao.',
        },
      ],
      exercicios: [
        {
          nome: 'Agachamento com salto',
          series: 4,
          repeticoes: '4x6',
          motivoEscolha: 'Desenvolve potencia especifica para saltos.',
          instrucoesExecucao:
            'Inicie em base atletica, agache ate controlar o quadril e salte com aterrissagem suave.',
        },
      ],
    },
    {
      dia: 'Quarta-feira',
      foco: 'agilidade lateral',
      duracaoMinutos: 90,
      alongamentos: [
        {
          nome: 'Mobilidade de quadril em avanco',
          duracaoSegundos: 45,
          motivoEscolha: 'Prepara quadris para deslocamentos laterais.',
          instrucoesExecucao:
            'Mantenha o tronco alto e avance o quadril sem arquear a lombar.',
        },
      ],
      exercicios: [
        {
          nome: 'Deslocamento lateral',
          series: 4,
          repeticoes: '4x20s',
          motivoEscolha: 'Treina mudancas de direcao para o volei.',
          instrucoesExecucao:
            'Mantenha base baixa, passos curtos e evite cruzar os pes durante o deslocamento.',
        },
      ],
    },
  ],
};

describe('training routes', () => {
  it('rejects invalid training plan payloads', async () => {
    const app = await buildApp({
      trainingPlanGenerator: async () => ({
        fallbackUsed: false,
        attempts: [],
        error: 'not called',
      }),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/training-plans',
      payload: { userId: 'missing-required-fields' },
    });

    assert.equal(response.statusCode, 400);
    assert.match(response.json().error.message, /body/i);
  });

  it('rejects training payloads without equipment information', async () => {
    const app = await buildApp({
      trainingPlanGenerator: async () => ({
        fallbackUsed: false,
        attempts: [],
        error: 'not called',
      }),
    });
    const { equipamentos, ...payload } = validInput;

    const response = await app.inject({
      method: 'POST',
      payload,
      url: '/api/training-plans',
    });

    assert.equal(response.statusCode, 400);
    assert.match(JSON.stringify(response.json()), /equipamentos/);
  });

  it('rejects unexpected fields on predefined equipment without calling the generator', async () => {
    let generatorCalled = false;
    const app = await buildApp({
      trainingPlanGenerator: async () => {
        generatorCalled = true;

        return {
          fallbackUsed: false,
          attempts: [],
          error: 'not called',
        };
      },
    });

    const response = await app.inject({
      method: 'POST',
      payload: {
        ...validInput,
        equipamentos: [
          {
            tipo: EquipamentoTreino.Halteres,
            descricao: 'campo inesperado',
          },
        ],
      },
      url: '/api/training-plans',
    });

    assert.equal(response.statusCode, 400);
    assert.equal(generatorCalled, false);
    assert.match(response.json().error.message, /additional properties/i);
  });

  it('accepts custom equipment text that normalizes to 80 characters', async () => {
    let receivedInput: DadosUsuario | undefined;
    const normalizedDescription = 'a'.repeat(80);
    const app = await buildApp({
      trainingPlanGenerator: async (input) => {
        receivedInput = input;

        return {
          fallbackUsed: false,
          attempts: [],
          error: 'not called',
        };
      },
    });

    const response = await app.inject({
      method: 'POST',
      payload: {
        ...validInput,
        equipamentos: [
          {
            tipo: EquipamentoTreino.Customizado,
            descricao: `  ${normalizedDescription}  `,
          },
        ],
      },
      url: '/api/training-plans',
    });

    assert.equal(response.statusCode, 503);
    assert.ok(receivedInput);
    const equipamento = receivedInput.equipamentos[0];
    assert.ok(equipamento);
    assert.equal(equipamento.tipo, EquipamentoTreino.Customizado);
    if (equipamento.tipo === EquipamentoTreino.Customizado) {
      assert.equal(equipamento.descricao, normalizedDescription);
    }
  });

  it('creates a training plan with execution metadata', async () => {
    const successfulResult: GenerateTrainingPlanResult = {
      provider: 'test',
      model: 'deterministic',
      fallbackUsed: false,
      durationMs: 12,
      attempts: [
        {
          provider: 'test',
          model: 'deterministic',
          role: 'primary',
          status: 'success',
          durationMs: 12,
        },
      ],
      result: generatedPlan,
    };
    const app = await buildApp({
      trainingPlanGenerator: async () => successfulResult,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/training-plans',
      payload: validInput,
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), successfulResult);
  });

  it('returns service unavailable when every provider fails', async () => {
    const app = await buildApp({
      trainingPlanGenerator: async () => ({
        fallbackUsed: true,
        attempts: [
          {
            provider: 'nvidia',
            model: 'model-a',
            role: 'primary',
            status: 'error',
            durationMs: 1,
            error: 'missing key',
          },
          {
            provider: 'openrouter',
            model: 'model-b',
            role: 'fallback',
            status: 'error',
            durationMs: 1,
            error: 'missing key',
          },
        ],
        error: 'Todos os providers configurados falharam.',
      }),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/training-plans',
      payload: validInput,
    });

    assert.equal(response.statusCode, 503);
    assert.equal(
      response.json().error.message,
      'Todos os providers configurados falharam.',
    );
  });

  it('documents the training plan route in OpenAPI', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/documentation/json',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().openapi, '3.0.3');
    const schema = response.json().paths['/api/training-plans'].post.requestBody.content[
      'application/json'
    ].schema;

    assert.ok(schema.required.includes('equipamentos'));
    assert.equal(schema.properties.equipamentos.minItems, 1);
    assert.deepEqual(schema.properties.equipamentos.items.anyOf[1].properties.tipo.enum, [
      EquipamentoTreino.Nenhum,
      EquipamentoTreino.Halteres,
      EquipamentoTreino.BarraAnilhas,
      EquipamentoTreino.Elasticos,
      EquipamentoTreino.BancoCaixa,
      EquipamentoTreino.Colchonete,
      EquipamentoTreino.Cones,
      EquipamentoTreino.Corda,
      EquipamentoTreino.MaquinasAcademia,
      EquipamentoTreino.Bola,
    ]);
    assert.deepEqual(schema.properties.equipamentos.items.anyOf[0], {
      type: 'object',
      required: ['tipo', 'descricao'],
      additionalProperties: false,
      properties: {
        tipo: { type: 'string', enum: [EquipamentoTreino.Customizado] },
        descricao: {
          type: 'string',
          description:
            'Normalized server-side: must contain 1 to 80 characters after control-character removal and whitespace collapsing.',
        },
      },
    });
    assert.equal(
      schema.properties.lesoes.items.oneOf[0].properties.observacoes.description,
      'Normalized server-side: must contain 1 to 180 characters after control-character removal and whitespace collapsing.',
    );
    assert.equal(
      schema.properties.lesoes.items.oneOf[1].properties.descricao.description,
      'Normalized server-side: must contain 1 to 120 characters after control-character removal and whitespace collapsing.',
    );
    assert.equal(
      schema.properties.lesoes.items.oneOf[1].properties.observacoes.description,
      'Normalized server-side: must contain 1 to 180 characters after control-character removal and whitespace collapsing.',
    );
  });
});
