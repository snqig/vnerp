# ERP系统测试文档

## 概述

本文档描述了ERP系统的测试策略、测试结构和执行方法。

## 测试框架

- **单元测试**: Vitest
- **集成测试**: Vitest + Mock数据库
- **E2E测试**: Playwright

## 目录结构

```
tests/
├── unit/                          # 单元测试
│   ├── bom-expansion.test.ts      # BOM展开计算测试
│   ├── fifo-allocation.test.ts    # FIFO分配算法测试
│   ├── warehouse-state-machine.test.ts  # 库存状态机测试
│   └── over-issue-validation.test.ts    # 超领校验测试
├── integration/                   # 集成测试
│   ├── inbound-flow.test.ts       # 入库流程测试
│   ├── outbound-flow.test.ts      # 出库流程测试
│   ├── stocktaking-flow.test.ts   # 盘点流程测试
│   └── material-issue-flow.test.ts # 领料流程测试
└── concurrency/                   # 并发测试
    ├── purchase-inbound.test.ts
    ├── material-issue.test.ts
    └── ...
```

## 测试命令

### 运行所有单元测试

```bash
pnpm test:unit
```

### 运行单元测试（仅一次）

```bash
pnpm test:unit:run
```

### 运行测试并生成覆盖率报告

```bash
pnpm test:coverage
```

覆盖率报告将生成在 `coverage/` 目录下。

### 运行特定测试文件

```bash
pnpm vitest run tests/unit/bom-expansion.test.ts
```

### 运行特定测试用例

```bash
pnpm vitest run -t "BOM展开计算"
```

## 单元测试

### 1. BOM展开计算测试 (`bom-expansion.test.ts`)

测试BOM展开的核心逻辑：

- **基础功能**
  - 单层BOM展开
  - 多层BOM展开（半成品）
  - 损耗率累加计算
  - 循环引用检测
  - 最大递归深度限制
  - 相同物料合并

- **缓存功能**
  - 缓存命中
  - 缓存清除

- **批量操作**
  - 批量展开多个产品
  - 合并多个展开结果

**关键测试用例**:

```typescript
it('应该正确展开单层BOM', async () => {
  const result = await expandBom(1, 10);
  expect(result.items).toHaveLength(2);
  expect(result.items[0].actualQuantity).toBeCloseTo(21); // 20 * (1 + 5/100)
});

it('应该检测循环引用并发出警告', async () => {
  const result = await expandBom(1, 10);
  expect(result.circularReferenceWarnings).toBeDefined();
});
```

### 2. FIFO分配算法测试 (`fifo-allocation.test.ts`)

测试先进先出分配逻辑：

- **基础分配**
  - 按入库日期顺序分配
  - 优先分配已开封批次
  - 优先分配即将过期批次
  - 库存不足处理
  - 无库存处理

- **精度计算**
  - 小数数量处理
  - 浮点数精度问题

- **缺货预警**
  - 安全库存检查
  - 再订货点计算

- **乐观锁重试**
  - 版本冲突检测
  - 自动重试机制

**关键测试用例**:

```typescript
it('应该按FIFO顺序分配库存', async () => {
  const result = await allocateFIFO(mockConn, 101, 1, 60);
  expect(result.allocations[0].batch_no).toBe('B001'); // 最早入库的批次
});

it('应该优先分配已开封的批次', async () => {
  const result = await allocateFIFO(mockConn, 101, 1, 40);
  expect(result.allocations[0].opened_at).toBeDefined();
});
```

### 3. 库存状态机测试 (`warehouse-state-machine.test.ts`)

测试入库单和出库单的状态流转：

- **入库单状态流转**
  - draft → pending
  - pending → completed
  - completed → pending (撤销)
  - draft/pending → cancelled

- **出库单状态流转**
  - draft → pending
  - pending → completed
  - completed → pending (撤销)
  - draft/pending → cancelled

- **操作权限**
  - 编辑权限检查
  - 删除权限检查
  - 审核权限检查

**关键测试用例**:

```typescript
it('应该允许 draft → pending', () => {
  expect(WarehouseStateMachine.canTransitionInbound('draft', 'pending')).toBe(true);
});

it('应该不允许 cancelled → 任何状态', () => {
  expect(WarehouseStateMachine.canTransitionInbound('cancelled', 'draft')).toBe(false);
});
```

### 4. 超领校验测试 (`over-issue-validation.test.ts`)

测试超领申请和审批逻辑：

- **超领申请**
  - 正常提交申请
  - 无原因拒绝
  - 超过上限拒绝

- **补料申请**
  - 正常提交申请
  - 原领料单验证

- **审批流程**
  - 审批通过
  - 审批驳回

**关键测试用例**:

```typescript
it('应该成功提交超领申请（需要审批）', async () => {
  const result = await submitOverRequisition(1, 101, 50, '生产损耗超标', 1, '张三');
  expect(result.success).toBe(true);
  expect(result.message).toContain('等待审批');
});
```

## 集成测试

### 1. 入库流程测试 (`inbound-flow.test.ts`)

测试完整的入库流程：

