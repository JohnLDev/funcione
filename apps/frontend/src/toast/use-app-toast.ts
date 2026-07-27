import { createContext, useContext } from 'react';
import type { AppErrorSeverity, AppErrorSource } from '@/errors/app-error.js';

export type AppToastInput = {
  message: string;
  severity?: AppErrorSeverity;
  source?: AppErrorSource;
};

export type AppToastContextValue = {
  showToast: (toast: AppToastInput) => void;
};

export const AppToastContext = createContext<AppToastContextValue | null>(null);

export function useAppToast() {
  const context = useContext(AppToastContext);

  if (!context) {
    throw new Error('useAppToast must be used inside AppToastProvider.');
  }

  return context;
}
