"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createT, DEFAULT_LOCALE, type Locale, type TranslationKey } from "@satiyo/shared";

interface I18nState {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (k: TranslationKey) => string;
}

const I18nContext = createContext<I18nState | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const saved = localStorage.getItem("satiyo_locale") as Locale | null;
    if (saved === "tr" || saved === "en") setLocaleState(saved);
  }, []);

  function setLocale(l: Locale) {
    setLocaleState(l);
    localStorage.setItem("satiyo_locale", l);
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: createT(locale) }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nState {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n I18nProvider içinde");
  return ctx;
}
