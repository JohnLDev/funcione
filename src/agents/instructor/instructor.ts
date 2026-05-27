import { ChatOpenAI } from '@langchain/openai';
import { SystemMessage } from '@langchain/core/messages';
import { writeFile } from 'node:fs/promises';
import * as z from 'zod';
import { createAgent, HumanMessage, tool, toolStrategy } from 'langchain';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { Agent } from '../../agent.js';

export enum NivelExperiencia {
  Iniciante = 'iniciante',
  Intermediario = 'intermediario',
  Avancado = 'avancado',
}

export enum TempoDisponivel {
  DuasVezesPorSemana = '2x_semana',
  TresVezesPorSemana = '3x_semana',
  QuatroVezesPorSemana = '4x_semana',
  CincoVezesPorSemana = '5x_semana',
  SeisVezesPorSemana = '6x_semana',
  SeteVezesPorSemana = '7x_semana',
}

export enum ModalidadeEsportiva {
  Volei = 'volei',
  Basquete = 'basquete',
  FutebolFutsal = 'futebol_futsal',
  BeachTenis = 'beach_tenis',
}

export enum LocalTreino {
  Academia = 'academia',
  Casa = 'casa',
  ArLivre = 'ar_livre',
}

export enum TipoLesao {
  Joelho = 'joelho',
  Tornozelo = 'tornozelo',
  Ombro = 'ombro',
  Lombar = 'lombar',
  Quadril = 'quadril',
  Punho = 'punho',
  Customizada = 'customizada',
}

export enum GravidadeLesao {
  Leve = 'leve',
  Moderada = 'moderada',
  Alta = 'alta',
}

export type LesaoUsuario =
  | {
      tipo: Exclude<TipoLesao, TipoLesao.Customizada>;
      gravidade?: GravidadeLesao;
      observacoes?: string;
    }
  | {
      tipo: TipoLesao.Customizada;
      descricao: string;
      gravidade?: GravidadeLesao;
      observacoes?: string;
    };

export type DadosUsuario = {
  userId: string;
  modalidade: ModalidadeEsportiva;
  idade: string;
  peso: string;
  altura: string;
  objetivo: string;
  nivelExperiencia: NivelExperiencia;
  tempoDisponivel: TempoDisponivel;
  duracaoTreinoMinutos: number;
  localTreino: LocalTreino;
  lesoes: LesaoUsuario[];
};

export type InstructorModelConfig = {
  provider: string;
  modelName: string;
  model: BaseChatModel;
};

export type TreinoAnterior = {
  userId: string;
  feedback: string;
  resumoTreinoAnterior: string;
};

const historicoTreinos: TreinoAnterior[] = [
  {
    userId: 'user-1',
    feedback:
      'O treino anterior teve muitos saltos e deixou fadiga no joelho. Prefiro manter foco em potência, mas com menor impacto e mais prevenção.',
    resumoTreinoAnterior:
      'Plano de vôlei com 3 treinos semanais focado em salto, pliometria, agilidade lateral, core e força de membros superiores.',
  },
  {
    userId: 'user-2',
    feedback:
      'Treino ficou muito fácil e faltou trabalho de agilidade com mudança de direção.',
    resumoTreinoAnterior:
      'Plano de basquete com 3 treinos semanais, exercícios básicos de força geral e core.',
  },
];

export function buscarTreinoAnterior(userId: string): TreinoAnterior | undefined {
  return historicoTreinos.find((treino) => treino.userId === userId);
}

const nivelExperienciaLabel: Record<NivelExperiencia, string> = {
  [NivelExperiencia.Iniciante]: 'Iniciante',
  [NivelExperiencia.Intermediario]: 'Intermediário',
  [NivelExperiencia.Avancado]: 'Avançado',
};

const tempoDisponivelLabel: Record<TempoDisponivel, string> = {
  [TempoDisponivel.DuasVezesPorSemana]: '2x por semana',
  [TempoDisponivel.TresVezesPorSemana]: '3x por semana',
  [TempoDisponivel.QuatroVezesPorSemana]: '4x por semana',
  [TempoDisponivel.CincoVezesPorSemana]: '5x por semana',
  [TempoDisponivel.SeisVezesPorSemana]: '6x por semana',
  [TempoDisponivel.SeteVezesPorSemana]: '7x por semana',
};

