# API 设计规范

> 基于 `src/app/api/` 356 个方法导出、`src/lib/api-response.ts`、`src/lib/api-auth.ts`、`src/lib/auth-fetch.ts` 与 `src/proxy.ts` 描述。
> 路由风格：多数用 `export const GET/POST/PUT/DELETE = withPermission(async (req, userInfo) => {...})`；dashboard/auth/health/init 等公开或特殊路由用 `export async function GET/POST(...)`。

## 1. RESTful 约定

### 1.1 URL 设计

```
基础格式：/api/{模块}/{资源}[/{id}[/{动作}]]
```

- 使用名词复数或集合名词：`/api/customers`、`/api/sales/orders`、`/api/warehouse/inbound`。
- 路径 kebab-case：`/api/process-reports`、`/api/standard-card`、`/api/sample-card`。
- 层级不超过 3 层：`/api/sales/delivery/[id]/ship`。
- 子动作使用动词：`/api/purchase/convert-po`、`/api/sales/convert-wo`、`/api/dcprint/sample-card/[id]/save-as-template`。

### 1.2 HTTP 方法语义

| 方法 | 用途 | 示例 |
|------|------|------|
| GET | 查询 / 列表 / 详情 | `GET /api/warehouse/inventory?warehouseId=1` |
| POST | 创建 / 执行操作 | `POST /api/auth/login`、`POST /api/warehouse/inbound` (含 `action` 字段) |
| PUT | 全量更新 | 较少使用，多由 POST + action 替代 |
| PATCH | 部分更新 / 状态流转 | `PATCH /api/sales/orders/[id]` 改 `status` |
| DELETE | 软删除 | `UPDATE ... SET deleted = 1` |

由于业务动作复杂，部分接口通过 POST body 中的 `action` 字段区分操作（如 `/api/warehouse/inbound` 的 `cutting` / `scan` / `audit`，`/api/qrcode` 的 `batch-consumed` / `print` / `scan` / `invalidate` / `void`）。

### 1.3 查询参数（GET）

```
GET /api/warehouse/inventory?page=1&pageSize=20&warehouseId=1&status=normal&keyword=B2026
```

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `page` | number | 1 | 页码 |
| `pageSize` | number | 20 | 每页条数（建议 ≤ 100） |
| `keyword` | string | - | 模糊搜索 |
| `{field}` | any | - | 业务过滤 |

## 2. 统一响应格式

`src/lib/api-response.ts` 定义 `ApiResponse<T>`：

```ts
interface ApiResponse<T = unknown> {
  code: number;        // 业务码：200 成功，401/403/404/409/422/500 错误
  success: boolean;    // 与 code 同义
  message: string;     // 中文提示
  data: T | null;      // 业务数据，统一经 sanitizeObject 转义
}
```

分页响应额外携带 `pagination`：

```ts
interface PaginatedResponse<T> extends ApiResponse<{ list: T[]; total; page; pageSize }> {
  pagination: { page; pageSize; total; totalPages };
}
```

### 2.1 工具函数

```ts
import {
  successResponse,
  errorResponse,
  paginatedResponse,
  commonErrors,
  withErrorHandler,
  validateRequestBody,
  logOperation,
} from '@/lib/api-response';

return successResponse(data, '操作成功');
return paginatedResponse(list, { page, pageSize, total, totalPages });
return commonErrors.unauthorized('未授权，请先登录');
return commonErrors.notFound('物料不存在');
return errorResponse('可用库存不足', 409, 409);
```

`sanitizeObject` 会对字符串做 HTML 实体转义（`<` `>` `"` `'`），防止 XSS 反射；日期被截断为 `YYYY-MM-DD`。

### 2.2 错误处理包装

`withErrorHandler` 包装 Route Handler，自动 try/catch 并输出 500：

```ts
export const GET = withErrorHandler(async (request) => {
  // 业务逻辑
}, '获取库存列表失败');
```

业务自定义错误应在内部捕获并返回具体码，例如 `InventoryError`、`DomainError`、`NotFoundError`、`VersionConflictError`。

## 3. HTTP 状态码使用

| 状态码 | 含义 | 使用场景 |
|--------|------|----------|
| 200 | 成功 | 所有成功响应 |
| 400 | 请求错误 | 参数校验失败 |
| 401 | 未认证 | 未提供 / 无效 / 过期 Token |
| 403 | 无权限 | 权限不足或资源越权；首次登录未改密（`passwordExpired: true`） |
| 404 | 未找到 | 资源不存在 |
| 409 | 冲突 | 编号重复、库存版本冲突（`VersionConflictError`） |
| 422 | 校验失败 | 业务校验不通过 |
| 429 | 限流 | 频率超限 |
| 500 | 服务器错误 | 未捕获异常 |

## 4. 认证与授权

### 4.1 服务端：`withAuth` / `withAuthAndErrorHandler`

`src/lib/api-auth.ts` 提供 HOC，统一处理认证与权限。`withAuth` 内部按序执行：

1. `extractToken(request)` 提取 `Authorization: Bearer <token>` 或 `access_token` cookie。
2. `verifyToken(token)` 用 `jose` 校验 JWT，回填 `iat`。
3. `isTokenRevoked(tokenKey)` 检查单 token 黑名单。
4. `isUserTokensRevoked(userId, iat)` 检查用户级撤销（改密后旧 token 立即失效）。
5. `getUserInfo(userId)` 重新加载用户状态、角色、权限、数据范围。
6. 首次登录强制改密检查（`firstLogin=true` 时仅放行 `/api/auth/change-password`、`/api/auth/logout`、`/api/auth/user-info`、`/api/auth/refresh`）。
7. `hasPermission(user, permission)` 校验操作权限。
8. `validateResourceAccess(user, type, id)` 校验资源级越权（`resourceType` 支持 `'order' | 'workorder' | 'inbound' | 'outbound'`）。

