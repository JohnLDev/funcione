import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useAuth } from '@/auth/use-auth.js';
import type { RegistrationProfileInput } from '@/auth/registration-profile.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card.js';
import { LanguageToggle } from './language-toggle.js';
import { ProductLogo } from './product-logo.js';
import { RegistrationProfileForm } from './registration-profile-form.js';
import { ThemeToggle } from './theme-toggle.js';

export function ProfileCompletionScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    authMessage,
    completeRegistrationProfile,
    isAuthActionRunning,
    session,
  } = useAuth();
  const user = session?.user;
  const initialProfile: Partial<RegistrationProfileInput> = {
    email: user?.email ?? '',
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    phoneNumber: user?.phoneNumber ?? '',
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
              {t('registration.completeTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 p-5 pt-0">
            {authMessage ? (
              <p
                className="rounded-2xl border border-border bg-muted p-3 text-sm font-semibold text-muted-foreground"
                role="status"
              >
                {authMessage}
              </p>
            ) : null}

            <RegistrationProfileForm
              emailReadonly={Boolean(user?.email)}
              initialValues={initialProfile}
              isSubmitting={isAuthActionRunning}
              mode="complete"
              onSubmit={async (profile) => {
                const result = await completeRegistrationProfile(profile);

                if (result.ok) {
                  navigate('/dashboard', { replace: true });
                }
              }}
              submitLabel={t('registration.save')}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
