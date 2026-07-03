# 领域事件 Outbox

> 基于 `src/infrastructure/event-bus/` 现状整理。

## 一、概述

`domain_event_outbox` 表实现 **Outbox 模式**：领域事件与业务数据在同一数据库事务内落库，由独立后台轮询器（`OutboxPoller`）异步消费，分发到内存事件总线（`InMemoryEventBus`），最终触发各事件处理器（`EventHandler`）。

### 解决的问题

- **事件丢失**：内存总线进程崩溃时未消费的事件会永久丢失。
- **数据不一致**：业务已提交但事件未发出，或事件已发出但业务回滚。
- **重试困难**：内存模式无法持久化重试状态。

## 二、关联代码

| 文件 | 职责 |
|---|---|
| `src/infrastructure/event-bus/DomainEventOutbox.ts` | 事件持久化数据访问（saveEvents / fetchPendingEvents / markAsProcessed / markAsFailed / markAsDeadLetter / markForRetry） |
| `src/infrastructure/event-bus/OutboxPoller.ts` | 后台轮询消费器（5s 间隔，BATCH_SIZE=50，MAX_RETRY_COUNT=3） |
| `src/infrastructure/event-bus/EventBus.ts` | `InMemoryEventBus`：subscribe / publish（allSettled 容错，失败抛第一个错误） |
| `src/infrastructure/event-bus/MemoryDomainEventOutbox.ts` | 内存版 Outbox（测试 / 无 DB 场景） |
| `src/infrastructure/event-bus/DomainEventOutboxFactory.ts` | Outbox 工厂，按环境选择实现 |
| `src/infrastructure/config/EventRegistry.ts` | 注册事件处理器到 EventBus |
| `src/domain/shared/DomainTypes.ts` | `DomainEvent` 类型定义 |

## 三、字段设计

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|---|---|---|---|---|
| `id` | BIGINT UNSIGNED | 否 | AUTO_INCREMENT | 主键 |
| `event_type` | VARCHAR(100) | 否 | - | 事件类型，如 `InboundOrderCreated` |
| `aggregate_type` | VARCHAR(50) | 是 | NULL | 聚合根类型，如 `InboundOrder` |
| `aggregate_id` | BIGINT UNSIGNED | 是 | NULL | 聚合根 ID |
| `payload` | JSON | 否 | - | 完整事件内容（JSON 序列化的 `DomainEvent`） |
| `status` | VARCHAR(20) | 否 | `pending` | `pending` / `processed` / `dead_letter` |
| `retry_count` | INT | 否 | 0 | 已重试次数（最大 3 次） |
| `error_message` | TEXT | 是 | NULL | 失败信息（`markAsFailed` 截断 500 字符；`markAsDeadLetter` 截断 2000 字符保留完整堆栈） |
| `next_execute_at` | DATETIME | 是 | NULL | 下次执行时间（指数退避：1s/3s/9s） |
| `created_at` | DATETIME | 否 | CURRENT_TIMESTAMP | 创建时间 |
| `processed_at` | DATETIME | 是 | NULL | 处理完成时间 |

## 四、索引设计

| 索引名 | 字段 | 用途 |
|---|---|---|
| `idx_status_created` | (status, created_at) | 查询待处理事件（按创建时间排序） |
| `idx_status_next_execute` | (status, next_execute_at) | 指数退避消费（仅查到期事件） |
| `idx_aggregate` | (aggregate_type, aggregate_id) | 按聚合根溯源事件链 |

## 五、状态流转

```
                saveEvents
   [业务事务] ──────────► pending
                          │
                 OutboxPoller.poll
                          │
            ┌─────────────┼─────────────┐
            ▼             ▼             ▼
         成功         失败(<3次)     失败(>=3次)
            │             │             │
            │    next_execute_at       死信标记
            │    = NOW + 退避时间   markAsDeadLetter
            │             │
            ▼             ▼
        processed      pending
                     (等待下次轮询)
```

## 六、指数退避策略

| 重试次数 | 退避间隔 | next_execute_at 计算 |
|---|---|---|
| 第 1 次失败 | 1 秒 | `DATE_ADD(NOW(), INTERVAL 1 SECOND)` |
| 第 2 次失败 | 3 秒 | `DATE_ADD(NOW(), INTERVAL 3 SECOND)` |
| 第 3 次失败 | 9 秒 | `DATE_ADD(NOW(), INTERVAL 9 SECOND)` |
| 第 4 次（超限） | - | `markAsDeadLetter`，状态变 `dead_letter`，不再被消费 |

