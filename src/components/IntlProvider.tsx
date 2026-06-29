'use client';

import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';

interface IntlProviderProps {
  locale: string;
  messages: Record<string, unknown>;
  children: ReactNode;
}

export function IntlProvider({ locale, messages, children }: IntlProviderProps) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      onError={(err) => {
        if (err.message?.includes('MISSING_MESSAGE')) {
          console.warn(`[i18n] 翻译键缺失: ${err.message}`);
        }
      }}
    >
      {children}
    </NextIntlClientProvider>
  );
}
