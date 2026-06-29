# 并发压力测试

本目录包含针对 ERP 系统关键操作的并发压力测试脚本，用于验证系统在高并发场景下的数据一致性和稳定性。

## 测试场景

### 1. 库存出库并发测试 (`inventory-outbound.test.ts`)

测试多个出库单同时扣减同一库存的场景：
- 并发创建多个出库单
- 并发确认出库（扣减库存）
- 验证库存不为负
- 验证库存数据一致性

### 2. 盘点审批并发测试 (`stocktaking-approve.test.ts`)

测试多个审批同时修改库存的场景：
- 并发创建盘点单
- 并发审批盘点单（调整库存）
- 验证盘点不会产生负库存
- 验证库存数据一致性

### 3. 领料并发测试 (`material-issue.test.ts`)

测试多个领料单同时领料的场景：
- 并发创建领料单
- 并发执行领料（扣减库存）
- 验证库存不为负
- 验证库存数据一致性

### 4. 采购入库并发测试 (`purchase-inbound.test.ts`)

测试超收校验并发场景：
- 并发创建采购入库单
- 并发审核入库单（增加库存）
- 超收校验（检查入库数量是否超过采购订单数量）
- 验证库存数据一致性

## 文件说明

```
tests/concurrency/
├── setup.ts                      # 测试环境设置和数据准备
├── utils.ts                      # 测试工具函数
├── inventory-outbound.test.ts    # 出库并发测试
├── stocktaking-approve.test.ts   # 盘点审批并发测试
├── material-issue.test.ts        # 领料并发测试
├── purchase-inbound.test.ts      # 采购入库并发测试
├── README.md                     # 本文档
└── reports/                      # 测试报告输出目录（自动生成）
```

## 运行测试

### 前置条件

1. 确保数据库服务已启动
2. 确保测试数据库已初始化
3. 确保已安装依赖：`pnpm install`

### 运行所有并发测试

```bash
# 使用 vitest 运行
pnpm vitest run tests/concurrency

# 或使用 npm script
pnpm test:unit:run tests/concurrency
```

### 运行单个测试文件

```bash
# 出库并发测试
pnpm vitest run tests/concurrency/inventory-outbound.test.ts

# 盘点审批并发测试
pnpm vitest run tests/concurrency/stocktaking-approve.test.ts

# 领料并发测试
pnpm vitest run tests/concurrency/material-issue.test.ts

# 采购入库并发测试
pnpm vitest run tests/concurrency/purchase-inbound.test.ts
```

### 监听模式

```bash
pnpm vitest tests/concurrency
```

## 测试报告

测试完成后，会在 `tests/concurrency/reports/` 目录下生成 JSON 格式的测试报告，包含：

- **testName**: 测试名称
- **totalRequests**: 总请求数
- **successCount**: 成功数量
- **failureCount**: 失败数量
- **successRate**: 成功率（%）
- **failureRate**: 失败率（%）
- **avgResponseTime**: 平均响应时间（ms）
- **minResponseTime**: 最小响应时间（ms）
- **maxResponseTime**: 最大响应时间（ms）
- **totalDuration**: 总耗时（ms）
- **errors**: 错误统计
- **timestamp**: 时间戳

示例报告：

```json
{
  "testName": "出库并发测试",
  "totalRequests": 10,
  "successCount": 10,
  "failureCount": 0,
  "successRate": 100,
  "failureRate": 0,
  "avgResponseTime": 45.2,
  "minResponseTime": 32,
  "maxResponseTime": 68,
  "totalDuration": 523,
  "errors": [],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 配置参数

可在 `setup.ts` 中修改测试配置：

```typescript
export const TEST_CONFIG = {
  // 并发数量
  CONCURRENCY_COUNT: 10,
  // 单个测试超时时间（毫秒）
  TEST_TIMEOUT: 30000,
  // API 基础路径
  API_BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  // 测试仓库ID
  TEST_WAREHOUSE_ID: 1,
  // 测试操作员ID
  TEST_OPERATOR_ID: 1,
  TEST_OPERATOR_NAME: '测试操作员',
};
```

## 数据一致性验证

所有测试都会进行以下验证：

1. **库存不为负**: 确保所有操作后库存数量 >= 0
2. **库存数量正确**: 确保实际库存 = 初始库存 - 出库/领料数量
3. **事务完整性**: 确保并发操作不会导致数据不一致

## 关键技术点

### 1. 数据库锁机制

测试使用 MySQL 的行级锁（`FOR UPDATE`）来保证并发安全：

```sql
SELECT * FROM inv_inventory 
WHERE material_id = ? AND warehouse_id = ? 
FOR UPDATE
```

### 2. 事务隔离

所有关键操作都在事务中执行，确保原子性：

```typescript
await transaction(async (conn) => {
  // 检查库存
  // 扣减库存
  // 更新状态
});
```

### 3. 乐观锁

部分操作使用版本号实现乐观锁：

```sql
UPDATE inv_outbound_order 
SET status = 'completed', version = version + 1 
WHERE id = ? AND version = ?
```

## 注意事项

1. **测试数据隔离**: 每个测试都会创建独立的测试数据，测试完成后自动清理
2. **并发数量**: 默认并发数为 10，可根据实际情况调整
3. **超时时间**: 默认超时时间为 30 秒，复杂测试可能需要更长时间
4. **数据库连接**: 确保数据库连接池配置足够支持并发测试

## 性能基准

在标准测试环境下（本地 MySQL，SSD 硬盘）：

| 测试场景 | 并发数 | 平均响应时间 | 成功率 |
|---------|-------|------------|-------|
| 出库并发 | 10 | ~50ms | 100% |
| 盘点审批 | 5 | ~80ms | 100% |
| 领料并发 | 8 | ~60ms | 100% |
| 采购入库 | 6 | ~70ms | 100% |

## 扩展测试

如需添加新的并发测试场景：

1. 在 `setup.ts` 中添加测试数据准备函数
2. 创建新的测试文件 `xxx.test.ts`
3. 使用 `runConcurrentTest` 工具函数执行测试
4. 使用验证函数检查数据一致性

示例：

```typescript
import { runConcurrentTest, verifyInventoryNotNegative } from './utils';

describe('新并发测试', () => {
  it('测试场景', async () => {
    const report = await runConcurrentTest(
      '测试名称',
      async (index) => {
        // 执行测试逻辑
        return { success: true, duration: 0 };
      },
      10 // 并发数
    );
    
    // 验证数据一致性
    const check = await verifyInventoryNotNegative(materialId, warehouseId);
    expect(check.valid).toBe(true);
  });
});
```

## 故障排查

### 测试失败常见原因

1. **数据库连接失败**: 检查数据库服务是否启动，连接配置是否正确
2. **超时**: 增加测试超时时间或减少并发数量
3. **死锁**: 检查事务锁顺序是否一致
4. **数据不一致**: 检查并发控制逻辑是否正确

### 日志查看

测试执行时会输出详细日志：

```
步骤1: 创建 10 个出库单...
已创建 10 个出库单

步骤2: 并发确认出库...
============================================================
测试报告: 出库并发测试
============================================================
...
```

## 相关文档

- [数据库设计文档](../../docs/02-模块详细设计/26-仓库管理核心原则专项说明.md)
- [API 设计规范](../../docs/Rules/api-design-rules.md)
- [测试文档](../../docs/05-测试文档/00-测试文档总览.md)
