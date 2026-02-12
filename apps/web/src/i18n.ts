import i18n from 'i18next'
// Force HMR reload
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import enTranslation from './locales/en/translation.json'
import plTranslation from './locales/pl/translation.json'

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: {
                translation: enTranslation,
            },
            pl: {
                translation: plTranslation,
            },
        },
        fallbackLng: 'en',
        debug: import.meta.env.DEV,
        interpolation: {
            escapeValue: false, // React escapes by default
        },
    })

export default i18n