未认证返回 401；无权限返回 403；资源越权返回 403。

```ts
import { withAuthAndErrorHandler, UserInfo } from '@/lib/api-auth';

export const GET = withAuthAndErrorHandler(async (request, userInfo) => {
  // userInfo: UserInfo（含 roles / permissions / dataScope / firstLogin）
  return successResponse(data);
}, { permission: 'warehouse:view' });

export const DELETE = withAuthAndErrorHandler(
  async (request, userInfo) => { /* ... */ },
  { permission: 'system:user:delete', resourceType: 'order', resourceIdParam: 'id' }
);
```

`withAuth` 不含 try/catch，需自动错误捕获请用 `withAuthAndErrorHandler`（委托 `withAuth` 完成 DRY 认证流程）。

### 4.2 客户端：`authFetch`

`src/lib/auth-fetch.ts` 封装带 Token 的 fetch 与 401 无感刷新：

- 自动注入 `Authorization: Bearer <token>`（从 localStorage / sessionStorage 读取）。
- 收到 401（且非 `/api/auth/refresh` 自身）时触发 `refreshAccessToken`。
- 并发 401 复用同一 `refreshPromise`，避免多次刷新互相覆盖。
- 刷新成功 → 写回新 token → 用新 token 重试原请求一次。
- 刷新失败 / 无 refreshToken → 清除登录态并跳转 `/login`。

```ts
import { authFetch } from '@/lib/auth-fetch';
const res = await authFetch('/api/warehouse/inventory', { method: 'POST', body: JSON.stringify(body) });
```

### 4.3 中间件层鉴权：`src/proxy.ts`

`src/proxy.ts`（Next.js 16 自动探测，替代已删 `src/middleware.ts`）在 Edge runtime 层做轻量校验：

- **API 路由**（`/api/`）：公开 API（`/api/auth/login`、`/api/auth/register`、`/api/health`、`/api/migrations`）放行；其余须携带 `access_token` cookie（无则 401）；`requiresCsrfValidation` 的请求校验 CSRF token（失败 403）。
- **页面鉴权**：26 个受保护前缀（dashboard/warehouse/sales/purchase/production/quality/hr/finance/equipment/engineering/outsource/orders/reports/settings/dcprint/sample/analysis/base-data/business/srm/prepress/plm/delivery/crm/tools/material-requisitions/modules/qrcode）无 `access_token` → 重定向 `/login?next=原路径`；已登录访问 `/login` 等 → 重定向 `/dashboard`。
- **生产环境封堵**：`/qrcode`、`/api/init`、`/api/debug`、`/api/diagnose` 返回 404。
- **i18n**：`createIntlMiddleware`，`locales=[zh-CN, zh-TW, en, vi]`，`defaultLocale=zh-CN`，`localePrefix='as-needed'`。
- 注：proxy 只校验 cookie 存在性，JWT 实际有效性由 SSR `layout.tsx` 与 API 路由 `verifyToken` 校验。

## 5. 数据库操作

- 所有 SQL 必须使用参数化占位符 `?`，禁止字符串拼接用户输入（详见 [代码审查规范](./代码审查规范.md) 与 [数据库规范](./数据库规范.md)）。
- 多表写入 / 库存变动必须使用事务：`transaction(async conn => { ... })`。
- 涉及乐观锁的场景使用 `version` 字段 + `transactionWithRetry`（指数退避 100ms → 1s）。
- 出库类操作应使用 `FOR UPDATE` 锁定批次，避免超卖。
- `IN (?)` 子句必须显式展开占位符（`ids.map(() => '?').join(',')`），不可依赖 `query()` 隐式展开。

## 6. 操作日志

写操作应在成功后调用 `logOperation` 写入 `sys_operation_log`：

```ts
await logOperation({
  title: '库存入库',
  oper_name: userInfo.username,
  oper_type: 'inventory',
  oper_method: 'POST',
  oper_url: '/api/warehouse/inventory',
  oper_param: JSON.stringify({ action, batchNo, quantity }),
  oper_result: '入库成功',
  status: 1,
});
```

详细审计设计见 [系统可审计性设计方案](./系统可审计性设计方案.md)。

## 7. 健康检查与监控

`GET /api/health` 无需认证，供负载均衡探针使用，返回数据库 / 内存 / 运行时状态，整体健康返回 200，降级返回 503。

```json
{
  "status": "healthy" | "degraded",
  "timestamp": "...",
  "version": "...",
  "environment": "...",
  "latency": 12,
  "checks": { "database": {...}, "memory": {...}, "uptime": {...} }
}
```

## 8. 文件上传与导出

- 上传：`/api/upload`（含 `/api/upload/sop`、`/api/upload/contract`），校验类型与大小。
- 导出：`@e965/xlsx`（Excel）、`jspdf` + `jspdf-autotable`（PDF）、`docx`（Word）、`file-saver`（保存）。统一通过 `src/lib/excel-service.ts` / `src/lib/global-export-service.ts` 封装。
- 配置 API：`ALLOW_SETUP_API=false` 时 `/api/setup/*`、`/api/init/*` 在生产被 proxy 层封堵。

## 9. 调试路由

以下路由在 `NODE_ENV=production` 下被 `src/proxy.ts` 屏蔽（返回 404）：

- `/api/init/*`（除 `init/menus` 等必要接口外，建议生产关闭）
- `/api/debug/*`
- `/api/diagnose/*`
- `/qrcode`（页面，仅开发可访问）

调试路由仅用于开发期排查，不应在生产环境依赖。

> 最后更新：2026-07-10
