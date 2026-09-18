
import type { Metadata } from 'next';
import { getMessages, getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';
import { IntlProvider } from '@/components/IntlProvider';
import { notFound } from 'next/navigation';
import { locales, type Locale } from '@/i18n/locales';
import { AuthProvider, type InitialAuthData } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ToastProviderComponent } from '@/components/ui/toast';
import { SnowAdminThemeProvider } from '@/hooks/useSnowAdminTheme';
import SystemConfigInitializer from '@/components/SystemConfigInitializer';
import { HtmlLangSetter } from '@/components/HtmlLangSetter';
import { getMenusByToken } from '@/lib/menu-service';
import { getCompanyProfile, resolveCompanyDisplayName } from '@/lib/company-profile';
import { CompanyProfileProvider } from '@/components/providers/company-profile-provider';

async function getMessagesByLocale(locale: string) {
  try {
    return (await import(`../../../messages/${locale}.json`)).default;
  } catch {
    return (await import(`../../../messages/zh-CN.json`)).default;
  }
}

/**
 * 服务端预取菜单数据。
 *
 * 读取 access_token cookie，若存在则轻量级校验 JWT 并查询菜单。
 * 任何失败（无 cookie / token 过期 / DB 异常）均返回 null，
 * AuthProvider 会降级到客户端 fetch + localStorage 缓存。
 *
 * 注意：服务端不能 HTTP 自调 /api/auth/menus，必须直接调用菜单服务函数。
 */
async function prefetchMenus(): Promise<InitialAuthData | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('access_token')?.value;
    if (!token) return null;

    const result = await getMenusByToken(token);
    if (!result) return null;

    return {
      menus: result.menus,
      permissions: result.permissions,
    };
  } catch {
    // SSR 预取失败时静默降级，不影响页面渲染
    return null;
  }
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = (locales as readonly string[]).includes(rawLocale)
    ? (rawLocale as Locale)
    : 'zh-CN';

  const ts = await getTranslations({ locale, namespace: 'Common' });
  const messages = await getMessagesByLocale(locale);

  // 标题取自公司档案（即 settings/organization 的「公司全称」），不硬编码公司名
  const profile = await getCompanyProfile();
  const title = resolveCompanyDisplayName(
    profile,
    messages?.Common?.companyName || ts('companyName')
  );
  const description = messages?.Common?.appDescription || ts('k_1iivgid');

  return {
    title,
    description,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = (locales as readonly string[]).includes(rawLocale)
    ? (rawLocale as Locale)
    : 'zh-CN';

  if (!locales.includes(locale)) {
    notFound();
  }

  const messages = await getMessages();
  const initialAuth = await prefetchMenus();
  // 公司档案（`sys_company`）：`generateMetadata` 已读取过，此处命中同一进程内缓存，
  // 不会有额外查询。透传给客户端用于播种，使首帧即显示真实公司名 / LOGO ——
  // 登录页处于未登录状态，无法由客户端接口在首帧前取到品牌信息。
  const profile = await getCompanyProfile();

  return (
    <>
      <HtmlLangSetter locale={locale} />
      <IntlProvider locale={locale} messages={messages}>
        <CompanyProfileProvider
          fullName={profile.fullName}
          shortName={profile.shortName}
          logo={profile.logo}
        >
          <SnowAdminThemeProvider>
            <AuthProvider initialAuth={initialAuth}>
              <SystemConfigInitializer />
              <ToastProviderComponent>
                <AuthGuard>{children}</AuthGuard>
              </ToastProviderComponent>
            </AuthProvider>
          </SnowAdminThemeProvider>
        </CompanyProfileProvider>
      </IntlProvider>
    </>
  );
}
