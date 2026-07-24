export type TrainingModality =
  | 'volei'
  | 'basquete'
  | 'futebol_futsal'
  | 'beach_tenis';
export type TrainingGoal =
  | 'performance'
  | 'condicionamento'
  | 'prevencao_lesao'
  | 'perda_peso'
  | 'ganho_massa';
export type ExperienceLevel =
  | 'iniciante'
  | 'intermediario'
  | 'avancado'
  | 'profissional';
export type WeeklyAvailability =
  | '2x_semana'
  | '3x_semana'
  | '4x_semana'
  | '5x_semana'
  | '6x_semana'
  | '7x_semana';
export type TrainingPlace = 'academia' | 'casa' | 'ar_livre';
export type EquipmentType =
  | 'nenhum'
  | 'halteres'
  | 'barra_anilhas'
  | 'elasticos'
  | 'banco_caixa'
  | 'colchonete'
  | 'cones'
  | 'corda'
  | 'maquinas_academia'
  | 'bola'
  | 'customizado';
export type InjuryType =
  | 'joelho'
  | 'tornozelo'
  | 'ombro'
  | 'lombar'
  | 'quadril'
  | 'punho'
  | 'customizada';
export type InjurySeverity = 'leve' | 'moderada' | 'alta';

export type TrainingEquipment =
  | { tipo: Exclude<EquipmentType, 'customizado'> }
  | { descricao: string; tipo: 'customizado' };

export type TrainingInjury =
  | {
      gravidade: InjurySeverity;
      observacoes?: string;
      tipo: Exclude<InjuryType, 'customizada'>;
    }
  | {
      descricao: string;
      gravidade: InjurySeverity;
      observacoes?: string;
      tipo: 'customizada';
    };

export type MonthlyTrainingPlanRequest = {
  alturaCm: number;
  duracaoTreinoMinutos: 30 | 45 | 60 | 75 | 90;
  equipamentos: TrainingEquipment[];
  lesoes: TrainingInjury[];
  localTreino: TrainingPlace;
  modalidade: TrainingModality;
  nivelExperiencia: ExperienceLevel;
  objetivos: TrainingGoal[];
  pesoKg: number;
  tempoDisponivel: WeeklyAvailability;
};

export type TrainingStretch = {
  duracaoSegundos: number;
  instrucoesExecucao: string;
  motivoEscolha: string;
  nome: string;
  observacoes?: string;
};

export type TrainingExercise = {
  instrucoesExecucao: string;
  motivoEscolha: string;
  nome: string;
  observacoes?: string;
  repeticoes: string;
  series: number;
};

export type TrainingSession = {
  alongamentos: TrainingStretch[];
  dia: string;
  duracaoMinutos: number;
  exercicios: TrainingExercise[];
  foco: string;
};

export type TrainingPlanResult = {
  resumo: string;
  treinos: TrainingSession[];
};

export type MonthlyTrainingPlan = {
  availableForRegenerationAt: string;
  generatedAt: string;
  id: string;
  result: TrainingPlanResult;
  snapshot: MonthlyTrainingPlanRequest & {
    idade: number;
    userId: string;
  };
  status: 'active' | 'expired';
  userId: string;
};

export type AthleticProfile = {
  alturaCm: number;
  equipamentosDisponiveis: TrainingEquipment[];
  lesoesRecorrentes: TrainingInjury[];
  localTreinoComum: TrainingPlace;
  modalidadePreferida: TrainingModality;
  nivelExperiencia: ExperienceLevel;
  pesoKg: number;
};

export type MonthlyTrainingPlanState = {
  activePlan: MonthlyTrainingPlan | null;
  athleticProfile: AthleticProfile | null;
  canGenerate: boolean;
  nextGenerationAvailableAt: string | null;
};

export type TrainingPlanActionResult =
  | { ok: true; plan: MonthlyTrainingPlan }
  | { message: string; ok: false };

export type TrainingPlanGateway = {
  createMonthlyPlan: (
    accessToken: string,
    payload: MonthlyTrainingPlanRequest,
  ) => Promise<TrainingPlanActionResult>;
  getActivePlan: (accessToken: string) => Promise<MonthlyTrainingPlanState>;
};
