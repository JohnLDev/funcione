import {
  EquipamentoTreino,
  GravidadeLesao,
  LocalTreino,
  ModalidadeEsportiva,
  NivelExperiencia,
  ObjetivoTreino,
  TempoDisponivel,
  TipoLesao,
} from '../domain/index.js';

function normalizedTextDescription(maxLength: number): string {
  return `Normalized server-side: must contain 1 to ${maxLength} characters after control-character removal and whitespace collapsing.`;
}

export const equipamentoUsuarioJsonSchema = {
  anyOf: [
    {
      type: 'object',
      required: ['tipo', 'descricao'],
      additionalProperties: false,
      properties: {
        tipo: { type: 'string', enum: [EquipamentoTreino.Customizado] },
        descricao: {
          type: 'string',
          description: normalizedTextDescription(80),
        },
      },
    },
    {
      type: 'object',
      required: ['tipo'],
      additionalProperties: false,
      properties: {
        tipo: {
          type: 'string',
          enum: [
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
          ],
        },
      },
    },
  ],
} as const;

const lesaoUsuarioJsonSchema = {
  oneOf: [
    {
      type: 'object',
      required: ['tipo', 'gravidade'],
      additionalProperties: false,
      properties: {
        tipo: {
          type: 'string',
          enum: [
            TipoLesao.Joelho,
            TipoLesao.Tornozelo,
            TipoLesao.Ombro,
            TipoLesao.Lombar,
            TipoLesao.Quadril,
            TipoLesao.Punho,
          ],
        },
        gravidade: { type: 'string', enum: Object.values(GravidadeLesao) },
        observacoes: {
          type: 'string',
          description: normalizedTextDescription(180),
        },
      },
    },
    {
      type: 'object',
      required: ['tipo', 'descricao', 'gravidade'],
      additionalProperties: false,
      properties: {
        tipo: { type: 'string', enum: [TipoLesao.Customizada] },
        descricao: {
          type: 'string',
          description: normalizedTextDescription(120),
        },
        gravidade: { type: 'string', enum: Object.values(GravidadeLesao) },
        observacoes: {
          type: 'string',
          description: normalizedTextDescription(180),
        },
      },
    },
  ],
} as const;

export const dadosUsuarioJsonSchema = {
  type: 'object',
  required: [
    'userId',
    'modalidade',
    'idade',
    'pesoKg',
    'alturaCm',
    'objetivos',
    'nivelExperiencia',
    'tempoDisponivel',
    'duracaoTreinoMinutos',
    'localTreino',
    'equipamentos',
    'lesoes',
  ],
  additionalProperties: false,
  properties: {
    userId: { type: 'string' },
    modalidade: { type: 'string', enum: Object.values(ModalidadeEsportiva) },
    idade: { type: 'integer', minimum: 16, maximum: 100 },
    pesoKg: { type: 'number', exclusiveMinimum: 0 },
    alturaCm: { type: 'number', exclusiveMinimum: 0 },
    objetivos: {
      type: 'array',
      minItems: 1,
      maxItems: Object.values(ObjetivoTreino).length,
      uniqueItems: true,
      items: { type: 'string', enum: Object.values(ObjetivoTreino) },
    },
    nivelExperiencia: { type: 'string', enum: Object.values(NivelExperiencia) },
    tempoDisponivel: { type: 'string', enum: Object.values(TempoDisponivel) },
    duracaoTreinoMinutos: { type: 'number', enum: [30, 45, 60, 75, 90] },
    localTreino: { type: 'string', enum: Object.values(LocalTreino) },
    equipamentos: {
      type: 'array',
      minItems: 1,
      maxItems: Object.values(EquipamentoTreino).length,
      uniqueItems: true,
      'x-uniqueBy': 'tipo',
      items: equipamentoUsuarioJsonSchema,
    },
    lesoes: {
      type: 'array',
      maxItems: Object.values(TipoLesao).length,
      uniqueItems: true,
      'x-uniqueBy': 'tipo',
      items: lesaoUsuarioJsonSchema,
    },
  },
} as const;

const { idade: _idade, userId: _userId, ...createMonthlyTrainingPlanProperties } =
  dadosUsuarioJsonSchema.properties;

export const createMonthlyTrainingPlanBodyJsonSchema = {
  type: 'object',
  required: dadosUsuarioJsonSchema.required.filter(
    (field) => field !== 'userId' && field !== 'idade',
  ),
  additionalProperties: false,
  properties: createMonthlyTrainingPlanProperties,
} as const;

const alongamentoJsonSchema = {
  type: 'object',
  required: ['nome', 'duracaoSegundos', 'motivoEscolha', 'instrucoesExecucao'],
  additionalProperties: false,
  properties: {
    nome: { type: 'string' },
    duracaoSegundos: { type: 'number' },
    motivoEscolha: { type: 'string' },
    instrucoesExecucao: { type: 'string' },
    observacoes: { type: 'string' },
  },
} as const;

