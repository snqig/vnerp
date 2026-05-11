# 编码规范

> 文档编号：VNERP-RULES-001 | 版本：V1.0 | 更新日期：2026-05-10

## 1. 通用规范

### 1.1 文件编码与换行

- 所有源文件使用 UTF-8 编码
- 换行符使用 LF（Unix 风格）
- 文件末尾保留一个空行
- 不允许制表符混用，统一使用 2 空格缩进

### 1.2 命名规则

| 类型 | 规则 | 示例 |
|------|------|------|
| 文件名（页面） | kebab-case | `production-report.tsx` |
| 文件名（组件） | PascalCase | `WorkOrderCard.tsx` |
| 文件名（工具） | kebab-case | `fifo-allocation.ts` |
| 文件名（API路由） | kebab-case | `process-reports/route.ts` |
| 变量/函数 | camelCase | `getWorkOrderList` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| 类型/接口 | PascalCase | `WorkOrder` / `IWorkOrderFilter` |
| 枚举 | PascalCase | `enum OrderStatus` |
| React组件 | PascalCase | `ProductionReport` |
| 自定义Hook | use 前缀 | `useWorkOrder` |
| 数据库表 | snake_case + 模块前缀 | `prd_work_report` |
| 数据库字段 | snake_case | `material_id` |
| API路径 | kebab-case | `/api/process-reports` |

### 1.3 注释规范

```typescript
// 函数注释：使用 JSDoc 格式
/**
 * 按 FIFO 原则分配库存
 * @param materialId 物料ID
 * @param quantity 需求数量
 * @param warehouseId 仓库ID
 * @returns 分配结果列表
 */
async function allocateFifo(materialId: number, quantity: number, warehouseId: number): Promise<AllocationResult[]> {
  // ...
}
```

- 公共函数必须有 JSDoc 注释
- 复杂逻辑必须添加行内注释说明意图
- 注释使用中文
- 禁止无意义注释（如 `// 赋值`）

## 2. TypeScript 规范

### 2.1 类型定义

```typescript
// 使用 interface 定义对象类型
interface WorkOrder {
  id: number;
  order_no: string;
  status: number;
}

// 使用 type 定义联合类型、工具类型
type OrderStatus = 1 | 2 | 3 | 4 | 5;
type WorkOrderResponse = ApiResponse<WorkOrder>;

// 状态映射使用 Record
const orderStatusMap: Record<number, { label: string; variant: string }> = {
  1: { label: '待排产', variant: 'outline' },
  2: { label: '生产中', variant: 'secondary' },
};
```

### 2.2 禁止事项

- 禁止使用 `any` 类型，必须使用具体类型或 `unknown`
- 禁止使用 `@ts-ignore`，应修复类型错误
- 禁止隐式 `any`，函数参数必须声明类型
- 禁止使用 `var`，统一使用 `const` 或 `let`

### 2.3 异步处理

```typescript
// 使用 async/await，不使用 .then() 链
async function fetchData(): Promise<Data> {
  try {
    const response = await fetch('/api/data');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('获取数据失败:', error);
    throw error;
  }
}
```

## 3. React 组件规范

### 3.1 组件结构

```typescript
// 组件文件结构顺序：
// 1. 导入
// 2. 类型定义
// 3. 常量/映射
// 4. 组件定义
// 5. 导出

interface WorkOrderListProps {
  status?: number;
  onRefresh?: () => void;
}

const statusMap: Record<number, { label: string; variant: string }> = {
  1: { label: '待排产', variant: 'outline' },
};

export default function WorkOrderList({ status, onRefresh }: WorkOrderListProps) {
  // 1. 状态声明
  const [list, setList] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // 2. 副作用
  useEffect(() => { fetchList(); }, []);

  // 3. 事件处理
  const fetchList = async () => { /* ... */ };

  // 4. 渲染
  return <div>{/* ... */}</div>;
}
```

### 3.2 组件规范

- 页面组件使用 `export default function PageName()`
- 共享组件使用命名导出 `export function ComponentName()`
- Props 必须定义 interface
- 事件处理函数使用 `handle` 前缀：`handleSubmit`, `handleClick`
- API 调用函数使用 `fetch`/`load` 前缀：`fetchList`, `loadDetail`

## 4. API 路由规范

### 4.1 Route Handler 结构

```typescript
import { NextRequest } from 'next/server';
import { pool } from '@/lib/db';
import { apiResponse, apiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get('page')) || 1;
    const pageSize = Number(searchParams.get('pageSize')) || 20;

    const [rows] = await pool.execute('SELECT * FROM table_name LIMIT ? OFFSET ?', [pageSize, (page - 1) * pageSize]);

    return apiResponse({ list: rows, total: 0, page, pageSize });
  } catch (error) {
    console.error('查询失败:', error);
    return apiError('查询失败', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // 参数校验
    if (!body.name) return apiError('名称不能为空', 400);

    const [result] = await pool.execute('INSERT INTO table_name (...) VALUES (...)', [...]);
    return apiResponse(result, '创建成功');
  } catch (error) {
    console.error('创建失败:', error);
    return apiError('创建失败', 500);
  }
}
```

### 4.2 数据库操作规范

- 所有数据库操作必须使用参数化查询，禁止字符串拼接 SQL
- 涉及多表操作必须使用事务
- 连接使用后必须释放
- 大批量操作使用批量插入

## 5. 前端样式规范

### 5.1 Tailwind CSS 使用

- 优先使用 Tailwind 工具类
- 类名顺序：布局 → 尺寸 → 间距 → 排版 → 颜色 → 其他
- 超过 5 个类名考虑抽取为组件或使用 `cn()` 合并
- 使用 shadcn/ui 组件，不重复造轮子

### 5.2 响应式设计

- 移动端优先，使用 `md:` `lg:` 断点
- 表格在移动端使用横向滚动
- 对话框在移动端使用全屏模式
