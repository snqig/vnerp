import { getRequestConfig } from 'next-intl/server';
import type { IntlError } from 'next-intl';
import { locales, defaultLocale } from './locales';

const seenMissingKeys = new Set<string>();

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !locales.includes(locale as Loose)) {
    locale = defaultLocale;
  }

  let messages;
  try {
    messages = (await import(`../../messages/${locale}.json`)).default;
  } catch {
    messages = (await import(`../../messages/${defaultLocale}.json`)).default;
  }

  return {
    locale,
    messages,
    onError(error: IntlError) {
      const msg = error.message;

      const missingMatch = msg.match(/Could not resolve ['"]([^'"]+)['"] in ['"]([^'"]+)['"]/);
      if (missingMatch) {
        const [, key, namespace] = missingMatch;
        const uniqueKey = `${locale}:${namespace}.${key}`;
        if (seenMissingKeys.has(uniqueKey)) return;
        seenMissingKeys.add(uniqueKey);
        console.warn(
          `[i18n] Missing translation key: "${namespace}.${key}" (locale: ${locale}). ` +
            `Run: node scripts/debug-perf/diagnose_i18n_keys.mjs to find all missing keys.`
        );
      } else if (msg.includes('INVALID_MESSAGE')) {
        console.warn(`[i18n] Message format error (locale: ${locale}): ${msg}`);
      }
    },
    getMessageFallback({ namespace, key }) {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      return fullKey;
    },
  };
});
