import type {
  TrainingExercise,
  TrainingModality,
  TrainingSession,
  TrainingStretch,
} from './training-plan.js';

export type WorkoutExecutionItemType = 'exercise' | 'stretch';

export type WorkoutExecutionItem = {
  instructions: string;
  key: string;
  metric: string;
  motive: string;
  name: string;
  observations?: string;
  type: WorkoutExecutionItemType;
};

export type WorkoutExecutionState = {
  completedAt: string | null;
  completedItemKeys: string[];
  modality: TrainingModality;
  planId: string;
  sessionId: string;
  startedAt: string;
  status: 'completed' | 'in_progress';
};

export type WorkoutExecutionStorageScope = {
  planId: string;
  sessionId: string;
  userId: string;
};

const storageKeyPrefix = 'funcione-workout-execution';

function hasSessionStorage() {
  return typeof window !== 'undefined' && window.sessionStorage;
}

function getStorageKey({ planId, sessionId, userId }: WorkoutExecutionStorageScope) {
  return `${storageKeyPrefix}:${userId}:${planId}:${sessionId}`;
}

function isWorkoutExecutionState(
  value: unknown,
  scope: WorkoutExecutionStorageScope,
): value is WorkoutExecutionState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<WorkoutExecutionState>;

  return (
    candidate.planId === scope.planId &&
    candidate.sessionId === scope.sessionId &&
    (candidate.status === 'completed' || candidate.status === 'in_progress') &&
    typeof candidate.startedAt === 'string' &&
    (typeof candidate.completedAt === 'string' || candidate.completedAt === null) &&
    Array.isArray(candidate.completedItemKeys) &&
    candidate.completedItemKeys.every((item) => typeof item === 'string') &&
    typeof candidate.modality === 'string'
  );
}

export function getWorkoutSessionId(
  session: TrainingSession,
  sessionIndex: number,
) {
  return `${sessionIndex}:${session.dia}:${session.foco}`;
}

function createStretchItem(item: TrainingStretch, index: number): WorkoutExecutionItem {
  return {
    instructions: item.instrucoesExecucao,
    key: `stretch:${index}:${item.nome}`,
    metric: String(item.duracaoSegundos),
    motive: item.motivoEscolha,
    name: item.nome,
    observations: item.observacoes,
    type: 'stretch',
  };
}

function createExerciseItem(
  item: TrainingExercise,
  index: number,
): WorkoutExecutionItem {
  return {
    instructions: item.instrucoesExecucao,
    key: `exercise:${index}:${item.nome}`,
    metric: `${item.series} x ${item.repeticoes}`,
    motive: item.motivoEscolha,
    name: item.nome,
    observations: item.observacoes,
    type: 'exercise',
  };
}

export function createWorkoutExecutionItems(session: TrainingSession) {
  return [
    ...session.alongamentos.map(createStretchItem),
    ...session.exercicios.map(createExerciseItem),
  ];
}

export function readWorkoutExecutionState(
  scope: WorkoutExecutionStorageScope,
): WorkoutExecutionState | null {
  if (!hasSessionStorage()) {
    return null;
  }

  try {
    const storedValue = window.sessionStorage.getItem(getStorageKey(scope));

    if (!storedValue) {
      return null;
    }

    const parsedValue: unknown = JSON.parse(storedValue);

    return isWorkoutExecutionState(parsedValue, scope) ? parsedValue : null;
  } catch {
    return null;
  }
}

export function writeWorkoutExecutionState(
  scope: WorkoutExecutionStorageScope,
  state: WorkoutExecutionState,
) {
  if (!hasSessionStorage()) {
    return;
  }

  window.sessionStorage.setItem(getStorageKey(scope), JSON.stringify(state));
}

export function clearWorkoutExecutionState(scope: WorkoutExecutionStorageScope) {
  if (!hasSessionStorage()) {
    return;
  }

  window.sessionStorage.removeItem(getStorageKey(scope));
}

export function toggleWorkoutExecutionItem(
  state: WorkoutExecutionState,
  itemKey: string,
): WorkoutExecutionState {
  const completedItemKeys = new Set(state.completedItemKeys);

  if (completedItemKeys.has(itemKey)) {
    completedItemKeys.delete(itemKey);
  } else {
    completedItemKeys.add(itemKey);
  }

  return {
    ...state,
    completedItemKeys: [...completedItemKeys],
  };
}
