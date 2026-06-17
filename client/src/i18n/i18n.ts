import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './locales/en.json';
import arTranslation from './locales/ar.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslation,
      },
      ar: {
        translation: arTranslation,
      },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

// Handle RTL direction
i18n.on('languageChanged', (lng) => {
  document.documentElement.dir = 'ltr';
  document.documentElement.lang = lng;
});

// Set initial direction
document.documentElement.dir = 'ltr';
document.documentElement.lang = i18n.language;

export default i18n;
