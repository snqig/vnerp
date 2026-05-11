# 新模块创建 SOP

> SOP 编号：VNERP-SKILL-005 | 版本：V1.0 | 更新日期：2026-05-10

## 前置条件

- 本地开发环境已搭建完成
- 了解模块的业务需求
- 了解项目编码规范和数据库规则

## 操作步骤

### 步骤 1：设计数据库表

1. 确定模块前缀（参考 [database-rules.md](../Rules/database-rules.md)）
2. 设计主表和明细表结构
3. 编写 SQL 迁移脚本

```sql
-- 示例：创建新模块表
CREATE TABLE IF NOT EXISTS mod_main_table (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_no VARCHAR(50) NOT NULL COMMENT '单号',
  status TINYINT DEFAULT 1 COMMENT '1-草稿 2-已确认 3-已完成 4-已取消',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT DEFAULT 0,
  INDEX idx_order_no (order_no),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='模块主表';
```

### 步骤 2：创建 API 路由

文件路径：`src/app/api/{module-name}/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { pool } from '@/lib/db';
import { apiResponse, apiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get('page')) || 1;
    const pageSize = Number(searchParams.get('pageSize')) || 20;

    const [rows]: any = await pool.execute(
      'SELECT * FROM mod_main_table WHERE deleted = 0 ORDER BY id DESC LIMIT ? OFFSET ?',
      [pageSize, (page - 1) * pageSize]
    );
    const [countRows]: any = await pool.execute(
      'SELECT COUNT(*) as total FROM mod_main_table WHERE deleted = 0'
    );

    return apiResponse({
      list: rows,
      total: countRows[0].total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('查询失败:', error);
    return apiError('查询失败', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.order_no) return apiError('单号不能为空', 400);

    const [result]: any = await pool.execute(
      'INSERT INTO mod_main_table (order_no, status) VALUES (?, 1)',
      [body.order_no]
    );
    return apiResponse(result, '创建成功');
  } catch (error) {
    console.error('创建失败:', error);
    return apiError('创建失败', 500);
  }
}
```

### 步骤 3：创建前端页面

文件路径：`src/app/{module-name}/page.tsx`

页面结构：
1. 定义 TypeScript 接口
2. 定义状态映射
3. 实现列表展示
4. 实现新增/编辑对话框
5. 实现搜索/筛选

### 步骤 4：添加菜单配置

在数据库 `sys_menu` 表中插入菜单记录：

```sql
INSERT INTO sys_menu (parent_id, name, path, icon, sort_order, status)
VALUES (0, '模块名称', '/module-name', 'ModuleIcon', 100, 1);
```

### 步骤 5：测试验证

1. 启动开发服务器：`pnpm dev`
2. 验证 API 接口：使用浏览器或 Postman 测试
3. 验证页面功能：列表、新增、编辑、删除
4. 运行类型检查：`pnpm ts-check`
5. 运行代码检查：`pnpm lint`

## 验证方法

- [ ] 数据库表创建成功
- [ ] API 接口可正常访问
- [ ] 页面可正常加载和操作
- [ ] 菜单可正常显示
- [ ] TypeScript 类型检查通过
- [ ] ESLint 检查通过
