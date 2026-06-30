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

## 九、相关文档

- [数据库架构.md](./数据库架构.md)
- [数据库关系.md](./数据库关系.md)
- [11-开发指南/API开发.md](../11-开发指南/API开发.md)

> 最后更新：2026-06-30
