import { getMessages } from 'next-intl/server';
import { IntlProvider } from '@/components/IntlProvider';
import { notFound } from 'next/navigation';
import { locales, type Locale } from '@/i18n/locales';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProviderComponent } from '@/components/ui/toast';
import { SnowAdminThemeProvider } from '@/hooks/useSnowAdminTheme';
import SystemConfigInitializer from '@/components/SystemConfigInitializer';
import { query } from '@/lib/db';

// 公司名称缓存
let cachedCompanyName: string | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function getCompanyName(): Promise<string> {
  const now = Date.now();
  if (cachedCompanyName && now - cacheTimestamp < CACHE_TTL) {
    return cachedCompanyName;
  }
  try {
    const rows: any = await query(
      `SELECT config_value FROM sys_config WHERE config_key IN ('company_name', 'company_short_name') ORDER BY FIELD(config_key, 'company_name', 'company_short_name') LIMIT 1`
    );
    if (Array.isArray(rows) && rows.length > 0 && rows[0]?.config_value) {
      cachedCompanyName = rows[0].config_value;
      cacheTimestamp = now;
      return cachedCompanyName!;
    }
  } catch (e) {
    if (cachedCompanyName) return cachedCompanyName;
  }
  return '越南达昌科技有限公司';
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
  const locale = (locales as readonly string[]).includes(rawLocale) ? rawLocale as Locale : 'zh-CN';

  // 验证 locale 是否有效
  if (!locales.includes(locale)) {
    notFound();
  }

  const messages = await getMessages();
  const companyName = await getCompanyName();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <title>{`${companyName} | VNERP`}</title>
      </head>
      <body className="antialiased bg-background text-foreground" suppressHydrationWarning>
        <IntlProvider locale={locale} messages={messages}>
          <SnowAdminThemeProvider>
            <AuthProvider>
              <SystemConfigInitializer />
              <ToastProviderComponent>{children}</ToastProviderComponent>
            </AuthProvider>
          </SnowAdminThemeProvider>
        </IntlProvider>
      </body>
    </html>
  );
}
