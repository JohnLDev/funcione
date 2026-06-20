import {
  createContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

export type Theme = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

type ThemeProviderState = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  cycleTheme: () => void;
};

const storageKey = 'funcione-theme';

export const ThemeProviderContext = createContext<ThemeProviderState | null>(null);

function getSystemTheme(): ResolvedTheme {
  if (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark';
  }

  return 'light';
}

function getStoredTheme(defaultTheme: Theme): Theme {
  if (typeof window === 'undefined') {
    return defaultTheme;
  }

  const storedTheme = window.localStorage.getItem(storageKey);

  if (
    storedTheme === 'system' ||
    storedTheme === 'light' ||
    storedTheme === 'dark'
  ) {
    return storedTheme;
  }

  return defaultTheme;
}

function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === 'system' ? getSystemTheme() : theme;
}

function applyTheme(theme: Theme): ResolvedTheme {
  const root = document.documentElement;
  const resolvedTheme = resolveTheme(theme);

  root.classList.remove('light', 'dark');
  root.classList.add(resolvedTheme);
  root.style.colorScheme = resolvedTheme;

  return resolvedTheme;
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
}: PropsWithChildren<{ defaultTheme?: Theme }>) {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme(defaultTheme));
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveTheme(getStoredTheme(defaultTheme)),
  );

  useEffect(() => {
    window.localStorage.setItem(storageKey, theme);
    setResolvedTheme(applyTheme(theme));
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => setResolvedTheme(applyTheme('system'));

    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const value = useMemo<ThemeProviderState>(
    () => ({
      theme,
      resolvedTheme,
      setTheme: setThemeState,
      cycleTheme: () => {
        setThemeState((currentTheme) => {
          if (currentTheme === 'system') {
            return 'light';
          }

          if (currentTheme === 'light') {
            return 'dark';
          }

          return 'system';
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
