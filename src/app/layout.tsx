import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

export const metadata: Metadata = {
  title: {
    default: '达昌ERP | 丝网印刷管理系统',
    template: '%s | 达昌ERP',
  },
  description: '越南达昌丝网印刷科技有限公司ERP系统 - 专为丝网印刷企业设计的管理系统',
  keywords: [
    '达昌ERP',
    '丝网印刷',
    'ERP系统',
    '仓库管理',
    '生产管理',
    '品质追溯',
  ],
  authors: [{ name: '越南达昌丝网印刷科技有限公司' }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
