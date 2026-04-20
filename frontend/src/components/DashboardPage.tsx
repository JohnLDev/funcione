import { useState } from 'react';
import type { User, QuestionnaireAnswers, WorkoutPlan } from '../types';
import './DashboardPage.css';

interface Props {
  user: User;
  answers: QuestionnaireAnswers | null;
  workoutPlan: WorkoutPlan | null;
  isGenerating: boolean;
  cooldownUntil: string | null;
  generateError: string | null;
  onLogout: () => void;
  onRedoQuestionnaire: () => void;
}

type Tab = 'workouts' | 'profile';

const LEVEL_LABEL: Record<string, string> = {
  beginner:     'Iniciante',
  intermediate: 'Intermediário',
  advanced:     'Avançado',
};

const GOAL_LABEL: Record<string, string> = {
  weight_loss:     'Perda de Peso',
  muscle_gain:     'Ganho Muscular',
  endurance:       'Resistência',
  flexibility:     'Flexibilidade',
  general_fitness: 'Condicionamento Geral',
};

const EQUIPMENT_LABEL: Record<string, string> = {
  none:             'Sem equipamento',
  dumbbells:        'Halteres',
  barbell:          'Barra e anilhas',
  resistance_bands: 'Elásticos',
  pull_up_bar:      'Barra fixa',
  full_gym:         'Academia',
};

