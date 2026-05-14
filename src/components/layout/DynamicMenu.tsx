'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Home,
  ShoppingCart,
  Warehouse,
  Factory,
  ShoppingBag,
  Banknote,
  ShieldCheck,
  Users,
  Settings,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useState, useEffect } from 'react';

// 图标映射
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Home,
  ShoppingCart,
  Warehouse,
  Factory,
  ShoppingBag,
  Banknote,
  ShieldCheck,
  Users,
  Settings,
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

// 通过路径匹配找到所有祖先菜单 - 改进版
function findAncestorsByPathPrefix(menus: MenuItem[], currentPath: string): string[] {
  const ancestors: string[] = [];
  
  function search(currentMenus: MenuItem[], parentCodes: string[]): boolean {
    for (const menu of currentMenus) {
      // 检查当前菜单是否匹配当前路径
      if (menu.path && (currentPath === menu.path || currentPath.startsWith(menu.path + '/'))) {
        ancestors.push(...parentCodes);
        return true;
      }
      
      // 如果当前菜单有子菜单，继续搜索
      if (menu.children && menu.children.length > 0) {
        if (search(menu.children, [...parentCodes, menu.code])) {
          return true;
        }
      }
    }
    return false;
  }
  
  // 先尝试精确匹配
  let found = search(menus, []);
  
  // 如果没找到，尝试更宽松的匹配（寻找最长匹配的路径前缀）
  if (!found) {
    function searchBestMatch(currentMenus: MenuItem[], parentCodes: string[]): boolean {
      for (const menu of currentMenus) {
        if (menu.path) {
          // 检查是否是当前路径的前缀
          if (currentPath.startsWith(menu.path)) {
            ancestors.push(...parentCodes);
            // 继续搜索子菜单，看是否有更精确的匹配
            if (menu.children && menu.children.length > 0) {
              searchBestMatch(menu.children, [...parentCodes, menu.code]);
            }
            return true;
          }
        }
        if (menu.children && menu.children.length > 0) {
          if (searchBestMatch(menu.children, [...parentCodes, menu.code])) {
            return true;
          }
        }
      }
      return false;
    }
    searchBestMatch(menus, []);
  }
  
  return [...new Set(ancestors)];
}

export function DynamicMenu() {
  const { menus, isLoading } = useAuth();
  const pathname = usePathname();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  // 根据当前路径自动展开所有祖先菜单
  useEffect(() => {
    if (!pathname || !menus || menus.length === 0) return;
    
    // 使用新的前缀匹配函数
    const ancestorCodes = findAncestorsByPathPrefix(menus, pathname);
    if (ancestorCodes.length > 0) {
      setExpandedMenus(prev => {
        const newSet = new Set([...prev, ...ancestorCodes]);
        return Array.from(newSet);
      });
    }
  }, [pathname, menus]);

  if (isLoading) {
    return <div className="p-4 text-muted-foreground">加载中...</div>;
  }

  // 切换菜单展开状态
  const toggleMenu = (code: string) => {
    setExpandedMenus(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  // 获取图标组件
  const getIcon = (iconName?: string) => {
    if (!iconName) return null;
    const IconComponent = iconMap[iconName];
    return IconComponent ? <IconComponent className="w-5 h-5" /> : null;
  };

  // 检查菜单是否激活
  const isActive = (path?: string) => {
    if (!path) return false;
    return pathname === path || pathname.startsWith(path + '/');
  };

  // 渲染菜单项
  const renderMenuItem = (menu: MenuItem, level: number = 0) => {
    const hasChildren = menu.children && menu.children.length > 0;
    const isExpanded = expandedMenus.includes(menu.code);
    const active = isActive(menu.path);

    // 目录类型（可展开）
    if (hasChildren) {
      return (
        <div key={menu.id}>
          <button
            onClick={() => toggleMenu(menu.code)}
            className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
              active ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
            }`}
            style={{ paddingLeft: `${16 + level * 16}px` }}
          >
            <div className="flex items-center gap-3">
              {getIcon(menu.icon)}
              <span>{menu.name}</span>
            </div>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          {isExpanded && (
            <div className="mt-1">
              {menu.children!.map(child => renderMenuItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    // 菜单类型（链接）
    return (
      <Link
        key={menu.id}
        href={menu.path || '#'}
        className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
          active ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
        }`}
        style={{ paddingLeft: `${16 + level * 16}px` }}
      >
        {getIcon(menu.icon)}
        <span>{menu.name}</span>
      </Link>
    );
  };

  return (
    <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
      {menus.map(menu => renderMenuItem(menu))}
    </nav>
  );
}
