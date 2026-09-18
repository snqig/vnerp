/**
 * 公司档案（名称 + LOGO）客户端读取 Hook。
 *
 * 单一真相源：`sys_company`（即 `settings/organization` 页面编辑的那条记录）。
 *
 * 历史问题（已修）：
 *   1. 本 Hook 原先**优先读 `sys_config.company_name`**，只有它为空时才回退组织档案
 *      —— 于是「在设置页改公司名」对界面无效。现统一以组织档案为准。
 *   2. 原先经 `/api/organization?type=company` 读取，而该接口走 `withPermission`
 *      **需要登录**；登录页本身是未登录状态 → 必然 401 → 只能显示 i18n 兜底值
 *      （`Common.companyName` = "公司名称"）与内置 LOGO。现改读**免鉴权**的
 *      `/api/public/company-branding`（只含展示型字段），匿名与登录态行为一致。
 *
 * 全局一致性：模块级缓存 + 订阅。40+ 个页面共用同一份数据，只发一次请求；
 * 上传 LOGO / 改公司名后调用 `refreshCompanyProfile()`（或本地 `updateCompanyProfile()`）
 * 即可让所有已挂载组件即时刷新，无需整页重载。
 *
 * 首帧一致性：`[locale]/layout.tsx` 服务端读取档案后，由
 * `CompanyProfileProvider` 在**渲染期**调用 `seedCompanyProfile()` 播种，
 * 使客户端首帧即显示真实公司名，不出现「先占位、后替换」的闪烁。
 */

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { authFetch } from '@/lib/auth-fetch';

/** 内置默认 LOGO：档案未配置时使用 */
export const DEFAULT_COMPANY_LOGO = '/loginlogo.png';

/** 免鉴权的品牌信息接口（只返回 full_name / short_name / logo） */
export const COMPANY_BRANDING_ENDPOINT = '/api/public/company-branding';

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

/**
 * 静默播种缓存（**不通知订阅者**）。
 *
 * 供 `CompanyProfileProvider` 在**渲染期**调用：此时子组件尚未渲染，
 * 其 `useState` 初始化即可读到已播种的值，从而客户端首帧与 SSR HTML 一致。
 * 刻意不广播 —— 渲染期触发订阅者的 `setState` 会引发 React 的
 * 「Cannot update a component while rendering a different component」告警。
 */
export function seedCompanyProfile(profile: CompanyProfileLite | null): void {
  if (!profile) return;
  cachedProfile = profile;
}

/** 局部更新（如刚上传完 LOGO，无需再发一次请求） */
export function updateCompanyProfile(patch: Partial<CompanyProfileLite>): void {
  commitProfile({
    companyName:
      patch.companyName !== undefined ? patch.companyName : (cachedProfile?.companyName ?? null),
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
 * 接口免鉴权，因此匿名访客（登录页）同样能拿到真实公司名与 LOGO；
 * 仅在网络失败或接口异常时返回 null，由调用方回退 i18n 默认值与内置 LOGO。
 */
async function loadProfile(retries = 2): Promise<CompanyProfileLite | null> {
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      for (let i = 0; i <= retries; i++) {
        try {
          const res = await authFetch(COMPANY_BRANDING_ENDPOINT);
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

    // 已由服务端播种（或本会话已拉取过）→ 直接使用，不再重复请求
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
  }, []);

  return {
    companyName: remoteName || fallbackName,
    logoUrl: remoteLogo || DEFAULT_COMPANY_LOGO,
    loading,
  };
}
