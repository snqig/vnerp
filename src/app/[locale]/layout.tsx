import { getMessages } from 'next-intl/server';
import { cookies } from 'next/headers';
import { IntlProvider } from '@/components/IntlProvider';
import { notFound } from 'next/navigation';
import { locales, type Locale } from '@/i18n/locales';
import { AuthProvider, type InitialAuthData } from '@/contexts/AuthContext';
import { ToastProviderComponent } from '@/components/ui/toast';
import { SnowAdminThemeProvider } from '@/hooks/useSnowAdminTheme';
import SystemConfigInitializer from '@/components/SystemConfigInitializer';
import { HtmlLangSetter } from '@/components/HtmlLangSetter';
import { query } from '@/lib/db';
import { getMenusByToken } from '@/lib/menu-service';

let cachedCompanyName: string | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function getCompanyName(): Promise<string> {
  const now = Date.now();
  if (cachedCompanyName && now - cacheTimestamp < CACHE_TTL) {
    return cachedCompanyName;
  }
  try {
    const rows = await query<{ config_value: string }>(
      `SELECT config_value FROM sys_config WHERE config_key IN ('sys.name', 'company_name', 'company_short_name') ORDER BY FIELD(config_key, 'sys.name', 'company_name', 'company_short_name') LIMIT 1`
    );
    if (Array.isArray(rows) && rows.length > 0 && rows[0]?.config_value) {
      cachedCompanyName = rows[0].config_value;
      cacheTimestamp = now;
      return cachedCompanyName!;
    }
  } catch {
    if (cachedCompanyName) return cachedCompanyName;
  }
  return 'VNERP丝网印刷管理系统';
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
  const companyName = await getCompanyName();
  const initialAuthData = await prefetchMenus();

  console.log('[SSR Layout] companyName:', companyName);
  console.log(
    '[SSR Layout] initialAuthData:',
    initialAuthData
      ? {
          menusCount: initialAuthData.menus?.length,
          permissionsCount: initialAuthData.permissions?.length,
        }
      : null
  );

  const initialAuth = initialAuthData ? { ...initialAuthData, companyName } : { companyName };

  console.log('[SSR Layout] initialAuth structure:', {
    hasMenus: !!initialAuth.menus,
    menusLength: initialAuth.menus?.length,
    hasPermissions: !!initialAuth.permissions,
    permissionsLength: initialAuth.permissions?.length,
    hasCompanyName: !!initialAuth.companyName,
    companyName: initialAuth.companyName,
  });

  return (
    <>
      <HtmlLangSetter locale={locale} />
      <IntlProvider locale={locale} messages={messages}>
        <SnowAdminThemeProvider>
          <AuthProvider initialAuth={initialAuth}>
            <SystemConfigInitializer />
            <ToastProviderComponent>{children}</ToastProviderComponent>
          </AuthProvider>
        </SnowAdminThemeProvider>
      </IntlProvider>
    </>
  );
}
