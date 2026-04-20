import { useState, type ChangeEvent } from 'react';
import type { QuestionnaireAnswers, FitnessLevel, FitnessGoal, Equipment } from '../types';
import './QuestionnairePage.css';

interface Props {
  userName: string;
  onComplete: (answers: QuestionnaireAnswers) => void;
}

const TOTAL_STEPS = 6;

interface Option<T> {
  id: T;
  label: string;
  description: string;
  symbol: string;
}

const LEVEL_OPTIONS: Option<FitnessLevel>[] = [
  { id: 'beginner',     label: 'Iniciante',     description: 'Pouca ou nenhuma experiência com treinos',  symbol: '▲' },
  { id: 'intermediate', label: 'Intermediário',  description: 'Treino regular há alguns meses ou anos',    symbol: '▲▲' },
  { id: 'advanced',     label: 'Avançado',       description: 'Treino consistente e disciplinado há anos', symbol: '▲▲▲' },
];

const GOAL_OPTIONS: Option<FitnessGoal>[] = [
  { id: 'weight_loss',     label: 'Perda de Peso',        description: 'Queimar gordura e melhorar condicionamento',  symbol: '◎' },
  { id: 'muscle_gain',     label: 'Ganho Muscular',        description: 'Aumentar massa muscular e desenvolver força', symbol: '◆' },
  { id: 'endurance',       label: 'Resistência',           description: 'Melhorar capacidade aeróbica e resistência',  symbol: '►' },
  { id: 'flexibility',     label: 'Flexibilidade',         description: 'Aumentar mobilidade e amplitude',             symbol: '≈' },
  { id: 'general_fitness', label: 'Condicionamento Geral', description: 'Equilíbrio entre força, saúde e disposição',  symbol: '◉' },
];

const DAYS_OPTIONS: Option<number>[] = [
  { id: 2, label: '2 dias', description: 'Treino mínimo eficaz',  symbol: '2x' },
  { id: 3, label: '3 dias', description: 'Equilíbrio ideal',      symbol: '3x' },
  { id: 4, label: '4 dias', description: 'Alto volume',           symbol: '4x' },
  { id: 5, label: '5 dias', description: 'Dedicação máxima',      symbol: '5x' },
];

const EQUIPMENT_OPTIONS: Option<Equipment>[] = [
  { id: 'none',             label: 'Sem equipamento', description: 'Somente peso corporal',               symbol: '○' },
  { id: 'dumbbells',        label: 'Halteres',        description: 'Halteres e equipamentos básicos',     symbol: '◈' },
  { id: 'barbell',          label: 'Barra e anilhas', description: 'Barra olímpica e pesos livres',       symbol: '═' },
  { id: 'resistance_bands', label: 'Elásticos',       description: 'Faixas elásticas de resistência',     symbol: '~' },
  { id: 'pull_up_bar',      label: 'Barra fixa',      description: 'Barra para exercícios de suspensão',  symbol: '⊤' },
  { id: 'full_gym',         label: 'Academia',        description: 'Acesso completo a equipamentos',      symbol: '■' },
];

const STEPS = [
  { title: 'Qual é o seu nível de condicionamento?',  subtitle: 'Isso calibra a intensidade e o volume do treino.' },
  { title: 'Qual é o seu objetivo principal?',         subtitle: 'Vamos focar no que realmente importa para você.' },
  { title: 'Quantos dias por semana você pode treinar?', subtitle: 'Seja realista com a sua rotina semanal.' },
  { title: 'Qual equipamento você tem disponível?',    subtitle: 'Montaremos o treino com o que você tem acesso.' },
  { title: 'Suas medidas',                             subtitle: 'Usadas para personalizar ainda mais o plano.' },
  { title: 'Informações complementares',               subtitle: 'Opcional — pule se não houver nada a informar.' },
];

interface PhysicalFields {
  age: string;
  weightKg: string;
  heightCm: string;
}

