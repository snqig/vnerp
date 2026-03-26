'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface PermissionGuardProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  role?: string;
  fallback?: ReactNode;
}

// 权限守卫组件 - 根据权限控制显示
export function PermissionGuard({
  children,
  permission,
  permissions,
  role,
  fallback = null
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasRole, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  // 检查单一权限
  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>;
  }

  // 检查多个权限（满足任意一个）
  if (permissions && !hasAnyPermission(permissions)) {
    return <>{fallback}</>;
  }

  // 检查角色
  if (role && !hasRole(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// 权限按钮组件
interface PermissionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  permission?: string;
  children: ReactNode;
}

export function PermissionButton({
  permission,
  children,
  ...props
}: PermissionButtonProps) {
  const { hasPermission } = useAuth();

  if (permission && !hasPermission(permission)) {
    return null;
  }

  return (
    <button {...props}>
      {children}
    </button>
  );
}
