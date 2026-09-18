import { NextRequest } from 'next/server';
import { successResponse } from '@/lib/api-response';
import { getCompanyProfile } from '@/lib/company-profile';

/**
 * 公司品牌信息（名称 / LOGO）公开读取接口。
 *
 * 为什么必须存在：`/api/organization?type=company` 走 `withPermission`，**需要登录态**；
 * 而登录页本身处于未登录状态，于是品牌信息只能落到 i18n 兜底值
 * （`Common.companyName` = "公司名称"）与内置 LOGO —— 这正是
 * 「登录页顶部显示 公司名称 / loginlogo.png」的根因。
 *
 * 安全边界：只暴露 `full_name` / `short_name` / `logo` 三个**展示型**字段，
 * 不含税号、银行账号、法人、联系电话等敏感企业信息。这些字段本就渲染在登录页上，
 * 属于对外可见信息，因此免鉴权不构成信息泄露。
 *
 * 缓存：无需显式声明，`getCompanyProfile()` 已内置 30 秒进程内缓存，
 * 不会对 `sys_company` 造成每次请求一次查询的压力。
 */
export async function GET(_request: NextRequest) {
  const profile = await getCompanyProfile();

  return successResponse({
    full_name: profile.fullName,
    short_name: profile.shortName,
    logo: profile.logo,
  });
}
