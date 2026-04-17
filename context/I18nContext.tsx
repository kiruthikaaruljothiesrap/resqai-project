"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { NextIntlClientProvider } from "next-intl";

type Locale = "en" | "ta" | "hi";

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextType>({ locale: "en", setLocale: () => {} });

import en from "@/messages/en.json";
import ta from "@/messages/ta.json";
import hi from "@/messages/hi.json";

const messagesMap = { en, ta, hi };

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  
  useEffect(() => {
    // Load saved locale
    const saved = localStorage.getItem("resqai_locale") as Locale;
    if (saved && ["en", "ta", "hi"].includes(saved)) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (l: Locale) => {
    localStorage.setItem("resqai_locale", l);
    setLocaleState(l);
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={messagesMap[locale]}>
        {children}
      </NextIntlClientProvider>
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