实现要点：`markAsFailed` 通过 `JOIN (SELECT retry_count ...)` 子查询读取原值，避免同 SET 中赋值顺序影响；状态保持 `pending`，由 `next_execute_at` 控制下次执行时间。

## 七、轮询消费关键参数

| 参数 | 值 | 说明 |
|---|---|---|
| `POLL_INTERVAL_MS` | 5000 | 轮询间隔 5 秒 |
| `MAX_RETRY_COUNT` | 3 | 最大重试次数 |
| `BATCH_SIZE` | 50 | 单批拉取事件数 |
| `polling` | 单例锁 | 防止并发轮询 |
| `pollTimer.unref()` | 是 | 不阻塞 Node.js 进程退出 |

## 八、EventBus 容错

`InMemoryEventBus.publish` 使用 `Promise.allSettled`：

- 单个 handler 失败不阻止其他 handler 执行。
- 失败时记录所有失败 handler 的索引与原因。
- 最后抛出第一个错误（保留 `Error.stack` / `message`），由 `OutboxPoller` 感知并触发重试 / 死信。

## 九、Stream 模式与可配置环境变量

当 Redis 可用时，OutboxPoller 会通过 `StreamPublisher` 将事件 XADD 到 Redis Stream `erp:domain-events`，由 `StreamConsumer` 以消费者组模式并行消费。相关环境变量：

| 环境变量 | 默认值 | 说明 |
|---|---|---|
| `EVENT_BUS_TYPE` | `memory` | 事件总线类型：`memory`（开发降级）/ `db`（生产，启用 outbox 持久化） |
| `IDEMPOTENCY_STALE_THRESHOLD_MINUTES` | `5` | `sys_event_processed` 中 `processing` 记录的过期回收阈值（分钟）。应略大于 handler 最大执行时间 |
| `IDEMPOTENCY_DISPATCHING_TIMEOUT_MINUTES` | `10` | `domain_event_outbox` 中 `dispatching` 状态的超时重置阈值（分钟）。OutboxPoller 崩溃恢复 |
| `STREAM_RECLAIM_IDLE_MS` | `60000` | StreamConsumer XAUTOCLAIM 的空闲超时（毫秒）。**必须大于 handler 最大执行时间**，否则会误回收正在执行中的消息导致数据丢失 |
| `STREAM_MAX_LENGTH` | `10000` | Redis Stream 最大长度（近似裁剪）。消费端停滞时旧消息可能被裁剪，生产环境建议根据峰值流量调整 |

### STREAM_RECLAIM_IDLE_MS 配置要点

此值必须大于 handler 的最大执行时间，否则会出现以下数据丢失场景：

1. Consumer-1 拉取消息，handler 执行超过 `STREAM_RECLAIM_IDLE_MS`
2. XAUTOCLAIM 将消息重新分配给 Consumer-2
3. Consumer-2 的 `IdempotentHandler` 检测到 `status='processing'` → 跳过执行
4. Consumer-2 `publish` resolve → **XACK**（消息从 pending list 移除）
5. Consumer-1 handler 失败 → `deleteMark` 删除幂等记录
6. 消息永久丢失（已 ACK + 标记已删）

**建议**：设置为 handler 最大执行时间的 1.5~2 倍。例如最慢 handler 需要 30 秒，应设为 `45000`~`60000`。

## 十、HIGH 风险修复记录（2026-07-03）

### HIGH #1：XADD 成功但 markAsProcessed 失败 → 误死信

**问题**：Stream 模式下，`streamPublisher.publish()` 成功（事件已入 Stream）后，`outbox.markAsProcessed()` 抛错（DB 故障）会被同一个 catch 块捕获，触发 `retry_count++`。重复 3 次后事件被标记为 `dead_letter`，尽管它已成功投递到 Stream 且可能已被消费。

**修复**：将 `publish` 和 `markAsProcessed` 拆分为独立 try-catch：
- `publish` 失败 → 走 retry/dead_letter 流程（事件未入 Stream，必须重试）
- `publish` 成功 + `markAsProcessed` 失败 → 仅 warn 日志 + `processed++`，不触发 retry
  - 事件已在 Stream 中，由 `StreamConsumer` + `IdempotentHandler` 保证最终消费
  - outbox 残留的 `dispatching` 记录由 `reclaimStaleDispatching` 定时清理

**修改文件**：`src/infrastructure/event-bus/OutboxPoller.ts`

