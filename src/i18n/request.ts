import { getRequestConfig } from 'next-intl/server';
import type { IntlError } from 'next-intl';
import { locales, defaultLocale } from './locales';

const seenMissingKeys = new Set<string>();

/**
 * 深合并消息：base(默认语言 zh-CN) 为底层，override(目标语言) 优先。
 * 目标语言缺失的 key 自动回退到默认语言，杜绝 en/vi/zh-TW 渲染出裸 `Namespace.key`
 * （同时让 Error 命名空间等仅存在于 zh-CN 的键对所有语言可用）。
 */
function deepMerge(base: any, override: any): any {
  if (Array.isArray(base) || Array.isArray(override)) return override ?? base;
  if (
    base &&
    override &&
    typeof base === 'object' &&
    typeof override === 'object'
  ) {
    const out: Record<string, unknown> = { ...base };
    for (const key of Object.keys(override)) {
      out[key] = deepMerge(base[key], override[key]);
    }
    return out;
  }
  return override ?? base;
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !locales.includes(locale as (typeof locales)[number])) {
    locale = defaultLocale;
  }

  // 默认语言(zh-CN)消息作为回退底层；目标语言缺失的 key 回退到中文。
  const defaultMessages = (await import(`../../messages/${defaultLocale}.json`)).default;
  let localeMessages;
  try {
    localeMessages = (await import(`../../messages/${locale}.json`)).default;
  } catch {
    localeMessages = defaultMessages;
  }

  const messages =
    locale === defaultLocale ? localeMessages : deepMerge(defaultMessages, localeMessages);

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
