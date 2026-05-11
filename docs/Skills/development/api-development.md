# API 开发 SOP

> SOP 编号：VNERP-SKILL-006 | 版本：V1.0 | 更新日期：2026-05-10

## 前置条件

- 了解 API 设计规范（参考 [api-design-rules.md](../Rules/api-design-rules.md)）
- 了解数据库操作规范
- 了解项目目录结构

## 操作步骤

### 步骤 1：确定 API 设计

| 项目 | 内容 |
|------|------|
| 路径 | `/api/{module}/{resource}` |
| 方法 | GET / POST / PUT / DELETE |
| 请求参数 | 查询参数 or 请求体 |
| 响应格式 | apiResponse / apiError |

### 步骤 2：创建路由文件

```
src/app/api/{module}/{resource}/route.ts
```

### 步骤 3：实现 GET（列表查询）

```typescript
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get('page')) || 1;
    const pageSize = Number(searchParams.get('pageSize')) || 20;
    const keyword = searchParams.get('keyword') || '';
    const status = searchParams.get('status');

    let where = 'WHERE deleted = 0';
    const params: any[] = [];

    if (keyword) {
      where += ' AND name LIKE ?';
      params.push(`%${keyword}%`);
    }
    if (status) {
      where += ' AND status = ?';
      params.push(Number(status));
    }

    const [rows]: any = await pool.execute(
      `SELECT * FROM table ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize]
    );
    const [countRows]: any = await pool.execute(
      `SELECT COUNT(*) as total FROM table ${where}`,
      params
    );

    return apiResponse({ list: rows, total: countRows[0].total, page, pageSize });
  } catch (error) {
    console.error('查询失败:', error);
    return apiError('查询失败', 500);
  }
}
```

### 步骤 4：实现 POST（创建）

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 参数校验
    if (!body.name) return apiError('名称不能为空', 400);

    // 业务校验
    const [existing]: any = await pool.execute(
      'SELECT id FROM table WHERE name = ? AND deleted = 0',
      [body.name]
    );
    if (existing.length > 0) return apiError('名称已存在', 409);

    // 创建记录
    const [result]: any = await pool.execute(
      'INSERT INTO table (name, status) VALUES (?, 1)',
      [body.name]
    );

    return apiResponse({ id: result.insertId }, '创建成功');
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return apiError('数据重复', 409);
    }
    console.error('创建失败:', error);
    return apiError('创建失败', 500);
  }
}
```

### 步骤 5：实现 PUT（更新）

```typescript
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.id) return apiError('ID不能为空', 400);

    const [result]: any = await pool.execute(
      'UPDATE table SET name = ? WHERE id = ? AND deleted = 0',
      [body.name, body.id]
    );

    if (result.affectedRows === 0) return apiError('记录不存在', 404);
    return apiResponse(null, '更新成功');
  } catch (error) {
    console.error('更新失败:', error);
    return apiError('更新失败', 500);
  }
}
```

### 步骤 6：实现 DELETE（逻辑删除）

```typescript
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return apiError('ID不能为空', 400);

    const [result]: any = await pool.execute(
      'UPDATE table SET deleted = 1 WHERE id = ?',
      [Number(id)]
    );

    if (result.affectedRows === 0) return apiError('记录不存在', 404);
    return apiResponse(null, '删除成功');
  } catch (error) {
    console.error('删除失败:', error);
    return apiError('删除失败', 500);
  }
}
```

### 步骤 7：测试验证

```bash
# 启动开发服务器
pnpm dev

# 测试 API
curl http://localhost:5000/api/module/resource
curl -X POST http://localhost:5000/api/module/resource -H "Content-Type: application/json" -d '{"name":"test"}'

# 类型检查
pnpm ts-check
```

## 注意事项

- 所有 SQL 必须使用参数化查询
- 涉及多表操作必须使用事务
- 连接使用后必须释放
- 错误信息不要暴露内部实现细节
- 敏感操作需验证用户权限
