import { CircleAlert, Volleyball, X } from 'lucide-react';
import {
  useCallback,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { useTranslation } from 'react-i18next';
import type { AppErrorSeverity, AppErrorSource } from '@/errors/app-error.js';
import { cn } from '@/lib/utils.js';
import { Button } from '@/components/ui/button.js';
import {
  AppToastContext,
  type AppToastInput,
} from './use-app-toast.js';

type AppToast = {
  id: number;
  message: string;
  severity: AppErrorSeverity;
  source: AppErrorSource;
};

const toastDurationMs = 4_800;

export function AppToastProvider({ children }: PropsWithChildren) {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState<AppToast[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((currentToasts) =>
      currentToasts.filter((toast) => toast.id !== id),
    );
  }, []);

  const showToast = useCallback(
    ({ message, severity = 'error', source = 'unknown' }: AppToastInput) => {
      const id = Date.now() + Math.floor(Math.random() * 1_000);

      setToasts((currentToasts) => [
        ...currentToasts.slice(-2),
        {
          id,
          message,
          severity,
          source,
        },
      ]);

      window.setTimeout(() => dismissToast(id), toastDurationMs);
    },
    [dismissToast],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <AppToastContext.Provider value={value}>
      {children}
      <div
        aria-label={t('toast.region')}
        className="pointer-events-none fixed inset-x-3 top-3 z-50 grid gap-3 sm:left-auto sm:right-5 sm:top-5 sm:w-[min(24rem,calc(100vw-2.5rem))]"
      >
        {toasts.map((toast) => (
          <div
            aria-label={t('toast.label')}
            aria-live="polite"
            className={cn(
              'pointer-events-auto flex w-full items-start gap-3 rounded-2xl border p-3 shadow-[0_20px_60px_rgba(0,120,255,0.26)] backdrop-blur-md',
              'animate-app-toast-in bg-card/96 text-card-foreground',
              toast.severity === 'error'
                ? 'border-destructive/35'
                : 'border-primary/30',
            )}
            data-testid="app-toast"
            data-source={toast.source}
            key={toast.id}
            role="status"
          >
            <span
              className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary"
              data-testid="app-toast-sport-icon"
            >
              <span className="absolute inset-1 rounded-full border border-primary/30 app-toast-pulse" />
              <Volleyball
                aria-hidden="true"
                className="app-toast-ball"
                size={24}
                strokeWidth={2.4}
              />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="flex items-center gap-2 text-xs font-black uppercase text-primary">
                <CircleAlert aria-hidden="true" size={14} />
                {t(`toast.severity.${toast.severity}`)}
              </p>
              <p className="mt-1 break-words text-sm font-bold leading-snug text-foreground">
                {toast.message}
              </p>
            </div>
            <Button
              aria-label={t('toast.dismiss')}
              className="h-9 w-9 shrink-0 rounded-xl"
              onClick={() => dismissToast(toast.id)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <X aria-hidden="true" size={16} />
            </Button>
          </div>
        ))}
      </div>
    </AppToastContext.Provider>
  );
}