function formatCooldown(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function DashboardPage({
  user,
  answers,
  workoutPlan,
  isGenerating,
  cooldownUntil,
  generateError,
  onLogout,
  onRedoQuestionnaire,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('workouts');
  const [expandedDay, setExpandedDay] = useState<number | null>(0);
  const [menuOpen, setMenuOpen] = useState(false);

  // Use the profile from the workout plan if no separate answers exist
  const profile = answers ?? workoutPlan?.profile ?? null;

  return (
    <div className="dashboard">
      <nav className="dash-nav">
        <div className="dash-nav-brand">
          <div className="dash-brand-icon">F</div>
          <span>funcione</span>
        </div>

        <div className="dash-nav-tabs">
          <button
            className={`dash-tab ${activeTab === 'workouts' ? 'dash-tab--active' : ''}`}
            onClick={() => setActiveTab('workouts')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 4v6a6 6 0 0 0 12 0V4" />
              <line x1="4" y1="20" x2="20" y2="20" />
            </svg>
            Treinos
          </button>
          <button
            className={`dash-tab ${activeTab === 'profile' ? 'dash-tab--active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Perfil
          </button>
        </div>

        <div className="dash-nav-user">
          <button className="dash-user-btn" onClick={() => setMenuOpen(v => !v)}>
            <div className="dash-avatar">{user.name.charAt(0).toUpperCase()}</div>
            <span className="dash-user-name">{user.name.split(' ')[0]}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="dash-chevron">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {menuOpen && (
            <div className="dash-dropdown">
              <div className="dash-dropdown-info">
                <div className="dash-avatar dash-avatar--sm">{user.name.charAt(0).toUpperCase()}</div>
                <div>
                  <strong>{user.name}</strong>
                  <span>{user.email}</span>
                </div>
              </div>
              <div className="dash-dropdown-divider" />
              <button className="dash-dropdown-item dash-dropdown-item--danger" onClick={onLogout}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sair
              </button>
            </div>
          )}
        </div>
      </nav>

      {menuOpen && <div className="dash-overlay" onClick={() => setMenuOpen(false)} />}

      <main className="dash-main">
        {/* ---- WORKOUTS TAB ---- */}
        {activeTab === 'workouts' && (
          <div className="workouts-tab">
            {/* Cooldown banner */}
            {cooldownUntil && (
              <div className="cooldown-banner">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <div>
                  <strong>Novo treino disponível em breve</strong>
                  <span>Você pode gerar um novo treino a partir de <b>{formatCooldown(cooldownUntil)}</b>.</span>
                </div>
              </div>
            )}

            {/* Generate error banner */}
            {generateError && !cooldownUntil && (
              <div className="error-banner">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div>
                  <strong>Erro ao gerar treino</strong>
                  <span>{generateError}</span>
                </div>
              </div>
            )}

            {isGenerating ? (
              <div className="generating-state">
                <div className="generating-ring">
                  <div className="generating-spinner" />
                </div>
                <h3>Gerando seu treino personalizado...</h3>
                <p>A IA está montando o plano ideal com base nas suas respostas</p>
                <div className="generating-steps">
                  <div className="gen-step gen-step--done">Analisando nível e objetivo</div>
                  <div className="gen-step gen-step--active">Gerando exercícios com IA</div>
                  <div className="gen-step">Calculando volume e intensidade</div>
                </div>
              </div>
            ) : workoutPlan ? (
              <div className="workout-plan">
                <div className="plan-header">
                  <div className="plan-header-content">
                    <h1>{workoutPlan.title}</h1>
                    <p>{workoutPlan.overview}</p>
                    <div className="plan-badges">
                      {profile && (
                        <>
                          <span className="plan-badge">{LEVEL_LABEL[profile.level] ?? profile.level}</span>
                          <span className="plan-badge plan-badge--accent">{GOAL_LABEL[profile.goal] ?? profile.goal}</span>
                          <span className="plan-badge">{profile.daysPerWeek}x por semana</span>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="plan-date">Criado em {workoutPlan.createdAt}</p>
                </div>

                <div className="workout-days">
                  {workoutPlan.days.map((day, i) => (
                    <div key={i} className={`day-card ${expandedDay === i ? 'day-card--open' : ''}`}>
                      <button
                        className="day-card-header"
                        onClick={() => setExpandedDay(expandedDay === i ? null : i)}
                      >
                        <div className="day-card-left">
                          <div className="day-dot" style={{ background: day.color }} />
                          <div className="day-info">
                            <strong className="day-name">{day.label}</strong>
                            <span className="day-focus">{day.focus}</span>
                          </div>
                        </div>
                        <div className="day-card-right">
                          <span className="day-count">{day.exercises.length} exercícios</span>
                          <svg
                            className="day-chevron"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            style={{ transform: expandedDay === i ? 'rotate(180deg)' : 'rotate(0deg)' }}
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </div>
                      </button>

                      {expandedDay === i && (
                        <div className="day-exercises">
                          {day.warmUp && (
                            <div className="day-extra-info">
                              <span className="day-extra-label">Aquecimento</span>
                              <span>{day.warmUp}</span>
                            </div>
                          )}

                          <div className="exercises-table">
                            <div className="exercises-table-head">
                              <span>Exercício</span>
                              <span>Séries</span>
                              <span>Reps</span>
                              <span>Descanso</span>
                            </div>
                            {day.exercises.map((ex, j) => (
                              <div key={j} className="exercise-row">
                                <div className="exercise-name">
                                  <span
                                    className="exercise-num"
                                    style={{ background: day.color + '22', color: day.color }}
                                  >
                                    {j + 1}
                                  </span>
                                  <div>
                                    <strong>{ex.name}</strong>
                                    {ex.notes && <p>{ex.notes}</p>}
                                  </div>
                                </div>
                                <span className="exercise-cell">{ex.sets ?? '—'}</span>
                                <span className="exercise-cell">{ex.reps ?? ex.duration ?? '—'}</span>
                                <span className="exercise-cell exercise-rest">{ex.rest ?? '—'}</span>
                              </div>
                            ))}
                          </div>

                          {day.coolDown && (
                            <div className="day-extra-info day-extra-info--cool">
                              <span className="day-extra-label">Desaquecimento</span>
                              <span>{day.coolDown}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* General tips */}
                {workoutPlan.generalTips.length > 0 && (
                  <div className="plan-section">
                    <h3 className="plan-section-title">Dicas Gerais</h3>
                    <ul className="tips-list">
                      {workoutPlan.generalTips.map((tip, i) => (
                        <li key={i}>
                          <span className="tip-dot" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Nutrition notes */}
                {workoutPlan.nutritionNotes && (
                  <div className="plan-section plan-section--nutrition">
                    <h3 className="plan-section-title">Nutrição</h3>
                    <p>{workoutPlan.nutritionNotes}</p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* ---- PROFILE TAB ---- */}
        {activeTab === 'profile' && (
          <div className="profile-tab">
            <div className="profile-header">
              <div className="profile-avatar-lg">{user.name.charAt(0).toUpperCase()}</div>
              <div>
                <h2>{user.name}</h2>
                <p>{user.email}</p>
                {user.provider === 'google' && (
                  <span className="provider-badge">Google</span>
                )}
              </div>
            </div>

            {profile && (
              <div className="answers-section">
                <h3>Suas respostas</h3>
                <div className="answers-grid">
                  <div className="answer-card">
                    <span className="answer-label">Nível</span>
                    <strong className="answer-value">{LEVEL_LABEL[profile.level] ?? profile.level}</strong>
                  </div>
                  <div className="answer-card">
                    <span className="answer-label">Objetivo</span>
                    <strong className="answer-value">{GOAL_LABEL[profile.goal] ?? profile.goal}</strong>
                  </div>
                  <div className="answer-card">
                    <span className="answer-label">Dias / semana</span>
                    <strong className="answer-value">{profile.daysPerWeek} dias</strong>
                  </div>
                  <div className="answer-card">
                    <span className="answer-label">Equipamento</span>
                    <strong className="answer-value">{EQUIPMENT_LABEL[profile.equipment] ?? profile.equipment}</strong>
                  </div>
                  {profile.age > 0 && (
                    <div className="answer-card">
                      <span className="answer-label">Idade</span>
                      <strong className="answer-value">{profile.age} anos</strong>
                    </div>
                  )}
                  {profile.weightKg > 0 && (
                    <div className="answer-card">
                      <span className="answer-label">Peso</span>
                      <strong className="answer-value">{profile.weightKg} kg</strong>
                    </div>
                  )}
                  {profile.heightCm > 0 && (
                    <div className="answer-card">
                      <span className="answer-label">Altura</span>
                      <strong className="answer-value">{profile.heightCm} cm</strong>
                    </div>
                  )}
                </div>

                {profile.restrictions && (
                  <div className="answer-text-card">
                    <span className="answer-label">Restrições</span>
                    <p>{profile.restrictions}</p>
                  </div>
                )}

                <button
                  className="redo-btn"
                  onClick={onRedoQuestionnaire}
                  disabled={!!cooldownUntil}
                  title={cooldownUntil ? `Disponível em ${formatCooldown(cooldownUntil)}` : undefined}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 .49-3.1" />
                  </svg>
                  {cooldownUntil
                    ? `Disponível em ${formatCooldown(cooldownUntil)}`
                    : 'Refazer questionário'}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
