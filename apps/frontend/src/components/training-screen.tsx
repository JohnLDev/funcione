import { Dumbbell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TrainingPlanProvider } from '@/training/training-plan-provider.js';
import { useTrainingPlan } from '@/training/use-training-plan.js';
import { TrainingActivePlan } from './training-active-plan.js';
import { TrainingPlanWizard } from './training-plan-wizard.js';

function TrainingScreenContent() {
  const { t } = useTranslation();
  const { isLoading, state } = useTrainingPlan();

  if (isLoading) {
    return (
      <section className="mt-5">
        <p className="text-sm font-bold text-muted-foreground">
          {t('training.loading')}
        </p>
      </section>
    );
  }

  return (
    <section className="mt-5 grid w-full gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Dumbbell aria-hidden="true" size={22} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-primary">{t('brand.byline')}</p>
          <h1 className="text-2xl font-black leading-tight text-foreground">
            {state?.activePlan ? t('training.activeTitle') : t('training.newTitle')}
          </h1>
        </div>
      </div>
      {state?.activePlan ? (
        <TrainingActivePlan plan={state.activePlan} />
      ) : (
        <TrainingPlanWizard />
      )}
    </section>
  );
}

export function TrainingScreen() {
  return (
    <TrainingPlanProvider>
      <TrainingScreenContent />
    </TrainingPlanProvider>
  );
}
