import { useMemo, useState, type ReactNode } from 'react';
import { Activity, Dumbbell, MapPin, Target, Timer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type {
  EquipmentType,
  ExperienceLevel,
  InjurySeverity,
  InjuryType,
  MonthlyTrainingPlanRequest,
  TrainingEquipment,
  TrainingGoal,
  TrainingInjury,
  TrainingModality,
  TrainingPlace,
  WeeklyAvailability,
} from '@/training/training-plan.js';
import { useTrainingPlan } from '@/training/use-training-plan.js';
import { FieldGroup, OptionChip } from './training-form-controls.js';
import { Button } from './ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card.js';

const modalities = ['volei', 'basquete', 'futebol_futsal', 'beach_tenis'] as const;
const goals = [
  'performance',
  'condicionamento',
  'prevencao_lesao',
  'perda_peso',
  'ganho_massa',
] as const;
const experienceLevels = [
  'iniciante',
  'intermediario',
  'avancado',
  'profissional',
] as const;
const availabilityOptions = [
  '2x_semana',
  '3x_semana',
  '4x_semana',
  '5x_semana',
  '6x_semana',
  '7x_semana',
] as const;
const durationOptions = [30, 45, 60, 75, 90] as const;
const places = ['academia', 'casa', 'ar_livre'] as const;
const equipmentOptions = [
  'nenhum',
  'halteres',
  'barra_anilhas',
  'elasticos',
  'banco_caixa',
  'colchonete',
  'cones',
  'corda',
  'maquinas_academia',
  'bola',
  'customizado',
] as const;
const injuryOptions = [
  'joelho',
  'tornozelo',
  'ombro',
  'lombar',
  'quadril',
  'punho',
  'customizada',
] as const;
const injurySeverities = ['leve', 'moderada', 'alta'] as const;

type InjuryDraft = {
  gravidade: InjurySeverity | '';
  observacoes: string;
};

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

export function normalizeFreeText(value: string, maxLength: number) {
  return value
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, maxLength);
}

