'use client';

import { useSnowAdminTheme } from '@/hooks/useSnowAdminTheme';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function MainLayout({ children, title }: MainLayoutProps) {
  const { navigationMode } = useSnowAdminTheme();

  if (navigationMode === 'top') {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <Header title={title} navigationMode={navigationMode} />
        <main className="flex-1 overflow-auto p-4 lg:p-6 bg-muted/30">
          {children}
        </main>
      </div>
    );
  }

  if (navigationMode === 'mixed') {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <Header title={title} navigationMode={navigationMode} />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar navigationMode={navigationMode} />
          <main className="flex-1 overflow-auto p-4 lg:p-6 bg-muted/30">
            {children}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-auto p-4 lg:p-6 bg-muted/30">
          {children}
        </main>
      </div>
    </div>
  );
}