1. 创建入库单（草稿）
2. 提交入库单（待审核）
3. 审核入库单（已完成）
4. 创建库存批次
5. 记录库存交易

**测试场景**:
- 采购入库
- 生产入库
- 退货入库
- 入库单撤销
- 入库单取消

### 2. 出库流程测试 (`outbound-flow.test.ts`)

测试完整的出库流程：

1. 创建出库单（草稿）
2. 提交出库单（待确认）
3. FIFO分配
4. 确认出库单（已完成）
5. 扣减库存批次
6. 记录库存交易

**测试场景**:
- 生产领料
- 销售出库
- 调拨出库
- 出库单撤销
- 库存不足处理

### 3. 盘点流程测试 (`stocktaking-flow.test.ts`)

测试完整的盘点流程：

1. 创建盘点单
2. 生成盘点明细（库存快照）
3. 录入实盘数量
4. 计算差异
5. 审批盘点单
6. 执行库存调整

**测试场景**:
- 全盘
- 抽盘
- 循环盘点
- 指定物料盘点
- 盘盈处理
- 盘亏处理

### 4. 领料流程测试 (`material-issue-flow.test.ts`)

测试完整的领料流程：

1. 根据工单生成领料单
2. FIFO推荐批次
3. 审批领料单
4. 扫码出库
5. FIFO校验
6. 成本计算

**测试场景**:
- 正常领料
- 超领
- 补料
- 退料
- 整料校验

## 测试覆盖率

### 目标覆盖率

| 指标 | 目标 |
|------|------|
| 行覆盖率 | ≥ 80% |
| 函数覆盖率 | ≥ 80% |
| 分支覆盖率 | ≥ 70% |
| 语句覆盖率 | ≥ 80% |

### 核心业务逻辑覆盖率要求

以下模块必须达到 80% 以上的覆盖率：

- `src/lib/bom-expansion.ts` - BOM展开
- `src/lib/fifo-allocation.ts` - FIFO分配
- `src/lib/warehouse-state-machine.ts` - 库存状态机
- `src/lib/material-requisition.ts` - 物料领用
- `src/lib/state-machine.ts` - 状态机
- `src/lib/inventory-sync.ts` - 库存同步
- `src/lib/warehouse-core.ts` - 仓库核心

### 查看覆盖率报告

运行测试后，打开 `coverage/index.html` 查看详细的覆盖率报告。

## Mock策略

### 数据库Mock

使用 Vitest 的 `vi.mock()` 来模拟数据库操作：

```typescript
vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  execute: vi.fn(),
  transaction: vi.fn((fn) => fn(mockConnection)),
}));
```

### 配置Mock

```typescript
vi.mock('@/lib/global-config', () => ({
  getConfig: vi.fn((key: string) => {
    const config: Record<string, any> = {
      over_requisition_approval: true,
      mr_prefix: 'MR',
    };
    return config[key];
  }),
}));
```

### 日志Mock

```typescript
vi.mock('@/lib/logger', () => ({
  secureLog: vi.fn(),
}));
```

## 并发测试

并发测试位于 `tests/concurrency/` 目录，测试以下场景：

- 并发入库
- 并发出库
- 并发盘点审批
- 乐观锁冲突处理

## 最佳实践

### 1. 测试命名

使用中文描述测试用例，清晰表达测试意图：

```typescript
it('应该正确展开单层BOM', async () => {
  // ...
});
```

### 2. 测试隔离

每个测试用例应该独立，不依赖其他测试的结果：

```typescript
beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});
```

### 3. Mock数据

使用有意义的数据，避免魔法数字：

```typescript
const material = {
  id: 101,
  material_code: 'MAT-001',
  material_name: '材料1',
  quantity: 100,
};
```

### 4. 断言

使用明确的断言，避免模糊的检查：

```typescript
// 好
expect(result.items).toHaveLength(2);
expect(result.items[0].actualQuantity).toBeCloseTo(21);

// 避免
expect(result).toBeTruthy();
```

### 5. 异步测试

正确处理异步操作：

```typescript
it('应该正确处理异步操作', async () => {
  const result = await someAsyncFunction();
  expect(result).toBeDefined();
});
```

## 持续集成

测试在以下环境自动运行：

- Pull Request 创建时
- 代码合并到主分支时
- 每日定时运行（完整测试套件）

## 故障排查

### 测试失败

1. 检查Mock是否正确设置
2. 检查异步操作是否正确等待
3. 检查测试数据是否有效

### 覆盖率不足

1. 运行 `pnpm test:coverage` 查看详细报告
2. 找到未覆盖的代码行
3. 添加测试用例覆盖该代码

### Mock问题

1. 确保 `vi.clearAllMocks()` 在 `beforeEach` 中调用
2. 确保 Mock 返回正确的数据结构
3. 使用 `vi.mocked()` 获取类型安全的 Mock

## 相关文档

- [Vitest 文档](https://vitest.dev/)
- [Testing Library 文档](https://testing-library.com/)
- [项目开发指南](./DEVELOPMENT_GUIDE.md)
