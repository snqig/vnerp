# 安全与权限规则

> 文档编号：VNERP-RULES-005 | 版本：V1.0 | 更新日期：2026-05-10

## 1. 用户认证

### 1.1 密码规则

- 最小长度 8 位
- 必须包含大小写字母和数字
- 使用 bcrypt 哈希存储，salt rounds >= 10
- 禁止明文存储或传输密码

### 1.2 JWT Token 规则

- Access Token 有效期 2 小时
- Refresh Token 有效期 7 天
- Token 包含：userId, username, role
- Token 存储在 HttpOnly Cookie 中
- 登出时清除 Token 并加入黑名单

### 1.3 登录安全

- 连续失败 5 次锁定账户 30 分钟
- 记录登录日志（IP、时间、设备）
- 支持验证码机制（失败 3 次后启用）

## 2. 权限控制

### 2.1 RBAC 权限模型

```
用户(User) → 角色(Role) → 权限(Permission) → 菜单/按钮/API
```

### 2.2 权限校验层级

| 层级 | 校验方式 | 说明 |
|------|---------|------|
| 路由层 | 中间件 | 检查是否登录 |
| 页面层 | 组件内 | 检查是否有页面访问权限 |
| 按钮层 | 组件内 | 检查是否有操作权限 |
| API层 | Route Handler | 检查是否有接口调用权限 |

### 2.3 API 权限校验模板

```typescript
import { verifyAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const user = await verifyAuth(request);
  if (!user) return apiError('未登录', 401);
  if (!user.permissions.includes('production:order:create')) {
    return apiError('无权限', 403);
  }
  // ...
}
```

## 3. 数据安全

### 3.1 SQL 注入防护

- 所有 SQL 操作使用参数化查询
- 禁止拼接用户输入到 SQL 语句
- 输入参数类型校验

### 3.2 XSS 防护

- React 默认转义 HTML，避免使用 `dangerouslySetInnerHTML`
- 用户输入进行 HTML 实体编码
- CSP (Content-Security-Policy) 头部配置

### 3.3 CSRF 防护

- SameSite Cookie 属性
- 关键操作二次确认
- Referer 校验

### 3.4 数据加密

- 传输层使用 HTTPS
- 敏感字段加密存储
- 数据库连接使用 SSL

## 4. 日志与审计

### 4.1 操作日志

记录以下关键操作：

| 操作类型 | 记录内容 |
|---------|---------|
| 登录/登出 | 用户、IP、时间、结果 |
| 数据创建 | 用户、模块、数据ID、时间 |
| 数据修改 | 用户、模块、变更前后值 |
| 数据删除 | 用户、模块、数据ID、时间 |
| 权限变更 | 操作人、目标用户、变更内容 |

### 4.2 日志存储

- 操作日志保留 180 天
- 登录日志保留 90 天
- 异常日志保留 30 天
- 日志不可篡改

## 5. 接口安全

### 5.1 限流规则

| 接口类型 | 限流策略 |
|---------|---------|
| 登录 | 同一 IP 每分钟 5 次 |
| 普通 API | 同一用户每分钟 60 次 |
| 导出 | 同一用户每分钟 3 次 |
| 文件上传 | 同一用户每分钟 10 次 |

### 5.2 输入校验

- 所有 API 入参必须校验类型和范围
- 字符串长度限制
- 数字范围限制
- 日期格式校验
- 枚举值校验
