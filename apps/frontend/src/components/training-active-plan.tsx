import { useState } from 'react';
import { CalendarDays, ChevronDown, Dumbbell, Timer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type {
  MonthlyTrainingPlan,
  TrainingSession,
} from '@/training/training-plan.js';
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
              <p className="text-sm text-foreground">{item.instrucoesExecucao}</p>
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
            </article>
          ))
        )}
      </section>
    </div>
  );
}

export function TrainingActivePlan({ plan }: { plan: MonthlyTrainingPlan }) {
  const { i18n, t } = useTranslation();
  const [openSessionIndex, setOpenSessionIndex] = useState(-1);

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
            <div className="grid grid-cols-2 gap-2">
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

          return (
            <Card className="rounded-2xl" key={`${session.dia}-${session.foco}`}>
              <CardContent className="grid gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-primary">{session.dia}</p>
                    <h2 className="break-words text-xl font-black">{session.foco}</h2>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-muted-foreground">
                      <Timer aria-hidden size={14} />
                      {session.duracaoMinutos} {t('training.active.minutes')}
                      <Dumbbell aria-hidden size={14} />
                      {session.exercicios.length}
                    </p>
                  </div>
                  <Button
                    aria-label={t('training.active.openDetailsLabel', {
                      session: `${session.dia}: ${session.foco}`,
                    })}
                    aria-expanded={isOpen}
                    className="shrink-0"
                    onClick={() => setOpenSessionIndex(isOpen ? -1 : index)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <ChevronDown aria-hidden size={16} />
                    {t('training.active.openDetails')}
                  </Button>
                </div>
                {isOpen ? <TrainingSessionDetail session={session} /> : null}
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
    </section>
  );
}
