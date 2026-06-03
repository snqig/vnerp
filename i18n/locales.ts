export const locales = ['zh-CN', 'zh-TW', 'en', 'vi'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale = 'zh-CN' as const;

export const localeNames: Record<Locale, string> = {
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  'en': 'English',
  'vi': 'Tiếng Việt',
};
