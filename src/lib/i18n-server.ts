import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';

// 支持的语言列表
export const locales = ['en', 'zh-CN', 'zh-TW', 'vi'] as const;
export type Locale = (typeof locales)[number];

// 默认语言
export const defaultLocale: Locale = 'zh-CN';

/**
 * 从请求头获取语言设置
 */
export async function getLocaleFromHeader(): Promise<Locale> {
  try {
    const headersList = await headers();
    const acceptLanguage = headersList.get('accept-language') || '';
    
    // 解析 Accept-Language 头
    const languages = acceptLanguage.split(',').map(lang => {
      const [code] = lang.trim().split(';');
      return code.trim().substring(0, 5); // 取前5个字符,如 zh-CN
    });
    
    // 查找匹配的语言
    for (const lang of languages) {
      if (locales.includes(lang as Locale)) {
        return lang as Locale;
      }
      // 处理简写,如 zh -> zh-CN
      if (lang === 'zh') {
        return 'zh-CN';
      }
    }
    
    return defaultLocale;
  } catch {
    return defaultLocale;
  }
}

/**
 * 加载指定语言的翻译文件
 */
export async function getTranslations(locale: Locale) {
  try {
    const messages = (await import(`../../messages/${locale}.json`)).default;
    return messages;
  } catch {
    // 如果加载失败,返回默认语言
    const messages = (await import(`../../messages/${defaultLocale}.json`)).default;
    return messages;
  }
}

/**
 * 获取翻译函数
 */
export async function getTranslator(namespace?: string) {
  const locale = await getLocaleFromHeader();
  const messages = await getTranslations(locale);
  
  return (key: string, params?: Record<string, any>): string => {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    const keys = fullKey.split('.');
    
    let value: any = messages;
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        // 如果找不到翻译,返回键名
        return fullKey;
      }
    }
    
    if (typeof value !== 'string') {
      return fullKey;
    }
    
    // 处理插值参数
    if (params) {
      return Object.entries(params).reduce(
        (str, [k, v]) => str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
        value
      );
    }
    
    return value;
  };
}

/**
 * 导出专用的翻译辅助函数
 */
export async function getExportTranslator() {
  return getTranslator('Export');
}
