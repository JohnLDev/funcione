import {
  createContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

export type Theme = 'light' | 'dark';
export type ResolvedTheme = Theme;

type ThemeProviderState = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  cycleTheme: () => void;
};

const storageKey = 'funcione-theme';

export const ThemeProviderContext = createContext<ThemeProviderState | null>(null);

function getStoredTheme(defaultTheme: Theme): Theme {
  if (typeof window === 'undefined') {
    return defaultTheme;
  }

  const storedTheme = window.localStorage.getItem(storageKey);

  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme;
  }

  return defaultTheme;
}

function applyTheme(theme: Theme): ResolvedTheme {
  const root = document.documentElement;

  root.classList.remove('light', 'dark');
  root.classList.add(theme);
  root.style.colorScheme = theme;

  return theme;
}

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
}: PropsWithChildren<{ defaultTheme?: Theme }>) {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme(defaultTheme));
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    getStoredTheme(defaultTheme),
  );

  useEffect(() => {
    window.localStorage.setItem(storageKey, theme);
    setResolvedTheme(applyTheme(theme));
  }, [theme]);

  const value = useMemo<ThemeProviderState>(
    () => ({
      theme,
      resolvedTheme,
      setTheme: setThemeState,
      cycleTheme: () => {
        setThemeState((currentTheme) => {
          return currentTheme === 'dark' ? 'light' : 'dark';
        });
      },
    }),
    [resolvedTheme, theme],
  );

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}
