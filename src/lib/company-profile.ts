/**
 * @module company-profile
 * @description 公司档案（公司名称 / 简称 / LOGO）的**单一真相源**读取模块。
 *
 * 背景（数据源分散问题）：
 *   同一份「公司名称」此前存在三处互相独立的数据源，且优先级各不相同：
 *     1. 客户端 `useCompanyName()` → `sys_config.company_name`（优先）
 *     2. 服务端 `[locale]/layout.tsx` 内联 `getCompanyName()` → `sys_config.company_name`
 *     3. `settings/organization` 页面 → `sys_company.full_name`（用户实际编辑的那份）
 *   结果是「在设置页改了公司名，界面其它地方不跟着变」。
 *
 * 本模块把 `sys_company`(id=1) 定为唯一权威源，并集中提供：
 *   - `getCompanyProfile()`：服务端读取（含短 TTL 缓存）
 *   - `invalidateCompanyProfileCache()`：写入后立即失效，避免缓存导致改动不生效
 *
 * 说明：`sys_config.company_name` 属于历史遗留的重复配置项，不再作为展示来源。
 */

import { queryOne } from '@/lib/db';

/** 公司档案（展示用） */
export interface CompanyProfile {
  /** 公司全称（`sys_company.full_name`） */
  fullName: string | null;
  /** 公司简称（`sys_company.short_name`） */
  shortName: string | null;
  /** LOGO 静态资源路径（`sys_company.logo`），如 `/uploads/company/xxx.png` */
  logo: string | null;
}

/** `sys_company` 查询结果行 */
interface CompanyRow {
  full_name: string | null;
  short_name: string | null;
  logo: string | null;
}

/** 空档案：DB 不可用或记录缺失时的兜底 */
const EMPTY_PROFILE: CompanyProfile = { fullName: null, shortName: null, logo: null };

/**
 * 缓存 TTL。
 *
 * 取 30 秒而非 5 分钟：`generateMetadata` 在每次动态渲染时都会执行，
 * 缓存过长会让「刚改完公司名 / 刚传完 LOGO」在标题等位置迟迟不生效。
 * 30 秒对一次极轻量的单行主键查询而言，开销可忽略。
 */
const CACHE_TTL_MS = 30_000;

let cache: { profile: CompanyProfile; ts: number } | null = null;

/** 写入公司档案后调用，使缓存立即失效（同进程内生效） */
export function invalidateCompanyProfileCache(): void {
  cache = null;
}

/** 读取公司档案（`sys_company` 中 `id = 1` 的单例行） */
export async function getCompanyProfile(): Promise<CompanyProfile> {
  const now = Date.now();
  if (cache && now - cache.ts < CACHE_TTL_MS) return cache.profile;

  try {
    const row = await queryOne<CompanyRow>(
      `SELECT full_name, short_name, logo FROM sys_company WHERE id = 1`
    );
    const profile: CompanyProfile = {
      fullName: row?.full_name ?? null,
      shortName: row?.short_name ?? null,
      logo: row?.logo ?? null,
    };
    cache = { profile, ts: now };
    return profile;
  } catch {
    // DB 未就绪 / 表缺失不应阻断页面渲染，退回上次成功值或空档案
    return cache?.profile ?? EMPTY_PROFILE;
  }
}

/**
 * 取公司展示名：全称优先，其次简称，最后回退调用方提供的兜底文案。
 *
 * @param fallback - 通常传入 i18n 的 `Common.companyName`，避免硬编码中文
 */
export function resolveCompanyDisplayName(
  profile: CompanyProfile,
  fallback: string
): string {
  return profile.fullName || profile.shortName || fallback;
}
