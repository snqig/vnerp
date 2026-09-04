'use client';

import { NextIntlClientProvider } from 'next-intl';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { setErrorTranslator } from '@/lib/error-handler';
import { getApiErrorMessage } from '@/lib/api-error-i18n';

interface IntlProviderProps {
  locale: string;
  messages: Record<string, unknown>;
  children: ReactNode;
}

const seenMissingKeys = new Set<string>();

export function IntlProvider({ locale, messages, children }: IntlProviderProps) {
  // 将 Error 命名空间注入 error-handler，打通「错误码 → i18n 消息」主链路。
  // 用 messages prop 直接查表（非 next-intl 上下文），规避缺失 key 回退歧义；
  // 缺失时 translator 返回 null，getErrorMessage 回退到后端中文 message。
  const errorNs = (messages as Record<string, Record<string, string>> | undefined)?.Error;
  useEffect(() => {
    setErrorTranslator((code: string) => {
      // 1) API 错误码（AE####）：用生成映射（zh-CN 规范来源）翻译；缺失返回 null
      const apiMsg = getApiErrorMessage(code);
      if (apiMsg) return apiMsg;
      // 2) Error 命名空间业务码（UNAUTHORIZED / HTTP_404 ...）：用注入的 Error 命名空间
      return errorNs?.[code] ?? null;
    });
  }, [errorNs]);

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
