'use client';

import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';

interface IntlProviderProps {
  locale: string;
  messages: Record<string, unknown>;
  children: ReactNode;
}

const seenMissingKeys = new Set<string>();

export function IntlProvider({ locale, messages, children }: IntlProviderProps) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      onError={(error) => {
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
        }
      }}
      getMessageFallback={({ namespace, key }) =>
        namespace ? `${namespace}.${key}` : key
      }
    >
      {children}
    </NextIntlClientProvider>
  );
}
