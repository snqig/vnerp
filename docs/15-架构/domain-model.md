# 领域模型文档

> 本文档描述系统中核心聚合根、值对象、领域事件及其关系。
> 最后更新: 2026-07-23

## 1. 聚合根清单

| 聚合根 | 目录 | 核心职责 |
|--------|------|----------|
| `SalesOrder` | `domain/sales/` | 销售订单生命周期（草稿→审核→发货→完成） |
| `WorkOrder` | `domain/production/` | 生产工单（接单→领料→报工→完工） |
| `InboundOrder` | `domain/warehouse/` | 入库单（待审→已审） |
| `OutboundOrder` | `domain/warehouse/` | 出库单（FIFO 扣减） |
| `QRCode` | `domain/trace/` | 二维码追溯（生成/分切/扫码） |
| `SampleOrder` | `domain/sample/` | 打样单（草稿→打样中→确认→转大货） |
| `PurchaseOrder` | `domain/purchase/` | 采购订单 |
| `Inventory` | `domain/inventory/` | 库存聚合（批次/总库存/事务） |
| `Receivable` / `Payable` | `domain/finance/` | 应收/应付凭证 |

## 2. 核心领域事件

### 2.1 事件发布方式

所有应用服务均通过 `getDomainEventOutbox().saveEvents(conn, aggregateType, aggregateId, events)` 在事务中原子写入 `domain_event_outbox`。OutboxPoller 每 5 秒轮询并 dispatch。

### 2.2 主要事件列表

```
SalesOrder:
  ├── sales.order.approved
  ├── sales.order.cancelled
  └── sales.shipped

Production:
  ├── workorder.created
  ├── workorder.material.issued
  ├── workorder.completed
  └── workorder.closed

Warehouse:
  ├── inbound.approved
  ├── outbound.posted
  └── stocktaking.approved

Trace:
  ├── qrcode.generated
  ├── qrcode.split
  └── qrcode.scanned

Sample:
  ├── sample.order.submitted
  ├── sample.order.confirmed
  └── SampleOrderConverted
```

### 2.3 事件处理器（IdempotentHandler 包装）

| 事件 | 处理器 | 副作用 |
|------|--------|--------|
| `sales.order.approved` | `SalesToWorkOrderHandler` | 生成工单 + BOM 物料需求 |
| `inbound.approved` | `InboundApprovedHandler` | 入账库存 + 成本计算 |
| `workorder.completed` | `WorkOrderCompletedHandler` | 成品入库 + 成本重算 |
| `qrcode.generated` | `QRCodeGeneratedHandler` | 打印任务入队 |
| `SampleOrderConverted` | `SampleOrderConversionHandler` | 更新 sample_order.sales_order_id |

## 3. 不变式（Invariants）

### 3.1 销售订单
- 审核后方可发货
- 发货量 ≤ 订单总量
- 已发货订单不可修改

### 3.2 库存扣减
- FIFO 批次准出（`inv_inbound_order_detail` ORDER BY create_time ASC）
- 锁定标记位 (`stocktaking_flag = 1`) 时禁止出库
- 出库必须记录 `inv_inventory_transaction`

### 3.3 二维码
- 同一 `qr_code` 全局唯一
- 分切 `split_flag = 1` 时 `parent_qr_code` 不能为空
- `deleted = 1` 作为软删除，查询默认过滤

### 3.4 打样单
- 状态线性流转：draft → pending → in_progress → confirmed → converted
- 转大货时状态变为 `converted`，记录 sales_order_id
- 已收取且可抵扣的打样费在转大货时自动标记抵扣

## 4. 仓储层

### 4.1 抽象层次

```
DbExecutor (interface)
  ├── MysqlDbExecutor (默认，委托 @/lib/db)
  └── [未来] PostgresDbExecutor / TiDBExecutor

BaseRepository<T, F> (抽象类，注入 DbExecutor)
  ├── findById / findByCode
  ├── findList (分页)
  ├── insertRow / updateFields / softDelete
  └── existsByCode / countByStatus

MysqlQRCodeRepository (独立实现，注入 DbExecutor)
  └── 继承模式待后续模块推广
```

### 4.2 事务边界

- 应用服务方法内开启事务: `transaction(async (conn) => { ... })`
- 仓储方法本身不开启事务（Unit of Work 由应用服务把控）
- 事件持久化在同一个事务内完成（原子性）

## 5. 遗留问题（P2 待办）

1. **CrossModuleSagaHandler** 当前注入 `InMemoryEventBus` 直接发布，建议改为注入通用 `EventBus` 接口，使其可被 OutboxPoller 包装
2. **批量薪资计算** (`PUT /api/hr/salary/calculate`) 同步阻塞，建议改为 async job + 202 Accepted
3. **物料到期提醒** 采用 N×M 批量插入，建议改为 cron + 批量 job
4. **BaseRepository** 推广到全部 Mysql*Repository（当前仅 MysqlQRCodeRepository 接入）
