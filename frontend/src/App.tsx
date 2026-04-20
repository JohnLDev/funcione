import { useState, useEffect } from 'react';
import type { AppPage, User, QuestionnaireAnswers, WorkoutPlan } from './types';
import { generateWorkoutPlan, getLatestWorkout, CooldownError } from './services/workoutService';
import { getProfile, saveToken, loadToken, clearToken } from './services/authService';
import { LoginPage } from './components/LoginPage';
import { QuestionnairePage } from './components/QuestionnairePage';
import { DashboardPage } from './components/DashboardPage';

export default function App() {
  const [page, setPage] = useState<AppPage>('login');
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [answers, setAnswers] = useState<QuestionnaireAnswers | null>(null);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(true);

  // ---- Session restore & OAuth callback ----
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthToken = params.get('token');
    const oauthError = params.get('message');

    // Clean OAuth params from URL without a page reload
    if (oauthToken || oauthError) {
      window.history.replaceState({}, '', window.location.pathname);
    }

    const stored = oauthToken ?? loadToken();

    if (!stored) {
      setRestoring(false);
      return;
    }

    if (oauthToken) saveToken(oauthToken);

    getProfile(stored)
      .then(async u => {
        setToken(stored);
        setUser(u);

        // Try to restore the latest workout so the user goes straight to dashboard
        const latest = await getLatestWorkout(stored);
        if (latest) {
          setWorkoutPlan(latest);
          setAnswers(latest.profile);
          setPage('dashboard');
        } else {
          setPage('questionnaire');
        }
      })
      .catch(() => {
        clearToken();
      })
      .finally(() => setRestoring(false));
  }, []);

  function handleLogin(u: User, t: string) {
    saveToken(t);
    setToken(t);
    setUser(u);
    setPage('questionnaire');
  }

  async function handleQuestionnaireComplete(a: QuestionnaireAnswers) {
    setAnswers(a);
    setGenerateError(null);
    setCooldownUntil(null);
    setPage('dashboard');
    setIsGenerating(true);

    try {
      const plan = await generateWorkoutPlan(a, token!);
      setWorkoutPlan(plan);
    } catch (err) {
      if (err instanceof CooldownError) {
        setCooldownUntil(err.nextAvailableAt);
        // Show the existing workout if available
        if (!workoutPlan) {
          try {
            const latest = await getLatestWorkout(token!);
            if (latest) setWorkoutPlan(latest);
          } catch {
            // ignore — dashboard will render with no plan
          }
        }
      } else {
        const msg = err instanceof Error ? err.message : 'Erro ao gerar treino.';
        setGenerateError(msg);
      }
    } finally {
      setIsGenerating(false);
    }
  }

  function handleLogout() {
    clearToken();
    setToken(null);
    setUser(null);
    setAnswers(null);
    setWorkoutPlan(null);
    setIsGenerating(false);
    setCooldownUntil(null);
    setGenerateError(null);
    setPage('login');
  }

  function handleRedoQuestionnaire() {
    setWorkoutPlan(null);
    setAnswers(null);
    setCooldownUntil(null);
    setGenerateError(null);
    setPage('questionnaire');
  }

  if (restoring) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#07070f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width: 32,
          height: 32,
          border: '3px solid rgba(124,58,237,0.2)',
          borderTopColor: '#7c3aed',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    );
  }

  if (page === 'login') {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (page === 'questionnaire' && user) {
    return (
      <QuestionnairePage
        userName={user.name.split(' ')[0]}
        onComplete={handleQuestionnaireComplete}
      />
    );
  }

  if (page === 'dashboard' && user) {
    return (
      <DashboardPage
        user={user}
        answers={answers}
        workoutPlan={workoutPlan}
        isGenerating={isGenerating}
        cooldownUntil={cooldownUntil}
        generateError={generateError}
        onLogout={handleLogout}
        onRedoQuestionnaire={handleRedoQuestionnaire}
      />
    );
  }

  return null;
}
