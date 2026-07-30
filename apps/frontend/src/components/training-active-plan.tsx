import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Dumbbell,
  Play,
  RotateCcw,
  Timer,
  Trophy,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type {
  MonthlyTrainingPlan,
  TrainingModality,
  TrainingSession,
} from '@/training/training-plan.js';
import {
  createWorkoutExecutionItems,
  getWorkoutSessionId,
  readWorkoutExecutionState,
  toggleWorkoutExecutionItem,
  writeWorkoutExecutionState,
  type WorkoutExecutionItem,
  type WorkoutExecutionState,
} from '@/training/workout-execution-state.js';
import { Badge } from './ui/badge.js';
import { Button } from './ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card.js';

function formatDate(value: string, language: string) {
  return new Intl.DateTimeFormat(language, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function TrainingSessionDetail({ session }: { session: TrainingSession }) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-4 border-t border-border pt-4">
      <section className="grid gap-2">
        <h3 className="text-sm font-black">{t('training.active.stretches')}</h3>
        {session.alongamentos.length === 0 ? (
          <p className="rounded-2xl bg-secondary p-3 text-sm font-semibold text-muted-foreground">
            {t('training.active.emptyStretches')}
          </p>
        ) : (
          session.alongamentos.map((item) => (
            <article className="grid gap-1 rounded-2xl bg-secondary p-3" key={item.nome}>
              <p className="break-words font-black">{item.nome}</p>
              <p className="text-xs font-bold text-muted-foreground">
                {item.motivoEscolha}
              </p>
              <p className="text-xs font-black text-primary">
                {item.duracaoSegundos} {t('training.active.seconds')}
              </p>
              <p className="text-sm text-foreground">{item.instrucoesExecucao}</p>
              {item.observacoes ? (
                <p className="text-sm font-semibold text-muted-foreground">
                  {t('training.active.observations')}: {item.observacoes}
                </p>
              ) : null}
            </article>
          ))
        )}
      </section>
      <section className="grid gap-2">
        <h3 className="text-sm font-black">{t('training.active.exercises')}</h3>
        {session.exercicios.length === 0 ? (
          <p className="rounded-2xl bg-secondary p-3 text-sm font-semibold text-muted-foreground">
            {t('training.active.emptyExercises')}
          </p>
        ) : (
          session.exercicios.map((item) => (
            <article className="grid gap-1 rounded-2xl bg-secondary p-3" key={item.nome}>
              <p className="break-words font-black">{item.nome}</p>
              <p className="text-xs font-bold text-muted-foreground">
                {item.series} x {item.repeticoes}
              </p>
              <p className="text-xs font-bold text-muted-foreground">
                {item.motivoEscolha}
              </p>
              <p className="text-sm text-foreground">{item.instrucoesExecucao}</p>
              {item.observacoes ? (
                <p className="text-sm font-semibold text-muted-foreground">
                  {t('training.active.observations')}: {item.observacoes}
                </p>
              ) : null}
            </article>
          ))
        )}
      </section>
    </div>
  );
}

function getCompletedItemCount(
  items: WorkoutExecutionItem[],
  state: WorkoutExecutionState,
) {
  const completedItemKeys = new Set(state.completedItemKeys);

  return items.filter((item) => completedItemKeys.has(item.key)).length;
}

