import { useContext } from 'react';
import { AuthProviderContext } from './auth-provider.js';

export function useAuth() {
  const context = useContext(AuthProviderContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
}
