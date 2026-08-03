export type PublicEditorialPageId =
  | 'about'
  | 'faq'
  | 'location'
  | 'routine'
  | 'safety';

export type PublicEditorialRelatedLink = {
  label: string;
  path: string;
};

export type PublicEditorialSection = {
  body: string[];
  bullets?: string[];
  title: string;
};

export type PublicEditorialPage = {
  eyebrow: string;
  id: PublicEditorialPageId;
  path: string;
  primaryCtaLabel: string;
  relatedLinks: PublicEditorialRelatedLink[];
  sections: PublicEditorialSection[];
  subtitle: string;
  title: string;
};

export const publicEditorialPageRoutes: Array<{
  id: PublicEditorialPageId;
  path: string;
}> = [
  { id: 'about', path: '/sobre' },
  { id: 'routine', path: '/guias/rotina-de-treino-personalizada' },
  { id: 'location', path: '/guias/treino-em-casa-academia-quadra' },
  { id: 'safety', path: '/guias/seguranca-recuperacao-lesoes' },
  { id: 'faq', path: '/perguntas-frequentes' },
];

type SupportedContentLanguage = 'en-US' | 'pt-BR';

const pagePaths = Object.fromEntries(
  publicEditorialPageRoutes.map((route) => [route.id, route.path]),
) as Record<PublicEditorialPageId, string>;