**验证脚本**：`scripts/verify-high1-fix.mjs`

```bash
node scripts/verify-high1-fix.mjs
```

### HIGH #2：RECLAIM_IDLE_MS 硬编码导致数据丢失

**问题**：`StreamConsumer` 中 `RECLAIM_IDLE_MS = 30000`（30 秒）硬编码，handler 执行超过 30 秒会被 XAUTOCLAIM 误回收，导致数据丢失。

**修复**：
- 改为环境变量 `STREAM_RECLAIM_IDLE_MS` 配置，默认 `60000`（60 秒，更安全）
- 新增 JSDoc 文档说明配置要点

**修改文件**：`src/infrastructure/event-bus/StreamConsumer.ts`

### 旧值依赖检查

`RECLAIM_IDLE_MS` 仅在 `StreamConsumer.ts` 中使用（6 处引用），无其他文件依赖旧值 `30000`。代码库中其他 `30000` 出现均为无关用途（testTimeout、idleTimeout、金额、数量等）。

### MEDIUM #4：JSON.parse 毒消息导致无限重试

**问题**：`StreamConsumer.processMessage` 中 `JSON.parse(data.payload)` 对畸形 payload 抛 `SyntaxError` → catch 块不 ACK → XAUTOCLAIM 无限重投递 → 消息永远卡在 pending list，浪费资源。

**修复**：将 `JSON.parse` 放入独立 try-catch。畸形 payload 时 ACK + 记录 error 日志（含 rawPayload 前 200 字符供排查），避免无限重投递。与 NaN eventId 处理方式一致。

**修改文件**：`src/infrastructure/event-bus/StreamConsumer.ts`

### MEDIUM #3：consumeLoop 静默死亡

**问题**：`StreamConsumer.consumeLoop()` 异常退出时 `.catch()` 仅记录日志，不自动重启。`this.running` 保持 `true`，`isRunning()` 返回 true，但实际不再消费。健康检查无法发现此状态。

**修复**：新增 `startConsumeLoop()` 方法包装 `consumeLoop().catch()`。异常退出时自动重启（带 `ERROR_BACKOFF_MS` 退避），避免静默死亡。

**修改文件**：`src/infrastructure/event-bus/StreamConsumer.ts`

### MEDIUM #5：Stream MAXLEN 裁剪未消费消息

**问题**：`StreamPublisher` 中 `MAX_STREAM_LENGTH = 10000` 硬编码。StreamConsumer 停滞时，OutboxPoller 持续 XADD → Stream 达到 10000 条开始裁剪最旧消息 → 未消费消息被裁剪 → 数据丢失。

**修复**：
- 将 `MAX_STREAM_LENGTH` 改为环境变量 `STREAM_MAX_LENGTH` 配置，默认 10000
- 在 `publish()` 中增加 XLEN 检查，当 Stream 长度达到 80% 阈值时告警一次（`streamLengthWarned` 标志避免重复告警）
- 告警消息包含 streamLength、maxLength、warnThreshold 和处理建议

**修改文件**：`src/infrastructure/event-bus/StreamPublisher.ts`

## 十一、验证脚本清单

| 脚本 | 用途 | 命令 |
|---|---|---|
| `scripts/verify-high1-fix.mjs` | 验证 XADD 成功 + markAsProcessed 失败不触发误死信 | `node scripts/verify-high1-fix.mjs` |
| `scripts/simulate-dispatching-orphan.mjs` | 验证 dispatching 孤儿事件恢复 | `node scripts/simulate-dispatching-orphan.mjs` |
| `scripts/simulate-xautoclaim-redelivery.mjs` | 验证 XAUTOCLAIM 重投递幂等性 | `node scripts/simulate-xautoclaim-redelivery.mjs` |
| `scripts/simulate-long-handler-reclaim.mjs` | 验证长时 handler 的 reclaim 竞态 | `node scripts/simulate-long-handler-reclaim.mjs` |
| `scripts/test-cleanup-30days.mjs` | 验证 30 天数据清理边界 | `node scripts/test-cleanup-30days.mjs` |
| `scripts/cleanup-event-processed.mjs` | 清理 sys_event_processed 表（CLI 工具） | `pnpm cleanup:events` |

## 十二、相关文档

- [数据库架构.md](./数据库架构.md)
- [数据库关系.md](./数据库关系.md)
- [11-开发指南/API开发.md](../11-开发指南/API开发.md)

> 最后更新：2026-07-03
