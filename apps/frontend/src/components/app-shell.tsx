import {
  Dumbbell,
  Home,
  LogOut,
  UserRound,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink } from 'react-router';
import { useAuth } from '@/auth/use-auth.js';
import type { AuthUser } from '@/auth/types.js';
import { Button } from './ui/button.js';
import { ProductLogo } from './product-logo.js';
import { SettingsMenu } from './settings-menu.js';
import { cn } from '@/lib/utils.js';

const navigationItems = [
  {
    icon: Home,
    isRouteDestination: true,
    labelKey: 'dashboard.bottomNav.home',
    to: '/dashboard',
  },
  {
    icon: Dumbbell,
    labelKey: 'dashboard.bottomNav.workout',
    to: '/training',
  },
  {
    icon: UserRound,
    labelKey: 'dashboard.bottomNav.profile',
    to: '/profile',
  },
] as const;

function getDisplayName({
  fallback,
  firstName,
  fullName,
  lastName,
}: {
  fallback: string;
  firstName?: string | null;
  fullName?: string | null;
  lastName?: string | null;
}) {
  const nameParts = [firstName, lastName].filter(Boolean);
  const joinedName = nameParts.join(' ').trim();

  return joinedName || fullName || fallback;
}

function DashboardNavigationLink({
  children,
  className,
  item,
}: {
  children: React.ReactNode;
  className: string;
  item: (typeof navigationItems)[number];
}) {
  return (
    <NavLink
      className={({ isActive }) =>
        cn(
          className,
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
        )
      }
      to={item.to}
    >
      {children}
    </NavLink>
  );
}

export function AppShell({
  children,
  onSignOut,
  user,
}: {
  children?: React.ReactNode;
  onSignOut: () => void;
  user: AuthUser;
}) {
  const { t } = useTranslation();
  const { profileState } = useAuth();
  const profile = profileState?.profile;
  const emailLabel = profile?.email ?? user.email ?? t('auth.signedInFallback');
  const userLabel = getDisplayName({
    fallback: emailLabel,
    firstName: profile?.firstName ?? user.firstName,
    fullName: user.fullName,
    lastName: profile?.lastName ?? user.lastName,
  });

  return (
    <div className="min-h-dvh overflow-x-hidden px-4 pb-24 pt-4 sm:px-6 md:px-8 md:pb-8">
      <div className="mx-auto grid w-full max-w-6xl gap-5 md:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden min-h-[calc(100dvh-2rem)] flex-col rounded-[2rem] border border-border bg-card/70 p-4 shadow-sm backdrop-blur md:sticky md:top-4 md:flex md:min-h-[calc(100dvh-3rem)]">
          <div className="flex items-center gap-3">
            <ProductLogo className="h-12 w-24" decorative />
            <div>
              <p className="text-xs font-bold text-primary">{t('brand.byline')}</p>
              <p className="text-2xl font-black leading-none">{t('brand.name')}</p>
            </div>
          </div>
          <nav className="mt-8 grid gap-2">
            {navigationItems.map((item) => (
              <DashboardNavigationLink
                className="flex min-h-12 items-center gap-3 rounded-2xl px-3 text-left text-sm font-bold transition-colors"
                key={item.labelKey}
                item={item}
              >
                <item.icon aria-hidden="true" size={18} />
                {t(item.labelKey)}
              </DashboardNavigationLink>
            ))}
          </nav>
          <div className="mt-auto rounded-2xl border border-border bg-background/50 p-3">
            <p className="truncate text-xs font-bold text-muted-foreground">
              {userLabel}
            </p>
            {emailLabel !== userLabel ? (
              <p className="mt-1 truncate text-xs font-bold text-muted-foreground/75">
                {emailLabel}
              </p>
            ) : null}
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

        <main className="flex min-h-[calc(100dvh-2rem)] min-w-0 flex-col md:min-h-[calc(100dvh-3rem)]">
          <header className="flex items-center justify-between gap-3" role="banner">
            <div className="flex min-w-0 items-center gap-3">
              <ProductLogo className="h-10 w-32 max-[360px]:w-28 md:hidden" />
              <div className="hidden min-w-0 md:block">
                <p className="truncate text-xs font-bold text-muted-foreground">
                  {userLabel}
                </p>
                <h1 className="truncate text-2xl font-black leading-tight text-foreground">
                  {t('dashboard.shellTitle')}
                </h1>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <SettingsMenu />
              <Button
                aria-label={t('auth.signOut')}
                className="md:hidden"
                onClick={onSignOut}
                size="icon"
                type="button"
                variant="outline"
              >
                <LogOut aria-hidden="true" size={18} />
              </Button>
            </div>
          </header>

          <div className="min-w-0">{children}</div>

          <footer
            aria-label={t('footer.label')}
            className="mt-8 flex flex-col gap-3 border-t border-border/70 pb-1 pt-4 text-xs font-bold text-muted-foreground sm:flex-row sm:items-center sm:justify-between md:mt-auto"
            role="contentinfo"
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Link
                className="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                to="/terms"
              >
                {t('footer.terms')}
              </Link>
              <Link
                className="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                to="/privacy"
              >
                {t('footer.privacy')}
              </Link>
            </div>
            <img
              alt={t('brand.milexLogoAlt')}
              className="h-8 w-fit object-contain brightness-75 contrast-125 drop-shadow-[0_14px_30px_rgba(0,89,255,0.2)] dark:brightness-100 dark:contrast-100"
              data-testid="footer-milex-logo"
              src="/brand/milex-logo-transparent.png"
            />
          </footer>
        </main>
      </div>

      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-3 bottom-3 z-10 grid grid-cols-3 rounded-[1.5rem] border border-border bg-card/92 p-2 shadow-2xl backdrop-blur md:hidden"
      >
        {navigationItems.map((item) => (
          <DashboardNavigationLink
            className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl text-[0.7rem] font-bold"
            key={item.labelKey}
            item={item}
          >
            <item.icon aria-hidden="true" size={18} />
            <span>{t(item.labelKey)}</span>
          </DashboardNavigationLink>
        ))}
      </nav>
    </div>
  );
}
