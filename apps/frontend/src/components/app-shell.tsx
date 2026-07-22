import {
  Activity,
  BarChart3,
  CalendarDays,
  Dumbbell,
  Home,
  LogOut,
  ShieldCheck,
  UserRound,
  Zap,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from './ui/badge.js';
import { Button } from './ui/button.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card.js';
import { Progress } from './ui/progress.js';
import { LanguageToggle } from './language-toggle.js';
import { ProductLogo } from './product-logo.js';
import { ThemeToggle } from './theme-toggle.js';
import { cn } from '@/lib/utils.js';
import type { AuthUser } from '@/auth/types.js';

const navigationItems = [
  { icon: Home, labelKey: 'dashboard.bottomNav.home', active: true },
  { icon: Dumbbell, labelKey: 'dashboard.bottomNav.workout', active: false },
  { icon: BarChart3, labelKey: 'dashboard.bottomNav.history', active: false },
  { icon: UserRound, labelKey: 'dashboard.bottomNav.profile', active: false },
] as const;

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Zap;
  label: string;
  value: string;
}) {
  return (
    <Card className="rounded-2xl bg-card/88">
      <CardContent className="flex items-center gap-3 p-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
          <Icon aria-hidden="true" size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-muted-foreground">{label}</p>
          <p className="mt-0.5 truncate text-xl font-black text-foreground">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function AppShell({
  onSignOut,
  user,
}: {
  onSignOut: () => void;
  user: AuthUser;
}) {
  const { t } = useTranslation();
  const userLabel = user.email ?? t('auth.signedInFallback');

  return (
    <div className="min-h-dvh overflow-x-hidden px-4 pb-24 pt-4 sm:px-6 md:px-8 md:pb-8">
      <div className="mx-auto grid w-full max-w-6xl gap-5 md:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden rounded-[2rem] border border-border bg-card/70 p-4 shadow-sm backdrop-blur md:block">
          <div className="flex items-center gap-3">
            <ProductLogo className="h-12 w-24" decorative />
            <div>
              <p className="text-xs font-bold text-primary">{t('brand.byline')}</p>
              <p className="text-2xl font-black leading-none">{t('brand.name')}</p>
            </div>
          </div>
          <nav className="mt-8 grid gap-2">
            {navigationItems.map((item) => (
              <button
                key={item.labelKey}
                className={cn(
                  'flex min-h-12 items-center gap-3 rounded-2xl px-3 text-left text-sm font-bold text-muted-foreground transition-colors',
                  item.active && 'bg-primary text-primary-foreground',
                )}
                type="button"
              >
                <item.icon aria-hidden="true" size={18} />
                {t(item.labelKey)}
              </button>
            ))}
          </nav>
          <div className="mt-8 rounded-2xl border border-border bg-background/50 p-3">
            <p className="truncate text-xs font-bold text-muted-foreground">
              {userLabel}
            </p>
            <Button
              className="mt-3 w-full"
              onClick={onSignOut}
              size="sm"
              type="button"
              variant="outline"
            >
              <LogOut aria-hidden="true" size={16} />
              {t('auth.signOut')}
            </Button>
          </div>
        </aside>

        <main className="min-w-0">
          <header className="grid gap-3 sm:flex sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center justify-between gap-3 sm:justify-start">
              <ProductLogo className="h-10 w-32 max-[360px]:w-28 sm:h-12 sm:w-32" />
              <div className="flex shrink-0 items-center gap-2 sm:hidden">
                <LanguageToggle />
                <ThemeToggle />
              </div>
            </div>
            <div className="flex min-w-0 items-end justify-between gap-3 sm:flex-1 sm:items-center">
              <div className="min-w-0">
                <p className="text-xs font-bold text-primary">{t('brand.byline')}</p>
                <h1 className="truncate text-3xl font-black leading-none text-foreground">
                  {t('brand.name')}
                </h1>
                <p className="mt-1 max-w-[14rem] truncate text-xs font-bold text-muted-foreground sm:max-w-xs">
                  {userLabel}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  aria-label={t('auth.signOut')}
                  onClick={onSignOut}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <LogOut aria-hidden="true" size={18} />
                  <span className="hidden sm:inline">{t('auth.signOut')}</span>
                </Button>
              </div>
              <div className="hidden shrink-0 items-center gap-2 sm:flex">
                <LanguageToggle />
                <ThemeToggle />
              </div>
            </div>
          </header>

          <section className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <Card className="relative overflow-hidden rounded-[2rem] border-primary/25 bg-gradient-to-br from-primary/20 via-card to-card">
              <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-primary/30 blur-3xl" />
              <CardHeader className="relative p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardDescription className="font-semibold">
                      {t('dashboard.eyebrow')}
                    </CardDescription>
                    <CardTitle className="mt-2 text-4xl font-black">
                      {t('dashboard.title')}
                    </CardTitle>
                    <p className="mt-2 text-sm font-semibold text-muted-foreground">
                      {t('dashboard.subtitle')}
                    </p>
                  </div>
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-2xl font-black text-primary-foreground shadow-[0_18px_42px_rgba(0,89,255,0.28)]">
                    9
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative p-5 pt-0">
                <div className="flex items-center justify-between gap-3 text-xs font-bold text-muted-foreground">
                  <span>{t('dashboard.progressLabel')}</span>
                  <span>68%</span>
                </div>
                <Progress className="mt-2" value={68} />
                <Button className="mt-5 w-full" type="button">
                  <Zap aria-hidden="true" size={18} />
                  {t('actions.startWorkout')}
                </Button>
              </CardContent>
            </Card>

            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
                <MetricCard
                  icon={Activity}
                  label={t('metrics.load')}
                  value={t('metrics.loadValue')}
                />
                <MetricCard
                  icon={ShieldCheck}
                  label={t('metrics.impact')}
                  value={t('metrics.impactValue')}
                />
              </div>
              <Card className="rounded-3xl bg-foreground text-background">
                <CardContent className="p-4">
                  <Badge className="mb-3" variant="secondary">
                    <CalendarDays aria-hidden="true" size={14} />
                    {t('dashboard.nextBlockLabel')}
                  </Badge>
                  <p className="text-xl font-black">{t('dashboard.nextBlock')}</p>
                </CardContent>
              </Card>
            </div>
          </section>
        </main>
      </div>

      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-3 bottom-3 z-10 grid grid-cols-4 rounded-[1.5rem] border border-border bg-card/92 p-2 shadow-2xl backdrop-blur md:hidden"
      >
        {navigationItems.map((item) => (
          <button
            key={item.labelKey}
            className={cn(
              'flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl text-[0.7rem] font-bold text-muted-foreground',
              item.active && 'bg-primary text-primary-foreground',
            )}
            type="button"
          >
            <item.icon aria-hidden="true" size={18} />
            <span>{t(item.labelKey)}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
