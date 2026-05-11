# API 设计规范

> 文档编号：VNERP-RULES-003 | 版本：V1.0 | 更新日期：2026-05-10

## 1. RESTful 规范

### 1.1 URL 设计

```
基础格式：/api/{模块}/{资源}

示例：
GET    /api/production/orders          # 获取生产工单列表
GET    /api/production/orders/:id      # 获取单个工单详情
POST   /api/production/orders          # 创建工单
PUT    /api/production/orders/:id      # 更新工单
DELETE /api/production/orders/:id      # 删除工单
```

### 1.2 URL 命名规则

- 使用名词复数形式：`/api/orders` 而非 `/api/order`
- 使用 kebab-case：`/api/process-reports` 而非 `/api/processReports`
- 层级不超过 3 层：`/api/module/resource/sub-resource`
- 操作性接口使用动词：`/api/transfers/:id/execute`

### 1.3 HTTP 方法使用

| 方法 | 用途 | 幂等性 |
|------|------|--------|
| GET | 查询资源 | 是 |
| POST | 创建资源/执行操作 | 否 |
| PUT | 全量更新资源 | 是 |
| PATCH | 部分更新资源 | 否 |
| DELETE | 删除资源 | 是 |

## 2. 请求格式

### 2.1 查询参数（GET）

```
/api/production/orders?page=1&pageSize=20&status=2&keyword=WO2026
```

| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码，默认 1 |
| pageSize | number | 每页条数，默认 20 |
| keyword | string | 搜索关键词 |
| {field} | any | 业务筛选字段 |

### 2.2 请求体（POST/PUT/PATCH）

```json
{
  "field1": "value1",
  "field2": 100,
  "items": [
    { "material_id": 1, "quantity": 50 }
  ]
}
```

- 使用 JSON 格式
- 字段名使用 snake_case（与数据库字段一致）
- 日期使用 ISO 8601 格式：`2026-05-10T08:00:00.000Z`
- 金额使用数字类型，精确到分

## 3. 响应格式

### 3.1 统一响应结构

```typescript
// 成功响应
{
  "success": true,
  "data": T,
  "message": "操作成功"
}

// 分页响应
{
  "success": true,
  "data": {
    "list": T[],
    "total": 100,
    "page": 1,
    "pageSize": 20
  },
  "message": "查询成功"
}

// 错误响应
{
  "success": false,
  "error": "错误描述",
  "code": 400
}
```

### 3.2 HTTP 状态码使用

| 状态码 | 含义 | 使用场景 |
|--------|------|---------|
| 200 | 成功 | GET/PUT/PATCH 成功 |
| 201 | 创建成功 | POST 创建资源成功 |
| 400 | 请求错误 | 参数校验失败 |
| 401 | 未认证 | 未登录或 Token 过期 |
| 403 | 无权限 | 权限不足 |
| 404 | 未找到 | 资源不存在 |
| 409 | 冲突 | 数据冲突（如编号重复） |
| 500 | 服务器错误 | 服务端异常 |

### 3.3 apiResponse / apiError 工具函数

```typescript
import { apiResponse, apiError } from '@/lib/api-response';

// 成功
return apiResponse(data, '操作成功');
return apiResponse({ list, total, page, pageSize });

// 错误
return apiError('参数错误', 400);
return apiError('未登录', 401);
return apiError('服务器错误', 500);
```

## 4. 错误处理规范

### 4.1 错误分类

| 错误类型 | HTTP状态码 | 处理方式 |
|---------|-----------|---------|
| 参数校验错误 | 400 | 返回具体字段错误信息 |
| 认证错误 | 401 | 返回登录提示 |
| 权限错误 | 403 | 返回权限不足提示 |
| 业务逻辑错误 | 400/409 | 返回具体业务错误信息 |
| 数据库错误 | 500 | 返回通用错误信息，记录详细日志 |
| 未知错误 | 500 | 返回通用错误信息，记录详细日志 |

### 4.2 错误处理模板

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.required_field) {
      return apiError('必填字段不能为空', 400);
    }

    const [result] = await pool.execute('INSERT INTO ...', [...]);
    return apiResponse(result, '创建成功');
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return apiError('编号已存在，请勿重复提交', 409);
    }
    console.error('创建失败:', error);
    return apiError('创建失败', 500);
  }
}
```

## 5. 安全规范

### 5.1 SQL 注入防护

```typescript
// 正确 - 参数化查询
await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);

// 错误 - 字符串拼接
await pool.execute(`SELECT * FROM users WHERE id = ${userId}`);
```

### 5.2 敏感数据处理

- 密码使用 bcrypt 哈希存储
- JWT Token 设置合理过期时间
- 响应中不返回密码、Token 等敏感字段
- 日志中不记录敏感信息

### 5.3 请求限流

- 登录接口：每 IP 每分钟 5 次
- 普通 API：每用户每分钟 60 次
- 导出接口：每用户每分钟 3 次
