import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslation from './locales/en.json';
import heTranslation from './locales/he.json';

const savedLang = typeof localStorage !== 'undefined' ? (localStorage.getItem('fastlane_language') || 'en') : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslation },
      he: { translation: heTranslation }
    },
    lng: savedLang, // Default language from localStorage or fallback
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already safes from xss
    }
  });

// Handle document direction for RTL and persist language selection
i18n.on('languageChanged', (lng) => {
  if (typeof document !== 'undefined') {
    document.documentElement.dir = lng === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = lng;
  }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('fastlane_language', lng);
    }
  } catch {
    // ignore
  }
});

if (typeof document !== 'undefined') {
  document.documentElement.dir = savedLang === 'he' ? 'rtl' : 'ltr';
  document.documentElement.lang = savedLang;
}

export default i18n;
