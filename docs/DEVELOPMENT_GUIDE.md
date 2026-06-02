# ERP 项目开发规范手册

## 目录

1. [项目架构](#项目架构)
2. [代码规范](#代码规范)
3. [API 开发规范](#api-开发规范)
4. [数据库规范](#数据库规范)
5. [缓存使用规范](#缓存使用规范)
6. [错误处理规范](#错误处理规范)
7. [性能优化规范](#性能优化规范)
8. [测试规范](#测试规范)
9. [部署规范](#部署规范)

---

## 项目架构

### 技术栈

- **前端**: Next.js 16 (App Router) + React 18 + TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **数据库**: MySQL 8.0
- **架构模式**: DDD (领域驱动设计)

### 目录结构

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   └── (pages)/           # 页面组件
├── components/            # 可复用组件
│   ├── ui/               # 基础 UI 组件
│   └── layout/           # 布局组件
├── lib/                   # 工具库
│   ├── db/               # 数据库连接
│   ├── performance/      # 性能优化
│   └── validations/      # 数据验证
├── hooks/                 # React Hooks
├── contexts/              # React Context
├── domain/                # 领域模型 (DDD)
└── infrastructure/        # 基础设施
```

---

## 代码规范

### TypeScript 规范

```typescript
// ✅ 推荐: 使用明确的类型定义
interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
}

// ❌ 避免: 使用 any
const data: any = fetchData(); // 不推荐

// ✅ 推荐: 使用泛型
async function fetchData<T>(url: string): Promise<T> {
  const response = await fetch(url);
  return response.json();
}
```

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件 | PascalCase | `UserList.tsx` |
| 函数 | camelCase | `getUserById()` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| 文件 | kebab-case | `user-service.ts` |
| 接口 | PascalCase | `interface User {}` |
| 类型 | PascalCase | `type UserRole = ...` |

### 组件规范

```tsx
// ✅ 推荐: 组件结构
interface UserCardProps {
  user: User;
  onEdit?: (user: User) => void;
}

export function UserCard({ user, onEdit }: UserCardProps) {
  // 1. Hooks 声明
  const [isEditing, setIsEditing] = useState(false);
  
  // 2. 派生状态
  const displayName = user.name || '未命名';
  
  // 3. 事件处理
  const handleEdit = useCallback(() => {
    onEdit?.(user);
  }, [user, onEdit]);
  
  // 4. 渲染
  return (
    <Card>
      <CardHeader>{displayName}</CardHeader>
      <CardContent>
        {/* ... */}
      </CardContent>
    </Card>
  );
}
```

---

## API 开发规范

### 路由结构

```
api/
├── [resource]/
│   └── route.ts          # CRUD 操作
├── [resource]/
│   └── [id]/
│       └── route.ts      # 单资源操作
```

### 响应格式

```typescript
// 成功响应
{
  "success": true,
  "data": { ... },
  "message": "操作成功"  // 可选
}

// 分页响应
{
  "success": true,
  "data": {
    "list": [...],
    "total": 100,
    "page": 1,
    "pageSize": 10
  },
  "pagination": {
    "total": 100,
    "page": 1,
    "pageSize": 10,
    "totalPages": 10
  }
}

// 错误响应
{
  "success": false,
  "message": "错误信息",
  "code": "ERROR_CODE",
  "details": { ... }  // 可选
}
```

### API 示例

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, AppError } from '@/lib/error-handling';
import { withRateLimit, API_RATE_LIMITS } from '@/lib/performance/api-optimization';

async function handler(req: NextRequest) {
  // 限流检查
  const rateLimitError = await withRateLimit(API_RATE_LIMITS.API_READ)(req);
  if (rateLimitError) return rateLimitError;

  switch (req.method) {
    case 'GET':
      const users = await getUsers();
      return NextResponse.json({ success: true, data: users });
    
    case 'POST':
      const body = await req.json();
      const user = await createUser(body);
      return NextResponse.json({ success: true, data: user }, { status: 201 });
    
    default:
      throw AppError.badRequest('不支持的请求方法');
  }
}

export const GET = withErrorHandler(handler);
export const POST = withErrorHandler(handler);
```

---

## 数据库规范

### 表命名

- 使用小写字母和下划线
- 前缀分类: `sys_`, `crm_`, `prd_`, `fin_`, `inv_`
- 示例: `sys_user`, `crm_customer`, `prd_order`

### 字段规范

```sql
CREATE TABLE example (
  id INT PRIMARY KEY AUTO_INCREMENT,
  -- 业务字段
  name VARCHAR(100) NOT NULL COMMENT '名称',
  status TINYINT DEFAULT 1 COMMENT '状态: 1-启用, 0-禁用',
  -- 审计字段
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  create_by INT,
  update_by INT,
  is_deleted TINYINT DEFAULT 0 COMMENT '软删除标记',
  -- 索引
  INDEX idx_name (name),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 查询优化

```typescript
// ✅ 推荐: 使用索引
SELECT * FROM orders WHERE customer_id = ? AND status = ?;

// ✅ 推荐: 分页查询
SELECT * FROM orders 
WHERE customer_id = ? 
ORDER BY create_time DESC 
LIMIT ? OFFSET ?;

// ❌ 避免: 全表扫描
SELECT * FROM orders WHERE YEAR(create_time) = 2024;
```

---

## 缓存使用规范

### 缓存策略

```typescript
import { cacheStrategy, CACHE_CONFIGS } from '@/lib/performance/cache-strategy';

// 获取或设置缓存
const user = await cacheStrategy.getOrSet(
  `user:${userId}`,
  () => fetchUserFromDb(userId),
  CACHE_CONFIGS.USER
);

// 主动清除缓存
await cacheStrategy.delete(`user:${userId}`);

// 按标签清除
await cacheStrategy.deleteByTag('user');
```

### 缓存 TTL 配置

| 数据类型 | TTL | 说明 |
|---------|-----|------|
| 用户信息 | 30分钟 | 变更频率低 |
| 菜单数据 | 60分钟 | 变更频率很低 |
| 客户数据 | 10分钟 | 中等频率 |
| 订单数据 | 5分钟 | 变更频率高 |
| 库存数据 | 2分钟 | 实时性要求高 |
| 报表数据 | 30分钟 | 统计数据 |

---

## 错误处理规范

### 错误类型

```typescript
import { AppError, ValidationError, BusinessError } from '@/lib/error-handling';

// 400 Bad Request
throw AppError.badRequest('参数错误');

// 401 Unauthorized
throw AppError.unauthorized('请先登录');

// 403 Forbidden
throw AppError.forbidden('无权访问');

// 404 Not Found
throw AppError.notFound('用户不存在');

// 409 Conflict
throw AppError.conflict('数据已存在');

// 429 Too Many Requests
throw AppError.tooManyRequests('请求过于频繁');

// 500 Internal Error
throw AppError.internal('服务器错误');

// 业务错误
throw new BusinessError('库存不足', 'INSUFFICIENT_STOCK', { 
  required: 100, 
  available: 50 
});

// 验证错误
throw new ValidationError({
  name: ['名称不能为空'],
  email: ['邮箱格式不正确'],
});
```

### 熔断器使用

```typescript
import { circuitBreakers } from '@/lib/error-handling';

const result = await circuitBreakers.database.execute(async () => {
  return await db.query('SELECT * FROM users');
});
```

---

## 性能优化规范

### 前端优化

```tsx
// ✅ 推荐: 使用动态导入
const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <Skeleton />,
  ssr: false,
});

// ✅ 推荐: 使用 useMemo 和 useCallback
const filteredData = useMemo(() => {
  return data.filter(item => item.status === 'active');
}, [data]);

const handleSubmit = useCallback((data: FormData) => {
  submitForm(data);
}, [submitForm]);

// ✅ 推荐: 虚拟列表
import { useVirtualizer } from '@tanstack/react-virtual';
```

### API 优化

```typescript
// ✅ 推荐: 请求去重
import { deduplicateRequest } from '@/lib/performance/api-optimization';

const data = await deduplicateRequest(
  `orders:${orderId}`,
  () => fetchOrder(orderId)
);

// ✅ 推荐: 超时控制
import { withTimeout, API_TIMEOUTS } from '@/lib/performance/api-optimization';

const result = await withTimeout(
  fetchLargeData(),
  API_TIMEOUTS.SLOW
);
```

---

## 测试规范

### 单元测试

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService();
  });

  it('should create user', async () => {
    const user = await service.create({
      name: 'Test',
      email: 'test@example.com',
    });
    
    expect(user.id).toBeDefined();
    expect(user.name).toBe('Test');
  });

  it('should throw error for invalid email', async () => {
    await expect(
      service.create({ name: 'Test', email: 'invalid' })
    ).rejects.toThrow('邮箱格式不正确');
  });
});
```

### 测试命令

```bash
# 运行所有测试
pnpm test

# 运行特定文件
pnpm test src/lib/__tests__/performance.test.ts

# 生成覆盖率报告
pnpm test:coverage
```

---

## 部署规范

### 环境变量

```env
# 数据库
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=vnerpdacahng

# 应用
NEXT_PUBLIC_API_URL=http://localhost:5000
NODE_ENV=production

# 性能
DB_POOL_MAX=20
CACHE_TTL_DEFAULT=300
```

### 构建命令

```bash
# 开发
pnpm dev

# 构建
pnpm build

# 生产运行
pnpm start

# 类型检查
pnpm typecheck

# 代码检查
pnpm lint
```

---

## 版本更新日志

### v1.0.0 (2024-01-15)
- 初始版本发布
- 核心业务功能完成
- 基础架构搭建完成

### v1.1.0 (2024-02-01)
- 添加性能优化模块
- 完善错误处理机制
- 添加监控和追踪功能
