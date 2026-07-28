import { Timer } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MonthlyTrainingPlanGeneration } from '@/training/training-plan.js';
import { Progress } from './ui/progress.js';

const preparationEstimateMs = 180_000;

export function getTrainingPreparationProgress(elapsedMs: number) {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) {
    return 8;
  }

  return Math.min(
    96,
    Math.round(8 + (Math.min(elapsedMs, preparationEstimateMs) / preparationEstimateMs) * 92),
  );
}

function formatRemainingTime(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

type TrainingPreparationProgressProps = {
  generation: MonthlyTrainingPlanGeneration;
};

export function TrainingPreparationProgress({
  generation,
}: TrainingPreparationProgressProps) {
  const { t } = useTranslation();
  const [observedAtMs, setObservedAtMs] = useState(() => Date.now());
  const createdAtMs = useMemo(() => {
    const parsed = new Date(generation.createdAt).getTime();

    return Number.isFinite(parsed) ? parsed : Date.now();
  }, [generation.createdAt]);
  const elapsedMs = Math.max(0, observedAtMs - createdAtMs);
  const remainingMs = Math.max(0, preparationEstimateMs - elapsedMs);
  const progress = getTrainingPreparationProgress(elapsedMs);
  const displayedAttempt = Math.min(
    Math.max(generation.attemptCount, 1),
    generation.maxAttempts,
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setObservedAtMs(Date.now());
    }, 1_000);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div
      aria-live="polite"
      className="grid gap-4 rounded-2xl border border-primary/25 bg-primary/10 p-4"
      role="status"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
          <span
            aria-hidden="true"
            className="absolute bottom-1 h-2 w-7 rounded-full bg-primary/20 animate-[training-prep-shadow_900ms_ease-in-out_infinite]"
          />
          <span
            aria-hidden="true"
            className="relative h-7 w-7 rounded-full bg-gradient-to-br from-primary to-accent shadow-lg animate-[training-prep-bounce_900ms_ease-in-out_infinite]"
            data-testid="training-preparation-bouncer"
          />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-black leading-tight text-foreground">
            {t('training.pendingTitle')}
          </p>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-muted-foreground">
            {t('training.pendingDescription')}
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        <Progress
          aria-label={t('training.preparationProgress.statusLabel')}
          className="h-3"
          value={progress}
        />
        <div className="flex flex-col gap-1 text-xs font-bold text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-1.5">
            <Timer aria-hidden="true" size={14} />
            {remainingMs > 0
              ? t('training.preparationProgress.remaining', {
                  time: formatRemainingTime(remainingMs),
                })
              : t('training.preparationProgress.extended')}
          </span>
          <span>
            {t('training.preparationProgress.attempt', {
              current: displayedAttempt,
              total: generation.maxAttempts,
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