const modalidadeLabel: Record<ModalidadeEsportiva, string> = {
  [ModalidadeEsportiva.Volei]: 'vôlei',
  [ModalidadeEsportiva.Basquete]: 'basquete',
  [ModalidadeEsportiva.FutebolFutsal]: 'futebol/futsal',
  [ModalidadeEsportiva.BeachTenis]: 'beach tennis',
};

const localTreinoLabel: Record<LocalTreino, string> = {
  [LocalTreino.Academia]: 'academia',
  [LocalTreino.Casa]: 'casa',
  [LocalTreino.ArLivre]: 'ao ar livre',
};

const tipoLesaoLabel: Record<TipoLesao, string> = {
  [TipoLesao.Joelho]: 'joelho',
  [TipoLesao.Tornozelo]: 'tornozelo',
  [TipoLesao.Ombro]: 'ombro',
  [TipoLesao.Lombar]: 'lombar',
  [TipoLesao.Quadril]: 'quadril',
  [TipoLesao.Punho]: 'punho',
  [TipoLesao.Customizada]: 'customizada',
};

const gravidadeLesaoLabel: Record<GravidadeLesao, string> = {
  [GravidadeLesao.Leve]: 'leve',
  [GravidadeLesao.Moderada]: 'moderada',
  [GravidadeLesao.Alta]: 'alta',
};

const focosPorModalidade: Record<ModalidadeEsportiva, string> = {
  [ModalidadeEsportiva.Volei]:
    'salto, agilidade, força de membros superiores, core, aterrissagem e prevenção',
  [ModalidadeEsportiva.Basquete]:
    'mudança de direção, aceleração, desaceleração, salto, core, estabilidade de joelho e tornozelo',
  [ModalidadeEsportiva.FutebolFutsal]:
    'aceleração, agilidade, resistência específica, potência de membros inferiores, core e prevenção de lesões',
  [ModalidadeEsportiva.BeachTenis]:
    'deslocamento na areia, rotação de tronco, potência de membros superiores, core, ombro e prevenção',
};

