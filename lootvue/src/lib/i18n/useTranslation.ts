"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  translations,
  type Locale,
  LOCALE_LABELS,
  LOCALE_FLAGS,
  LOCALE_DISPLAY,
} from "./translations";

interface I18nState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      locale: "en",
      setLocale: (locale) => set({ locale }),
    }),
    { name: "lootvue-locale-v1" }
  )
);

/** Hook to get the translation function and locale controls */
export function useTranslation() {
  const locale = useI18nStore((s) => s.locale);
  const setLocale = useI18nStore((s) => s.setLocale);

  const t = (key: string): string => {
    return translations[locale]?.[key] ?? translations.en[key] ?? key;
  };

  return { t, locale, setLocale, LOCALE_LABELS, LOCALE_FLAGS, LOCALE_DISPLAY };
}

export { type Locale, LOCALE_LABELS, LOCALE_FLAGS, LOCALE_DISPLAY };
