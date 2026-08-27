# 领域事件 Outbox

> 基于 `src/infrastructure/event-bus/` 现状整理。涵盖 Redis Streams + Outbox 两阶段持久化、降级机制、关键配置、幂等性陷阱与修复记录。

## 一、概述

系统采用 **Outbox 模式 + Redis Streams** 实现领域事件的可靠投递与最终一致性。领域事件与业务数据在同一数据库事务内落库到 `domain_event_outbox` 表，由独立后台轮询器（`OutboxPoller`）异步消费，分发到 Redis Streams（`erp:domain-events`），再由 `StreamConsumer` 以消费者组模式并行消费，最终触发各事件处理器（`EventHandler`）。处理器执行通过 `sys_event_processed` 表实现幂等去重。

### 解决的问题

- **事件丢失**：纯内存总线进程崩溃时未消费的事件会永久丢失。
- **数据不一致**：业务已提交但事件未发出，或事件已发出但业务回滚。
- **重试困难**：内存模式无法持久化重试状态。
- **消费端幂等**：XAUTOCLAIM 重投递或崩溃恢复后，同一事件可能被多次消费，需幂等保护。

## 二、架构总览

```
┌─────────────────────────────────────────────────────────────────────┐
│  业务事务（同事务内）                                                  │
│    1. 写业务表                                                       │
│    2. saveEvents → domain_event_outbox (status='pending')           │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ 事务提交
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  OutboxPoller（5s 轮询）                                              │
│    claimPendingEvents → status='dispatching'                        │
│    ├─ Redis 可用：StreamPublisher.XADD → erp:domain-events          │
│    │   ├─ XADD 成功 → markAsProcessed (status='processed')          │
│    │   └─ XADD 失败 → markAsFailed (指数退避) / markAsDeadLetter    │
│    └─ Redis 不可用：eventBus.publish（内存模式直投）                   │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  StreamConsumer（消费者组 XREADGROUP）                                 │
│    对每条消息：                                                        │
│    1. IdempotencyGuard.checkAndMark → sys_event_processed            │
│       (status='processing')                                          │
│    2. 首次 → eventBus.publish → 36 个 EventHandler 执行               │
│    3. 成功 → markAsProcessed (status='processed') → XACK             │
│    4. 失败 → deleteMark（允许重试）                                    │
│    定时：XAUTOCLAIM 回收死消费者                                        │
└─────────────────────────────────────────────────────────────────────┘
```

## 三、关联代码

| 文件 | 职责 |
|---|---|
| `src/infrastructure/event-bus/DomainEventOutbox.ts` | 事件持久化数据访问（saveEvents / fetchPendingEvents / markAsProcessed / markAsFailed / markAsDeadLetter / markForRetry） |
| `src/infrastructure/repositories/MysqlDomainEventOutboxRepository.ts` | 增强 Outbox 实现（claimPendingEvents / reclaimStaleDispatching），`EVENT_BUS_TYPE=db` 时使用 |
| `src/infrastructure/event-bus/OutboxPoller.ts` | 后台轮询消费器（5s 间隔，BATCH_SIZE=50，MAX_RETRY_COUNT=3） |
| `src/infrastructure/event-bus/StreamPublisher.ts` | Redis Streams 生产者（XADD + MAXLEN 裁剪 + 80% 告警） |
| `src/infrastructure/event-bus/StreamConsumer.ts` | Redis Streams 消费者（XREADGROUP + XAUTOCLAIM + XACK） |
| `src/infrastructure/event-bus/IdempotencyGuard.ts` | 幂等守护（checkAndMark / markAsProcessed / deleteMark / reclaimStaleProcessing / cleanupOlderThan） |
| `src/infrastructure/event-bus/EventBus.ts` | `InMemoryEventBus`：subscribe / publish（allSettled 容错） |
| `src/infrastructure/event-bus/MemoryDomainEventOutbox.ts` | 内存版 Outbox（测试 / `EVENT_BUS_TYPE=memory` 场景，no-op） |
| `src/infrastructure/event-bus/DomainEventOutboxFactory.ts` | Outbox 工厂，按 `EVENT_BUS_TYPE` 选择实现 |
| `src/infrastructure/event-bus/types/IDomainEventOutboxRepository.ts` | Outbox 仓储接口定义 |
| `src/application/EventRegistry.ts` | 注册 36 个事件处理器到 EventBus |
| `src/domain/shared/DomainTypes.ts` | `DomainEvent` 类型定义 |

