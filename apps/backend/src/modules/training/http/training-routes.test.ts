import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../../app.js';
import {
  createInMemoryUserProfileRepository,
  type AuthVerifier,
} from '../../auth/index.js';
import {
  EquipamentoTreino,
  GravidadeLesao,
  LocalTreino,
  ModalidadeEsportiva,
  NivelExperiencia,
  ObjetivoTreino,
  TempoDisponivel,
  TipoLesao,
  type DadosUsuario,
  type PlanoTreino,
} from '../domain/index.js';
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

async function waitForGenerationStatus(
  app: FastifyInstance,
  generationId: string,
  expectedStatus: string,
) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await app.inject({
      headers: { authorization: 'Bearer valid-token' },
      method: 'GET',
      url: `/api/training-plans/generations/${generationId}`,
    });

    assert.equal(response.statusCode, 200);
    const payload = response.json();

    if (payload.generation.status === expectedStatus) {
      return payload;
    }

    await delay(5);
  }

  throw new Error(`Generation ${generationId} did not reach ${expectedStatus}.`);
}

describe('training routes', () => {
  it('does not expose the legacy unauthenticated generation endpoint', async () => {
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
      payload: validInput,
      url: '/api/training-plans',
    });

    assert.equal(response.statusCode, 404);
    assert.equal(generatorCalled, false);
  });

  it('rejects unsupported, duplicate, unbounded, or incomplete monthly inputs', async () => {
    const userProfileRepository = await createUserProfileRepository();
    let generatorCalled = false;
    const app = await buildApp({
      authVerifier,
      trainingPlanGenerator: async () => {
        generatorCalled = true;

        return {
          fallbackUsed: false,
          attempts: [],
          error: 'not called',
        };
      },
      trainingRepositories: createInMemoryTrainingRepositories(),
      userProfileRepository,
    });
    const invalidPayloads = [
      { ...monthlyPayload, duracaoTreinoMinutos: 50 },
      {
        ...monthlyPayload,
        lesoes: [{ tipo: TipoLesao.Joelho }],
      },
      {
        ...monthlyPayload,
        objetivos: [ObjetivoTreino.Performance, ObjetivoTreino.Performance],
      },
      {
        ...monthlyPayload,
        equipamentos: [
          { tipo: EquipamentoTreino.Halteres },
          { tipo: EquipamentoTreino.Halteres },
        ],
      },
      {
        ...monthlyPayload,
        lesoes: [
          { gravidade: GravidadeLesao.Leve, tipo: TipoLesao.Joelho },
          { gravidade: GravidadeLesao.Alta, tipo: TipoLesao.Joelho },
        ],
      },
      {
        ...monthlyPayload,
        objetivos: Array.from(
          { length: Object.values(ObjetivoTreino).length + 1 },
          () => ObjetivoTreino.Performance,
        ),
      },
    ];

    for (const payload of invalidPayloads) {
      const response = await app.inject({
        headers: { authorization: 'Bearer valid-token' },
        method: 'POST',
        payload,
        url: '/api/training-plans/monthly',
      });

      assert.equal(response.statusCode, 400);
    }
    assert.equal(generatorCalled, false);
  });

  it('accepts custom equipment text that normalizes to 80 characters', async () => {
    const userProfileRepository = await createUserProfileRepository();
    let receivedInput: DadosUsuario | undefined;
    const normalizedDescription = 'a'.repeat(80);
    const app = await buildApp({
      authVerifier,
      trainingPlanGenerator: async (input) => {
        receivedInput = input;

        return {
          fallbackUsed: false,
          attempts: [],
          error: 'not called',
        };
      },
      trainingRepositories: createInMemoryTrainingRepositories(),
      userProfileRepository,
    });

    const response = await app.inject({
      headers: { authorization: 'Bearer valid-token' },
      method: 'POST',
      payload: {
        ...monthlyPayload,
        equipamentos: [
          {
            tipo: EquipamentoTreino.Customizado,
            descricao: `  ${normalizedDescription}  `,
          },
        ],
      },
      url: '/api/training-plans/monthly',
    });

    assert.equal(response.statusCode, 202);
    await waitForGenerationStatus(
      app,
      response.json().generation.id,
      'failed',
    );
    assert.ok(receivedInput);
    const equipamento = receivedInput.equipamentos[0];
    assert.ok(equipamento);
    assert.equal(equipamento.tipo, EquipamentoTreino.Customizado);
    if (equipamento.tipo === EquipamentoTreino.Customizado) {
      assert.equal(equipamento.descricao, normalizedDescription);
    }
  });

  it('omits the legacy generation endpoint from OpenAPI', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/documentation/json',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().openapi, '3.0.3');
    assert.equal(response.json().paths['/api/training-plans'], undefined);
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

  it('rejects monthly generation when durable worker storage is required but missing', async () => {
    const userProfileRepository = await createUserProfileRepository();
    let generatorCalled = false;
    const app = await buildApp({
      authVerifier,
      requiresTrainingWorkerRepositories: true,
      trainingPlanGenerator: async () => {
        generatorCalled = true;

        return {
          attempts: [],
          fallbackUsed: false,
          error: 'not called',
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

    assert.equal(response.statusCode, 503);
    assert.equal(
      response.json().error.code,
      'TRAINING_PLAN_WORKER_NOT_CONFIGURED',
    );
    assert.equal(generatorCalled, false);
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
      pendingGeneration: null,
    });
  });

  it('accepts monthly generation asynchronously and later exposes the completed public plan', async () => {
    const userProfileRepository = await createUserProfileRepository();
    let generatorInput: DadosUsuario | undefined;
    let releaseGeneration: (() => void) | undefined;
    const generationBlocked = new Promise<void>((resolve) => {
      releaseGeneration = resolve;
    });
    const app = await buildApp({
      authVerifier,
      trainingPlanGenerator: async (input) => {
        generatorInput = input;
        await generationBlocked;

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

    assert.equal(response.statusCode, 202);
    assert.equal(response.json().generation.status, 'queued');
    assert.equal(generatorInput, undefined);

    const pendingResponse = await app.inject({
      headers: { authorization: 'Bearer valid-token' },
      method: 'GET',
      url: `/api/training-plans/generations/${response.json().generation.id}`,
    });

    assert.equal(pendingResponse.statusCode, 200);
    assert.match(pendingResponse.json().generation.status, /^(queued|running)$/);

    releaseGeneration?.();
    const completedPayload = await waitForGenerationStatus(
      app,
      response.json().generation.id,
      'completed',
    );

    const capturedGeneratorInput = generatorInput as unknown as DadosUsuario;
    assert.deepEqual(capturedGeneratorInput.userId, authenticatedUser.id);
    assert.equal(capturedGeneratorInput.idade, 30);
    assert.equal(completedPayload.plan.userId, authenticatedUser.id);
    assert.equal(completedPayload.plan.snapshot.idade, 30);
    assert.equal(completedPayload.plan.metadata, undefined);
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
    await waitForGenerationStatus(
      app,
      creationResponse.json().generation.id,
      'completed',
    );
    const activeResponse = await app.inject({
      headers: { authorization: 'Bearer valid-token' },
      method: 'GET',
      url: '/api/training-plans/active',
    });

    assert.equal(creationResponse.statusCode, 202);
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

  it('returns the global 500 contract when monthly repositories fail', async () => {
    const userProfileRepository = await createUserProfileRepository();
    const trainingRepositories = createInMemoryTrainingRepositories();
    trainingRepositories.monthlyTrainingPlanRepository
      .findActiveGenerationStateByUserId = async () => {
        throw new Error('repository unavailable');
      };
    const app = await buildApp({
      authVerifier,
      trainingRepositories,
      userProfileRepository,
    });

    const [activeResponse, createResponse] = await Promise.all([
      app.inject({
        headers: { authorization: 'Bearer valid-token' },
        method: 'GET',
        url: '/api/training-plans/active',
      }),
      app.inject({
        headers: { authorization: 'Bearer valid-token' },
        method: 'POST',
        payload: monthlyPayload,
        url: '/api/training-plans/monthly',
      }),
    ]);

    for (const response of [activeResponse, createResponse]) {
      assert.equal(response.statusCode, 500);
      assert.equal(response.json().error.code, 'INTERNAL_SERVER_ERROR');
    }
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
    const generationRoute = paths['/api/training-plans/generations/{generationId}'].get;
    const monthlyRoute = paths['/api/training-plans/monthly'].post;
    const bodySchema = monthlyRoute.requestBody.content['application/json'].schema;
    const generationSchema = monthlyRoute.responses['202'].content['application/json'].schema
      .properties.generation;
    const monthlyPlanSchema = generationRoute.responses['200'].content['application/json'].schema
      .properties.plan.anyOf[0];

    assert.deepEqual(activeRoute.security, [{ bearerAuth: [] }]);
    assert.deepEqual(generationRoute.security, [{ bearerAuth: [] }]);
    assert.deepEqual(monthlyRoute.security, [{ bearerAuth: [] }]);
    assert.equal(bodySchema.properties.userId, undefined);
    assert.equal(bodySchema.properties.idade, undefined);
    assert.equal(bodySchema.required.includes('userId'), false);
    assert.equal(bodySchema.required.includes('idade'), false);
    assert.deepEqual(bodySchema.properties.duracaoTreinoMinutos.enum, [
      30,
      45,
      60,
      75,
      90,
    ]);
    assert.equal(
      bodySchema.properties.objetivos.maxItems,
      Object.values(ObjetivoTreino).length,
    );
    assert.equal(bodySchema.properties.objetivos.uniqueItems, true);
    assert.equal(
      bodySchema.properties.equipamentos.maxItems,
      Object.values(EquipamentoTreino).length,
    );
    assert.equal(bodySchema.properties.equipamentos.uniqueItems, true);
    assert.equal(bodySchema.properties.equipamentos['x-uniqueBy'], 'tipo');
    assert.equal(
      bodySchema.properties.equipamentos.items.anyOf[0].properties.descricao.minLength,
      1,
    );
    assert.equal(
      bodySchema.properties.equipamentos.items.anyOf[0].properties.descricao.maxLength,
      80,
    );
    assert.equal(
      bodySchema.properties.lesoes.maxItems,
      Object.values(TipoLesao).length,
    );
    assert.equal(bodySchema.properties.lesoes.uniqueItems, true);
    assert.equal(bodySchema.properties.lesoes['x-uniqueBy'], 'tipo');
    assert.ok(
      bodySchema.properties.lesoes.items.oneOf[0].required.includes('gravidade'),
    );
    assert.ok(
      bodySchema.properties.lesoes.items.oneOf[1].required.includes('gravidade'),
    );
    assert.equal(
      bodySchema.properties.lesoes.items.oneOf[0].properties.observacoes.minLength,
      1,
    );
    assert.equal(
      bodySchema.properties.lesoes.items.oneOf[0].properties.observacoes.maxLength,
      180,
    );
    assert.equal(
      bodySchema.properties.lesoes.items.oneOf[1].properties.descricao.minLength,
      1,
    );
    assert.equal(
      bodySchema.properties.lesoes.items.oneOf[1].properties.descricao.maxLength,
      120,
    );
    assert.equal(
      bodySchema.properties.lesoes.items.oneOf[1].properties.observacoes.minLength,
      1,
    );
    assert.equal(
      bodySchema.properties.lesoes.items.oneOf[1].properties.observacoes.maxLength,
      180,
    );
    assert.deepEqual(generationSchema.properties.status.enum, [
      'queued',
      'running',
      'completed',
      'failed',
    ]);
    assert.equal(monthlyPlanSchema.properties.metadata, undefined);
    assert.ok(activeRoute.responses['401']);
    assert.ok(activeRoute.responses['500']);
    assert.ok(activeRoute.responses['503']);
    assert.ok(generationRoute.responses['401']);
    assert.ok(generationRoute.responses['404']);
    assert.ok(generationRoute.responses['500']);
    assert.ok(monthlyRoute.responses['400']);
    assert.ok(monthlyRoute.responses['401']);
    assert.ok(monthlyRoute.responses['409']);
    assert.ok(monthlyRoute.responses['500']);
    assert.ok(monthlyRoute.responses['503']);
  });
});
