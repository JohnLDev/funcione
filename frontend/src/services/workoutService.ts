import { apiPost, apiGet, ApiError } from './api';
import type { QuestionnaireAnswers, WorkoutPlan, WorkoutDay, Exercise } from '../types';

// Colours cycled per training day
const DAY_COLORS = ['#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'];

export class CooldownError extends Error {
  readonly nextAvailableAt: string | null;

  constructor(nextAvailableAt: string | null) {
    super('Você pode gerar um novo treino apenas uma vez por semana.');
    this.name = 'CooldownError';
    this.nextAvailableAt = nextAvailableAt;
  }
}

// ---- Shape returned by the backend ----

interface BackendExercise {
  name: string;
  sets: string | null;
  reps: string | null;
  duration: string | null;
  rest: string | null;
  notes: string | null;
}

interface BackendWorkoutDay {
  day: string;
  focus: string;
  warm_up: string | null;
  exercises: BackendExercise[];
  cool_down: string | null;
}

interface BackendPlan {
  title: string;
  overview: string;
  weekly_schedule: BackendWorkoutDay[];
  general_tips: string[];
  nutrition_notes: string | null;
}

interface BackendProfile {
  age: number;
  weight_kg: number;
  height_cm: number;
  fitness_level: string;
  goal: string;
  days_per_week: number;
  equipment: string;
  restrictions: string;
  additional_info: string;
}

interface BackendWorkoutDetail {
  id: number;
  user_id: number;
  profile: BackendProfile;
  plan: BackendPlan;
  created_at: string;
}

// ---- Transformers ----

function toExercise(e: BackendExercise): Exercise {
  return {
    name: e.name,
    sets: e.sets,
    reps: e.reps,
    duration: e.duration,
    rest: e.rest,
    notes: e.notes,
  };
}

function toWorkoutDay(d: BackendWorkoutDay, index: number): WorkoutDay {
  return {
    label: d.day,
    focus: d.focus,
    color: DAY_COLORS[index % DAY_COLORS.length],
    warmUp: d.warm_up,
    coolDown: d.cool_down,
    exercises: d.exercises.map(toExercise),
  };
}

function toProfile(p: BackendProfile): QuestionnaireAnswers {
  return {
    age: p.age,
    weightKg: p.weight_kg,
    heightCm: p.height_cm,
    level: p.fitness_level as QuestionnaireAnswers['level'],
    goal: p.goal as QuestionnaireAnswers['goal'],
    daysPerWeek: p.days_per_week,
    equipment: p.equipment as QuestionnaireAnswers['equipment'],
    restrictions: p.restrictions ?? '',
    additionalInfo: p.additional_info ?? '',
  };
}

function toWorkoutPlan(w: BackendWorkoutDetail): WorkoutPlan {
  return {
    id: String(w.id),
    title: w.plan.title,
    overview: w.plan.overview,
    days: w.plan.weekly_schedule.map(toWorkoutDay),
    generalTips: w.plan.general_tips ?? [],
    nutritionNotes: w.plan.nutrition_notes ?? null,
    createdAt: new Date(w.created_at).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }),
    profile: toProfile(w.profile),
  };
}

// ---- Public API ----

export async function generateWorkoutPlan(
  answers: QuestionnaireAnswers,
  token: string,
): Promise<WorkoutPlan> {
  try {
    const detail = await apiPost<BackendWorkoutDetail>(
      '/api/v1/workouts/generate',
      {
        age: answers.age,
        weight_kg: answers.weightKg,
        height_cm: answers.heightCm,
        fitness_level: answers.level,
        goal: answers.goal,
        days_per_week: answers.daysPerWeek,
        equipment: answers.equipment,
        restrictions: answers.restrictions || undefined,
        additional_info: answers.additionalInfo || undefined,
      },
      token,
    );
    return toWorkoutPlan(detail);
  } catch (err) {
    if (err instanceof ApiError && err.status === 429) {
      const nextAt = (err.payload?.next_available_at as string | undefined) ?? null;
      throw new CooldownError(nextAt);
    }
    throw err;
  }
}

export async function getLatestWorkout(token: string): Promise<WorkoutPlan | null> {
  try {
    const detail = await apiGet<BackendWorkoutDetail>('/api/v1/workouts/latest', token);
    return toWorkoutPlan(detail);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}
