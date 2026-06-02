import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProviderComponent } from '@/components/ui/toast';
import { SnowAdminThemeProvider } from '@/hooks/useSnowAdminTheme';
import { query } from '@/lib/db';
import SystemConfigInitializer from '@/components/SystemConfigInitializer';

// 公司名称缓存（避免每次请求都查询数据库）
let cachedCompanyName: string | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

async function getCompanyName(): Promise<string> {
  // 检查缓存是否有效
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
    console.error('Failed to fetch company name:', e);
    // 如果查询失败，使用缓存的旧值或默认值
    if (cachedCompanyName) {
      return cachedCompanyName;
    }
  }
  return '越南达昌科技有限公司';
}

export async function generateMetadata(): Promise<Metadata> {
  const companyName = await getCompanyName();
  return {
    title: {
      default: `${companyName} | 丝网印刷管理系统`,
      template: `%s | ${companyName}`,
    },
    description: `${companyName}ERP系统 - 专为丝网印刷企业设计的管理系统`,
    keywords: [companyName, '丝网印刷', 'ERP系统', '仓库管理', '生产管理', '品质追溯'],
    authors: [{ name: companyName }],
    icons: {
      icon: '/favicon.ico',
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <SnowAdminThemeProvider>
          <AuthProvider>
            <SystemConfigInitializer />
            <ToastProviderComponent>{children}</ToastProviderComponent>
          </AuthProvider>
        </SnowAdminThemeProvider>
      </body>
    </html>
  );
}
