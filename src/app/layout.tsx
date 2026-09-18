import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { getCompanyProfile, resolveCompanyDisplayName } from '@/lib/company-profile';

/**
 * 站点标题取自公司档案（即 settings/organization 的「公司全称」），不硬编码公司名。
 * 此处仅作兜底：实际页面标题由 [locale]/layout.tsx 的同名函数按语言覆盖。
 */
export async function generateMetadata(): Promise<Metadata> {
  const profile = await getCompanyProfile();
  return { title: resolveCompanyDisplayName(profile, 'VNERP') };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground" suppressHydrationWarning>
        {children}
        <Script id="sw-register" strategy="lazyOnload">
          {`
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.register('/sw.js').catch(() => {});
            }
          `}
        </Script>
      </body>
    </html>
  );
}
