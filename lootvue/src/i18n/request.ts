import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

// Supported locales — must match Locale type in lib/i18n/translations.ts
const SUPPORTED_LOCALES = ['en', 'zh', 'vi'] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export default getRequestConfig(async () => {
  // Read locale from cookie set by LanguageSwitcher / LanguageToggle.
  // Falls back to 'en' if cookie is absent or contains an unsupported value.
  const cookieStore = await cookies();
  const raw = cookieStore.get('locale')?.value ?? 'en';
  const locale: SupportedLocale = isSupportedLocale(raw) ? raw : 'en';

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
