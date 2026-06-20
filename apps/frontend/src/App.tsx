import { AppShell } from './components/app-shell.js';
import { ThemeProvider } from './theme/theme-provider.js';

export function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <AppShell />
    </ThemeProvider>
  );
}
