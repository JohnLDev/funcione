import { MoonStar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button.js';
import { useTheme } from '@/theme/use-theme.js';

export function ThemeToggle() {
  const { t } = useTranslation();
  const { theme, cycleTheme } = useTheme();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={cycleTheme}
      aria-label={t('theme.button', { theme: t(`theme.${theme}`) })}
    >
      <MoonStar aria-hidden="true" size={18} />
      <span className="hidden sm:inline">{t(`theme.${theme}`)}</span>
    </Button>
  );
}
