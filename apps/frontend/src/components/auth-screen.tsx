import { ArrowLeft, Chrome, LogIn, UserPlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { RegistrationProfileInput } from '@/auth/registration-profile.js';
import { useAuth } from '@/auth/use-auth.js';
import { RegistrationProfileForm } from './registration-profile-form.js';
import { Button } from './ui/button.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card.js';
import { LanguageToggle } from './language-toggle.js';
import { ProductLogo } from './product-logo.js';
import { ThemeToggle } from './theme-toggle.js';

type AuthScreenMode = 'signin' | 'signup';

export function AuthScreen({ mode }: { mode: AuthScreenMode }) {
  const { t } = useTranslation();
  const {
    authMessage,
    isAuthActionRunning,
    signInWithGoogle,
    signInWithPassword,
    signUpWithPassword,
  } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const isSignIn = mode === 'signin';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await signInWithPassword(email, password);
  };

  const handleRegistrationSubmit = async (
    values: RegistrationProfileInput & { password?: string },
  ) => {
    await signUpWithPassword(values, values.password ?? '');
  };

  return (
    <div className="min-h-dvh overflow-x-hidden px-4 py-4 sm:px-6">
      <main className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-md flex-col gap-5">
        <header className="flex items-center justify-between gap-3">
          <ProductLogo className="h-10 w-32 max-[360px]:w-28" />
          <div className="flex shrink-0 items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </header>

        <Card className="mt-auto rounded-[2rem] border-primary/25 bg-card/92 shadow-xl">
          <CardHeader className="p-5">
            <CardDescription className="font-bold text-primary">
              {t('brand.byline')}
            </CardDescription>
            <CardTitle className="text-3xl font-black">
              {isSignIn ? t('auth.title') : t('registration.signUpTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 p-5 pt-0">
            {isSignIn ? (
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

                  {authMessage ? (
                    <p
                      className="rounded-2xl border border-border bg-muted p-3 text-sm font-semibold text-muted-foreground"
                      role="status"
                    >
                      {authMessage}
                    </p>
                  ) : null}

                  <Button disabled={isAuthActionRunning} type="submit">
                    <LogIn aria-hidden="true" size={18} />
                    {t('auth.signIn')}
                  </Button>
                </form>

                <Button
                  asChild
                  className={
                    isAuthActionRunning ? 'pointer-events-none opacity-50' : undefined
                  }
                  variant="outline"
                >
                  <Link to="/signup">
                    <UserPlus aria-hidden="true" size={18} />
                    {t('auth.signUp')}
                  </Link>
                </Button>

                <div className="h-px bg-border" />

                <Button
                  disabled={isAuthActionRunning}
                  onClick={signInWithGoogle}
                  type="button"
                  variant="secondary"
                >
                  <Chrome aria-hidden="true" size={18} />
                  {t('auth.continueWithGoogle')}
                </Button>
              </>
            ) : (
              <>
                {authMessage ? (
                  <p
                    className="rounded-2xl border border-border bg-muted p-3 text-sm font-semibold text-muted-foreground"
                    role="status"
                  >
                    {authMessage}
                  </p>
                ) : null}

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
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
