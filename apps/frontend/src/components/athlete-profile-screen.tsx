import { Dumbbell, IdCard, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { PreFooterAd } from '@/ads/ad-placements.js';
import { useAuth } from '@/auth/use-auth.js';
import { TrainingPlanProvider } from '@/training/training-plan-provider.js';
import { useTrainingPlan } from '@/training/use-training-plan.js';
import type {
  AthleticProfile,
  MonthlyTrainingPlan,
} from '@/training/training-plan.js';
import { AppLoading } from './app-loading.js';
import { Button } from './ui/button.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card.js';

type AthleteProfileViewModel = {
  alturaCm: number;
  localTreino: string;
  modalidade: string;
  nivelExperiencia: string;
  pesoKg: number;
};

function formatCpf(value: string) {
  return value.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

function formatDate(value: string, language: string) {
  return new Intl.DateTimeFormat(language, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function formatPhone(value: string) {
  return value.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
}

function getAthleteProfile(
  activePlan: MonthlyTrainingPlan | null,
  profile: AthleticProfile | null,
): AthleteProfileViewModel | null {
  if (profile) {
    return {
      alturaCm: profile.alturaCm,
      localTreino: profile.localTreinoComum,
      modalidade: profile.modalidadePreferida,
      nivelExperiencia: profile.nivelExperiencia,
      pesoKg: profile.pesoKg,
    };
  }

  if (!activePlan) {
    return null;
  }

  return {
    alturaCm: activePlan.snapshot.alturaCm,
    localTreino: activePlan.snapshot.localTreino,
    modalidade: activePlan.snapshot.modalidade,
    nivelExperiencia: activePlan.snapshot.nivelExperiencia,
    pesoKg: activePlan.snapshot.pesoKg,
  };
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-secondary p-3">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-foreground">
        {value}
      </p>
    </div>
  );
}

function AthleteProfileContent() {
  const { i18n, t } = useTranslation();
  const { profileState } = useAuth();
  const { isLoading, state } = useTrainingPlan();
  const registrationProfile = profileState?.profile;
  const athleteProfile = getAthleteProfile(
    state?.activePlan ?? null,
    state?.athleticProfile ?? null,
  );

  return (
    <section className="mt-5 grid gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <UserRound aria-hidden size={22} />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-black leading-tight text-foreground">
            {t('profile.title')}
          </h1>
        </div>
      </div>

      <div className="grid gap-4">
        <Card className="rounded-2xl">
          <CardHeader className="p-4">
            <IdCard aria-hidden className="text-primary" size={24} />
            <CardTitle>{t('profile.registrationTitle')}</CardTitle>
            <CardDescription className="font-semibold">
              {t('profile.registrationDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 p-4 pt-0 sm:grid-cols-2 xl:grid-cols-3">
            {registrationProfile ? (
              <>
                <ProfileRow
                  label={t('registration.firstName')}
                  value={registrationProfile.firstName}
                />
                <ProfileRow
                  label={t('registration.lastName')}
                  value={registrationProfile.lastName}
                />
                <ProfileRow
                  label={t('registration.email')}
                  value={registrationProfile.email}
                />
                <ProfileRow
                  label={t('registration.phoneNumber')}
                  value={formatPhone(registrationProfile.phoneNumber)}
                />
                <ProfileRow
                  label={t('registration.birthDate')}
                  value={formatDate(registrationProfile.birthDate, i18n.language)}
                />
                <ProfileRow
                  label={t('registration.cpf')}
                  value={formatCpf(registrationProfile.cpf)}
                />
              </>
            ) : (
              <p className="text-sm font-bold text-muted-foreground sm:col-span-2">
                {t('profile.registrationEmpty')}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="p-4">
            <Dumbbell aria-hidden className="text-primary" size={24} />
            <CardTitle>{t('profile.athleteTitle')}</CardTitle>
            <CardDescription className="font-semibold">
              {t('profile.athleteDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 p-4 pt-0">
            {isLoading && !state ? (
              <AppLoading
                compact
                description={t('training.loadingDescription')}
                label={t('training.loading')}
              />
            ) : athleteProfile ? (
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                <ProfileRow
                  label={t('training.fields.modality')}
                  value={t(
                    `training.options.modalities.${athleteProfile.modalidade}`,
                  )}
                />
                <ProfileRow
                  label={t('training.fields.experience')}
                  value={t(
                    `training.options.experience.${athleteProfile.nivelExperiencia}`,
                  )}
                />
                <ProfileRow
                  label={t('training.fields.height')}
                  value={`${athleteProfile.alturaCm} cm`}
                />
                <ProfileRow
                  label={t('training.fields.weight')}
                  value={`${athleteProfile.pesoKg} kg`}
                />
                <ProfileRow
                  label={t('training.fields.place')}
                  value={t(`training.options.places.${athleteProfile.localTreino}`)}
                />
              </div>
            ) : (
              <>
                <p className="text-sm font-bold text-muted-foreground">
                  {t('profile.athleteEmpty')}
                </p>
                <Button asChild className="w-full sm:w-auto">
                  <Link to="/training">
                    <Dumbbell aria-hidden size={18} />
                    {t('actions.requestWorkout')}
                  </Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <PreFooterAd />
    </section>
  );
}

export function AthleteProfileScreen() {
  return (
    <TrainingPlanProvider>
      <AthleteProfileContent />
    </TrainingPlanProvider>
  );
}
