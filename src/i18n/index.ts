import { createContext, useContext, useState, createElement, type ReactNode } from "react";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import es from "./locales/es.json";
import pt from "./locales/pt.json";
import sw from "./locales/sw.json";

export const LOCALES = { en, fr, es, pt, sw } as const;
export type LocaleCode = keyof typeof LOCALES;

export const LANGUAGE_NAMES: Record<LocaleCode, string> = {
  en: "English",
  fr: "Français",
  es: "Español",
  pt: "Português",
  sw: "Kiswahili"
};

type Dict = typeof en;

const I18nContext = createContext<{ locale: LocaleCode; t: Dict; setLocale: (l: LocaleCode) => void }>({
  locale: "en",
  t: en,
  setLocale: () => {}
});

function detectDefaultLocale(): LocaleCode {
  const stored = localStorage.getItem("q-locale") as LocaleCode | null;
  if (stored && stored in LOCALES) return stored;
  const browser = navigator.language.slice(0, 2) as LocaleCode;
  return browser in LOCALES ? browser : "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(detectDefaultLocale());

  function setLocale(l: LocaleCode) {
    localStorage.setItem("q-locale", l);
    setLocaleState(l);
  }

  return createElement(
    I18nContext.Provider,
    { value: { locale, t: LOCALES[locale], setLocale } },
    children
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
