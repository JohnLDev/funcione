import { ArrowLeft, LogIn, UserPlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { authOptions } from '@/auth/auth-options.js';
import type { RegistrationProfileInput } from '@/auth/registration-profile.js';
import { useAuth } from '@/auth/use-auth.js';
import { RegistrationProfileForm } from './registration-profile-form.js';
import { Button } from './ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card.js';
import { GoogleIcon } from './google-icon.js';
import { SettingsMenu } from './settings-menu.js';

type AuthScreenMode = 'signin' | 'signup';

export function AuthScreen({ mode }: { mode: AuthScreenMode }) {
  const { t } = useTranslation();
  const {
    isAuthActionRunning,
    signInWithGoogle,
    signInWithPassword,
    signUpWithPassword,
  } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const isSignIn = mode === 'signin';
  const isPasswordAuthEnabled = authOptions.passwordAuthEnabled;
  const isGoogleOnlySignIn = isSignIn && !isPasswordAuthEnabled;
  const mainClassName = [
    'mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-md flex-col sm:max-w-xl',
    isGoogleOnlySignIn
      ? 'justify-start py-12 sm:py-20'
      : 'justify-center py-16 sm:py-20',
  ].join(' ');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await signInWithPassword(email, password);
  };

  const handleRegistrationSubmit = async (
    values: RegistrationProfileInput & { password?: string },
  ) => {
    const { password: submittedPassword = '', ...profile } = values;

    await signUpWithPassword(profile, submittedPassword);
  };

  return (
    <div className="min-h-dvh overflow-x-hidden px-4 py-4 sm:px-6">
      <div className="fixed right-4 top-4 z-20 sm:right-6 sm:top-6">
        <SettingsMenu />
      </div>

      <main className={mainClassName}>
        <div className="mx-auto mb-5 flex w-full flex-col items-center gap-2 sm:mb-6">
          <img
            alt={t('brand.logoAlt')}
            className={
              isSignIn
                ? 'h-auto w-[min(92vw,34rem)] object-contain drop-shadow-[0_28px_80px_rgba(0,120,255,0.5)] sm:w-[34rem]'
                : 'h-auto w-[min(78vw,18rem)] object-contain drop-shadow-[0_22px_64px_rgba(0,120,255,0.42)] sm:w-72'
            }
            data-testid="auth-product-logo"
            src="/brand/funcione-logo-transparent.png"
          />
        </div>

        <Card className="mx-auto w-full max-w-lg rounded-[2rem] border-primary/25 bg-card/92 shadow-xl backdrop-blur-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-4 p-5">
            <CardTitle className="min-w-0 text-3xl font-black leading-tight">
              {isSignIn ? t('auth.title') : t('registration.signUpTitle')}
            </CardTitle>
            <img
              alt={t('brand.milexLogoAlt')}
              className="mt-0.5 h-8 w-auto max-w-[6.5rem] shrink-0 object-contain brightness-75 contrast-125 drop-shadow-[0_16px_44px_rgba(0,120,255,0.26)] dark:brightness-100 dark:contrast-100 sm:h-9"
              data-testid="auth-milex-logo"
              src="/brand/milex-logo-transparent.png"
            />
          </CardHeader>
          <CardContent className="grid gap-4 p-5 pt-0">
            {isSignIn ? (
              <>
                {isPasswordAuthEnabled ? (
                  <>
                    <form className="grid gap-3" onSubmit={handleSubmit}>
                      <label className="grid gap-2 text-sm font-bold" htmlFor="email">
                        {t('auth.email')}
                        <input
                          autoComplete="email"
                          className="h-12 rounded-2xl border border-input bg-background px-4 text-base text-foreground outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring"
                          id="email"
                          inputMode="email"
                          onChange={(event) => setEmail(event.target.value)}
                          required
                          type="email"
                          value={email}
                        />
                      </label>

                      <label className="grid gap-2 text-sm font-bold" htmlFor="password">
                        {t('auth.password')}
                        <input
                          autoComplete="current-password"
                          className="h-12 rounded-2xl border border-input bg-background px-4 text-base text-foreground outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring"
                          id="password"
                          minLength={8}
                          onChange={(event) => setPassword(event.target.value)}
                          required
                          type="password"
                          value={password}
                        />
                      </label>

                      <Button disabled={isAuthActionRunning} type="submit">
                        <LogIn aria-hidden="true" size={18} />
                        {t('auth.signIn')}
                      </Button>
                    </form>

                    <Button
                      asChild
                      className={
                        isAuthActionRunning
                          ? 'pointer-events-none opacity-50'
                          : undefined
                      }
                      variant="outline"
                    >
                      <Link to="/signup">
                        <UserPlus aria-hidden="true" size={18} />
                        {t('auth.signUp')}
                      </Link>
                    </Button>

                    <div className="h-px bg-border" />
                  </>
                ) : null}

                <Button
                  className="border-[#dadce0] bg-white text-[#3c4043] shadow-sm hover:bg-[#f8fafd]"
                  disabled={isAuthActionRunning}
                  onClick={signInWithGoogle}
                  type="button"
                  variant="outline"
                >
                  <GoogleIcon className="h-[18px] w-[18px]" />
                  {t('auth.continueWithGoogle')}
                </Button>
              </>
            ) : isPasswordAuthEnabled ? (
              <>
                <RegistrationProfileForm
                  isSubmitting={isAuthActionRunning}
                  mode="signup"
                  onSubmit={handleRegistrationSubmit}
                  submitLabel={t('auth.signUp')}
                />

                <Button
                  asChild
                  className={
                    isAuthActionRunning ? 'pointer-events-none opacity-50' : undefined
                  }
                  variant="ghost"
                >
                  <Link to="/login">
                    <ArrowLeft aria-hidden="true" size={18} />
                    {t('registration.backToSignIn')}
                  </Link>
                </Button>
              </>
            ) : null}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