export function QuestionnairePage({ userName, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<QuestionnaireAnswers>>({});
  const [physical, setPhysical] = useState<PhysicalFields>({ age: '', weightKg: '', heightCm: '' });
  const [restrictions, setRestrictions] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [physicalErrors, setPhysicalErrors] = useState<Partial<PhysicalFields>>({});

  function set<K extends keyof QuestionnaireAnswers>(key: K, value: QuestionnaireAnswers[K]) {
    setAnswers(prev => ({ ...prev, [key]: value }));
  }

  function validatePhysical(): boolean {
    const errors: Partial<PhysicalFields> = {};
    const age = Number(physical.age);
    const weight = Number(physical.weightKg);
    const height = Number(physical.heightCm);

    if (!physical.age || isNaN(age) || age < 10 || age > 100) {
      errors.age = 'Idade entre 10 e 100 anos';
    }
    if (!physical.weightKg || isNaN(weight) || weight <= 0) {
      errors.weightKg = 'Peso deve ser maior que 0';
    }
    if (!physical.heightCm || isNaN(height) || height <= 0) {
      errors.heightCm = 'Altura deve ser maior que 0';
    }

    setPhysicalErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function isStepValid(): boolean {
    if (step === 0) return !!answers.level;
    if (step === 1) return !!answers.goal;
    if (step === 2) return !!answers.daysPerWeek;
    if (step === 3) return !!answers.equipment;
    if (step === 4) {
      const age = Number(physical.age);
      const w = Number(physical.weightKg);
      const h = Number(physical.heightCm);
      return (
        !!physical.age && !isNaN(age) && age >= 10 && age <= 100 &&
        !!physical.weightKg && !isNaN(w) && w > 0 &&
        !!physical.heightCm && !isNaN(h) && h > 0
      );
    }
    if (step === 5) return true; // optional step
    return false;
  }

  function handleNext() {
    if (step === 4 && !validatePhysical()) return;
    if (!isStepValid()) return;

    if (step < TOTAL_STEPS - 1) {
      setStep(s => s + 1);
    } else {
      onComplete({
        ...(answers as Pick<QuestionnaireAnswers, 'level' | 'goal' | 'daysPerWeek' | 'equipment'>),
        age: Number(physical.age),
        weightKg: Number(physical.weightKg),
        heightCm: Number(physical.heightCm),
        restrictions,
        additionalInfo,
      });
    }
  }

  function handlePhysical(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setPhysical(prev => ({ ...prev, [name]: value }));
    setPhysicalErrors(prev => ({ ...prev, [name]: undefined }));
  }

  function renderOptions() {
    if (step === 0) {
      return LEVEL_OPTIONS.map(opt => (
        <button
          key={opt.id}
          className={`q-card ${answers.level === opt.id ? 'q-card--selected' : ''}`}
          onClick={() => set('level', opt.id)}
        >
          <span className="q-card-symbol">{opt.symbol}</span>
          <div className="q-card-text">
            <strong>{opt.label}</strong>
            <span>{opt.description}</span>
          </div>
          <div className="q-card-check" />
        </button>
      ));
    }

    if (step === 1) {
      return GOAL_OPTIONS.map(opt => (
        <button
          key={opt.id}
          className={`q-card ${answers.goal === opt.id ? 'q-card--selected' : ''}`}
          onClick={() => set('goal', opt.id)}
        >
          <span className="q-card-symbol">{opt.symbol}</span>
          <div className="q-card-text">
            <strong>{opt.label}</strong>
            <span>{opt.description}</span>
          </div>
          <div className="q-card-check" />
        </button>
      ));
    }

    if (step === 2) {
      return (
        <div className="q-days-grid">
          {DAYS_OPTIONS.map(opt => (
            <button
              key={opt.id}
              className={`q-days-card ${answers.daysPerWeek === opt.id ? 'q-days-card--selected' : ''}`}
              onClick={() => set('daysPerWeek', opt.id as QuestionnaireAnswers['daysPerWeek'])}
            >
              <span className="q-days-symbol">{opt.symbol}</span>
              <strong>{opt.label}</strong>
              <span>{opt.description}</span>
            </button>
          ))}
        </div>
      );
    }

    if (step === 3) {
      return EQUIPMENT_OPTIONS.map(opt => (
        <button
          key={opt.id}
          className={`q-card ${answers.equipment === opt.id ? 'q-card--selected' : ''}`}
          onClick={() => set('equipment', opt.id)}
        >
          <span className="q-card-symbol">{opt.symbol}</span>
          <div className="q-card-text">
            <strong>{opt.label}</strong>
            <span>{opt.description}</span>
          </div>
          <div className="q-card-check" />
        </button>
      ));
    }

    if (step === 4) {
      return (
        <div className="q-physical">
          <div className="q-field">
            <label htmlFor="age">Idade (anos)</label>
            <input
              id="age"
              name="age"
              type="number"
              min={10}
              max={100}
              placeholder="ex: 28"
              value={physical.age}
              onChange={handlePhysical}
              className={physicalErrors.age ? 'q-input--error' : ''}
            />
            {physicalErrors.age && <span className="q-field-error">{physicalErrors.age}</span>}
          </div>

          <div className="q-field">
            <label htmlFor="weightKg">Peso (kg)</label>
            <input
              id="weightKg"
              name="weightKg"
              type="number"
              min={1}
              step="0.1"
              placeholder="ex: 75.0"
              value={physical.weightKg}
              onChange={handlePhysical}
              className={physicalErrors.weightKg ? 'q-input--error' : ''}
            />
            {physicalErrors.weightKg && <span className="q-field-error">{physicalErrors.weightKg}</span>}
          </div>

          <div className="q-field">
            <label htmlFor="heightCm">Altura (cm)</label>
            <input
              id="heightCm"
              name="heightCm"
              type="number"
              min={1}
              step="0.1"
              placeholder="ex: 178"
              value={physical.heightCm}
              onChange={handlePhysical}
              className={physicalErrors.heightCm ? 'q-input--error' : ''}
            />
            {physicalErrors.heightCm && <span className="q-field-error">{physicalErrors.heightCm}</span>}
          </div>
        </div>
      );
    }

    if (step === 5) {
      return (
        <div className="q-physical">
          <div className="q-field">
            <label htmlFor="restrictions">Lesões ou restrições físicas</label>
            <textarea
              id="restrictions"
              placeholder="ex: dor lombar leve, joelho direito operado..."
              value={restrictions}
              onChange={e => setRestrictions(e.target.value)}
              rows={3}
            />
          </div>

          <div className="q-field">
            <label htmlFor="additionalInfo">Informações adicionais</label>
            <textarea
              id="additionalInfo"
              placeholder="ex: prefiro treinos de 45 min, sem pesos no fim de semana..."
              value={additionalInfo}
              onChange={e => setAdditionalInfo(e.target.value)}
              rows={3}
            />
          </div>

          <p className="q-optional-hint">Esses campos são opcionais. Clique em "Gerar Meu Treino" para prosseguir.</p>
        </div>
      );
    }

    return null;
  }

  return (
    <div className="q-page">
      <div className="q-bg-glow" />

      <div className="q-container">
        <header className="q-header">
          <div className="q-brand">
            <div className="q-brand-icon">F</div>
            <span>funcione</span>
          </div>
          <span className="q-welcome">Olá, {userName}</span>
        </header>

        <div className="q-progress-bar">
          <div
            className="q-progress-fill"
            style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
          />
        </div>
        <div className="q-progress-label">
          Etapa {step + 1} de {TOTAL_STEPS}
        </div>

        <div className="q-body">
          <div className="q-step-heading">
            <h2>{STEPS[step].title}</h2>
            <p>{STEPS[step].subtitle}</p>
          </div>

          <div className="q-options">
            {renderOptions()}
          </div>

          <div className="q-actions">
            {step > 0 && (
              <button className="q-btn-back" onClick={() => setStep(s => s - 1)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Voltar
              </button>
            )}
            <button
              className="q-btn-next"
              onClick={handleNext}
              disabled={!isStepValid()}
            >
              {step === TOTAL_STEPS - 1 ? 'Gerar Meu Treino' : 'Continuar'}
              {step < TOTAL_STEPS - 1 && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
