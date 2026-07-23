import { useMemo, useState } from 'react';
import { Activity, Dumbbell, MapPin, Target, Timer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type {
  MonthlyTrainingPlanRequest,
  TrainingEquipment,
  TrainingGoal,
  TrainingInjury,
} from '@/training/training-plan.js';
import { useTrainingPlan } from '@/training/use-training-plan.js';
import { FieldGroup, OptionChip } from './training-form-controls.js';
import { Button } from './ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card.js';

const initialForm: MonthlyTrainingPlanRequest = {
  alturaCm: 180,
  duracaoTreinoMinutos: 60,
  equipamentos: [{ tipo: 'nenhum' }],
  lesoes: [],
  localTreino: 'casa',
  modalidade: 'volei',
  nivelExperiencia: 'intermediario',
  objetivos: ['performance'],
  pesoKg: 80,
  tempoDisponivel: '3x_semana',
};

const steps = ['objective', 'body', 'routine', 'safety', 'review'] as const;

export function TrainingPlanWizard() {
  const { t } = useTranslation();
  const { createMonthlyPlan, isGenerating, state } = useTrainingPlan();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [form, setForm] = useState<MonthlyTrainingPlanRequest>(() => {
    const profile = state?.athleticProfile;

    if (!profile) {
      return initialForm;
    }

    return {
      ...initialForm,
      alturaCm: profile.alturaCm,
      equipamentos: profile.equipamentosDisponiveis,
      lesoes: profile.lesoesRecorrentes,
      localTreino: profile.localTreinoComum,
      modalidade: profile.modalidadePreferida,
      nivelExperiencia: profile.nivelExperiencia,
      pesoKg: profile.pesoKg,
    };
  });

  const currentStep = steps[currentStepIndex];
  const progress = Math.round(((currentStepIndex + 1) / steps.length) * 100);

  function toggleGoal(goal: TrainingGoal) {
    setForm((current) => ({
      ...current,
      objetivos: current.objetivos.includes(goal)
        ? current.objetivos.length === 1
          ? current.objetivos
          : current.objetivos.filter((item) => item !== goal)
        : [...current.objetivos, goal],
    }));
  }

  function toggleEquipment(equipment: TrainingEquipment) {
    setForm((current) => {
      if (equipment.tipo === 'nenhum') {
        return { ...current, equipamentos: [{ tipo: 'nenhum' }] };
      }

      const withoutNone = current.equipamentos.filter(
        (item) => item.tipo !== 'nenhum',
      );
      const exists = withoutNone.some((item) => item.tipo === equipment.tipo);

      return {
        ...current,
        equipamentos: exists
          ? withoutNone.filter((item) => item.tipo !== equipment.tipo)
          : [...withoutNone, equipment],
      };
    });
  }

  const canContinue = useMemo(() => {
    if (currentStep === 'objective') {
      return form.objetivos.length > 0;
    }

    if (currentStep === 'safety') {
      return form.equipamentos.length > 0;
    }

    return true;
  }, [currentStep, form.equipamentos.length, form.objetivos.length]);

  async function submit() {
    const result = await createMonthlyPlan(form);

    if (result.ok) {
      setCurrentStepIndex(0);
    }
  }

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="rounded-2xl">
        <CardHeader className="p-4">
          <p className="text-xs font-black text-primary">
            {t('training.stepLabel', {
              current: currentStepIndex + 1,
              total: steps.length,
            })}
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${progress}%` }}
            />
          </div>
          <CardTitle className="text-2xl font-black">
            {t(`training.steps.${currentStep}`)}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 p-4 pt-0">
          {currentStep === 'objective' ? (
            <FieldGroup title={t('training.fields.modality')}>
              <OptionChip
                active={form.modalidade === 'volei'}
                icon={Target}
                label={t('training.options.modalities.volei')}
                onClick={() =>
                  setForm((current) => ({ ...current, modalidade: 'volei' }))
                }
              />
              <OptionChip
                active={form.objetivos.includes('performance')}
                icon={Activity}
                label={t('training.options.goals.performance')}
                onClick={() => toggleGoal('performance')}
              />
            </FieldGroup>
          ) : null}

          {currentStep === 'body' ? (
            <FieldGroup title={t('training.fields.body')}>
              <label className="grid gap-1 text-sm font-bold">
                {t('training.fields.weight')}
                <input
                  className="min-h-12 rounded-2xl border border-input bg-background px-4"
                  inputMode="decimal"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      pesoKg: Number(event.target.value),
                    }))
                  }
                  value={form.pesoKg}
                />
              </label>
              <label className="grid gap-1 text-sm font-bold">
                {t('training.fields.height')}
                <input
                  className="min-h-12 rounded-2xl border border-input bg-background px-4"
                  inputMode="numeric"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      alturaCm: Number(event.target.value),
                    }))
                  }
                  value={form.alturaCm}
                />
              </label>
              <OptionChip
                active={form.nivelExperiencia === 'intermediario'}
                label={t('training.options.experience.intermediario')}
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    nivelExperiencia: 'intermediario',
                  }))
                }
              />
            </FieldGroup>
          ) : null}

          {currentStep === 'routine' ? (
            <FieldGroup title={t('training.fields.routine')}>
              <OptionChip
                active={form.tempoDisponivel === '3x_semana'}
                icon={Timer}
                label={t('training.options.availability.3x_semana')}
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    tempoDisponivel: '3x_semana',
                  }))
                }
              />
              <OptionChip
                active={form.duracaoTreinoMinutos === 60}
                label={t('training.options.duration.60')}
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    duracaoTreinoMinutos: 60,
                  }))
                }
              />
            </FieldGroup>
          ) : null}

          {currentStep === 'safety' ? (
            <FieldGroup title={t('training.fields.safety')}>
              <OptionChip
                active={form.localTreino === 'casa'}
                icon={MapPin}
                label={t('training.options.places.casa')}
                onClick={() =>
                  setForm((current) => ({ ...current, localTreino: 'casa' }))
                }
              />
              <OptionChip
                active={form.equipamentos.some((item) => item.tipo === 'halteres')}
                icon={Dumbbell}
                label={t('training.options.equipment.halteres')}
                onClick={() => toggleEquipment({ tipo: 'halteres' })}
              />
              <OptionChip
                active={form.lesoes.length === 0}
                label={t('training.options.injuries.none')}
                onClick={() =>
                  setForm((current) => ({ ...current, lesoes: [] as TrainingInjury[] }))
                }
              />
            </FieldGroup>
          ) : null}

          {currentStep === 'review' ? (
            <dl className="grid gap-2 text-sm font-bold">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">
                  {t('training.fields.modality')}
                </dt>
                <dd>{t(`training.options.modalities.${form.modalidade}`)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">
                  {t('training.fields.frequency')}
                </dt>
                <dd>{t(`training.options.availability.${form.tempoDisponivel}`)}</dd>
              </div>
            </dl>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <Button
              disabled={currentStepIndex === 0}
              onClick={() => setCurrentStepIndex((index) => Math.max(0, index - 1))}
              type="button"
              variant="outline"
            >
              {t('training.back')}
            </Button>
            {currentStep === 'review' ? (
              <Button disabled={isGenerating} onClick={submit} type="button">
                {isGenerating ? t('training.generating') : t('training.generate')}
              </Button>
            ) : (
              <Button
                disabled={!canContinue}
                onClick={() =>
                  setCurrentStepIndex((index) => Math.min(steps.length - 1, index + 1))
                }
                type="button"
              >
                {t('training.continue')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      <aside className="hidden lg:block">
        <Card className="sticky top-4 rounded-2xl">
          <CardContent className="p-4 text-sm font-bold text-muted-foreground">
            {t('training.monthlyLimitNotice')}
          </CardContent>
        </Card>
      </aside>
    </section>
  );
}
