'use client';

import { createContext, useCallback, useContext, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  LOCALE_COOKIE,
  getDictionary,
  interpolate,
  type Dictionary,
  type Locale,
} from './dictionaries';

type I18nValue = {
  locale: Locale;
  dict: Dictionary;
  dir: 'ltr' | 'rtl';
  isSwitching: boolean;
  setLocale: (next: Locale) => void;
  toggleLocale: () => void;
  /** Fill `{placeholders}` in a dictionary string. */
  fill: (template: string, vars: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isSwitching, startTransition] = useTransition();

  const setLocale = useCallback(
    (next: Locale) => {
      // One year, root path -- the server layout reads this to set lang/dir.
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      startTransition(() => router.refresh());
    },
    [router],
  );

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      dict: getDictionary(locale),
      dir: locale === 'ur' ? 'rtl' : 'ltr',
      isSwitching,
      setLocale,
      toggleLocale: () => setLocale(locale === 'en' ? 'ur' : 'en'),
      fill: interpolate,
    }),
    [locale, isSwitching, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}

/** Shorthand: `const t = useT();  t.job.post` */
export function useT() {
  return useI18n().dict;
}
