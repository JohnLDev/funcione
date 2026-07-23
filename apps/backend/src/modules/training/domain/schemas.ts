import * as z from 'zod';
import {
  EquipamentoTreino,
  GravidadeLesao,
  LocalTreino,
  ModalidadeEsportiva,
  NivelExperiencia,
  ObjetivoTreino,
  TempoDisponivel,
  TipoLesao,
} from './enums.js';
import { createBoundedPromptTextSchema } from './prompt-text.js';

const LesaoCustomizadaDescricaoSchema = createBoundedPromptTextSchema(120);
const LesaoObservacaoSchema = createBoundedPromptTextSchema(180).optional();
const EquipamentoCustomizadoDescricaoSchema = createBoundedPromptTextSchema(80);

export const LesaoUsuarioSchema = z.discriminatedUnion('tipo', [
  z.object({
    tipo: z.enum([
      TipoLesao.Joelho,
      TipoLesao.Tornozelo,
      TipoLesao.Ombro,
      TipoLesao.Lombar,
      TipoLesao.Quadril,
      TipoLesao.Punho,
    ]),
    gravidade: z.enum(GravidadeLesao).optional(),
    observacoes: LesaoObservacaoSchema,
  }),
  z.object({
    tipo: z.literal(TipoLesao.Customizada),
    descricao: LesaoCustomizadaDescricaoSchema,
    gravidade: z.enum(GravidadeLesao).optional(),
    observacoes: LesaoObservacaoSchema,
  }),
]);

export const EquipamentoUsuarioSchema = z.discriminatedUnion('tipo', [
  z.object({
    tipo: z.enum([
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
    ]),
  }),
  z.object({
    tipo: z.literal(EquipamentoTreino.Customizado),
    descricao: EquipamentoCustomizadoDescricaoSchema,
  }),
]);

export const DadosUsuarioSchema = z.object({
  userId: z.string(),
  modalidade: z.enum(ModalidadeEsportiva),
  idade: z.number().int().min(16).max(100),
  pesoKg: z.number().positive(),
  alturaCm: z.number().positive(),
  objetivos: z.array(z.enum(ObjetivoTreino)).min(1),
  nivelExperiencia: z.enum(NivelExperiencia),
  tempoDisponivel: z.enum(TempoDisponivel),
  duracaoTreinoMinutos: z.number(),
  localTreino: z.enum(LocalTreino),
  equipamentos: z.array(EquipamentoUsuarioSchema).min(1).superRefine((equipamentos, ctx) => {
    const hasNenhum = equipamentos.some(
      (equipamento) => equipamento.tipo === EquipamentoTreino.Nenhum,
    );

    if (hasNenhum && equipamentos.length > 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'Equipment "nenhum" cannot be combined with other equipment.',
      });
    }
  }),
  lesoes: z.array(LesaoUsuarioSchema),
});

export const CreateMonthlyTrainingPlanRequestSchema = DadosUsuarioSchema.omit({
  idade: true,
  userId: true,
});

export const AlongamentoSchema = z.object({
  nome: z
    .string()
    .describe('Nome claro e reconhecível do alongamento ou mobilidade preparatória'),
  duracaoSegundos: z.number(),
  motivoEscolha: z
    .string()
    .describe(
      'Explique por que este alongamento foi escolhido considerando modalidade, objetivo, nível, local de treino e restrições do usuário',
    ),
  instrucoesExecucao: z
    .string()
    .describe(
      'Explique como executar em 2-4 frases, incluindo posição inicial, movimento principal, controle/postura, respiração ou ritmo, e pelo menos um erro comum a evitar.',
    ),
  observacoes: z.string().optional(),
});

export const ExercicioSchema = z.object({
  nome: z
    .string()
    .describe('Nome claro e reconhecível do exercício, evitando nomes vagos ou inventados'),
  series: z.number(),
  repeticoes: z.string().describe('Ex: "4x8" ou "3x30s"'),
  motivoEscolha: z
    .string()
    .describe(
      'Explique por que este exercício foi escolhido considerando modalidade, objetivo, nível, local de treino e restrições do usuário',
    ),
  instrucoesExecucao: z
    .string()
    .describe(
      'Explique como executar em 2-4 frases, incluindo posição inicial, movimento principal, controle/postura, respiração ou ritmo, e pelo menos um erro comum a evitar.',
    ),
  observacoes: z.string().optional(),
});

export const TreinoSchema = z.object({
  dia: z.string().describe('Ex: Segunda-feira'),
  foco: z.string().describe('Ex: potência de salto'),
  duracaoMinutos: z.number(),
  alongamentos: z
    .array(AlongamentoSchema)
    .describe('Alongamentos e mobilidade separados da parte principal do treino'),
  exercicios: z
    .array(ExercicioSchema)
    .describe('Exercícios principais de performance, força, potência, agilidade ou prevenção'),
});

export const PlanoTreinoSchema = z.object({
  resumo: z.string().describe('Visão geral do plano em 1-2 frases'),
  treinos: z
    .array(TreinoSchema)
    .min(2)
    .max(7)
    .describe('Entre 2 e 7 treinos semanais, conforme o tempo disponível informado'),
});

export type LesaoUsuario = z.infer<typeof LesaoUsuarioSchema>;
export type EquipamentoUsuario = z.infer<typeof EquipamentoUsuarioSchema>;
export type CreateMonthlyTrainingPlanRequest = z.infer<
  typeof CreateMonthlyTrainingPlanRequestSchema
>;
export type DadosUsuario = z.infer<typeof DadosUsuarioSchema>;
export type AlongamentoDTO = z.infer<typeof AlongamentoSchema>;
export type ExercicioDTO = z.infer<typeof ExercicioSchema>;
export type TreinoDTO = z.infer<typeof TreinoSchema>;
export type PlanoTreino = z.infer<typeof PlanoTreinoSchema>;

export type TreinoAnterior = {
  userId: string;
  feedback: string;
  resumoTreinoAnterior: string;
};
