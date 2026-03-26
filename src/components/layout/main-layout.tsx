'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { Sidebar } from './sidebar';
import { Header } from './header';

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function MainLayout({ children, title }: MainLayoutProps) {
  return (
    <AuthProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header title={title} />
          <main className="flex-1 overflow-auto p-4 lg:p-6 bg-muted/30">
            {children}
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}
