import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale } from './locales';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !locales.includes(locale as any)) {
    console.warn(
      `[i18n] ⚠ 语言无效或缺失: "${locale}", 回退到默认语言: "${defaultLocale}"`
    );
    locale = defaultLocale;
  } else {
    console.info(`[i18n] ✔ 加载语言: "${locale}"`);
  }

  let messages;
  try {
    messages = (await import(`../../messages/${locale}.json`)).default;
    const msgKeys = Object.keys(messages);
    console.info(`[i18n] ✔ 语言包加载成功: "${locale}", 包含命名空间: [${msgKeys.join(', ')}]`);
  } catch (err) {
    console.error(`[i18n] ✘ 语言包加载失败: "${locale}"`, err);
    console.warn(`[i18n] ⚠ 回退到默认语言包: "${defaultLocale}"`);
    messages = (await import(`../../messages/${defaultLocale}.json`)).default;
  }

  return {
    locale,
    messages,
  };
});