const ptBrPages: Record<PublicEditorialPageId, PublicEditorialPage> = {
  about: {
    eyebrow: 'Sobre o Funcione',
    id: 'about',
    path: pagePaths.about,
    primaryCtaLabel: 'Comecar agora',
    relatedLinks: [
      {
        label: 'Como montar uma rotina de treino personalizada',
        path: pagePaths.routine,
      },
      { label: 'Perguntas frequentes', path: pagePaths.faq },
    ],
    sections: [
      {
        body: [
          'O Funcione foi criado para ajudar pessoas ativas a organizar a rotina de treino com mais clareza, consistencia e autonomia. A proposta e reunir informacoes importantes em um fluxo simples, para que cada treino tenha contexto e seja mais facil de acompanhar.',
          'A experiencia parte da rotina real do atleta: disponibilidade na semana, tempo por sessao, local de treino, equipamentos disponiveis, objetivo esportivo e pontos de atencao fisica.',
        ],
        title: 'Para quem o Funcione foi criado',
      },
      {
        body: [
          'O Funcione ajuda a transformar dados de cadastro e preferencias em uma leitura mais organizada da rotina. Em vez de espalhar informacoes em conversas, anotacoes e planilhas, o app concentra os dados que influenciam uma solicitacao de treino.',
          'Isso torna mais simples revisar o que foi informado, acompanhar o plano ativo e entender quando uma nova solicitacao faz sentido.',
        ],
        title: 'Como o app organiza a experiencia',
      },
      {
        body: [
          'Termos de uso, politica de privacidade e guias publicos ficam acessiveis antes do login. Essa estrutura existe para que a pessoa entenda o servico, os cuidados e o uso de dados antes de entrar na area do atleta.',
        ],
        title: 'Transparencia antes do cadastro',
      },
      {
        body: [
          'O Funcione apoia organizacao e acompanhamento, mas nao substitui avaliacao medica, fisioterapeutica ou acompanhamento de um profissional de educacao fisica. Dor persistente, lesoes, limitacoes especificas e condicoes de saude pedem orientacao profissional.',
        ],
        title: 'Limites importantes',
      },
    ],
    subtitle:
      'Uma area simples para organizar informacoes de treino, acompanhar rotina e deixar decisoes esportivas mais claras antes de agir.',
    title: 'Sobre o Funcione',
  },
  faq: {
    eyebrow: 'Ajuda publica',
    id: 'faq',
    path: pagePaths.faq,
    primaryCtaLabel: 'Entrar no Funcione',
    relatedLinks: [
      { label: 'Sobre o Funcione', path: pagePaths.about },
      { label: 'Politica de privacidade', path: '/privacy' },
    ],
    sections: [
      {
        body: [
          'O Funcione organiza informacoes de perfil, rotina e objetivo para apoiar a solicitacao e o acompanhamento de treinos. A experiencia foi pensada para deixar a rotina mais clara, especialmente quando a pessoa precisa conciliar treino com trabalho, estudo, deslocamento e descanso.',
        ],
        title: 'O que o Funcione faz?',
      },
      {
        body: [
          'Sim. A pagina de guia, o Sobre, as perguntas frequentes, os termos e a politica de privacidade ficam acessiveis sem login. A area do atleta exige entrada porque contem dados de cadastro e informacoes pessoais de treino.',
        ],
        title: 'Consigo entender o servico antes de entrar?',
      },
      {
        body: [
          'Nao necessariamente. As informacoes sobre local e equipamentos ajudam a adaptar expectativas. Treinos em casa, academia ou quadra podem ter estruturas diferentes, e o ideal e informar o contexto real para evitar planos dificeis de executar.',
        ],
        title: 'Preciso treinar em academia?',
      },
      {
        body: [
          'Anuncios ajudam a manter conteudo publico e parte da experiencia acessivel. Eles devem aparecer apenas em paginas com conteudo ou em areas com treino ativo, nunca em telas de login, carregamento, erro, cadastro incompleto ou preparo de treino.',
        ],
        title: 'Por que vejo anuncios?',
      },
      {
        body: [
          'Nao. O Funcione nao substitui profissionais de saude ou de educacao fisica. Em caso de dor, lesao, restricao importante ou duvida sobre seguranca, procure orientacao profissional.',
        ],
        title: 'O treino substitui acompanhamento profissional?',
      },
    ],
    subtitle:
      'Respostas diretas sobre acesso, privacidade, anuncios e limites da experiencia no Funcione.',
    title: 'Perguntas frequentes',
  },
  location: {
    eyebrow: 'Guia de ambiente',
    id: 'location',
    path: pagePaths.location,
    primaryCtaLabel: 'Comecar agora',
    relatedLinks: [
      { label: 'Rotina de treino personalizada', path: pagePaths.routine },
      { label: 'Seguranca e recuperacao', path: pagePaths.safety },
    ],
    sections: [
      {
        body: [
          'O local de treino muda a escolha dos exercicios, o ritmo da sessao e os cuidados com seguranca. Uma rotina feita para casa precisa considerar espaco, piso, ruido e equipamentos simples. Na academia, a disponibilidade de maquinas e cargas abre outras possibilidades. Na quadra, deslocamentos, mudancas de direcao e impacto entram com mais forca.',
        ],
        title: 'Por que o local muda o plano',
      },
      {
        body: [
          'Treinar em casa funciona melhor quando a sessao e objetiva e usa recursos previsiveis. Colchonete, elastico, halteres, cadeira firme e uma area livre ja permitem muita coisa, mas o plano precisa respeitar o espaco disponivel.',
        ],
        bullets: [
          'Evite exercicios que exigem corrida se o espaco e pequeno.',
          'Prefira movimentos controlados quando o piso escorrega.',
          'Use alternativas para carga quando nao houver halteres.',
        ],
        title: 'Treino em casa',
      },
      {
        body: [
          'A academia facilita progressao de carga, variacao de equipamentos e controle de intensidade. Ainda assim, o plano precisa considerar horarios cheios, maquinas ocupadas e exercicios alternativos para manter a sessao fluida.',
        ],
        title: 'Treino em academia',
      },
      {
        body: [
          'Quadras e espacos esportivos favorecem deslocamento, agilidade, coordenacao e gestos da modalidade. A atencao principal deve ir para aquecimento, impacto, calzado, superficie e fadiga.',
        ],
        title: 'Treino em quadra',
      },
    ],
    subtitle:
      'Casa, academia e quadra pedem escolhas diferentes. Entender o ambiente evita improviso e aumenta a chance de manter consistencia.',
    title: 'Treino em casa, academia ou quadra',
  },
  routine: {
    eyebrow: 'Guia de rotina',
    id: 'routine',
    path: pagePaths.routine,
    primaryCtaLabel: 'Comecar agora',
    relatedLinks: [
      { label: 'Treino em casa, academia ou quadra', path: pagePaths.location },
      { label: 'Seguranca e recuperacao', path: pagePaths.safety },
    ],
    sections: [
      {
        body: [
          'Uma rotina de treino personalizada comeca pela frequencia semanal. Antes de escolher exercicios, vale entender quantos dias a pessoa consegue treinar de verdade, sem depender de uma semana perfeita.',
          'Duas sessoes bem cumpridas podem gerar mais consistencia do que cinco sessoes impossiveis de encaixar. A personalizacao nasce desse acordo entre objetivo e rotina real.',
        ],
        title: 'Comece pela frequencia semanal',
      },
      {
        body: [
          'A duracao muda a estrutura da sessao. Trinta minutos pedem foco: aquecimento direto, poucos exercicios principais e fechamento simples. Sessenta ou setenta e cinco minutos permitem mais volume, descanso e trabalho complementar.',
        ],
        bullets: [
          '30 minutos: prioridade e clareza.',
          '45 minutos: bom equilibrio entre aquecimento, bloco principal e complemento.',
          '60 minutos ou mais: espaco para progressao, tecnica e acessorios.',
        ],
        title: 'Ajuste o plano ao tempo por sessao',
      },
      {
        body: [
          'Objetivos diferentes pedem decisoes diferentes. Condicionamento, forca, mobilidade, emagrecimento, retorno gradual ou desempenho esportivo nao precisam seguir o mesmo desenho. O objetivo ajuda a definir intensidade, volume e ordem dos blocos.',
        ],
        title: 'Conecte objetivo e prioridade',
      },
      {
        body: [
          'Rotinas mudam. Viagens, semanas cheias, provas, trabalho e sono ruim podem exigir ajustes. Um bom plano e aquele que permite voltar sem culpa e retomar a consistencia com seguranca.',
        ],
        title: 'Revise quando a vida mudar',
      },
    ],
    subtitle:
      'Um plano funciona melhor quando respeita frequencia, duracao, objetivo e energia disponivel na semana real do atleta.',
    title: 'Como montar uma rotina de treino personalizada',
  },
  safety: {
    eyebrow: 'Guia de cuidado',
    id: 'safety',
    path: pagePaths.safety,
    primaryCtaLabel: 'Comecar agora',
    relatedLinks: [
      { label: 'Rotina de treino personalizada', path: pagePaths.routine },
      { label: 'Treino em casa, academia ou quadra', path: pagePaths.location },
    ],
    sections: [
      {
        body: [
          'Seguranca, recuperacao e lesoes precisam entrar na conversa antes de aumentar volume ou intensidade. O corpo responde melhor quando treino, descanso, sono e historico fisico caminham juntos.',
        ],
        title: 'Cuidado faz parte do plano',
      },
      {
        body: [
          'Desconforto leve pode aparecer em treinos novos, mas dor forte, dor que altera movimento ou dor que persiste merece pausa e orientacao profissional. Ignorar sinais importantes costuma atrapalhar mais do que adaptar a sessao.',
        ],
        title: 'Dor nao deve ser tratada como meta',
      },
      {
        body: [
          'Recuperacao nao e ausencia de treino; e parte do processo. Sono, alimentacao, hidratacao, descanso entre sessoes e progressao gradual ajudam a manter continuidade.',
        ],
        bullets: [
          'Aumente volume aos poucos.',
          'Evite repetir impacto alto sem recuperacao adequada.',
          'Registre restricoes e pontos de atencao antes de solicitar um plano.',
        ],
        title: 'Recuperacao sustenta consistencia',
      },
      {
        body: [
          'Lesoes, cirurgias recentes, condicoes de saude, dor persistente ou inseguranca para executar movimentos pedem avaliacao individual. O Funcione ajuda na organizacao, mas a orientacao profissional e o caminho certo para decisoes clinicas ou tecnicas especificas.',
        ],
        title: 'Quando buscar orientacao profissional',
      },
    ],
    subtitle:
      'Progredir com consistencia exige respeitar sinais do corpo, historico de lesoes e tempo de recuperacao.',
    title: 'Seguranca, recuperacao e lesoes',
  },
};