export function finalizeFreeText(value: string, maxLength: number) {
  return value
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function uniqueTypes<T extends string>(types: readonly T[]): T[] {
  return [...new Set(types)];
}

function normalizeEquipment(
  equipment: TrainingEquipment[],
): TrainingEquipment[] {
  const normalizedEquipment: TrainingEquipment[] = [];
  const types = new Set<EquipmentType>();

  for (const item of equipment) {
    if (types.has(item.tipo)) {
      continue;
    }

    if (item.tipo === 'customizado') {
      const descricao = finalizeFreeText(item.descricao, 80);

      if (!descricao) {
        continue;
      }

      normalizedEquipment.push({ descricao, tipo: item.tipo });
      types.add(item.tipo);
      continue;
    }

    normalizedEquipment.push({ tipo: item.tipo });
    types.add(item.tipo);
  }

  return normalizedEquipment;
}

function normalizeInjuries(injuries: TrainingInjury[]): TrainingInjury[] {
  const normalizedInjuries: TrainingInjury[] = [];
  const types = new Set<InjuryType>();

  for (const injury of injuries) {
    if (types.has(injury.tipo)) {
      continue;
    }

    const observacoes = injury.observacoes
      ? finalizeFreeText(injury.observacoes, 180)
      : '';
    const observation = observacoes ? { observacoes } : {};

    if (injury.tipo === 'customizada') {
      const descricao = finalizeFreeText(injury.descricao, 120);

      if (!descricao) {
        continue;
      }

      normalizedInjuries.push({
        descricao,
        gravidade: injury.gravidade,
        tipo: injury.tipo,
        ...observation,
      });
      types.add(injury.tipo);
      continue;
    }

    normalizedInjuries.push({
      gravidade: injury.gravidade,
      tipo: injury.tipo,
      ...observation,
    });
    types.add(injury.tipo);
  }

  return normalizedInjuries;
}

function parsePositiveNumber(value: string): number | null {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function ReviewRow({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="grid min-w-0 gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words sm:text-right">{children}</dd>
    </div>
  );
}

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
      equipamentos: normalizeEquipment(profile.equipamentosDisponiveis),
      lesoes: normalizeInjuries(profile.lesoesRecorrentes),
      localTreino: profile.localTreinoComum,
      modalidade: profile.modalidadePreferida,
      nivelExperiencia: profile.nivelExperiencia,
      pesoKg: profile.pesoKg,
    };
  });
  const [bodyMeasurements, setBodyMeasurements] = useState(() => {
    const profile = state?.athleticProfile;

    return {
      alturaCm: String(profile?.alturaCm ?? initialForm.alturaCm),
      pesoKg: String(profile?.pesoKg ?? initialForm.pesoKg),
    };
  });
  const [selectedEquipmentTypes, setSelectedEquipmentTypes] = useState<
    EquipmentType[]
  >(() => uniqueTypes(form.equipamentos.map((equipment) => equipment.tipo)));
  const [customEquipmentDescription, setCustomEquipmentDescription] = useState(
    () =>
      finalizeFreeText(
        form.equipamentos.find((equipment) => equipment.tipo === 'customizado')
          ?.descricao ?? '',
        80,
      ),
  );
  const [hasInjuries, setHasInjuries] = useState(() => form.lesoes.length > 0);
  const [selectedInjuryTypes, setSelectedInjuryTypes] = useState<InjuryType[]>(
    () => uniqueTypes(form.lesoes.map((injury) => injury.tipo)),
  );
  const [customInjuryDescription, setCustomInjuryDescription] = useState(
    () =>
      finalizeFreeText(
        form.lesoes.find((injury) => injury.tipo === 'customizada')?.descricao ??
          '',
        120,
      ),
  );
  const [injuryDrafts, setInjuryDrafts] = useState<
    Partial<Record<InjuryType, InjuryDraft>>
  >(() =>
    Object.fromEntries(
      form.lesoes.map((injury) => [
        injury.tipo,
        {
          gravidade: injury.gravidade,
          observacoes: finalizeFreeText(injury.observacoes ?? '', 180),
        },
      ]),
    ),
  );

  const currentStep = steps[currentStepIndex];
  const progress = Math.round(((currentStepIndex + 1) / steps.length) * 100);
  const alturaCm = parsePositiveNumber(bodyMeasurements.alturaCm);
  const pesoKg = parsePositiveNumber(bodyMeasurements.pesoKg);
  const hasValidBodyMeasurements = alturaCm !== null && pesoKg !== null;
  const normalizedCustomEquipmentDescription = finalizeFreeText(
    customEquipmentDescription,
    80,
  );
  const normalizedCustomInjuryDescription = finalizeFreeText(
    customInjuryDescription,
    120,
  );
  const hasCustomEquipment = selectedEquipmentTypes.includes('customizado');
  const hasCustomInjury = selectedInjuryTypes.includes('customizada');
  const hasCompleteInjuryDrafts = selectedInjuryTypes.every(
    (injury) => Boolean(injuryDrafts[injury]?.gravidade),
  );
  const hasValidSafetyInputs =
    selectedEquipmentTypes.length > 0 &&
    (!hasCustomEquipment || normalizedCustomEquipmentDescription.length > 0) &&
    (!hasInjuries ||
      (selectedInjuryTypes.length > 0 &&
        hasCompleteInjuryDrafts &&
        (!hasCustomInjury || normalizedCustomInjuryDescription.length > 0)));
  const reviewEquipment = form.equipamentos
    .map((equipment) =>
      equipment.tipo === 'customizado'
        ? `${t('training.options.equipment.customizado')}: ${equipment.descricao}`
        : t(`training.options.equipment.${equipment.tipo}`),
    )
    .join(', ');
  const reviewInjuries = form.lesoes.map((injury) => {
    const injuryName =
      injury.tipo === 'customizada'
        ? `${t('training.options.injuries.customizada')}: ${injury.descricao}`
        : t(`training.options.injuries.${injury.tipo}`);
    const severity = t(
      `training.options.injurySeverity.${injury.gravidade}`,
    );

    return [injuryName, severity, injury.observacoes]
      .filter(Boolean)
      .join(' - ');
  });

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

  function toggleEquipment(equipment: EquipmentType) {
    setSelectedEquipmentTypes((current) => {
      if (equipment === 'nenhum') {
        return ['nenhum'];
      }

      const withoutNone = current.filter((item) => item !== 'nenhum');

      return withoutNone.includes(equipment)
        ? withoutNone.filter((item) => item !== equipment)
        : [...withoutNone, equipment];
    });
  }

  function toggleInjury(injury: InjuryType) {
    setHasInjuries(true);
    setSelectedInjuryTypes((current) => {
      if (current.includes(injury)) {
        return current.filter((item) => item !== injury);
      }

      setInjuryDrafts((drafts) => ({
        ...drafts,
        [injury]: drafts[injury] ?? { gravidade: '', observacoes: '' },
      }));

      return [...current, injury];
    });
  }

  function updateInjuryDraft(
    injury: InjuryType,
    update: Partial<InjuryDraft>,
  ) {
    setInjuryDrafts((drafts) => ({
      ...drafts,
      [injury]: {
        gravidade: '',
        observacoes: '',
        ...drafts[injury],
        ...update,
      },
    }));
  }

  function buildEquipment(): TrainingEquipment[] {
    const equipment: TrainingEquipment[] = [];

    for (const tipo of uniqueTypes(selectedEquipmentTypes)) {
      if (tipo === 'customizado') {
        if (normalizedCustomEquipmentDescription) {
          equipment.push({
            descricao: normalizedCustomEquipmentDescription,
            tipo,
          });
        }

        continue;
      }

      equipment.push({ tipo });
    }

    return equipment;
  }

  function buildInjuries(): TrainingInjury[] {
    if (!hasInjuries) {
      return [];
    }

    const injuries: TrainingInjury[] = [];

    for (const tipo of uniqueTypes(selectedInjuryTypes)) {
      const draft = injuryDrafts[tipo];

      if (!draft?.gravidade) {
        continue;
      }

      const normalizedObservation = finalizeFreeText(draft.observacoes, 180);
      const observation = normalizedObservation
        ? { observacoes: normalizedObservation }
        : {};

      if (tipo === 'customizada') {
        if (normalizedCustomInjuryDescription) {
          injuries.push({
            descricao: normalizedCustomInjuryDescription,
            gravidade: draft.gravidade,
            tipo,
            ...observation,
          });
        }

        continue;
      }

      injuries.push({ gravidade: draft.gravidade, tipo, ...observation });
    }

    return injuries;
  }

  const canContinue = useMemo(() => {
    if (currentStep === 'objective') {
      return form.objetivos.length > 0;
    }

    if (currentStep === 'body') {
      return hasValidBodyMeasurements;
    }

    if (currentStep === 'safety') {
      return hasValidSafetyInputs;
    }

    return true;
  }, [currentStep, form.objetivos.length, hasValidBodyMeasurements, hasValidSafetyInputs]);

  function continueWizard() {
    if (currentStep === 'safety') {
      if (!hasValidSafetyInputs) {
        return;
      }

      setForm((current) => ({
        ...current,
        equipamentos: buildEquipment(),
        lesoes: buildInjuries(),
      }));
    }

    setCurrentStepIndex((index) => Math.min(steps.length - 1, index + 1));
  }

  async function submit() {
    if (
      !hasValidBodyMeasurements ||
      !hasValidSafetyInputs ||
      alturaCm === null ||
      pesoKg === null
    ) {
      return;
    }

    const result = await createMonthlyPlan({
      ...form,
      alturaCm,
      pesoKg,
    });

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
            <>
              <FieldGroup title={t('training.fields.modality')}>
                {modalities.map((modality) => (
                  <OptionChip
                    active={form.modalidade === modality}
                    icon={Target}
                    key={modality}
                    label={t(`training.options.modalities.${modality}`)}
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        modalidade: modality as TrainingModality,
                      }))
                    }
                  />
                ))}
              </FieldGroup>
              <FieldGroup title={t('training.fields.goals')}>
                {goals.map((goal) => (
                  <OptionChip
                    active={form.objetivos.includes(goal)}
                    icon={Activity}
                    key={goal}
                    label={t(`training.options.goals.${goal}`)}
                    onClick={() => toggleGoal(goal)}
                  />
                ))}
              </FieldGroup>
            </>
          ) : null}

          {currentStep === 'body' ? (
            <FieldGroup title={t('training.fields.body')}>
              <label className="grid min-w-0 gap-1 text-sm font-bold">
                {t('training.fields.weight')}
                <input
                  className="min-h-12 w-full rounded-2xl border border-input bg-background px-4"
                  inputMode="decimal"
                  onChange={(event) =>
                    setBodyMeasurements((current) => ({
                      ...current,
                      pesoKg: event.target.value,
                    }))
                  }
                  value={bodyMeasurements.pesoKg}
                />
              </label>
              <label className="grid min-w-0 gap-1 text-sm font-bold">
                {t('training.fields.height')}
                <input
                  className="min-h-12 w-full rounded-2xl border border-input bg-background px-4"
                  inputMode="numeric"
                  onChange={(event) =>
                    setBodyMeasurements((current) => ({
                      ...current,
                      alturaCm: event.target.value,
                    }))
                  }
                  value={bodyMeasurements.alturaCm}
                />
              </label>
              {experienceLevels.map((level) => (
                <OptionChip
                  active={form.nivelExperiencia === level}
                  key={level}
                  label={t(`training.options.experience.${level}`)}
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      nivelExperiencia: level as ExperienceLevel,
                    }))
                  }
                />
              ))}
            </FieldGroup>
          ) : null}

          {currentStep === 'routine' ? (
            <>
              <FieldGroup title={t('training.fields.frequency')}>
                {availabilityOptions.map((availability) => (
                  <OptionChip
                    active={form.tempoDisponivel === availability}
                    icon={Timer}
                    key={availability}
                    label={t(`training.options.availability.${availability}`)}
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        tempoDisponivel: availability as WeeklyAvailability,
                      }))
                    }
                  />
                ))}
              </FieldGroup>
              <FieldGroup title={t('training.fields.duration')}>
                {durationOptions.map((duration) => (
                  <OptionChip
                    active={form.duracaoTreinoMinutos === duration}
                    key={duration}
                    label={t(`training.options.duration.${duration}`)}
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        duracaoTreinoMinutos: duration,
                      }))
                    }
                  />
                ))}
              </FieldGroup>
            </>
          ) : null}

          {currentStep === 'safety' ? (
            <>
              <FieldGroup title={t('training.fields.place')}>
                {places.map((place) => (
                  <OptionChip
                    active={form.localTreino === place}
                    icon={MapPin}
                    key={place}
                    label={t(`training.options.places.${place}`)}
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        localTreino: place as TrainingPlace,
                      }))
                    }
                  />
                ))}
              </FieldGroup>
              <FieldGroup title={t('training.fields.equipment')}>
                {equipmentOptions.map((equipment) => (
                  <OptionChip
                    active={selectedEquipmentTypes.includes(equipment)}
                    icon={Dumbbell}
                    key={equipment}
                    label={t(`training.options.equipment.${equipment}`)}
                    onClick={() => toggleEquipment(equipment)}
                  />
                ))}
                {hasCustomEquipment ? (
                  <label className="grid min-w-0 gap-1 text-sm font-bold sm:col-span-2">
                    {t('training.fields.customEquipment')}
                    <input
                      className="min-h-12 w-full rounded-2xl border border-input bg-background px-4"
                      maxLength={80}
                      onChange={(event) =>
                        setCustomEquipmentDescription(
                          normalizeFreeText(event.target.value, 80),
                        )
                      }
                      value={customEquipmentDescription}
                    />
                  </label>
                ) : null}
              </FieldGroup>
              <FieldGroup title={t('training.fields.injuries')}>
                <OptionChip
                  active={!hasInjuries}
                  label={t('training.options.injuries.none')}
                  onClick={() => {
                    setHasInjuries(false);
                    setSelectedInjuryTypes([]);
                  }}
                />
                <OptionChip
                  active={hasInjuries}
                  label={t('training.options.injuries.has')}
                  onClick={() => setHasInjuries(true)}
                />
                {hasInjuries
                  ? injuryOptions.map((injury) => (
                      <OptionChip
                        active={selectedInjuryTypes.includes(injury)}
                        key={injury}
                        label={t(`training.options.injuries.${injury}`)}
                        onClick={() => toggleInjury(injury)}
                      />
                    ))
                  : null}
                {hasInjuries
                  ? selectedInjuryTypes.map((injury) => {
                      const injuryLabel = t(
                        `training.options.injuries.${injury}`,
                      );
                      const draft = injuryDrafts[injury] ?? {
                        gravidade: '',
                        observacoes: '',
                      };

                      return (
                        <fieldset
                          className="grid min-w-0 gap-3 border-t border-border pt-3 sm:col-span-2 sm:grid-cols-2"
                          key={injury}
                        >
                          <legend className="mb-2 text-sm font-black text-foreground">
                            {injuryLabel}
                          </legend>
                          {injury === 'customizada' ? (
                            <label className="grid min-w-0 gap-1 text-sm font-bold sm:col-span-2">
                              {t('training.fields.customInjury')}
                              <input
                                className="min-h-12 w-full rounded-2xl border border-input bg-background px-4"
                                maxLength={120}
                                onChange={(event) =>
                                  setCustomInjuryDescription(
                                    normalizeFreeText(event.target.value, 120),
                                  )
                                }
                                value={customInjuryDescription}
                              />
                            </label>
                          ) : null}
                          <label className="grid min-w-0 gap-1 text-sm font-bold">
                            {t('training.fields.injurySeverityFor', {
                              injury: injuryLabel,
                            })}
                            <select
                              className="min-h-12 w-full rounded-2xl border border-input bg-background px-4"
                              onChange={(event) =>
                                updateInjuryDraft(injury, {
                                  gravidade: event.target.value as
                                    | InjurySeverity
                                    | '',
                                })
                              }
                              value={draft.gravidade}
                            >
                              <option value="">
                                {t('training.options.injurySeverity.placeholder')}
                              </option>
                              {injurySeverities.map((severity) => (
                                <option key={severity} value={severity}>
                                  {t(
                                    `training.options.injurySeverity.${severity}`,
                                  )}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="grid min-w-0 gap-1 text-sm font-bold">
                            {t('training.fields.injuryObservationFor', {
                              injury: injuryLabel,
                            })}
                            <input
                              className="min-h-12 w-full rounded-2xl border border-input bg-background px-4"
                              maxLength={180}
                              onChange={(event) =>
                                updateInjuryDraft(injury, {
                                  observacoes: normalizeFreeText(
                                    event.target.value,
                                    180,
                                  ),
                                })
                              }
                              value={draft.observacoes}
                            />
                          </label>
                        </fieldset>
                      );
                    })
                  : null}
              </FieldGroup>
            </>
          ) : null}

          {currentStep === 'review' ? (
            <dl className="grid gap-2 text-sm font-bold">
              <ReviewRow label={t('training.fields.modality')}>
                {t(`training.options.modalities.${form.modalidade}`)}
              </ReviewRow>
              <ReviewRow label={t('training.fields.goals')}>
                {form.objetivos
                  .map((goal) => t(`training.options.goals.${goal}`))
                  .join(', ')}
              </ReviewRow>
              <ReviewRow label={t('training.fields.weight')}>
                {pesoKg} kg
              </ReviewRow>
              <ReviewRow label={t('training.fields.height')}>
                {alturaCm} cm
              </ReviewRow>
              <ReviewRow label={t('training.fields.age')}>
                {t('training.review.backendCalculated')}
              </ReviewRow>
              <ReviewRow label={t('training.fields.experience')}>
                {t(`training.options.experience.${form.nivelExperiencia}`)}
              </ReviewRow>
              <ReviewRow label={t('training.fields.frequency')}>
                {t(`training.options.availability.${form.tempoDisponivel}`)}
              </ReviewRow>
              <ReviewRow label={t('training.fields.duration')}>
                {t(`training.options.duration.${form.duracaoTreinoMinutos}`)}
              </ReviewRow>
              <ReviewRow label={t('training.fields.place')}>
                {t(`training.options.places.${form.localTreino}`)}
              </ReviewRow>
              <ReviewRow label={t('training.fields.equipment')}>
                {reviewEquipment}
              </ReviewRow>
              <ReviewRow label={t('training.fields.injuries')}>
                {reviewInjuries.length > 0 ? (
                  <span className="grid gap-1">
                    {reviewInjuries.map((injury) => (
                      <span key={injury}>{injury}</span>
                    ))}
                  </span>
                ) : (
                  t('training.options.injuries.none')
                )}
              </ReviewRow>
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
              <Button
                disabled={
                  isGenerating || !hasValidBodyMeasurements || !hasValidSafetyInputs
                }
                onClick={submit}
                type="button"
              >
                {isGenerating ? t('training.generating') : t('training.generate')}
              </Button>
            ) : (
              <Button disabled={!canContinue} onClick={continueWizard} type="button">
                {t('training.continue')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      <aside>
        <Card className="sticky top-4 rounded-2xl">
          <CardContent className="p-4 text-sm font-bold text-muted-foreground">
            {t('training.monthlyLimitNotice')}
          </CardContent>
        </Card>
      </aside>
    </section>
  );
}
