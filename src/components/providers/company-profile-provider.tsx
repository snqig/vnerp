'use client';

import { useEffect } from 'react';
import { seedCompanyProfile, updateCompanyProfile } from '@/hooks/useCompanyName';

interface CompanyProfileProviderProps {
  /** 公司全称（`sys_company.full_name`） */
  fullName: string | null;
  /** 公司简称（`sys_company.short_name`） */
  shortName: string | null;
  /** LOGO 资源路径（`sys_company.logo`） */
  logo: string | null;
  children: React.ReactNode;
}

/**
 * 把服务端读取到的公司档案播种进 `useCompanyName` 的模块级缓存。
 *
 * 为什么需要：Hook 的初始值取自模块级缓存。若没有播种，客户端首帧只能拿到
 * i18n 兜底值（`Common.companyName` = "公司名称"）与内置 LOGO，
 * 即使用户已经配好公司名与 LOGO，也会先闪一下占位内容再被替换。
 *
 * 播种放在**渲染期**而非 `useEffect`：React 先渲染父组件再渲染子组件，
 * 因此子组件 `useState` 初始化时缓存已就绪。同时由于服务端渲染也走同一路径，
 * SSR HTML 与客户端首帧取值一致，不会产生水合不一致。
 *
 * `useEffect` 负责挂载后的**广播**：客户端路由切换时模块实例被复用，
 * 此时 SSR 传来的值可能已变化，需要通知已挂载的订阅者更新。
 */
export function CompanyProfileProvider({
  fullName,
  shortName,
  logo,
  children,
}: CompanyProfileProviderProps) {
  const companyName = fullName || shortName || null;
  const logoUrl = logo || null;

  seedCompanyProfile({ companyName, logoUrl });

  useEffect(() => {
    updateCompanyProfile({ companyName, logoUrl });
  }, [companyName, logoUrl]);

  return <>{children}</>;
}
