# API 开发

本文档说明 VNERP API 开发规范与流程，对应 `src/app/api/` 下的路由实现与 `src/lib/api-response.ts`、`src/lib/api-auth.ts` 工具。

## 1. 路由组织

API 路由位于 `src/app/api/`，遵循 Next.js App Router 约定。每个目录下的 `route.ts` 导出 HTTP 方法函数（`GET` / `POST` / `PUT` / `DELETE`）。

典型结构：

```
src/app/api/
├── auth/
│   ├── login/route.ts          # POST /api/auth/login
│   ├── logout/route.ts         # POST /api/auth/logout
│   ├── me/route.ts             # GET /api/auth/me
│   ├── refresh/route.ts        # POST /api/auth/refresh
│   └── register/route.ts       # POST /api/auth/register
├── health/route.ts             # GET /api/health（无认证）
├── customers/route.ts          # GET / POST /api/customers
├── warehouse/
│   ├── inbound/route.ts
│   ├── outbound/route.ts
│   └── transfer/route.ts
└── qrcode/
    ├── route.ts
    ├── print/route.ts
    └── trace/route.ts
```

动态参数路由使用 `[id]` 目录，如 `src/app/api/orders/bom/[id]/route.ts`。

## 2. 响应格式

统一通过 `src/lib/api-response.ts` 返回，结构为：

```ts
interface ApiResponse<T> {
  code: number;        // 业务码，200 成功
  success: boolean;
  message: string;
  data: T | null;
}

interface PaginatedResponse<T> extends ApiResponse<{
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}> {
  pagination: { page, pageSize, total, totalPages };
}
```

工具方法：

| 方法 | 用途 |
|------|------|
| `successResponse(data, message?, code?)` | 成功响应，自动 sanitize（XSS 转义） |
| `paginatedResponse(data, pagination, message?)` | 分页响应 |
| `errorResponse(message, code?, statusCode?)` | 错误响应 |
| `commonErrors.unauthorized()` / `forbidden()` / `notFound()` / `badRequest()` / `conflict()` / `validationError()` / `serverError()` | 常见错误快捷方法 |
| `withErrorHandler(handler)` | 包装器，捕获异常返回 500 |
| `withAuthAndErrorHandler(handler, options?)` | 包装器，校验 JWT 后执行，注入 `UserInfo` |
| `validateRequestBody(body, requiredFields)` | 校验必填字段 |
| `logOperation(params)` | 记录操作日志到 `sys_operation_log` |

## 3. 典型 GET 实现（分页查询）

参考 `src/app/api/customers/route.ts`：

```ts
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const keyword = searchParams.get('keyword') || '';

  const where = 'WHERE deleted = 0 AND name LIKE ?';
  const params = [`%${keyword}%`];

  const totalRows: any = await query(
    `SELECT COUNT(*) as total FROM crm_customer ${where}`, params
  );
  const total = totalRows[0]?.total || 0;

  const rows: any = await query(
    `SELECT * FROM crm_customer ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  return paginatedResponse(rows, {
    page, pageSize, total,
    totalPages: Math.ceil(total / pageSize),
  });
});
```

## 4. 典型 POST 实现（创建）

```ts
export const POST = withAuthAndErrorHandler(async (request, userInfo) => {
  const body = await request.json();

  // 参数校验
  const { valid, missing } = validateRequestBody(body, ['name', 'code']);
  if (!valid) {
    return errorResponse(`缺少必填字段: ${missing.join(', ')}`, 400, 400);
  }

  // 业务逻辑（封装在 service 中）
  const id = await CustomerService.create(body);

  // 操作日志
  await logOperation({
    title: '创建客户',
    oper_name: userInfo.username,
    oper_type: 'POST',
    oper_method: '/api/customers',
    oper_url: '/api/customers',
    oper_param: JSON.stringify(body),
    status: 1,
  });

  return successResponse({ id }, '创建成功');
});
```

## 5. 认证与权限

### 5.1 认证

`withAuthAndErrorHandler` 自动从 `Authorization: Bearer <token>` 头解析 JWT，注入 `UserInfo`：

```ts
interface UserInfo {
  userId: number;
  username: string;
  realName: string;
  roles: string[];
  permissions: string[];
  iat?: number;  // token 签发时间
}
```

未携带 token 或 token 无效返回 401。`/api/health`、`/api/auth/login` 等少数路由无需认证。

### 5.2 权限

通过 `options.permission` 指定所需权限点：

```ts
export const DELETE = withAuthAndErrorHandler(
  async (request, userInfo) => { /* ... */ },
  { permission: 'system:user:delete' }
);
```

权限点存储在 `sys_menu.permission` 字段，通过 `sys_role_menu` 关联到角色。前端使用 `PermissionGuard` 或 `usePermission` Hook 控制按钮。

### 5.3 速率限制

登录接口使用 `checkRateLimit`（`src/lib/rate-limit.ts`）限制单 IP 15 分钟内 20 次请求。其他敏感接口可参考实现。

## 6. 数据库访问

统一使用 `src/lib/db/index.ts` 提供的函数：

| 函数 | 用途 |
|------|------|
| `query<T>(sql, values?)` | 查询，返回行数组，自动重试 2 次 |
| `queryOne<T>(sql, values?)` | 查询单行 |
| `execute(sql, values?)` | 写入 / 更新 / 删除 |
| `transaction(async (conn) => {...})` | 事务，异常自动回滚 |
| `queryPaginated(sql, params, page, pageSize)` | 分页查询 |

所有查询使用参数化占位符 `?`，**禁止**字符串拼接 SQL。

## 7. 缓存

可选使用 `src/lib/api-cache.ts`：

- `cachedApiRoute(handler, options)` 包装路由，缓存 GET 响应。
- `invalidateCache(key)` 在数据变更后失效缓存。

缓存后端由 `EVENT_BUS_TYPE` 与 Redis 决定：生产使用 Redis 共享缓存，开发降级为进程内 Map。

## 8. 错误处理约定

| 场景 | HTTP 状态码 | 业务码 |
|------|------------|--------|
| 参数缺失 / 格式错误 | 400 | 400 |
| 未认证 | 401 | 401 |
| 无权限 | 403 | 403 |
| 资源不存在 | 404 | 404 |
| 资源冲突（如用户名重复） | 409 | 409 |
| 数据校验失败 | 422 | 422 |
| 限流 | 429 | 429 |
| 服务器错误 | 500 | 500 |

业务逻辑错误（如"库存不足"）建议返回 400 + 具体消息，避免使用 500。

## 9. 调试路由

以下路由在 `NODE_ENV=production` 下被 `src/middleware.ts` 屏蔽（返回 404）：

- `/api/diagnose/*`
- `/api/test/*`
- `/api/init/*`（除 `init/menus` 等必要接口外，建议生产关闭）

调试路由仅用于开发期排查，不应在生产环境依赖。

> 最后更新：2026-06-30