const exercicioJsonSchema = {
  type: 'object',
  required: ['nome', 'series', 'repeticoes', 'motivoEscolha', 'instrucoesExecucao'],
  additionalProperties: false,
  properties: {
    nome: { type: 'string' },
    series: { type: 'number' },
    repeticoes: { type: 'string' },
    motivoEscolha: { type: 'string' },
    instrucoesExecucao: { type: 'string' },
    observacoes: { type: 'string' },
  },
} as const;

const treinoJsonSchema = {
  type: 'object',
  required: ['dia', 'foco', 'duracaoMinutos', 'alongamentos', 'exercicios'],
  additionalProperties: false,
  properties: {
    dia: { type: 'string' },
    foco: { type: 'string' },
    duracaoMinutos: { type: 'number' },
    alongamentos: {
      type: 'array',
      items: alongamentoJsonSchema,
    },
    exercicios: {
      type: 'array',
      items: exercicioJsonSchema,
    },
  },
} as const;

export const planoTreinoJsonSchema = {
  type: 'object',
  required: ['resumo', 'treinos'],
  additionalProperties: false,
  properties: {
    resumo: { type: 'string' },
    treinos: {
      type: 'array',
      minItems: 2,
      maxItems: 7,
      items: treinoJsonSchema,
    },
  },
} as const;

export const modelAttemptJsonSchema = {
  type: 'object',
  required: ['provider', 'model', 'role', 'status', 'durationMs'],
  additionalProperties: false,
  properties: {
    provider: { type: 'string' },
    model: { type: 'string' },
    role: { type: 'string', enum: ['primary', 'fallback'] },
    status: { type: 'string', enum: ['success', 'error'] },
    durationMs: { type: 'number' },
    error: { type: 'string' },
  },
} as const;

export const generateTrainingPlanSuccessJsonSchema = {
  type: 'object',
  required: ['provider', 'model', 'fallbackUsed', 'attempts', 'durationMs', 'result'],
  additionalProperties: false,
  properties: {
    provider: { type: 'string' },
    model: { type: 'string' },
    fallbackUsed: { type: 'boolean' },
    attempts: {
      type: 'array',
      items: modelAttemptJsonSchema,
    },
    durationMs: { type: 'number' },
    result: planoTreinoJsonSchema,
  },
} as const;

export const monthlyTrainingPlanPublicJsonSchema = {
  type: 'object',
  required: [
    'availableForRegenerationAt',
    'generatedAt',
    'id',
    'result',
    'snapshot',
    'status',
    'userId',
  ],
  additionalProperties: false,
  properties: {
    availableForRegenerationAt: { type: 'string', format: 'date-time' },
    generatedAt: { type: 'string', format: 'date-time' },
    id: { type: 'string' },
    result: planoTreinoJsonSchema,
    snapshot: dadosUsuarioJsonSchema,
    status: { type: 'string', enum: ['active', 'expired'] },
    userId: { type: 'string' },
  },
} as const;

export const athleticProfilePublicJsonSchema = {
  type: 'object',
  required: [
    'alturaCm',
    'createdAt',
    'equipamentosDisponiveis',
    'lesoesRecorrentes',
    'localTreinoComum',
    'modalidadePreferida',
    'nivelExperiencia',
    'pesoKg',
    'updatedAt',
    'userId',
  ],
  additionalProperties: false,
  properties: {
    alturaCm: { type: 'number' },
    createdAt: { type: 'string', format: 'date-time' },
    equipamentosDisponiveis: {
      type: 'array',
      items: equipamentoUsuarioJsonSchema,
    },
    lesoesRecorrentes: {
      type: 'array',
      items: lesaoUsuarioJsonSchema,
    },
    localTreinoComum: { type: 'string', enum: Object.values(LocalTreino) },
    modalidadePreferida: {
      type: 'string',
      enum: Object.values(ModalidadeEsportiva),
    },
    nivelExperiencia: {
      type: 'string',
      enum: Object.values(NivelExperiencia),
    },
    pesoKg: { type: 'number' },
    updatedAt: { type: 'string', format: 'date-time' },
    userId: { type: 'string' },
  },
} as const;

export const activeMonthlyTrainingPlanResponseJsonSchema = {
  type: 'object',
  required: [
    'activePlan',
    'athleticProfile',
    'canGenerate',
    'nextGenerationAvailableAt',
  ],
  additionalProperties: false,
  properties: {
    activePlan: {
      anyOf: [monthlyTrainingPlanPublicJsonSchema, { type: 'null' }],
    },
    athleticProfile: {
      anyOf: [athleticProfilePublicJsonSchema, { type: 'null' }],
    },
    canGenerate: { type: 'boolean' },
    nextGenerationAvailableAt: {
      anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }],
    },
  },
} as const;

export const createMonthlyTrainingPlanResponseJsonSchema = {
  type: 'object',
  required: ['plan'],
  additionalProperties: false,
  properties: {
    plan: monthlyTrainingPlanPublicJsonSchema,
  },
} as const;