function TrainingExecutionItemCard({
  item,
  checked,
  onToggle,
}: {
  checked: boolean;
  item: WorkoutExecutionItem;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const metric =
    item.type === 'stretch'
      ? `${item.metric} ${t('training.active.seconds')}`
      : item.metric;

  return (
    <label
      className={`grid cursor-pointer gap-2 rounded-2xl p-3 transition-colors ${
        checked ? 'bg-primary/10 ring-1 ring-primary/35' : 'bg-secondary'
      }`}
    >
      <span className="grid grid-cols-[auto,minmax(0,1fr)] items-start gap-3">
        <input
          checked={checked}
          className="mt-1 h-5 w-5 shrink-0 accent-primary"
          onChange={onToggle}
          type="checkbox"
        />
        <span className="grid min-w-0 gap-1">
          <span className="break-words font-black">{item.name}</span>
          <span className="text-xs font-black text-primary">{metric}</span>
        </span>
      </span>
      <span className="grid gap-1 border-t border-border/70 pt-2">
        <span className="text-xs font-bold text-muted-foreground">{item.motive}</span>
        <span className="text-sm text-foreground">{item.instructions}</span>
        {item.observations ? (
          <span className="text-sm font-semibold text-muted-foreground">
            {t('training.active.observations')}: {item.observations}
          </span>
        ) : null}
      </span>
    </label>
  );
}

function TrainingExecutionPanel({
  items,
  onFinish,
  onToggleItem,
  session,
  state,
}: {
  items: WorkoutExecutionItem[];
  onFinish: () => void;
  onToggleItem: (itemKey: string) => void;
  session: TrainingSession;
  state: WorkoutExecutionState;
}) {
  const { t } = useTranslation();
  const completedItemKeys = new Set(state.completedItemKeys);
  const stretchItems = items.filter((item) => item.type === 'stretch');
  const exerciseItems = items.filter((item) => item.type === 'exercise');
  const done = getCompletedItemCount(items, state);
  const total = items.length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  const renderItems = (
    sectionItems: WorkoutExecutionItem[],
    emptyMessage: string,
  ) => {
    if (sectionItems.length === 0) {
      return (
        <p className="rounded-2xl bg-secondary p-3 text-sm font-semibold text-muted-foreground">
          {emptyMessage}
        </p>
      );
    }

    return sectionItems.map((item) => (
      <TrainingExecutionItemCard
        checked={completedItemKeys.has(item.key)}
        item={item}
        key={item.key}
        onToggle={() => onToggleItem(item.key)}
      />
    ));
  };

  return (
    <div className="grid gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-3">
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-bold text-primary">
              {t('training.active.execution.inProgress')}
            </p>
            <h3 className="break-words text-lg font-black">{session.foco}</h3>
          </div>
          <Badge className="w-fit" variant="secondary">
            {t('training.active.execution.progress', { done, total })}
          </Badge>
        </div>
        <div
          aria-hidden="true"
          className="h-2 overflow-hidden rounded-full bg-secondary"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <section className="grid gap-2">
        <h3 className="text-sm font-black">{t('training.active.stretches')}</h3>
        {renderItems(stretchItems, t('training.active.emptyStretches'))}
      </section>

      <section className="grid gap-2">
        <h3 className="text-sm font-black">{t('training.active.exercises')}</h3>
        {renderItems(exerciseItems, t('training.active.emptyExercises'))}
      </section>

      <Button className="justify-self-start" onClick={onFinish} type="button">
        <CheckCircle2 aria-hidden size={16} />
        {t('training.active.execution.finish')}
      </Button>
    </div>
  );
}

function SportCompletionAnimation({
  label,
  modality,
}: {
  label: string;
  modality: TrainingModality;
}) {
  return (
    <div
      aria-label={label}
      className="relative mx-auto h-28 w-full max-w-xs overflow-hidden rounded-2xl border border-primary/30 bg-primary/10"
      data-sport={modality}
      data-testid="workout-completion-sport-animation"
    >
      <span className="absolute inset-x-8 bottom-5 h-0.5 rounded-full bg-primary/35" />
      {modality === 'volei' ? (
        <>
          <span
            aria-hidden="true"
            className="volleyball-spike-player absolute -bottom-8 left-2 z-10 h-40 w-40"
            data-testid="volleyball-spike-net"
          >
            <img
              alt=""
              aria-hidden="true"
              className="h-full w-full object-contain"
              data-testid="volleyball-spike-player-asset"
              decoding="async"
              height={640}
              src="/sports/volleyball-spike-attacker.png"
              width={640}
            />
          </span>
          <span
            aria-hidden="true"
            className="volleyball-spike-ball absolute left-[31%] top-[11%] z-20 h-4 w-4 rounded-full border-2 border-primary bg-card shadow-lg"
            data-testid="volleyball-spike-ball"
          />
          <span
            aria-hidden="true"
            className="volleyball-spike-trail absolute left-[36%] top-[18%] z-10 h-0.5 w-[4.5rem] rounded-full bg-primary/40"
          />
        </>
      ) : null}
      {modality === 'basquete' ? (
        <>
          <span
            aria-hidden="true"
            className="basketball-shot-player absolute -bottom-7 left-9 z-10 h-40 w-40"
            data-testid="basketball-shot-hoop"
          >
            <img
              alt=""
              aria-hidden="true"
              className="h-full w-full object-contain"
              data-testid="basketball-shot-player-asset"
              decoding="async"
              height={640}
              src="/sports/basketball-dunk-player.png"
              width={640}
            />
          </span>
          <span
            aria-hidden="true"
            className="basketball-shot-ball absolute left-[42%] top-[12%] z-20 h-4 w-4 rounded-full border-2"
            data-testid="basketball-shot-ball"
          />
          <span
            aria-hidden="true"
            className="basketball-shot-trail absolute left-[45%] top-[20%] z-10 h-0.5 w-16 rounded-full bg-primary/40"
          />
        </>
      ) : null}
      {modality === 'futebol_futsal' ? (
        <>
          <span
            aria-hidden="true"
            className="football-kick-player absolute -bottom-7 left-1 z-10 h-40 w-40"
            data-testid="football-kick-goal"
          >
            <img
              alt=""
              aria-hidden="true"
              className="h-full w-full object-contain"
              data-testid="football-kick-player-asset"
              decoding="async"
              height={640}
              src="/sports/football-kick-player.png"
              width={640}
            />
          </span>
          <span
            aria-hidden="true"
            className="football-kick-ball absolute bottom-8 left-[39%] z-20 h-4 w-4 rounded-full border-2"
            data-testid="football-kick-ball"
          />
          <span
            aria-hidden="true"
            className="football-kick-trail absolute bottom-9 left-[31%] z-10 h-0.5 w-[4.5rem] rounded-full bg-primary/40"
          />
        </>
      ) : null}
      {modality === 'beach_tenis' ? (
        <>
          <span
            aria-hidden="true"
            className="beach-tennis-swing-player absolute -bottom-1 left-2 z-10 h-[7.5rem] w-48"
            data-testid="beach-tennis-swing-net"
          >
            <img
              alt=""
              aria-hidden="true"
              className="h-full w-full object-contain"
              data-testid="beach-tennis-swing-player-asset"
              decoding="async"
              height={426}
              src="/sports/beach-tennis-swing-player.png"
              width={640}
            />
          </span>
          <span
            aria-hidden="true"
            className="beach-tennis-swing-ball absolute left-[48%] top-[19%] z-20 h-3.5 w-3.5 rounded-full border-2"
            data-testid="beach-tennis-swing-ball"
          />
          <span
            aria-hidden="true"
            className="beach-tennis-swing-trail absolute left-[43%] top-[28%] z-10 h-0.5 w-16 rounded-full bg-accent/55"
          />
        </>
      ) : null}
    </div>
  );
}

export function TrainingActivePlan({ plan }: { plan: MonthlyTrainingPlan }) {
  const { i18n, t } = useTranslation();
  const [openSessionIndex, setOpenSessionIndex] = useState(-1);
  const [pendingFinishSessionId, setPendingFinishSessionId] = useState<string | null>(
    null,
  );
  const [completionSessionId, setCompletionSessionId] = useState<string | null>(null);
  const completeDialogPrimaryActionRef = useRef<HTMLButtonElement>(null);
  const pendingDialogPrimaryActionRef = useRef<HTMLButtonElement>(null);
  const userId = plan.userId || plan.snapshot.userId;
  const sessionIds = useMemo(
    () =>
      plan.result.treinos.map((session, index) =>
        getWorkoutSessionId(session, index),
      ),
    [plan.result.treinos],
  );
  const [executionStates, setExecutionStates] = useState<
    Record<string, WorkoutExecutionState>
  >(() => {
    return Object.fromEntries(
      plan.result.treinos.flatMap((session, index) => {
        const sessionId = getWorkoutSessionId(session, index);
        const state = readWorkoutExecutionState({
          planId: plan.id,
          sessionId,
          userId,
        });

        return state ? [[sessionId, state]] : [];
      }),
    );
  });
  const executionItemsBySessionId = useMemo(
    () =>
      Object.fromEntries(
        plan.result.treinos.map((session, index) => [
          sessionIds[index],
          createWorkoutExecutionItems(session),
        ]),
      ) as Record<string, WorkoutExecutionItem[]>,
    [plan.result.treinos, sessionIds],
  );
  const hasInProgressSession = Object.values(executionStates).some(
    (state) => state.status === 'in_progress',
  );

  useEffect(() => {
    setExecutionStates(
      Object.fromEntries(
        plan.result.treinos.flatMap((session, index) => {
          const sessionId = getWorkoutSessionId(session, index);
          const state = readWorkoutExecutionState({
            planId: plan.id,
            sessionId,
            userId,
          });

          return state ? [[sessionId, state]] : [];
        }),
      ),
    );
  }, [plan.id, plan.result.treinos, userId]);

  useEffect(() => {
    for (const [sessionId, state] of Object.entries(executionStates)) {
      writeWorkoutExecutionState(
        {
          planId: plan.id,
          sessionId,
          userId,
        },
        state,
      );
    }
  }, [executionStates, plan.id, userId]);

  useEffect(() => {
    if (pendingFinishSessionId) {
      pendingDialogPrimaryActionRef.current?.focus();
    }
  }, [pendingFinishSessionId]);

  useEffect(() => {
    if (completionSessionId) {
      completeDialogPrimaryActionRef.current?.focus();
    }
  }, [completionSessionId]);

  const startWorkout = (session: TrainingSession, sessionIndex: number) => {
    const sessionId = sessionIds[sessionIndex];

    setExecutionStates((currentStates) => ({
      ...currentStates,
      [sessionId]: {
        completedAt: null,
        completedItemKeys:
          currentStates[sessionId]?.status === 'in_progress'
            ? currentStates[sessionId].completedItemKeys
            : [],
        modality: plan.snapshot.modalidade,
        planId: plan.id,
        sessionId,
        startedAt: new Date().toISOString(),
        status: 'in_progress',
      },
    }));
    setOpenSessionIndex(sessionIndex);
  };

  const toggleExecutionItem = (sessionId: string, itemKey: string) => {
    setExecutionStates((currentStates) => {
      const currentState = currentStates[sessionId];

      if (!currentState) {
        return currentStates;
      }

      return {
        ...currentStates,
        [sessionId]: toggleWorkoutExecutionItem(currentState, itemKey),
      };
    });
  };

  const completeWorkout = (sessionId: string) => {
    setExecutionStates((currentStates) => {
      const currentState = currentStates[sessionId];

      if (!currentState) {
        return currentStates;
      }

      return {
        ...currentStates,
        [sessionId]: {
          ...currentState,
          completedAt: new Date().toISOString(),
          status: 'completed',
        },
      };
    });
    setPendingFinishSessionId(null);
    setCompletionSessionId(sessionId);
  };

  const requestWorkoutFinish = (sessionId: string) => {
    const state = executionStates[sessionId];
    const items = executionItemsBySessionId[sessionId] ?? [];

    if (!state) {
      return;
    }

    if (getCompletedItemCount(items, state) < items.length) {
      setPendingFinishSessionId(sessionId);
      return;
    }

    completeWorkout(sessionId);
  };

  const completedSessionIndex = completionSessionId
    ? sessionIds.indexOf(completionSessionId)
    : -1;
  const completionState = completionSessionId
    ? executionStates[completionSessionId]
    : null;

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid gap-4">
        <Card className="rounded-2xl border-primary/25">
          <CardHeader className="p-4">
            <Badge className="w-fit gap-1.5" variant="secondary">
              <CalendarDays aria-hidden size={14} />
              {t('training.active.generated', {
                date: formatDate(plan.generatedAt, i18n.language),
              })}
            </Badge>
            <CardTitle className="text-2xl font-black">
              {t('training.active.summary')}
            </CardTitle>
            <p className="text-sm font-semibold text-muted-foreground">
              {plan.result.resumo}
            </p>
          </CardHeader>
          <CardContent className="grid gap-3 p-4 pt-0">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="min-w-0 rounded-2xl bg-secondary p-3">
                <p className="text-xs font-bold text-muted-foreground">
                  {t('training.fields.modality')}
                </p>
                <p className="break-words font-black">
                  {t(`training.options.modalities.${plan.snapshot.modalidade}`)}
                </p>
              </div>
              <div className="min-w-0 rounded-2xl bg-secondary p-3">
                <p className="text-xs font-bold text-muted-foreground">
                  {t('training.fields.goals')}
                </p>
                <p className="break-words font-black">
                  {plan.snapshot.objetivos
                    .map((goal) => t(`training.options.goals.${goal}`))
                    .join(', ')}
                </p>
              </div>
              <div className="min-w-0 rounded-2xl bg-secondary p-3">
                <p className="text-xs font-bold text-muted-foreground">
                  {t('training.fields.frequency')}
                </p>
                <p className="break-words font-black">
                  {t(`training.options.availability.${plan.snapshot.tempoDisponivel}`)}
                </p>
              </div>
              <div className="min-w-0 rounded-2xl bg-secondary p-3">
                <p className="text-xs font-bold text-muted-foreground">
                  {t('training.fields.duration')}
                </p>
                <p className="font-black">
                  {plan.snapshot.duracaoTreinoMinutos} {t('training.active.minutes')}
                </p>
              </div>
            </div>
            <p className="text-sm font-bold text-primary">
              {t('training.active.nextGeneration', {
                date: formatDate(plan.availableForRegenerationAt, i18n.language),
              })}
            </p>
          </CardContent>
        </Card>

        {plan.result.treinos.map((session, index) => {
          const isOpen = openSessionIndex === index;
          const sessionId = sessionIds[index];
          const executionState = executionStates[sessionId];
          const executionItems = executionItemsBySessionId[sessionId] ?? [];
          const isInProgress = executionState?.status === 'in_progress';
          const progressText = executionState
            ? t('training.active.execution.progress', {
                done: getCompletedItemCount(executionItems, executionState),
                total: executionItems.length,
              })
            : null;

          return (
            <Card
              className={`rounded-2xl transition-colors ${
                isInProgress
                  ? 'border-primary/60 bg-primary/5 shadow-2xl shadow-primary/10'
                  : hasInProgressSession
                    ? 'opacity-85'
                    : ''
              }`}
              key={`${session.dia}-${session.foco}`}
            >
              <CardContent className="grid gap-3 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-bold text-primary">{session.dia}</p>
                      {isInProgress ? (
                        <Badge className="w-fit" variant="secondary">
                          {t('training.active.execution.inProgress')}
                        </Badge>
                      ) : null}
                    </div>
                    <h2 className="break-words text-xl font-black">{session.foco}</h2>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Timer aria-hidden size={14} />
                        {session.duracaoMinutos} {t('training.active.minutes')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Activity aria-hidden size={14} />
                        {t('training.active.stretchCount', {
                          count: session.alongamentos.length,
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Dumbbell aria-hidden size={14} />
                        {t('training.active.exerciseCount', {
                          count: session.exercicios.length,
                        })}
                      </span>
                      {progressText ? (
                        <span className="flex items-center gap-1 text-primary">
                          <CheckCircle2 aria-hidden size={14} />
                          {progressText}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="grid w-full grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:flex sm:w-auto sm:shrink-0 sm:flex-wrap sm:justify-end">
                    {!isInProgress ? (
                      <Button
                        aria-label={t('training.active.execution.startLabel', {
                          session: `${session.dia}: ${session.foco}`,
                        })}
                        className="w-full justify-center sm:w-auto"
                        onClick={() => startWorkout(session, index)}
                        size="sm"
                        type="button"
                      >
                        <Play aria-hidden size={16} />
                        {t('training.active.execution.start')}
                      </Button>
                    ) : null}
                    {!isInProgress ? (
                      <Button
                        aria-label={t('training.active.openDetailsLabel', {
                          session: `${session.dia}: ${session.foco}`,
                        })}
                        aria-expanded={isOpen}
                        className="w-full justify-center sm:w-auto"
                        onClick={() => setOpenSessionIndex(isOpen ? -1 : index)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <ChevronDown aria-hidden size={16} />
                        {t('training.active.openDetails')}
                      </Button>
                    ) : null}
                  </div>
                </div>
                {isInProgress && executionState ? (
                  <TrainingExecutionPanel
                    items={executionItems}
                    onFinish={() => requestWorkoutFinish(sessionId)}
                    onToggleItem={(itemKey) => toggleExecutionItem(sessionId, itemKey)}
                    session={session}
                    state={executionState}
                  />
                ) : isOpen ? (
                  <TrainingSessionDetail session={session} />
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
      <aside className="hidden lg:block">
        <Card className="sticky top-4 rounded-2xl">
          <CardContent className="grid gap-2 p-4 text-sm font-bold">
            <p className="text-muted-foreground">{t('training.monthlyLimitNotice')}</p>
            <p className="text-primary">
              {formatDate(plan.availableForRegenerationAt, i18n.language)}
            </p>
          </CardContent>
        </Card>
      </aside>
      {pendingFinishSessionId ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-background/80 p-4 backdrop-blur-sm sm:place-items-center">
          <div
            aria-describedby="workout-finish-confirm-description"
            aria-labelledby="workout-finish-confirm-title"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-primary/30 bg-card p-5 shadow-2xl"
            role="alertdialog"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <AlertTriangle aria-hidden="true" size={22} />
              </div>
              <div className="min-w-0">
                <h2
                  className="text-xl font-black leading-tight text-foreground"
                  id="workout-finish-confirm-title"
                >
                  {t('training.active.execution.pendingTitle')}
                </h2>
                <p
                  className="mt-2 text-sm font-semibold leading-relaxed text-muted-foreground"
                  id="workout-finish-confirm-description"
                >
                  {t('training.active.execution.pendingMessage')}
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                onClick={() => setPendingFinishSessionId(null)}
                type="button"
                variant="outline"
              >
                {t('training.active.execution.continueWorkout')}
              </Button>
              <Button
                onClick={() => completeWorkout(pendingFinishSessionId)}
                ref={pendingDialogPrimaryActionRef}
                type="button"
              >
                <CheckCircle2 aria-hidden size={16} />
                {t('training.active.execution.confirmFinish')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {completionState ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-background/80 p-4 backdrop-blur-sm sm:place-items-center">
          <div
            aria-describedby="workout-completion-description"
            aria-labelledby="workout-completion-title"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-primary/30 bg-card p-5 shadow-2xl"
            role="alertdialog"
          >
            <div className="grid gap-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Trophy aria-hidden="true" size={24} />
              </div>
              <SportCompletionAnimation
                label={t('training.active.execution.sportAnimationLabel')}
                modality={completionState.modality}
              />
              <div className="grid gap-2">
                <h2
                  className="text-2xl font-black leading-tight text-foreground"
                  id="workout-completion-title"
                >
                  {t('training.active.execution.completeTitle')}
                </h2>
                <p
                  className="text-sm font-semibold leading-relaxed text-muted-foreground"
                  id="workout-completion-description"
                >
                  {t('training.active.execution.completeMessage')}
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                onClick={() => {
                  setCompletionSessionId(null);
                  if (completedSessionIndex >= 0) {
                    setOpenSessionIndex(completedSessionIndex);
                  }
                }}
                type="button"
                variant="outline"
              >
                <RotateCcw aria-hidden size={16} />
                {t('training.active.execution.review')}
              </Button>
              <Button
                onClick={() => setCompletionSessionId(null)}
                ref={completeDialogPrimaryActionRef}
                type="button"
              >
                {t('training.active.execution.backToPlan')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
