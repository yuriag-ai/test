import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import all translations
import commonPT from './locales/pt-BR/common.json';
import homePT from './locales/pt-BR/home.json';
import authPT from './locales/pt-BR/auth.json';
import generatorPT from './locales/pt-BR/generator.json';
import workoutPT from './locales/pt-BR/workout.json';

import commonEN from './locales/en/common.json';
import homeEN from './locales/en/home.json';
import authEN from './locales/en/auth.json';
import generatorEN from './locales/en/generator.json';
import workoutEN from './locales/en/workout.json';

const resources = {
  'pt-BR': {
    common: commonPT,
    home: homePT,
    auth: authPT,
    generator: generatorPT,
    workout: workoutPT,
  },
  en: {
    common: commonEN,
    home: homeEN,
    auth: authEN,
    generator: generatorEN,
    workout: workoutEN,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'pt-BR',
    defaultNS: 'common',
    ns: ['common', 'home', 'auth', 'generator', 'workout'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
