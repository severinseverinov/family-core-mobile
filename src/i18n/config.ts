import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import tr from './locales/tr.json';
import en from './locales/en.json';
import de from './locales/de.json';

const resources = {
  tr: { translation: tr },
  en: { translation: en },
  de: { translation: de },
};

const deviceLanguage = Localization.getLocales()[0]?.languageCode || 'tr';
const supportedLanguages = ['tr', 'en', 'de'];
const language = supportedLanguages.includes(deviceLanguage) ? deviceLanguage : 'tr';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: language,
    fallbackLng: 'tr',
    compatibilityJSON: 'v3',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;