## 四、两阶段持久化设计

### 4.1 domain_event_outbox 表（事件落库）

事件与业务数据同事务写入，保证原子性。

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|---|---|---|---|---|
| `id` | BIGINT UNSIGNED | 否 | AUTO_INCREMENT | 主键 |
| `event_type` | VARCHAR(100) | 否 | - | 事件类型，如 `InboundOrderCreated` |
| `aggregate_type` | VARCHAR(50) | 是 | NULL | 聚合根类型，如 `InboundOrder` |
| `aggregate_id` | BIGINT UNSIGNED | 是 | NULL | 聚合根 ID |
| `payload` | JSON | 否 | - | 完整事件内容（JSON 序列化的 `DomainEvent`） |
| `status` | VARCHAR(20) | 否 | `pending` | `pending` / `dispatching` / `processed` / `failed` / `dead_letter` |
| `retry_count` | INT | 否 | 0 | 已重试次数（最大 3 次） |
| `error_message` | TEXT | 是 | NULL | 失败信息（`markAsFailed` 截断 500 字符；`markAsDeadLetter` 截断 2000 字符保留完整堆栈） |
| `next_execute_at` | DATETIME | 是 | NULL | 下次执行时间（指数退避：1s/3s/9s） |
| `created_at` | DATETIME | 否 | CURRENT_TIMESTAMP | 创建时间 |
| `processed_at` | DATETIME | 是 | NULL | 处理完成时间 |

索引：`idx_status_created`（status + created_at）、`idx_status_next_execute`（status + next_execute_at）、`idx_aggregate`（aggregate_type + aggregate_id）。

### 4.2 sys_event_processed 表（幂等去重）

按 `(event_id, handler_name)` 维度记录每个 handler 的处理状态，防止重复执行。

| 字段 | 类型 | 说明 |
|---|---|---|
| `event_id` | BIGINT UNSIGNED | 事件 ID（`domain_event_outbox.id`） |
| `handler_name` | VARCHAR(100) | 处理器名称 |
| `status` | VARCHAR(20) | `processing` / `processed` |
| `processed_at` | DATETIME | 标记时间（用于过期回收） |

唯一键：`(event_id, handler_name)`。

### 4.3 两阶段状态流转

**domain_event_outbox 状态流转：**

```
                saveEvents
   [业务事务] ──────────► pending
                          │
              OutboxPoller.claimPendingEvents
                          │
                          ▼
                     dispatching
                          │
            ┌─────────────┼─────────────┐
            ▼             ▼             ▼
         成功         失败(<3次)     失败(>=3次)
            │             │             │
            │    markAsFailed        markAsDeadLetter
            │    status='pending'    status='dead_letter'
            │    next_execute_at     不再被消费
            │    = NOW + 退避
            ▼             ▼
        processed      pending
                     (等待下次轮询)
```

**sys_event_processed 状态流转（每个 handler 独立）：**

```
  checkAndMark → INSERT status='processing'（预占位）
       │
       ├─ handler 成功 → markAsProcessed → status='processed'
       └─ handler 失败 → deleteMark → DELETE（允许重试）
```

## 五、Redis Streams 配置

