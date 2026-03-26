'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Package,
  Factory,
  ClipboardCheck,
  ShoppingCart,
  Settings,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Printer,
  Users,
  Warehouse,
  Banknote,
  ShieldCheck,
  Home,
  ShoppingBag,
  Globe,
  Database,
  Zap,
  Palette,
  GripVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// 拖拽相关导入
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// 图标映射
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Home,
  LayoutDashboard,
  FileText,
  Package,
  Factory,
  ClipboardCheck,
  ShoppingCart,
  Settings,
  Printer,
  Users,
  Warehouse,
  Banknote,
  ShieldCheck,
  ShoppingBag,
  Globe,
  Database,
  Zap,
  Palette,
};

interface MenuItem {
  id: number;
  name: string;
  code: string;
  type: number;
  icon?: string;
  path?: string;
  children?: MenuItem[];
  sort_order?: number;
}

// 可拖拽的菜单项组件
interface SortableMenuItemProps {
  menu: MenuItem;
  level: number;
  collapsed: boolean;
  active: boolean;
  expanded: boolean;
  onToggle: () => void;
  getIcon: (iconName?: string) => React.ReactNode;
  renderChildren: (menu: MenuItem, level: number) => React.ReactNode;
}

function SortableMenuItem({
  menu,
  level,
  collapsed,
  active,
  expanded,
  onToggle,
  getIcon,
  renderChildren,
}: SortableMenuItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: menu.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
  };

  const hasChildren = menu.children && menu.children.length > 0;

  if (hasChildren) {
    return (
      <div ref={setNodeRef} style={style} className="mb-1">
        <button
          onClick={onToggle}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-colors group',
            active
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-700 hover:bg-gray-100'
          )}
          style={{ paddingLeft: collapsed ? '12px' : `${12 + level * 12}px` }}
        >
          <div className="flex items-center gap-3 flex-1">
            {!collapsed && (
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="w-3 h-3 text-gray-400" />
              </div>
            )}
            {getIcon(menu.icon)}
            {!collapsed && <span>{menu.name}</span>}
          </div>
          {!collapsed && (
            expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
          )}
        </button>
        {expanded && !collapsed && (
          <div className="mt-1 ml-4">
            {menu.children!.map(child => renderChildren(child, level + 1))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="mb-1 group">
      <Link
        href={menu.path || '#'}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors',
          active
            ? 'bg-blue-50 text-blue-700'
            : 'text-gray-700 hover:bg-gray-100'
        )}
        style={{ paddingLeft: collapsed ? '12px' : `${12 + level * 12}px` }}
        title={collapsed ? menu.name : undefined}
      >
        {!collapsed && (
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.preventDefault()}
          >
            <GripVertical className="w-3 h-3 text-gray-400" />
          </div>
        )}
        {getIcon(menu.icon)}
        {!collapsed && <span>{menu.name}</span>}
      </Link>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [orderedMenus, setOrderedMenus] = useState<MenuItem[]>([]);
  const { menus, isLoading, user, logout } = useAuth();

  // 从 localStorage 加载排序
  useEffect(() => {
    const savedOrder = localStorage.getItem('menu_order');
    if (savedOrder) {
      try {
        const orderIds = JSON.parse(savedOrder) as number[];
        // 根据保存的ID顺序重新排序菜单
        const sortedMenus = [...menus].sort((a, b) => {
          const indexA = orderIds.indexOf(a.id);
          const indexB = orderIds.indexOf(b.id);
          if (indexA === -1 && indexB === -1) return (a.sort_order || 0) - (b.sort_order || 0);
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });
        setOrderedMenus(sortedMenus);
      } catch {
        setOrderedMenus(menus);
      }
    } else {
      setOrderedMenus(menus);
    }
  }, [menus]);

  // 保存排序到 localStorage（立即）和数据库（防抖）
  const saveToLocalStorage = useCallback((newOrder: MenuItem[]) => {
    const orderIds = newOrder.map(m => m.id);
    localStorage.setItem('menu_order', JSON.stringify(orderIds));
  }, []);

  // 防抖保存到数据库
  const debouncedSaveToDatabase = useCallback((orders: MenuItem[]) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      console.log('未登录，跳过数据库保存');
      return;
    }

    const orderData = orders.map((m, index) => ({
      id: m.id,
      sort_order: index + 1
    }));

    fetch('/api/menu/sort-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ orders: orderData }),
    })
    .then(response => {
      if (!response.ok) {
        console.error('保存菜单排序失败:', response.status);
      } else {
        console.log('菜单排序保存成功');
      }
    })
    .catch(error => {
      console.error('保存菜单排序请求失败:', error.message);
    });
  }, []);

  // 保存排序（先本地，再防抖保存到数据库）
  const saveMenuOrder = useCallback((newOrder: MenuItem[]) => {
    // 立即保存到 localStorage
    saveToLocalStorage(newOrder);

    // 延迟保存到数据库（防抖）
    const timer = setTimeout(() => {
      debouncedSaveToDatabase(newOrder);
    }, 800);

    return () => clearTimeout(timer);
  }, [saveToLocalStorage, debouncedSaveToDatabase]);

  // 配置拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 处理拖拽结束
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setOrderedMenus((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        saveMenuOrder(newOrder);
        toast.success('菜单顺序已保存');
        return newOrder;
      });
    }
  }, [saveMenuOrder]);

  // 切换菜单展开状态
  const toggleMenu = (code: string) => {
    setExpandedMenus(prev =>
      prev.includes(code)
        ? prev.filter(c => c !== code)
        : [...prev, code]
    );
  };

  // 获取图标组件
  const getIcon = (iconName?: string) => {
    if (!iconName) return <LayoutDashboard className="w-5 h-5" />;
    const IconComponent = iconMap[iconName];
    return IconComponent ? <IconComponent className="w-5 h-5" /> : <LayoutDashboard className="w-5 h-5" />;
  };

  // 检查菜单是否激活
  const isActive = (path?: string) => {
    if (!path) return false;
    return pathname === path || pathname.startsWith(path + '/');
  };

  // 渲染子菜单（非拖拽）
  const renderMenuItem = (menu: MenuItem, level: number = 0): React.ReactNode => {
    const hasChildren = menu.children && menu.children.length > 0;
    const isExpanded = expandedMenus.includes(menu.code);
    const active = isActive(menu.path);

    if (hasChildren) {
      return (
        <div key={menu.id} className="mb-1">
          <button
            onClick={() => toggleMenu(menu.code)}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-colors',
              active
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            )}
            style={{ paddingLeft: collapsed ? '12px' : `${12 + level * 12}px` }}
          >
            <div className="flex items-center gap-3">
              {getIcon(menu.icon)}
              {!collapsed && <span>{menu.name}</span>}
            </div>
            {!collapsed && (
              isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
            )}
          </button>
          {isExpanded && !collapsed && (
            <div className="mt-1 ml-4">
              {menu.children!.map(child => renderMenuItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={menu.id}
        href={menu.path || '#'}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors mb-1',
          active
            ? 'bg-blue-50 text-blue-700'
            : 'text-gray-700 hover:bg-gray-100'
        )}
        style={{ paddingLeft: collapsed ? '12px' : `${12 + level * 12}px` }}
        title={collapsed ? menu.name : undefined}
      >
        {getIcon(menu.icon)}
        {!collapsed && <span>{menu.name}</span>}
      </Link>
    );
  };

  return (
    <>
      {/* 移动端菜单按钮 */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
      </Button>

      {/* 侧边栏 */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-white border-r border-gray-200 transition-all duration-300 lg:static',
          collapsed ? 'w-16' : 'w-64',
          collapsed ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'
        )}
      >
        {/* Logo区域 */}
        <div className="h-16 flex items-center justify-center border-b border-gray-200">
          {collapsed ? (
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">达</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">达</span>
              </div>
              <span className="font-bold text-lg text-gray-800">达昌ERP</span>
            </div>
          )}
        </div>

        {/* 菜单区域 */}
        <ScrollArea className="flex-1 h-[calc(100vh-8rem)]">
          <nav className="p-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-gray-400">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : orderedMenus.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                暂无菜单权限
              </div>
            ) : collapsed ? (
              // 折叠状态下不启用拖拽
              orderedMenus.map(menu => renderMenuItem(menu))
            ) : (
              // 展开状态下启用拖拽
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={orderedMenus.map(m => m.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {orderedMenus.map((menu) => (
                    <SortableMenuItem
                      key={menu.id}
                      menu={menu}
                      level={0}
                      collapsed={collapsed}
                      active={isActive(menu.path)}
                      expanded={expandedMenus.includes(menu.code)}
                      onToggle={() => toggleMenu(menu.code)}
                      getIcon={getIcon}
                      renderChildren={renderMenuItem}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </nav>
        </ScrollArea>

        {/* 底部用户信息 */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-gray-500" />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {user?.realName || user?.username || '未登录'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.roles?.[0]?.role_name || '普通用户'}
                </p>
              </div>
            )}
            {!collapsed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-gray-500 hover:text-red-600"
              >
                退出
              </Button>
            )}
          </div>
        </div>

        {/* 折叠按钮 */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-3 top-20 hidden lg:flex w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3 rotate-90" />}
        </Button>
      </aside>

      {/* 移动端遮罩 */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}
    </>
  );
}
