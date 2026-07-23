import {
  LocalTreino,
  ModalidadeEsportiva,
  MonthlyTrainingPlanStatus,
  NivelExperiencia,
} from './enums.js';
import type {
  CreateMonthlyTrainingPlanRequest,
  DadosUsuario,
  EquipamentoUsuario,
  LesaoUsuario,
  PlanoTreino,
} from './schemas.js';

export type AthleticProfile = {
  alturaCm: number;
  createdAt: string;
  equipamentosDisponiveis: EquipamentoUsuario[];
  lesoesRecorrentes: LesaoUsuario[];
  localTreinoComum: LocalTreino;
  modalidadePreferida: ModalidadeEsportiva;
  nivelExperiencia: NivelExperiencia;
  pesoKg: number;
  updatedAt: string;
  userId: string;
};

export type AthleticProfileInput = Pick<
  AthleticProfile,
  | 'alturaCm'
  | 'equipamentosDisponiveis'
  | 'lesoesRecorrentes'
  | 'localTreinoComum'
  | 'modalidadePreferida'
  | 'nivelExperiencia'
  | 'pesoKg'
>;

export type MonthlyTrainingPlanMetadata = {
  attempts: Array<{
    durationMs: number;
    error?: string;
    model: string;
    provider: string;
    role: 'primary' | 'fallback';
    status: 'success' | 'error';
  }>;
  durationMs: number;
  fallbackUsed: boolean;
  model: string;
  provider: string;
};

export type MonthlyTrainingPlan = {
  availableForRegenerationAt: string;
  createdAt: string;
  generatedAt: string;
  id: string;
  metadata: MonthlyTrainingPlanMetadata;
  result: PlanoTreino;
  snapshot: DadosUsuario;
  status: MonthlyTrainingPlanStatus;
  updatedAt: string;
  userId: string;
};

export type MonthlyTrainingPlanState = {
  activePlan: MonthlyTrainingPlan | null;
  athleticProfile: AthleticProfile | null;
  canGenerate: boolean;
  nextGenerationAvailableAt: string | null;
};

export type CreateMonthlyTrainingPlanPayload = CreateMonthlyTrainingPlanRequest;

export function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);

  return nextDate;
}

export function calculateAgeFromBirthDate(birthDate: string, now: Date): number | null {
  const parsedBirthDate = new Date(`${birthDate}T00:00:00.000Z`);

  if (Number.isNaN(parsedBirthDate.getTime()) || parsedBirthDate >= now) {
    return null;
  }

  let age = now.getUTCFullYear() - parsedBirthDate.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - parsedBirthDate.getUTCMonth();
  const dayDiff = now.getUTCDate() - parsedBirthDate.getUTCDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  return age;
}