| 环境变量 | 默认值 | 说明 |
|---|---|---|
| `EVENT_BUS_TYPE` | `memory` | 事件总线类型：`memory`（开发降级，不启动 OutboxPoller）/ `db`（生产，启用 Outbox 持久化） |
| `STREAM_MAX_LENGTH` | `10000` | Redis Stream `erp:domain-events` 最大长度（近似裁剪 MAXLEN ~）。消费端停滞时旧消息可能被裁剪 |
| `STREAM_RECLAIM_IDLE_MS` | `60000` | StreamConsumer XAUTOCLAIM 的空闲超时（毫秒）。**必须大于 handler 最大执行时间**，否则误回收导致数据丢失 |
| `IDEMPOTENCY_STALE_THRESHOLD_MINUTES` | `5` | `sys_event_processed` 中 `processing` 记录的过期回收阈值（分钟）。应略大于 handler 最大执行时间 |
| `IDEMPOTENCY_DISPATCHING_TIMEOUT_MINUTES` | `10` | `domain_event_outbox` 中 `dispatching` 状态的超时重置阈值（分钟）。OutboxPoller 崩溃恢复 |

### Redis Stream 关键参数

- 流名：`erp:domain-events`（`StreamPublisher` 与 `StreamConsumer` 共用常量 `STREAM_KEY`）
- 消费者组：`StreamConsumer` 以消费者组模式消费
- `BATCH_SIZE`（StreamConsumer）：50（单批拉取消息数）
- `MAXLEN ~`：近似裁剪，避免 XADD 阻塞

## 六、OutboxPoller 关键参数

| 参数 | 值 | 说明 |
|---|---|---|
| `POLL_INTERVAL_MS` | 5000 | 轮询间隔 5 秒 |
| `MAX_RETRY_COUNT` | 3 | 最大重试次数 |
| `BATCH_SIZE` | 50 | 单批拉取事件数 |
| `RECLAIM_INTERVAL_MS` | 60000 | 回收定时器间隔 60 秒 |
| `CLEANUP_INTERVAL_MS` | 86400000 | 清理定时器间隔 24 小时 |
| `CLEANUP_OLDER_THAN_DAYS` | 30 | 清理 30 天前已处理记录 |
| `polling` | 单例锁 | 防止并发轮询 |
| `pollTimer.unref()` | 是 | 不阻塞 Node.js 进程退出 |

### 定时任务

OutboxPoller 启动三个定时器：

1. **轮询定时器**（5s）：`claimPendingEvents` → XADD / 内存 publish → `markAsProcessed` / `markAsFailed` / `markAsDeadLetter`。
2. **回收定时器**（60s）：
   - `IdempotencyGuard.reclaimStaleProcessing()`：清理 `sys_event_processed` 中过期的 `processing` 记录（超过 `IDEMPOTENCY_STALE_THRESHOLD_MINUTES`）。
   - `outbox.reclaimStaleDispatching(DISPATCHING_TIMEOUT_MINUTES)`：重置 `domain_event_outbox` 中卡在 `dispatching` 超过 `IDEMPOTENCY_DISPATCHING_TIMEOUT_MINUTES` 的事件为 `pending`。
3. **清理定时器**（24h）：`IdempotencyGuard.cleanupOlderThan(30)` 删除 30 天前已处理记录。

## 七、指数退避策略

`markAsFailed` 通过 `JOIN (SELECT retry_count ...)` 子查询读取原值，避免同 SET 中赋值顺序影响；状态保持 `pending`，由 `next_execute_at` 控制下次执行时间。

| 重试次数 | 退避间隔 | next_execute_at 计算 |
|---|---|---|
| 第 1 次失败 | 1 秒 | `DATE_ADD(NOW(), INTERVAL 1 SECOND)` |
| 第 2 次失败 | 3 秒 | `DATE_ADD(NOW(), INTERVAL 3 SECOND)` |
| 第 3 次失败 | 9 秒 | `DATE_ADD(NOW(), INTERVAL 9 SECOND)` |
| 第 4 次（超限） | - | `markAsDeadLetter`，状态变 `dead_letter`，不再被消费 |

