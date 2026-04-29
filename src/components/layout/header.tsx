'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, User, Settings, Warehouse, LogOut, ChevronDown, LayoutDashboard, FileText, Package, Factory, ClipboardCheck, ShoppingCart, Printer, Users, Banknote, ShieldCheck, Home, ShoppingBag, Globe, Database, Zap, Palette, QrCode, Scissors, Search, Droplets, Wrench, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
import { useRouter } from 'next/navigation';
import { NavigationMode } from '@/hooks/useSnowAdminTheme';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyName } from '@/hooks/useCompanyName';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Home, LayoutDashboard, FileText, Package, Factory, ClipboardCheck, ShoppingCart, Printer, Users, Warehouse, Banknote, ShieldCheck, ShoppingBag, Globe, Database, Zap, Palette, QrCode, Scissors, Search, Droplets, Wrench, Truck,
};

interface MenuItem {
  id: number;
  name: string;
  code: string;
  type: number;
  icon?: string;
  path?: string;
  children?: MenuItem[];
}

interface Notification {
  id: number;
  title: string;
  content: string;
  time: string;
  type: string;
  read: boolean;
}

interface HeaderProps {
  title?: string;
  navigationMode?: NavigationMode;
  menus?: MenuItem[];
}

export function Header({ title, navigationMode = 'sidebar', menus: propMenus }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { menus: authMenus } = useAuth();
  const { companyName } = useCompanyName();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userInfo, setUserInfo] = useState({ username: '管理员', email: 'admin@dachang.com' });
  const [activeTopMenu, setActiveTopMenu] = useState<string | null>(null);

  const menus = propMenus || authMenus || [];

  const getIcon = (iconName?: string) => {
    if (!iconName) return <LayoutDashboard className="w-4 h-4" />;
    const IconComponent = iconMap[iconName];
    return IconComponent ? <IconComponent className="w-4 h-4" /> : <LayoutDashboard className="w-4 h-4" />;
  };

  const isActive = (path?: string) => {
    if (!path) return false;
    return pathname === path || pathname.startsWith(path + '/');
  };

  const findActiveParent = useCallback(() => {
    for (const menu of menus) {
      if (menu.children) {
        for (const child of menu.children) {
          if (isActive(child.path)) return menu.code;
        }
      }
      if (isActive(menu.path)) return menu.code;
    }
    return null;
  }, [menus, pathname]);

  useEffect(() => {
    setActiveTopMenu(findActiveParent());
  }, [findActiveParent]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/system/notice?page=1&pageSize=10');
      const result = await res.json();
      if (result.success && result.data?.list) {
        const items = result.data.list.map((n: any) => ({
          id: n.id,
          title: n.notice_title,
          content: n.notice_content || '',
          time: n.create_time ? new Date(n.create_time).toLocaleString('zh-CN') : '',
          type: n.notice_type === 1 ? '通知' : n.notice_type === 2 ? '公告' : '其他',
          read: false,
        }));
        setNotifications(items);
        setUnreadCount(items.length);
      }
    } catch (e) {
      setNotifications([
        { id: 1, title: '系统通知', content: '欢迎使用ERP系统', time: new Date().toLocaleString('zh-CN'), type: '系统', read: false },
      ]);
      setUnreadCount(1);
    }
  }, []);

  const fetchUserInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/system/user?page=1&pageSize=1');
      const result = await res.json();
      if (result.success && result.data?.list?.length > 0) {
        const user = result.data.list[0];
        setUserInfo({
          username: user.username || user.real_name || '管理员',
          email: user.email || 'admin@dachang.com',
        });
      }
    } catch (e) {
      // keep defaults
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    fetchUserInfo();
  }, [fetchNotifications, fetchUserInfo]);

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleViewAllNotifications = () => {
    router.push('/settings/notice');
  };

  const handlePersonalSettings = () => {
    router.push('/settings/basics');
  };

  const handleSwitchWarehouse = () => {
    router.push('/warehouse/setup');
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore
    }
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
      <div className="flex-1 flex items-center gap-4">
        {navigationMode !== 'sidebar' && (
          <div className="flex items-center gap-2 mr-2">
            <img src="/loginlogo.png" alt="达昌" className="w-7 h-7 rounded-lg object-contain" />
            <span className="font-bold text-sm text-foreground hidden md:inline">{companyName}</span>
          </div>
        )}
        {title && navigationMode === 'sidebar' && (
          <h1 className="text-lg font-semibold">{title}</h1>
        )}
        {(navigationMode === 'top' || navigationMode === 'mixed') && (
          <nav className="snow-top-nav flex items-center gap-1 ml-2">
            {Array.isArray(menus) && menus.map((menu) => {
              const isTopActive = activeTopMenu === menu.code;
              if (menu.children && menu.children.length > 0) {
                return (
                  <DropdownMenu key={menu.id}>
                    <DropdownMenuTrigger asChild>
                      <button
                        className={cn(
                          'snow-top-nav-item',
                          isTopActive && 'active'
                        )}
                      >
                        {getIcon(menu.icon)}
                        <span>{menu.name}</span>
                        <ChevronDown className="w-3 h-3 ml-1" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      {menu.children.map((child) => (
                        <DropdownMenuItem key={child.id} asChild>
                          <Link
                            href={child.path || '#'}
                            className={cn(
                              'flex items-center gap-2 cursor-pointer',
                              isActive(child.path) && 'text-primary font-medium'
                            )}
                          >
                            {getIcon(child.icon)}
                            <span>{child.name}</span>
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              }
              return (
                <Link
                  key={menu.id}
                  href={menu.path || '#'}
                  className={cn(
                    'snow-top-nav-item',
                    isTopActive && 'active'
                  )}
                >
                  {getIcon(menu.icon)}
                  <span>{menu.name}</span>
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between px-2">
              <DropdownMenuLabel className="p-0">通知中心</DropdownMenuLabel>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleMarkAllRead}>
                  全部已读
                </Button>
              )}
            </div>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">暂无通知</div>
            ) : (
              notifications.slice(0, 5).map((n) => (
                <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-1 py-3">
                  <div className="flex items-center gap-2">
                    {!n.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                    <span className="font-medium">{n.title}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{n.type}</span>
                  </div>
                  {n.content && <span className="text-xs text-muted-foreground line-clamp-2">{n.content}</span>}
                  <span className="text-xs text-muted-foreground">{n.time}</span>
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-center text-primary justify-center" onClick={handleViewAllNotifications}>
              查看全部通知
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <User className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{userInfo.username}</span>
                <span className="text-xs text-muted-foreground">{userInfo.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handlePersonalSettings}>
              <Settings className="mr-2 h-4 w-4" />
              个人设置
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSwitchWarehouse}>
              <Warehouse className="mr-2 h-4 w-4" />
              切换仓库
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
