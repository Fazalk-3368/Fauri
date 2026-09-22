import { cookies } from 'next/headers';
import { LOCALE_COOKIE, getDictionary, type Locale } from './dictionaries';

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return value === 'ur' ? 'ur' : 'en';
}

export async function getServerDictionary() {
  const locale = await getLocale();
  return { locale, dict: getDictionary(locale), dir: locale === 'ur' ? 'rtl' : 'ltr' } as const;
}
