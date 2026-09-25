/**
 * @module route-permissions-public
 * @description 无需认证即可访问的公开 API 路由列表（纯数据，客户端可安全引用）。
 *
 * 与 `api-permissions.ts` 的 `PUBLIC_ROUTES` 同源，拆出是为了让客户端页面守卫共用。
 */
export const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/reset-lock',
  '/api/linkage/',
  '/api/document-number',
  // 对外可见的品牌信息（公司名 / LOGO），登录页在未登录状态下也要渲染
  '/api/public/',
  // 存活探针与接口文档，属于基础设施，不需要登录态
  '/api/health',
  '/api/openapi.json',
];