const AlongamentoSchema = z.object({
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

const ExercicioSchema = z.object({
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

export const PlanoTreinoSchema = z.object({
  resumo: z.string().describe('Visão geral do plano em 1-2 frases'),
  treinos: z
    .array(
      z.object({
        dia: z.string().describe('Ex: Segunda-feira'),
        foco: z.string().describe('Ex: potência de salto'),
        duracaoMinutos: z.number(),
        alongamentos: z
          .array(AlongamentoSchema)
          .describe(
            'Alongamentos e mobilidade separados da parte principal do treino',
          ),
        exercicios: z
          .array(ExercicioSchema)
          .describe(
            'Exercícios principais de performance, força, potência, agilidade ou prevenção',
          ),
      }),
    )
    .min(2)
    .max(7)
    .describe(
      'Entre 2 e 7 treinos semanais, conforme o tempo disponível informado',
    ),
});

const BuscarTreinoAnteriorInputSchema = z.object({
  userId: z.string().describe('ID do usuário para buscar treino anterior'),
});

const buscarTreinoAnteriorUsuario = tool(
  async ({ userId }) => {
    const treinoAnterior = buscarTreinoAnterior(userId);

    if (!treinoAnterior) {
      return {
        encontrado: false,
        feedback: undefined,
        resumoTreinoAnterior: undefined,
      };
    }

    return {
      encontrado: true,
      feedback: treinoAnterior.feedback,
      resumoTreinoAnterior: treinoAnterior.resumoTreinoAnterior,
    };
  },
  {
    name: 'buscar_treino_anterior_usuario',
    description:
      'Busca no histórico simulado o treino anterior e o feedback do usuário pelo userId. Use antes de gerar um novo plano de treino.',
    schema: BuscarTreinoAnteriorInputSchema,
  },
);

type OpenAICompatibleModelParams = {
  provider: string;
  modelName: string;
  apiKey?: string;
  baseURL: string;
  temperature?: number;
  defaultHeaders?: Record<string, string>;
};

export function createOpenAICompatibleModel({
  provider,
  modelName,
  apiKey,
  baseURL,
  temperature = 0.3,
  defaultHeaders,
}: OpenAICompatibleModelParams): InstructorModelConfig {
  return {
    provider,
    modelName,
    model: new ChatOpenAI({
      model: modelName,
      temperature,
      apiKey,
      configuration: {
        baseURL,
        defaultHeaders,
      },
    }),
  };
}

export function createNvidiaModel(
  modelName = 'meta/llama-3.3-70b-instruct',
): InstructorModelConfig {
  return createOpenAICompatibleModel({
    provider: 'nvidia',
    modelName,
    apiKey: process.env.NVIDIA_API_KEY,
    baseURL: 'https://integrate.api.nvidia.com/v1',
  });
}

export function createOpenRouterModel(
  modelName = 'openai/gpt-oss-120b',
): InstructorModelConfig {
  return createOpenAICompatibleModel({
    provider: 'openrouter',
    modelName,
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer':
        process.env.OPENROUTER_SITE_URL ?? 'http://localhost',
      'X-OpenRouter-Title':
        process.env.OPENROUTER_SITE_NAME ?? 'LangChain Training Plan',
    },
  });
}

export const systemPrompt = new SystemMessage(
  `Você é um preparador físico especialista em performance esportiva para atletas recreativos e intermediários.

Crie planos de treino seguros, práticos e específicos para a modalidade informada, considerando idade, peso, altura, objetivo, nível de experiência, frequência semanal, duração do treino, local de treino e lesões/restrições.

Antes de gerar um novo plano, use a tool buscar_treino_anterior_usuario com o userId informado.
Se houver treino anterior com feedback, adapte o novo plano considerando esse feedback.
Não copie o treino anterior; use histórico e feedback apenas para ajustar seleção de exercícios, volume, intensidade, impacto e foco.
Se não houver treino anterior, gere o plano normalmente com base nos dados atuais.

Priorize:
- especificidade da modalidade;
- progressão adequada ao nível do usuário;
- prevenção de lesões;
- equilíbrio entre força, potência, mobilidade, core, agilidade e recuperação;
- exercícios executáveis em contexto real de treino.
- compatibilidade entre exercícios, equipamentos e local de treino informado.

Critérios obrigatórios de qualidade:
- Para 3 treinos por semana, distribua em dias alternados, como Segunda-feira, Quarta-feira e Sexta-feira, salvo se o usuário informar outra preferência.
- Cada treino de 90 minutos deve conter pelo menos 2 alongamentos ou mobilidades preparatórias e 4 a 6 exercícios principais.
- Se a duração for menor que 90 minutos, reduza volume mantendo pelo menos 3 exercícios principais por treino.
- Alongamentos devem ser mobilidades ou preparações específicas para o foco do treino, não alongamentos genéricos.
- Exercícios principais devem ser exercícios reconhecidos e nomeados com clareza, como agachamento com salto, aterrissagem controlada, deslocamento lateral, prancha, remada, flexão de braço, ponte de glúteos, avanço, elevação de panturrilha ou variações equivalentes.
- Evite nomes vagos como "saltos de altura", "alongamento de joelho", "alongamento de perna", "alongamento de core", "caminhada em curva" ou qualquer exercício que não descreva prática reconhecida.
- Para vôlei, inclua trabalho de salto, aterrissagem, agilidade lateral, core, estabilidade de joelho/tornozelo, força de membros superiores e prevenção.
- Se houver feedback anterior, adapte explicitamente seleção de exercícios, impacto, volume ou foco conforme esse feedback.

O plano será considerado inválido se:
- usar exercícios vagos, inventados ou sem nome técnico reconhecível;
- repetir a mesma instrução de execução para alongamentos ou exercícios diferentes;
- prescrever apenas 1 exercício principal em um treino de 90 minutos;
- ignorar o local de treino;
- usar equipamentos não informados;
- gerar treinos consecutivos para frequência de 3x por semana;
- criar alongamentos sem relação com o foco do treino;
- escrever instruções genéricas, superficiais ou biomecanicamente incorretas.

Exemplo de boa instrução:
"Comece em posição atlética, pés afastados na largura dos quadris e joelhos levemente flexionados. Desloque-se lateralmente com passos curtos sem cruzar os pés, mantendo o tronco estável e o centro de gravidade baixo. Respire de forma contínua e acelere apenas mantendo controle. Evite levantar o tronco ou deixar os joelhos colapsarem para dentro."

Exemplo ruim:
"Caminhe em curva mantendo os joelhos dobrados. Evite se machucar."

Regras:
- Não invente dados que não foram informados.
- Não prescreva condutas médicas, fisioterapêuticas ou diagnósticos.
- Não presuma acesso a academia, máquinas, pesos ou acessórios quando o local de treino não indicar isso.
- Se houver lesões ou restrições, adapte o treino de forma conservadora.
- Separe alongamentos dos exercícios principais.
- Cada alongamento e exercício deve ter instruções de execução específicas, com posição inicial, movimento principal, controle/postura, respiração ou ritmo, e pelo menos um erro comum a evitar.
- Não use instruções genéricas como "faça corretamente", "mantenha boa postura" ou "execute com controle" sem explicar como.
- Respeite exatamente o schema de saída solicitado.`,
);

function formatarLesoes(lesoes: LesaoUsuario[]): string {
  if (lesoes.length === 0) {
    return 'Nenhuma';
  }

  return lesoes
    .map((lesao) => {
      const gravidade = lesao.gravidade
        ? `Gravidade: ${gravidadeLesaoLabel[lesao.gravidade]}`
        : undefined;
      const observacoes = lesao.observacoes
        ? `Observações: ${lesao.observacoes}`
        : undefined;

      if (lesao.tipo === TipoLesao.Customizada) {
        return [
          `Tipo: ${tipoLesaoLabel[lesao.tipo]}`,
          `Descrição: ${lesao.descricao}`,
          gravidade,
          observacoes,
        ]
          .filter(Boolean)
          .join(', ');
      }

      return [`Tipo: ${tipoLesaoLabel[lesao.tipo]}`, gravidade, observacoes]
        .filter(Boolean)
        .join(', ');
    })
    .join('\n');
}

export function criarPrompt(dados: DadosUsuario): string {
  return `
Crie um plano de treinamento para ${modalidadeLabel[dados.modalidade]} com base APENAS nos dados abaixo.

<Usuario>
ID do usuário: ${dados.userId}
Modalidade: ${modalidadeLabel[dados.modalidade]}
Idade: ${dados.idade}
Peso: ${dados.peso}
Altura: ${dados.altura}
Objetivo: ${dados.objetivo}
Nível de experiência: ${nivelExperienciaLabel[dados.nivelExperiencia]}
Tempo disponível: ${tempoDisponivelLabel[dados.tempoDisponivel]}
Duração de cada treino: ${dados.duracaoTreinoMinutos} minutos
Local de treino: ${localTreinoLabel[dados.localTreino]}
Lesões/restrições:
${formatarLesoes(dados.lesoes)}
</Usuario>

Regras:
- Use o userId informado para consultar histórico de treino anterior antes de gerar o novo plano
- Se existir feedback anterior, adapte o plano atual ao feedback sem ignorar os dados atuais do usuário
- Gere exatamente a quantidade de treinos indicada em "Tempo disponível"
- Para 3 treinos por semana, use dias alternados, como Segunda-feira, Quarta-feira e Sexta-feira, salvo se houver outra preferência informada
- Cada treino deve respeitar a duração informada e ter volume compatível com nível de experiência, frequência semanal, local de treino e restrições
- Use foco específico para ${modalidadeLabel[dados.modalidade]}: ${focosPorModalidade[dados.modalidade]}
- Separe cada treino em "alongamentos" e "exercicios"
- Cada treino de 90 minutos deve conter pelo menos 2 alongamentos ou mobilidades preparatórias e 4 a 6 exercícios principais
- Alongamentos devem preparar o corpo para o foco do treino e não devem ser genéricos
- Exercícios devem compor o trabalho principal de performance, força, potência, agilidade, core ou prevenção
- Escolha exercícios amplamente reconhecidos na preparação física da modalidade
- Evite exercícios exóticos, raros, redundantes, inventados, vagos ou com alto risco técnico sem necessidade
- Não use nomes vagos como "saltos de altura", "alongamento de joelho", "alongamento de perna", "alongamento de core" ou "caminhada em curva"
- Não repita a mesma instrução de execução para alongamentos ou exercícios diferentes
- Prefira a alternativa mais simples e segura quando houver duas opções com benefício semelhante
- Escolha apenas alongamentos e exercícios compatíveis com o local de treino informado
- Não presuma acesso a academia, máquinas, pesos, elásticos, caixas, cones ou acessórios quando não estiverem informados
- Para cada alongamento e exercício, explique o motivo da escolha conectando-o à modalidade, objetivo, nível, local de treino e restrições do usuário
- Toda instrução de execução deve ser específica para o alongamento ou exercício escolhido
- Toda instrução de execução deve explicar posição inicial, movimento principal, controle/postura, respiração ou ritmo, e pelo menos um erro comum a evitar
- Não use instruções genéricas como "faça corretamente", "mantenha boa postura" ou "execute com controle" sem explicar como
- Não invente lesões, restrições, equipamentos disponíveis ou dados não informados
`;
}

export function criarPromptComHistorico(
  dados: DadosUsuario,
  treinoAnterior?: TreinoAnterior,
): string {
  const historico = treinoAnterior
    ? `
<HistoricoTreinoAnterior>
Encontrado: sim
Resumo do treino anterior: ${treinoAnterior.resumoTreinoAnterior}
Feedback do usuário: ${treinoAnterior.feedback}
</HistoricoTreinoAnterior>`
    : `
<HistoricoTreinoAnterior>
Encontrado: não
</HistoricoTreinoAnterior>`;

  return `${criarPrompt(dados)}

${historico}

Instruções para execução direta sem agente:
- O histórico acima já foi consultado pelo código antes desta chamada.
- Não tente chamar tools, funções ou buscar dados externos.
- Se o histórico existir, use o feedback para adaptar seleção de exercícios, volume, intensidade, impacto e foco.
- Ainda assim, priorize os dados atuais do usuário acima do treino anterior.`;
}

export type PlanoTreino = z.infer<typeof PlanoTreinoSchema>;

function extrairPlanoDeConteudo(content: unknown): PlanoTreino | null {
  if (typeof content !== 'string' || content.trim().length === 0) {
    return null;
  }

  try {
    const parsedContent: unknown = JSON.parse(content);
    const maybePlan =
      typeof parsedContent === 'object' &&
      parsedContent !== null &&
      'parameters' in parsedContent
        ? (parsedContent as { parameters: unknown }).parameters
        : parsedContent;

    if (typeof maybePlan !== 'object' || maybePlan === null) {
      return null;
    }

    const normalizedPlan = { ...(maybePlan as Record<string, unknown>) };

    if (typeof normalizedPlan.treinos === 'string') {
      normalizedPlan.treinos = JSON.parse(normalizedPlan.treinos);
    }

    return PlanoTreinoSchema.parse(normalizedPlan);
  } catch {
    return null;
  }
}

function extrairConteudoDaMensagem(message: unknown): unknown {
  if (typeof message !== 'object' || message === null) {
    return undefined;
  }

  if ('content' in message) {
    return (message as { content: unknown }).content;
  }

  if ('kwargs' in message) {
    const kwargs = (message as { kwargs: unknown }).kwargs;

    if (typeof kwargs === 'object' && kwargs !== null && 'content' in kwargs) {
      return (kwargs as { content: unknown }).content;
    }
  }

  return undefined;
}

async function salvarDebugAgentResult(result: unknown): Promise<void> {
  await writeFile('agent-debug.json', JSON.stringify(result, null, 2));
}

async function extrairPlanoDoResultado(result: {
  structuredResponse?: unknown;
  messages?: unknown[];
}): Promise<PlanoTreino> {
  const structuredResponse = PlanoTreinoSchema.safeParse(result.structuredResponse);

  if (structuredResponse.success) {
    return structuredResponse.data;
  }

  const fallbackPlan = result.messages
    ?.slice()
    .reverse()
    .map((message: unknown) =>
      extrairPlanoDeConteudo(extrairConteudoDaMensagem(message)),
    )
    .find((plano: PlanoTreino | null): plano is PlanoTreino => plano !== null);

  if (fallbackPlan) {
    return fallbackPlan;
  }

  await salvarDebugAgentResult(result);
  throw new Error('Resposta estruturada não retornada pelo agente.');
}

function createInstructorReactAgent(model: BaseChatModel) {
  return createAgent({
    model,
    systemPrompt,
    tools: [buscarTreinoAnteriorUsuario],
    responseFormat: toolStrategy(PlanoTreinoSchema),
  });
}

type InstructorReactAgent = ReturnType<typeof createInstructorReactAgent>;

export class InstructorAgent extends Agent<InstructorReactAgent> {
  readonly modelConfig: InstructorModelConfig;

  constructor(agent: InstructorReactAgent, modelConfig: InstructorModelConfig) {
    super(agent);
    this.modelConfig = modelConfig;
  }

  static createAgent(modelConfig = createNvidiaModel()): InstructorAgent {
    return new InstructorAgent(
      createInstructorReactAgent(modelConfig.model),
      modelConfig,
    );
  }

  async createTrainingPlan(input: DadosUsuario): Promise<PlanoTreino> {
    const result = await this.agent.invoke({
      messages: [new HumanMessage(criarPrompt(input))],
    });

    return extrairPlanoDoResultado(result);
  }
}
