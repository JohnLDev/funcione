import { Globe2 } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button.js';

const languages = ['pt-BR', 'en-US'] as const;

export function LanguageToggle() {
  const { i18n, t } = useTranslation();
  const currentLanguage =
    i18n.resolvedLanguage === 'en-US' ? 'en-US' : 'pt-BR';
  const nextLanguage = currentLanguage === 'pt-BR' ? 'en-US' : 'pt-BR';

  useEffect(() => {
    document.documentElement.lang = currentLanguage;
    window.localStorage.setItem('funcione-language', currentLanguage);
  }, [currentLanguage]);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => {
        void i18n.changeLanguage(nextLanguage);
      }}
      aria-label={t('language.button', {
        language: t(`language.${currentLanguage}`),
      })}
    >
      <Globe2 aria-hidden="true" size={18} />
      <span className="hidden sm:inline">
        {languages.includes(currentLanguage) ? currentLanguage : 'pt-BR'}
      </span>
    </Button>
  );
}
