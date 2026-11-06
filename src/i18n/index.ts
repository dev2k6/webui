/*
 * SPDX-FileCopyrightText: 2020 Stalwart Labs LLC <hello@stalw.art>
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-SEL
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import vi from './vi.json';

const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'vi', label: 'Tiếng Việt' },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]['code'];

const savedLng = typeof localStorage !== 'undefined' ? localStorage.getItem('i18nextLng') : null;
const browserLng = typeof navigator !== 'undefined' ? navigator.language?.split('-')[0] : 'en';
const initialLng = savedLng && (savedLng === 'vi' || savedLng === 'en') ? savedLng : browserLng === 'vi' ? 'vi' : 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    vi: { translation: vi },
  },
  lng: initialLng,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export function setLocale(locale?: string) {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('i18nextLng') : null;
  const lang = saved || (locale ? locale.split('_')[0].split('-')[0] : 'en') || 'en';
  i18n.changeLanguage(lang);
  const isRtl = RTL_LANGUAGES.includes(lang);
  document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
}

export function changeLanguage(lang: string) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('i18nextLng', lang);
  }
  i18n.changeLanguage(lang);
  const isRtl = RTL_LANGUAGES.includes(lang);
  document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
}

export default i18n;
