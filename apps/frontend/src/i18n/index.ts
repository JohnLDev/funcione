import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ptBR from './locales/pt-BR/common.json';
import enUS from './locales/en-US/common.json';

const storedLanguage =
  typeof window === 'undefined'
    ? undefined
    : window.localStorage.getItem('funcione-language') ?? undefined;

void i18n.use(initReactI18next).init({
  resources: {
    'pt-BR': {
      common: ptBR,
    },
    'en-US': {
      common: enUS,
    },
  },
  lng: storedLanguage,
  fallbackLng: 'pt-BR',
  supportedLngs: ['pt-BR', 'en-US'],
  defaultNS: 'common',
  interpolation: {
    escapeValue: false,
  },
});

export { i18n };
