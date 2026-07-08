'use client';

import { useSnowAdminTheme } from '@/hooks/useSnowAdminTheme';
import { Sidebar } from './sidebar';
import { Header } from './header';

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function MainLayout({ children, title }: MainLayoutProps) {
  const { navigationMode } = useSnowAdminTheme();

  // SSR 已能提供菜单（layout.tsx 服务端预取注入 initialAuth），
  // 不再需要 sidebarReady 延迟挂载来消除水合差异。
  // Sidebar 内部在 isLoading=true 时仍会渲染骨架屏作为降级。

  if (navigationMode === 'top') {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <Header title={title} navigationMode={navigationMode} />
        <main className="flex-1 overflow-auto p-4 lg:p-6 bg-muted/30">{children}</main>
      </div>
    );
  }

  if (navigationMode === 'mixed') {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <Header title={title} navigationMode={navigationMode} />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar navigationMode={navigationMode} />
          <main className="flex-1 overflow-auto p-4 lg:p-6 bg-muted/30">{children}</main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-auto p-4 lg:p-6 bg-muted/30">{children}</main>
      </div>
    </div>
  );
}
