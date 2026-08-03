import {
  AlertCircle,
  CalendarDays,
  Dumbbell,
  RefreshCw,
  UserRound,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { DesktopSidebarAd, PreFooterAd } from '@/ads/ad-placements.js';
import { useAuth } from '@/auth/use-auth.js';
import { TrainingPlanProvider } from '@/training/training-plan-provider.js';
import { useTrainingPlan } from '@/training/use-training-plan.js';
import type { MonthlyTrainingPlan } from '@/training/training-plan.js';
import { AppLoading } from './app-loading.js';
import { Badge } from './ui/badge.js';
import { Button } from './ui/button.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card.js';

function formatDate(value: string, language: string) {
  return new Intl.DateTimeFormat(language, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function DashboardTrainingCard({
  activePlan,
}: {
  activePlan: MonthlyTrainingPlan | null;
}) {
  const { i18n, t } = useTranslation();

  if (!activePlan) {
    return (
      <Card className="rounded-2xl border-primary/25 bg-card/88">
        <CardHeader className="p-5">
          <Badge className="w-fit" variant="secondary">
            <Dumbbell aria-hidden size={14} />
            {t('dashboard.trainingBadge')}
          </Badge>
          <CardTitle className="text-3xl font-black">
            {t('dashboard.requestTitle')}
          </CardTitle>
          <CardDescription className="max-w-2xl font-semibold">
            {t('dashboard.requestDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <Button asChild className="w-full sm:w-auto">
            <Link to="/training">
              <Dumbbell aria-hidden size={18} />
              {t('actions.requestWorkout')}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-primary/25 bg-card/88">
      <CardHeader className="p-5">
        <Badge className="w-fit" variant="secondary">
          <CalendarDays aria-hidden size={14} />
          {t('training.active.generated', {
            date: formatDate(activePlan.generatedAt, i18n.language),
          })}
        </Badge>
        <CardTitle className="text-3xl font-black">
          {t('dashboard.activeTitle')}
        </CardTitle>
        <CardDescription className="max-w-2xl font-semibold">
          {activePlan.result.resumo}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 p-5 pt-0">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-2xl bg-secondary p-3">
            <p className="text-xs font-bold text-muted-foreground">
              {t('training.fields.modality')}
            </p>
            <p className="font-black">
              {t(`training.options.modalities.${activePlan.snapshot.modalidade}`)}
            </p>
          </div>
          <div className="rounded-2xl bg-secondary p-3">
            <p className="text-xs font-bold text-muted-foreground">
              {t('training.fields.duration')}
            </p>
            <p className="font-black">
              {activePlan.snapshot.duracaoTreinoMinutos}{' '}
              {t('training.active.minutes')}
            </p>
          </div>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link to="/training">
            <Dumbbell aria-hidden size={18} />
            {t('dashboard.openTraining')}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function DashboardContent() {
  const { t } = useTranslation();
  const { profileState, session } = useAuth();
  const { errorMessage, isLoading, reload, state } = useTrainingPlan();
  const profile = profileState?.profile;
  const hasPublisherContent = Boolean(state?.activePlan);
  const displayName =
    profile ? `${profile.firstName} ${profile.lastName}` : session?.user.fullName;

  if (isLoading && !state) {
    return (
      <section className="mt-5">
        <AppLoading
          className="min-h-56"
          description={t('training.loadingDescription')}
          label={t('training.loading')}
        />
      </section>
    );
  }

  return (
    <section className="mt-5 grid gap-4">
      <div className="rounded-2xl border border-border bg-card/72 p-5 shadow-sm">
        <p className="text-sm font-bold text-primary">
          {t('dashboard.welcomeEyebrow', {
            name: displayName ?? t('auth.signedInFallback'),
          })}
        </p>
        <h2 className="mt-2 text-3xl font-black leading-tight text-foreground">
          {t('dashboard.welcomeTitle')}
        </h2>
        <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-muted-foreground">
          {t('dashboard.welcomeText')}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-4">
          {errorMessage ? (
            <div
              className="flex flex-col gap-3 rounded-2xl border border-destructive/35 bg-destructive/10 p-4 sm:flex-row sm:items-center sm:justify-between"
              role="alert"
            >
              <p className="flex min-w-0 items-start gap-2 break-words text-sm font-bold text-foreground">
                <AlertCircle aria-hidden className="mt-0.5 shrink-0" size={18} />
                {errorMessage}
              </p>
              <Button
                className="shrink-0"
                onClick={() => void reload({ force: true })}
                type="button"
                variant="outline"
              >
                <RefreshCw aria-hidden size={16} />
                {t('training.retry')}
              </Button>
            </div>
          ) : null}
          <DashboardTrainingCard activePlan={state?.activePlan ?? null} />
        </div>

        <aside className="grid content-start gap-4">
          <Card className="rounded-2xl bg-card/88">
            <CardHeader className="p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary">
                <UserRound aria-hidden size={20} />
              </div>
              <CardTitle>{t('dashboard.profileCardTitle')}</CardTitle>
              <CardDescription className="font-semibold">
                {displayName ?? t('auth.signedInFallback')}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 p-4 pt-0">
              <p className="truncate text-sm font-bold text-muted-foreground">
                {profile?.email ?? session?.user.email}
              </p>
              <Button asChild className="w-full" variant="outline">
                <Link to="/profile">
                  <UserRound aria-hidden size={18} />
                  {t('dashboard.openProfile')}
                </Link>
              </Button>
            </CardContent>
          </Card>
          <DesktopSidebarAd suppress={!hasPublisherContent} />
        </aside>
      </div>
      <PreFooterAd suppress={!hasPublisherContent} />
    </section>
  );
}

export function DashboardScreen() {
  return (
    <TrainingPlanProvider>
      <DashboardContent />
    </TrainingPlanProvider>
  );
}
