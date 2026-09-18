/**
 * 公司档案（名称 + LOGO）客户端读取 Hook。
 *
 * 单一真相源：`sys_company`（即 `settings/organization` 页面编辑的那条记录），
 * 通过 `/api/organization?type=company` 读取。
 *
 * 历史问题（已修）：本 Hook 原先**优先读 `sys_config.company_name`**，只有它为空时
 * 才回退到组织档案 —— 于是「在设置页改公司名」对界面无效。现统一以组织档案为准。
 *
 * 全局一致性：模块级缓存 + 订阅。40+ 个页面共用同一份数据，只发一次请求；
 * 上传 LOGO / 改公司名后调用 `refreshCompanyProfile()`（或本地 `updateCompanyProfile()`）
 * 即可让所有已挂载组件即时刷新，无需整页重载。
 */

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { authFetch } from '@/lib/auth-fetch';
import { useAuthGate } from '@/contexts/AuthContext';

/** 内置默认 LOGO：档案未配置时使用 */
export const DEFAULT_COMPANY_LOGO = '/loginlogo.png';

export interface CompanyProfileLite {
  /** 公司名称（`sys_company.full_name`，缺失时回退简称） */
  companyName: string | null;
  /** LOGO 资源路径（`sys_company.logo`） */
  logoUrl: string | null;
}

let cachedProfile: CompanyProfileLite | null = null;
let inflight: Promise<CompanyProfileLite | null> | null = null;
const listeners = new Set<(profile: CompanyProfileLite) => void>();

/** 合并写入缓存并通知所有订阅者 */
function commitProfile(next: CompanyProfileLite): void {
  cachedProfile = next;
  listeners.forEach((listener) => listener(next));
}

/** 局部更新（如刚上传完 LOGO，无需再发一次请求） */
export function updateCompanyProfile(patch: Partial<CompanyProfileLite>): void {
  commitProfile({
    companyName: patch.companyName !== undefined ? patch.companyName : (cachedProfile?.companyName ?? null),
    logoUrl: patch.logoUrl !== undefined ? patch.logoUrl : (cachedProfile?.logoUrl ?? null),
  });
}

function subscribe(listener: (profile: CompanyProfileLite) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** 归一化接口响应（兼容 data 直接返回 / 包在 list/records/items 中的多种形态） */
function normalize(raw: unknown): CompanyProfileLite | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const candidate =
    (Array.isArray(record.list) ? record.list[0] : undefined) ??
    (Array.isArray(record.records) ? record.records[0] : undefined) ??
    (Array.isArray(record.items) ? record.items[0] : undefined) ??
    raw;
  if (!candidate || typeof candidate !== 'object') return null;

  const row = candidate as Record<string, unknown>;
  const fullName = typeof row.full_name === 'string' ? row.full_name.trim() : '';
  const shortName = typeof row.short_name === 'string' ? row.short_name.trim() : '';
  const logo = typeof row.logo === 'string' ? row.logo.trim() : '';

  const companyName = fullName || shortName || null;
  if (!companyName && !logo) return null;
  return { companyName, logoUrl: logo || null };
}

/**
 * 拉取公司档案（带并发去重与重试）。
 *
 * 未登录（401）返回 null，由调用方回退 i18n 默认值与内置 LOGO —— 登录页同样需要品牌信息，
 * 但不应对匿名访客产生 401 噪音（BUG-005）。
 */
async function loadProfile(retries = 2): Promise<CompanyProfileLite | null> {
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      for (let i = 0; i <= retries; i++) {
        try {
          const res = await authFetch('/api/organization?type=company');
          if (res.status === 401) return null;
          if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
            const json = await res.json();
            if (!json?.success) return null;
            return normalize(json.data);
          }
        } catch {
          /* 落到下方重试 */
        }
        if (i < retries) {
          await new Promise((resolve) => setTimeout(resolve, 500 * (i + 1)));
        }
      }
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/**
 * 强制刷新公司档案（上传 LOGO / 保存公司信息后调用），并广播给所有订阅者。
 */
export async function refreshCompanyProfile(): Promise<CompanyProfileLite | null> {
  const profile = await loadProfile();
  if (profile) commitProfile(profile);
  return profile;
}

export function useCompanyName() {
  const tc = useTranslations('Common');
  const authGate = useAuthGate();

  const fallbackName = tc('companyName');
  const [remoteName, setRemoteName] = useState<string | null>(
    cachedProfile?.companyName ?? null
  );
  const [remoteLogo, setRemoteLogo] = useState<string | null>(cachedProfile?.logoUrl ?? null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apply = (profile: CompanyProfileLite) => {
      setRemoteName(profile.companyName);
      setRemoteLogo(profile.logoUrl);
    };

    const unsubscribe = subscribe(apply);

    // 认证闸门：公司档案接口需要登录态；未登录时保持 i18n 默认名与内置 LOGO
    if (authGate === 'pending') return unsubscribe;
    if (authGate === 'anonymous') {
      setLoading(false);
      return unsubscribe;
    }

    if (cachedProfile) {
      apply(cachedProfile);
      setLoading(false);
      return unsubscribe;
    }

    let cancelled = false;
    loadProfile().then((profile) => {
      if (cancelled) return;
      if (profile) {
        commitProfile(profile);
        apply(profile);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [authGate]);

  return {
    companyName: remoteName || fallbackName,
    logoUrl: remoteLogo || DEFAULT_COMPANY_LOGO,
    loading,
  };
}
