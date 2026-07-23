import { Dumbbell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TrainingPlanProvider } from '@/training/training-plan-provider.js';
import { useTrainingPlan } from '@/training/use-training-plan.js';
import { TrainingPlanWizard } from './training-plan-wizard.js';
import { Card, CardContent } from './ui/card.js';

function TrainingScreenContent() {
  const { t } = useTranslation();
  const { isLoading, state } = useTrainingPlan();

  if (isLoading) {
    return (
      <p className="text-sm font-bold text-muted-foreground">
        {t('training.loading')}
      </p>
    );
  }

  return (
    <main className="min-h-dvh overflow-x-hidden px-4 pb-24 pt-4 sm:px-6 md:px-8">
      <section className="mx-auto grid w-full max-w-5xl gap-4">
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
          <Card className="rounded-2xl">
            <CardContent className="p-4">
              <p className="text-xl font-black">{t('training.activeTitle')}</p>
            </CardContent>
          </Card>
        ) : (
          <TrainingPlanWizard />
        )}
      </section>
    </main>
  );
}

export function TrainingScreen() {
  return (
    <TrainingPlanProvider>
      <TrainingScreenContent />
    </TrainingPlanProvider>
  );
}
