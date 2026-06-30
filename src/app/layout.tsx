import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VNERP | 丝网印刷管理系统',
  description: 'VNERP ERP系统 - 专为丝网印刷企业设计的管理系统',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
