import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from 'react-router';
import { authOptions } from './auth/auth-options.js';
import { AuthProvider } from './auth/auth-provider.js';
import { useAuth } from './auth/use-auth.js';
import { AuthScreen } from './components/auth-screen.js';
import { AppLoading } from './components/app-loading.js';
import { AppShell } from './components/app-shell.js';
import { AthleteProfileScreen } from './components/athlete-profile-screen.js';
import { DashboardScreen } from './components/dashboard-screen.js';
import { LegalDocumentScreen } from './components/legal-document-screen.js';
import { useTranslation } from 'react-i18next';
import { ProfileCompletionScreen } from './components/profile-completion-screen.js';
import { TrainingScreen } from './components/training-screen.js';
import { ThemeProvider } from './theme/theme-provider.js';
import { AppToastProvider } from './toast/app-toast-provider.js';

function LoadingScreen() {
  const { t } = useTranslation();

  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-md place-items-center px-4 py-6 sm:max-w-lg">
      <AppLoading
        description={t('auth.loadingDescription')}
        label={t('auth.loading')}
      />
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
          ) : authOptions.passwordAuthEnabled ? (
            <AuthScreen mode="signup" />
          ) : (
            <Navigate replace to="/login" />
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
            <ProfileCompletionScreen onSignOut={handleSignOut} />
          )
        }
        path="/complete-profile"
      />
      <Route
        element={<LegalDocumentScreen documentType="terms" />}
        path="/terms"
      />
      <Route
        element={<LegalDocumentScreen documentType="privacy" />}
        path="/privacy"
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
            >
              <DashboardScreen />
            </AppShell>
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
      <Route
        element={
          !session ? (
            <Navigate replace to="/login" />
          ) : !hasCompletedProfile ? (
            <Navigate replace to="/complete-profile" />
          ) : (
            <AppShell onSignOut={handleSignOut} user={session.user}>
              <AthleteProfileScreen />
            </AppShell>
          )
        }
        path="/profile"
      />
      <Route element={<Navigate replace to="/" />} path="*" />
    </Routes>
  );
}

export function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <AppToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </AppToastProvider>
    </ThemeProvider>
  );
}
