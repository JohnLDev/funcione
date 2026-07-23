import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../../../app.js';
import {
  createInMemoryUserProfileRepository,
  type AuthVerifier,
} from '../../auth/index.js';
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
import { createInMemoryTrainingRepositories } from '../infra/in-memory-training-repositories.js';

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

const authenticatedUser = {
  email: 'athlete@funcione.app',
  id: 'user-123',
  provider: 'password' as const,
};

const authVerifier: AuthVerifier = async (authorizationHeader) => {
  if (authorizationHeader === 'Bearer valid-token') {
    return {
      authenticated: true,
      user: authenticatedUser,
    };
  }

  return {
    authenticated: false,
    code: 'AUTH_TOKEN_MISSING',
    message: 'Authentication token is required.',
    statusCode: 401,
  };
};

const { idade: _idade, userId: _userId, ...monthlyPayload } = validInput;

async function createUserProfileRepository() {
  const userProfileRepository = createInMemoryUserProfileRepository();

  await userProfileRepository.upsert(authenticatedUser.id, {
    birthDate: '1996-07-20',
    cpf: '52998224725',
    email: authenticatedUser.email,
    firstName: 'Joao',
    lastName: 'Silva',
    phoneNumber: '11999999999',
  });

  return userProfileRepository;
}

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

  it('requires authentication for monthly training routes', async () => {
    const app = await buildApp({ authVerifier });

    const [activeResponse, createResponse] = await Promise.all([
      app.inject({
        method: 'GET',
        url: '/api/training-plans/active',
      }),
      app.inject({
        method: 'POST',
        payload: monthlyPayload,
        url: '/api/training-plans/monthly',
      }),
    ]);

    assert.equal(activeResponse.statusCode, 401);
    assert.equal(createResponse.statusCode, 401);
  });

  it('authenticates monthly creation before validating the request body', async () => {
    let verificationCalls = 0;
    const app = await buildApp({
      authVerifier: async () => {
        verificationCalls += 1;

        return {
          authenticated: false,
          code: 'AUTH_TOKEN_MISSING',
          message: 'Authentication token is required.',
          statusCode: 401,
        };
      },
    });

    const response = await app.inject({
      method: 'POST',
      payload: {},
      url: '/api/training-plans/monthly',
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().error.code, 'AUTH_TOKEN_MISSING');
    assert.equal(verificationCalls, 1);
  });

  it('returns auth provider configuration failures from monthly routes', async () => {
    const providerFailureAuthVerifier: AuthVerifier = async () => ({
      authenticated: false,
      code: 'AUTH_PROVIDER_NOT_CONFIGURED',
      message: 'Authentication provider is not configured.',
      statusCode: 503,
    });
    const app = await buildApp({ authVerifier: providerFailureAuthVerifier });

    const [activeResponse, createResponse] = await Promise.all([
      app.inject({
        method: 'GET',
        url: '/api/training-plans/active',
      }),
      app.inject({
        method: 'POST',
        payload: {},
        url: '/api/training-plans/monthly',
      }),
    ]);

    assert.equal(activeResponse.statusCode, 503);
    assert.equal(activeResponse.json().error.code, 'AUTH_PROVIDER_NOT_CONFIGURED');
    assert.equal(createResponse.statusCode, 503);
    assert.equal(createResponse.json().error.code, 'AUTH_PROVIDER_NOT_CONFIGURED');
  });

  it('returns the authenticated user active monthly plan state', async () => {
    const userProfileRepository = await createUserProfileRepository();
    const app = await buildApp({
      authVerifier,
      trainingRepositories: createInMemoryTrainingRepositories(),
      userProfileRepository,
    });

    const response = await app.inject({
      headers: { authorization: 'Bearer valid-token' },
      method: 'GET',
      url: '/api/training-plans/active',
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      activePlan: null,
      athleticProfile: null,
      canGenerate: true,
      nextGenerationAvailableAt: null,
    });
  });

  it('creates a monthly plan with backend-derived user data and public fields only', async () => {
    const userProfileRepository = await createUserProfileRepository();
    let generatorInput: DadosUsuario | undefined;
    const app = await buildApp({
      authVerifier,
      trainingPlanGenerator: async (input) => {
        generatorInput = input;

        return {
          attempts: [],
          durationMs: 10,
          fallbackUsed: false,
          model: 'test-model',
          provider: 'test-provider',
          result: generatedPlan,
        };
      },
      trainingRepositories: createInMemoryTrainingRepositories(),
      userProfileRepository,
    });

    const response = await app.inject({
      headers: { authorization: 'Bearer valid-token' },
      method: 'POST',
      payload: monthlyPayload,
      url: '/api/training-plans/monthly',
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(generatorInput?.userId, authenticatedUser.id);
    assert.equal(generatorInput?.idade, 30);
    assert.equal(response.json().plan.userId, authenticatedUser.id);
    assert.equal(response.json().plan.snapshot.idade, 30);
    assert.equal(response.json().plan.metadata, undefined);
  });

  it('omits metadata from an existing active monthly plan response', async () => {
    const userProfileRepository = await createUserProfileRepository();
    const app = await buildApp({
      authVerifier,
      trainingPlanGenerator: async () => ({
        attempts: [],
        durationMs: 10,
        fallbackUsed: false,
        model: 'test-model',
        provider: 'test-provider',
        result: generatedPlan,
      }),
      trainingRepositories: createInMemoryTrainingRepositories(),
      userProfileRepository,
    });

    const creationResponse = await app.inject({
      headers: { authorization: 'Bearer valid-token' },
      method: 'POST',
      payload: monthlyPayload,
      url: '/api/training-plans/monthly',
    });
    const activeResponse = await app.inject({
      headers: { authorization: 'Bearer valid-token' },
      method: 'GET',
      url: '/api/training-plans/active',
    });

    assert.equal(creationResponse.statusCode, 200);
    assert.equal(activeResponse.statusCode, 200);
    assert.equal(activeResponse.json().activePlan.userId, authenticatedUser.id);
    assert.equal(activeResponse.json().activePlan.metadata, undefined);
  });

  it('uses request-scoped monthly storage repositories when factories are configured', async () => {
    const userProfileRepository = await createUserProfileRepository();
    const trainingRepositories = createInMemoryTrainingRepositories();
    const trainingTokens: string[] = [];
    const profileTokens: string[] = [];
    const app = await buildApp({
      authVerifier,
      trainingRepositoryFactory: (accessToken) => {
        trainingTokens.push(accessToken);

        return trainingRepositories;
      },
      userProfileRepositoryFactory: (accessToken) => {
        profileTokens.push(accessToken);

        return userProfileRepository;
      },
    });

    const response = await app.inject({
      headers: { authorization: 'Bearer valid-token' },
      method: 'GET',
      url: '/api/training-plans/active',
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(trainingTokens, ['valid-token']);
    assert.deepEqual(profileTokens, ['valid-token']);
  });

  it('returns a conflict when a monthly plan is already active', async () => {
    const userProfileRepository = await createUserProfileRepository();
    const app = await buildApp({
      authVerifier,
      trainingPlanGenerator: async () => ({
        attempts: [],
        durationMs: 10,
        fallbackUsed: false,
        model: 'test-model',
        provider: 'test-provider',
        result: generatedPlan,
      }),
      trainingRepositories: createInMemoryTrainingRepositories(),
      userProfileRepository,
    });
    const request = {
      headers: { authorization: 'Bearer valid-token' },
      method: 'POST' as const,
      payload: monthlyPayload,
      url: '/api/training-plans/monthly',
    };

    await app.inject(request);
    const response = await app.inject(request);

    assert.equal(response.statusCode, 409);
    assert.equal(response.json().error.code, 'MONTHLY_PLAN_ALREADY_ACTIVE');
  });

  it('documents monthly route security, body, success, and error contracts in OpenAPI', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/documentation/json',
    });

    assert.equal(response.statusCode, 200);
    const paths = response.json().paths;
    const activeRoute = paths['/api/training-plans/active'].get;
    const monthlyRoute = paths['/api/training-plans/monthly'].post;
    const bodySchema = monthlyRoute.requestBody.content['application/json'].schema;
    const monthlyPlanSchema = monthlyRoute.responses['200'].content['application/json'].schema
      .properties.plan;

    assert.deepEqual(activeRoute.security, [{ bearerAuth: [] }]);
    assert.deepEqual(monthlyRoute.security, [{ bearerAuth: [] }]);
    assert.equal(bodySchema.properties.userId, undefined);
    assert.equal(bodySchema.properties.idade, undefined);
    assert.equal(bodySchema.required.includes('userId'), false);
    assert.equal(bodySchema.required.includes('idade'), false);
    assert.equal(monthlyPlanSchema.properties.metadata, undefined);
    assert.ok(activeRoute.responses['401']);
    assert.ok(activeRoute.responses['503']);
    assert.ok(monthlyRoute.responses['400']);
    assert.ok(monthlyRoute.responses['401']);
    assert.ok(monthlyRoute.responses['409']);
    assert.ok(monthlyRoute.responses['503']);
  });
});
