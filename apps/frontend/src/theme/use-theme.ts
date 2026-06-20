import { useContext } from 'react';
import { ThemeProviderContext } from './theme-provider.js';

export function useTheme() {
  const context = useContext(ThemeProviderContext);

  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider.');
  }

  return context;
}
