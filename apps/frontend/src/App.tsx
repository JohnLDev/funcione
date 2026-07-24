import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from 'react-router';
import { AuthProvider } from './auth/auth-provider.js';
import { useAuth } from './auth/use-auth.js';
import { AuthScreen } from './components/auth-screen.js';
import { AppShell } from './components/app-shell.js';
import { useTranslation } from 'react-i18next';
import { ProfileCompletionScreen } from './components/profile-completion-screen.js';
import { TrainingScreen } from './components/training-screen.js';
import { ThemeProvider } from './theme/theme-provider.js';

function LoadingScreen() {
  const { t } = useTranslation();

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <p className="text-sm font-bold text-muted-foreground">
        {t('auth.loading')}
      </p>
    </main>
  );
}

function getAuthenticatedPath(hasCompletedProfile: boolean) {
  return hasCompletedProfile ? '/dashboard' : '/complete-profile';
}

function AppRoutes() {
  const navigate = useNavigate();
  const {
    authMessage,
    isLoadingProfile,
    isLoadingSession,
    profileState,
    session,
    signOut,
  } = useAuth();
  const hasCompletedProfile = Boolean(profileState?.completed);
  const isResolvingProfile =
    Boolean(session) && profileState === null && !authMessage;

  if (isLoadingSession || isLoadingProfile || isResolvingProfile) {
    return <LoadingScreen />;
  }

  const handleSignOut = () => {
    void signOut().then((result) => {
      if (result.ok) {
        navigate('/login', { replace: true });
      }
    });
  };

  return (
    <Routes>
      <Route
        element={
          <Navigate
            replace
            to={session ? getAuthenticatedPath(hasCompletedProfile) : '/login'}
          />
        }
        path="/"
      />
      <Route
        element={
          session ? (
            <Navigate replace to={getAuthenticatedPath(hasCompletedProfile)} />
          ) : (
            <AuthScreen mode="signin" />
          )
        }
        path="/login"
      />
      <Route
        element={
          session ? (
            <Navigate replace to={getAuthenticatedPath(hasCompletedProfile)} />
          ) : (
            <AuthScreen mode="signup" />
          )
        }
        path="/signup"
      />
      <Route
        element={
          !session ? (
            <Navigate replace to="/login" />
          ) : hasCompletedProfile ? (
            <Navigate replace to="/dashboard" />
          ) : (
            <ProfileCompletionScreen />
          )
        }
        path="/complete-profile"
      />
      <Route
        element={
          !session ? (
            <Navigate replace to="/login" />
          ) : !hasCompletedProfile ? (
            <Navigate replace to="/complete-profile" />
          ) : (
            <AppShell
              onSignOut={handleSignOut}
              user={session.user}
            />
          )
        }
        path="/dashboard"
      />
      <Route
        element={
          !session ? (
            <Navigate replace to="/login" />
          ) : !hasCompletedProfile ? (
            <Navigate replace to="/complete-profile" />
          ) : (
            <AppShell onSignOut={handleSignOut} user={session.user}>
              <TrainingScreen />
            </AppShell>
          )
        }
        path="/training"
      />
      <Route element={<Navigate replace to="/" />} path="*" />
    </Routes>
  );
}

export function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