## 八、EventBus 容错

`InMemoryEventBus.publish` 使用 `Promise.allSettled`：

- 单个 handler 失败不阻止其他 handler 执行。
- 失败时记录所有失败 handler 的索引与原因。
- 最后抛出第一个错误（保留 `Error.stack` / `message`），由 `OutboxPoller` / `StreamConsumer` 感知并触发重试 / 死信。

## 九、降级机制

| `EVENT_BUS_TYPE` | Redis 可用 | OutboxPoller | 投递方式 | 幂等保护 |
|---|---|---|---|---|
| `memory`（默认） | 否 | 不启动 | 内存直投（不持久化） | 无 |
| `memory` | 是 | 不启动 | 内存直投 | 无 |
| `db` | 否 | 启动 | `eventBus.publish`（内存总线直投，事件已落库） | 有（`sys_event_processed`） |
| `db` | 是 | 启动 | `StreamPublisher.XADD` → `StreamConsumer` 消费 | 有（`sys_event_processed`） |

> 生产环境必须设置 `EVENT_BUS_TYPE=db`。`memory` 模式不启动 OutboxPoller，事件不持久化，进程崩溃会丢失。

## 十、幂等性陷阱与修复记录

### 10.1 陷阱一：mark-before-execute 缺陷 → catch deleteMark

**问题**：`IdempotencyGuard` 采用「先标记后执行」模式（`checkAndMark` 预占位 → handler 执行 → `markAsProcessed` 确认）。若 handler 执行失败，需在 catch 块调用 `deleteMark` 删除预占位记录，允许重试。若 catch 块本身遗漏 `deleteMark` 调用，记录残留为 `processing`，导致该事件永远无法被重新执行（`checkAndMark` 返回 `false`）。

**修复**：`StreamConsumer` 与 `OutboxPoller` 的 catch 块必须调用 `deleteMark(eventId, handlerName)` 清除预占位。`IdempotencyGuard.deleteMark` 实现为容错（失败仅 warn 日志，不抛异常），避免二次失败导致死锁。

**代码位置**：`src/infrastructure/event-bus/IdempotencyGuard.ts` 的 `deleteMark` 方法（第 114-131 行）。

### 10.2 陷阱二：Number NaN 校验

**问题**：`StreamConsumer.processMessage` 从 Redis Stream 消息中解析 `eventId`。若消息格式异常（如 `eventId` 字段缺失或非数字），`Number.parseInt` 返回 `NaN`，后续 `checkAndMark(NaN, ...)` 会写入无效的幂等记录，导致正常事件无法消费。

**修复**：在 `processMessage` 中增加 `eventId` 损坏校验：

```ts
// eventId 损坏校验：NaN/0/非正数表示 Stream 消息格式异常
if (!Number.isFinite(eventId) || eventId <= 0) {
  // ACK 掉避免 XAUTOCLAIM 无限重投递
  await consumer.xack(...);
  secureLog('error', 'StreamConsumer: invalid eventId, ACK to skip', { rawEventId });
  return;
}
```

**代码位置**：`src/infrastructure/event-bus/StreamConsumer.ts` 第 171-184 行。

### 10.3 陷阱三：dispatching 超时回收

**问题**：`OutboxPoller` 在 `claimPendingEvents` 后崩溃，事件卡在 `dispatching` 状态。`claimPendingEvents` 只选取 `pending`，这些事件永远不会被重新消费。

**修复**：`reclaimStaleDispatching(timeoutMinutes)` 定时将超过 `IDEMPOTENCY_DISPATCHING_TIMEOUT_MINUTES`（默认 10 分钟）的 `dispatching` 事件重置为 `pending`。由 OutboxPoller 回收定时器（60s 间隔）调用。

**代码位置**：`src/infrastructure/event-bus/OutboxPoller.ts` 第 248-263 行。