const enUsPages: Record<PublicEditorialPageId, PublicEditorialPage> = {
  about: {
    eyebrow: 'About Funcione',
    id: 'about',
    path: pagePaths.about,
    primaryCtaLabel: 'Start now',
    relatedLinks: [
      {
        label: 'How to build a personalized training routine',
        path: pagePaths.routine,
      },
      { label: 'Frequently asked questions', path: pagePaths.faq },
    ],
    sections: [
      {
        body: [
          'Funcione was created to help active people organize their training routine with more clarity, consistency, and autonomy. The goal is to keep important information in a simple flow, so each workout has context and is easier to follow.',
          'The experience starts with the athlete actual routine: weekly availability, session duration, training location, available equipment, sport objective, and physical points of attention.',
        ],
        title: 'Who Funcione is for',
      },
      {
        body: [
          'Funcione helps turn registration details and preferences into a clearer view of the training routine. Instead of spreading information across chats, notes, and spreadsheets, the app keeps the inputs that shape a training request in one place.',
          'That makes it easier to review what was shared, follow the active plan, and understand when a new request makes sense.',
        ],
        title: 'How the app organizes the experience',
      },
      {
        body: [
          'Terms of use, privacy policy, and public guides are available before sign-in. This structure helps people understand the service, its care points, and data use before entering the athlete area.',
        ],
        title: 'Transparency before registration',
      },
      {
        body: [
          'Funcione supports organization and follow-up, but it does not replace medical evaluation, physical therapy, or guidance from a fitness professional. Persistent pain, injuries, specific limitations, and health conditions call for professional guidance.',
        ],
        title: 'Important limits',
      },
    ],
    subtitle:
      'A simple area to organize training information, follow routine, and make sport decisions clearer before acting.',
    title: 'About Funcione',
  },
  faq: {
    eyebrow: 'Public help',
    id: 'faq',
    path: pagePaths.faq,
    primaryCtaLabel: 'Sign in to Funcione',
    relatedLinks: [
      { label: 'About Funcione', path: pagePaths.about },
      { label: 'Privacy policy', path: '/privacy' },
    ],
    sections: [
      {
        body: [
          'Funcione organizes profile, routine, and objective information to support training requests and workout follow-up. The experience is designed to make routine clearer, especially when training has to fit around work, study, commuting, and rest.',
        ],
        title: 'What does Funcione do?',
      },
      {
        body: [
          'Yes. The guide page, About page, FAQ, terms, and privacy policy are available without sign-in. The athlete area requires sign-in because it contains registration data and personal training information.',
        ],
        title: 'Can I understand the service before signing in?',
      },
      {
        body: [
          'Not necessarily. Location and equipment details help set realistic expectations. Home, gym, and court workouts may need different structures, and the best input is the context you can actually use.',
        ],
        title: 'Do I need to train at a gym?',
      },
      {
        body: [
          'Ads help keep public content and part of the experience accessible. They should appear only on pages with content or in areas with an active plan, never on login, loading, error, incomplete registration, or workout preparation screens.',
        ],
        title: 'Why do I see ads?',
      },
      {
        body: [
          'No. Funcione does not replace health or fitness professionals. If you have pain, an injury, an important restriction, or any question about safety, seek professional guidance.',
        ],
        title: 'Does a workout replace professional follow-up?',
      },
    ],
    subtitle:
      'Direct answers about access, privacy, ads, and the limits of the Funcione experience.',
    title: 'Frequently asked questions',
  },
  location: {
    eyebrow: 'Environment guide',
    id: 'location',
    path: pagePaths.location,
    primaryCtaLabel: 'Start now',
    relatedLinks: [
      { label: 'Personalized training routine', path: pagePaths.routine },
      { label: 'Safety and recovery', path: pagePaths.safety },
    ],
    sections: [
      {
        body: [
          'The training location changes exercise selection, session pace, and safety needs. A home routine has to consider space, flooring, noise, and simple equipment. In a gym, machines and weights open different options. On a court, movement, direction changes, and impact matter more.',
        ],
        title: 'Why location changes the plan',
      },
      {
        body: [
          'Home training works best when the session is direct and uses predictable resources. A mat, bands, dumbbells, a sturdy chair, and an open area already allow many options, but the plan should respect the available space.',
        ],
        bullets: [
          'Avoid running drills when space is tight.',
          'Prefer controlled movements when the floor is slippery.',
          'Use load alternatives when dumbbells are not available.',
        ],
        title: 'Training at home',
      },
      {
        body: [
          'The gym makes load progression, equipment variety, and intensity control easier. Even then, the plan should account for busy hours, occupied machines, and exercise alternatives to keep the session moving.',
        ],
        title: 'Training at the gym',
      },
      {
        body: [
          'Courts and sport spaces support movement, agility, coordination, and sport-specific gestures. The main attention points are warm-up, impact, footwear, surface, and fatigue.',
        ],
        title: 'Training on a court',
      },
    ],
    subtitle:
      'Home, gym, and court settings call for different choices. Understanding the environment reduces improvisation and supports consistency.',
    title: 'Training at home, in the gym, or on a court',
  },
  routine: {
    eyebrow: 'Routine guide',
    id: 'routine',
    path: pagePaths.routine,
    primaryCtaLabel: 'Start now',
    relatedLinks: [
      { label: 'Home, gym, or court training', path: pagePaths.location },
      { label: 'Safety and recovery', path: pagePaths.safety },
    ],
    sections: [
      {
        body: [
          'A personalized training routine starts with weekly frequency. Before choosing exercises, it helps to understand how many days the person can actually train without relying on a perfect week.',
          'Two completed sessions can build more consistency than five sessions that never fit. Personalization starts with this agreement between objective and real routine.',
        ],
        title: 'Start with weekly frequency',
      },
      {
        body: [
          'Session duration changes the structure. Thirty minutes call for focus: direct warm-up, a few main exercises, and a simple close. Sixty or seventy-five minutes allow more volume, rest, and complementary work.',
        ],
        bullets: [
          '30 minutes: priority and clarity.',
          '45 minutes: a useful balance between warm-up, main block, and complement.',
          '60 minutes or more: room for progression, technique, and accessories.',
        ],
        title: 'Fit the plan to session duration',
      },
      {
        body: [
          'Different goals require different decisions. Conditioning, strength, mobility, weight loss, gradual return, and sport performance do not need the same structure. The objective helps define intensity, volume, and block order.',
        ],
        title: 'Connect objective and priority',
      },
      {
        body: [
          'Routines change. Travel, busy weeks, competitions, work, and poor sleep can require adjustments. A good plan lets the athlete return without guilt and rebuild consistency with care.',
        ],
        title: 'Review when life changes',
      },
    ],
    subtitle:
      'A plan works better when it respects frequency, duration, objective, and the energy available in the athlete real week.',
    title: 'How to build a personalized training routine',
  },
  safety: {
    eyebrow: 'Care guide',
    id: 'safety',
    path: pagePaths.safety,
    primaryCtaLabel: 'Start now',
    relatedLinks: [
      { label: 'Personalized training routine', path: pagePaths.routine },
      { label: 'Home, gym, or court training', path: pagePaths.location },
    ],
    sections: [
      {
        body: [
          'Safety, recovery, and injuries should be part of the conversation before volume or intensity increases. The body responds better when training, rest, sleep, and physical history move together.',
        ],
        title: 'Care is part of the plan',
      },
      {
        body: [
          'Mild discomfort may appear with new workouts, but strong pain, pain that changes movement, or pain that persists deserves a pause and professional guidance. Ignoring important signals usually harms progress more than adapting the session.',
        ],
        title: 'Pain should not be treated as a goal',
      },
      {
        body: [
          'Recovery is not the absence of training; it is part of the process. Sleep, food, hydration, rest between sessions, and gradual progression support continuity.',
        ],
        bullets: [
          'Increase volume gradually.',
          'Avoid repeating high impact without adequate recovery.',
          'Register restrictions and attention points before requesting a plan.',
        ],
        title: 'Recovery supports consistency',
      },
      {
        body: [
          'Injuries, recent surgeries, health conditions, persistent pain, or insecurity with movements call for individual evaluation. Funcione helps with organization, but professional guidance is the right path for specific clinical or technical decisions.',
        ],
        title: 'When to seek professional guidance',
      },
    ],
    subtitle:
      'Progressing with consistency requires respecting body signals, injury history, and recovery time.',
    title: 'Safety, recovery, and injuries',
  },
};

const pagesByLanguage: Record<
  SupportedContentLanguage,
  Record<PublicEditorialPageId, PublicEditorialPage>
> = {
  'en-US': enUsPages,
  'pt-BR': ptBrPages,
};

function resolveContentLanguage(language?: string): SupportedContentLanguage {
  return language?.startsWith('en') ? 'en-US' : 'pt-BR';
}

export function getPublicEditorialPage(
  id: PublicEditorialPageId,
  language?: string,
) {
  return pagesByLanguage[resolveContentLanguage(language)][id];
}

