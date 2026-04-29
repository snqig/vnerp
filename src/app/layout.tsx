import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProviderComponent } from '@/components/ui/toast';
import { SnowAdminThemeProvider } from '@/hooks/useSnowAdminTheme';
import { query } from '@/lib/db';

async function getCompanyName(): Promise<string> {
  try {
    const rows: any = await query(`SELECT config_value FROM sys_config WHERE config_key IN ('company_name', 'company_short_name') AND deleted = 0 ORDER BY FIELD(config_key, 'company_name', 'company_short_name') LIMIT 1`);
    if (Array.isArray(rows) && rows.length > 0 && rows[0]?.config_value) {
      return rows[0].config_value;
    }
  } catch (e) {
    console.error('Failed to fetch company name:', e);
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
    keywords: [
      companyName,
      '丝网印刷',
      'ERP系统',
      '仓库管理',
      '生产管理',
      '品质追溯',
    ],
    authors: [{ name: companyName }],
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <SnowAdminThemeProvider>
          <AuthProvider>
            <ToastProviderComponent>
              {children}
            </ToastProviderComponent>
          </AuthProvider>
        </SnowAdminThemeProvider>
      </body>
    </html>
  );
}
