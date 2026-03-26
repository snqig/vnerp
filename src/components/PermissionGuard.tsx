'use client';

import React from 'react';
import { usePermission } from '@/hooks/usePermission';

interface PermissionGuardProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

// 单权限验证组件
export function PermissionGuard({ permission, children, fallback = null }: PermissionGuardProps) {
  const { hasPermission, loaded } = usePermission();

  if (!loaded) {
    return null;
  }

  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface AnyPermissionGuardProps {
  permissions: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

// 任意权限验证组件
export function AnyPermissionGuard({ permissions, children, fallback = null }: AnyPermissionGuardProps) {
  const { hasAnyPermission, loaded } = usePermission();

  if (!loaded) {
    return null;
  }

  if (!hasAnyPermission(permissions)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface AllPermissionsGuardProps {
  permissions: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

// 所有权限验证组件
export function AllPermissionsGuard({ permissions, children, fallback = null }: AllPermissionsGuardProps) {
  const { hasAllPermissions, loaded } = usePermission();

  if (!loaded) {
    return null;
  }

  if (!hasAllPermissions(permissions)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// 带权限的按钮组件
interface PermissionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  permission: string;
  children: React.ReactNode;
}

export function PermissionButton({ permission, children, ...props }: PermissionButtonProps) {
  const { hasPermission, loaded } = usePermission();

  if (!loaded || !hasPermission(permission)) {
    return null;
  }

  return <button {...props}>{children}</button>;
}

export default PermissionGuard;