### 10.4 HIGH #1：XADD 成功但 markAsProcessed 失败 → 误死信

**问题**：Stream 模式下，`streamPublisher.publish()` 成功（事件已入 Stream）后，`outbox.markAsProcessed()` 抛错（DB 故障）会被同一个 catch 块捕获，触发 `retry_count++`。重复 3 次后事件被标记为 `dead_letter`，尽管它已成功投递到 Stream 且可能已被消费。

**修复**：将 `publish` 和 `markAsProcessed` 拆分为独立 try-catch：
- `publish` 失败 → 走 retry/dead_letter 流程（事件未入 Stream，必须重试）
- `publish` 成功 + `markAsProcessed` 失败 → 仅 warn 日志 + `processed++`，不触发 retry
  - 事件已在 Stream 中，由 `StreamConsumer` + `IdempotentHandler` 保证最终消费
  - outbox 残留的 `dispatching` 记录由 `reclaimStaleDispatching` 定时清理

**修改文件**：`src/infrastructure/event-bus/OutboxPoller.ts`（第 96-152 行）

**验证脚本**：`scripts/verify-high1-fix.mjs`

```bash
node scripts/verify-high1-fix.mjs
```

### 10.5 HIGH #2：RECLAIM_IDLE_MS 硬编码导致数据丢失

**问题**：`StreamConsumer` 中 `RECLAIM_IDLE_MS = 30000`（30 秒）硬编码，handler 执行超过 30 秒会被 XAUTOCLAIM 误回收，导致数据丢失。

**丢失场景**：
1. Consumer-1 拉取消息，handler 执行超过 `STREAM_RECLAIM_IDLE_MS`
2. XAUTOCLAIM 将消息重新分配给 Consumer-2
3. Consumer-2 的 `IdempotentHandler` 检测到 `status='processing'` → 跳过执行
4. Consumer-2 `publish` resolve → **XACK**（消息从 pending list 移除）
5. Consumer-1 handler 失败 → `deleteMark` 删除幂等记录
6. 消息永久丢失（已 ACK + 标记已删）

**修复**：
- 改为环境变量 `STREAM_RECLAIM_IDLE_MS` 配置，默认 `60000`（60 秒，更安全）
- 新增 JSDoc 文档说明配置要点

**建议**：设置为 handler 最大执行时间的 1.5~2 倍。例如最慢 handler 需要 30 秒，应设为 `45000`~`60000`。

**修改文件**：`src/infrastructure/event-bus/StreamConsumer.ts`

### 10.6 MEDIUM #3：consumeLoop 静默死亡

**问题**：`StreamConsumer.consumeLoop()` 异常退出时 `.catch()` 仅记录日志，不自动重启。`this.running` 保持 `true`，`isRunning()` 返回 true，但实际不再消费。健康检查无法发现此状态。

**修复**：新增 `startConsumeLoop()` 方法包装 `consumeLoop().catch()`。异常退出时自动重启（带 `ERROR_BACKOFF_MS` 退避），避免静默死亡。

**修改文件**：`src/infrastructure/event-bus/StreamConsumer.ts`（第 82-87 行）

### 10.7 MEDIUM #4：JSON.parse 毒消息导致无限重试

**问题**：`StreamConsumer.processMessage` 中 `JSON.parse(data.payload)` 对畸形 payload 抛 `SyntaxError` → catch 块不 ACK → XAUTOCLAIM 无限重投递 → 消息永远卡在 pending list，浪费资源。

**修复**：将 `JSON.parse` 放入独立 try-catch。畸形 payload 时 ACK + 记录 error 日志（含 rawPayload 前 200 字符供排查），避免无限重投递。与 NaN eventId 处理方式一致。

**修改文件**：`src/infrastructure/event-bus/StreamConsumer.ts`（第 184-189 行）

### 10.8 MEDIUM #5：Stream MAXLEN 裁剪未消费消息

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

> 最后更新：2026-07-10
