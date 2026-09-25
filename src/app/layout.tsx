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

/**
 * 主题初始化脚本（内联 + 同步，必须早于首次绘制）。
 *
 * 背景：`dark` 类此前只由 `ThemeToggle`（位于 `Header` → `MainLayout`）的
 * `useEffect` 在客户端挂载后添加，由此带来两个问题：
 *   1. 不渲染 `MainLayout` 的路由（14 个，如 `/hr/employee/query`）永远拿不到
 *      `dark` 类 —— 用户已选深色主题，页面却仍是浅色；
 *   2. 其余路由也要等水合完成才加类 —— 首帧必然闪一次浅色（FOUC）。
 *
 * 修复：在文档根部同步决定主题类，与「页面由哪个布局渲染」彻底解耦。
 * 判定语义与 `ThemeToggle.applyTheme` 严格一致（dark/light/system 三值；
 * 未设置时不动作），以保证默认行为不变、不引入回归。
 */
const THEME_INIT_SCRIPT = `(function(){try{
var t=localStorage.getItem('theme');
if(t!=='dark'&&t!=='light'&&t!=='system')return;
var root=document.documentElement;
var dark=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
if(dark){root.classList.add('dark')}else{root.classList.remove('dark')}
}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground" suppressHydrationWarning>
        {/* 主题类必须在首帧前落到 <html> 上，否则深色模式会闪白/整页失效 */}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
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
