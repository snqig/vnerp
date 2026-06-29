# 领域事件持久化表设计说明

## 概述

`domain_event_outbox` 表实现 **Outbox 模式**，保证领域事件与业务数据在同一数据库事务内落库，由独立的后台轮询器（`OutboxPoller`）异步消费分发到内存事件总线（`InMemoryEventBus`），最终触发各事件处理器（`EventHandler`）。

该模式解决了以下问题：
- **事件丢失**：内存事件总线进程崩溃时未消费的事件会永久丢失
- **数据不一致**：业务数据已提交但事件未发出，或事件已发出但业务数据回滚
- **重试困难**：内存模式无法持久化重试状态

## 关联代码

| 文件 | 职责 |
|---|---|
| `src/infrastructure/event-bus/DomainEventOutbox.ts` | 事件持久化数据访问（保存/查询/标记/重试） |
| `src/infrastructure/event-bus/OutboxPoller.ts` | 后台轮询消费器（5s 间隔，最大重试3次） |
| `src/infrastructure/event-bus/EventBus.ts` | 内存事件总线（订阅/发布/分发到 handler） |
| `src/application/services/*ApplicationService.ts` | 业务服务在事务内调用 `saveEvents` 落库 |

## 字段设计

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|---|---|---|---|---|
| `id` | BIGINT UNSIGNED | 否 | AUTO_INCREMENT | 主键 |
| `event_type` | VARCHAR(100) | 否 | - | 事件类型，如 `InboundOrderCreated` |
| `aggregate_type` | VARCHAR(50) | 是 | NULL | 聚合根类型，如 `InboundOrder` |
| `aggregate_id` | BIGINT UNSIGNED | 是 | NULL | 聚合根 ID |
| `payload` | JSON | 否 | - | 完整事件内容（JSON 序列化的 `DomainEvent`） |
| `status` | VARCHAR(20) | 否 | `pending` | 状态：`pending`/`processed`/`failed` |
| `retry_count` | INT | 否 | 0 | 已重试次数（最大 3 次） |
| `error_message` | TEXT | 是 | NULL | 最近一次失败的错误信息（截断 500 字符） |
| `next_execute_at` | DATETIME | 是 | NULL | 下次执行时间（指数退避：1s/3s/9s） |
| `created_at` | DATETIME | 否 | CURRENT_TIMESTAMP | 创建时间 |
| `processed_at` | DATETIME | 是 | NULL | 处理完成时间 |

## 索引设计

| 索引名 | 字段 | 用途 |
|---|---|---|
| `idx_status_created` | (status, created_at) | 查询待处理事件（按创建时间排序） |
| `idx_status_next_execute` | (status, next_execute_at) | 指数退避消费（仅查到期事件） |
| `idx_aggregate` | (aggregate_type, aggregate_id) | 按聚合根溯源事件链 |

## 状态流转

```
                saveEvents
    [业务事务] ──────────► pending
                            │
                   OutboxPoller.poll
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
          成功          失败(<3次)    失败(>=3次)
              │             │             │
              │      next_execute_at      死信标记
              │      = NOW + 退避时间    (1.5 任务)
              │             │
              ▼             ▼
          processed      pending
                         (等待下次轮询)
```

## 指数退避策略（1.4 任务实现）

| 重试次数 | 退避间隔 | next_execute_at 计算 |
|---|---|---|
| 第 1 次失败 | 1 秒 | `DATE_ADD(NOW(), INTERVAL 1 SECOND)` |
| 第 2 次失败 | 3 秒 | `DATE_ADD(NOW(), INTERVAL 3 SECOND)` |
| 第 3 次失败 | 9 秒 | `DATE_ADD(NOW(), INTERVAL 9 SECOND)` |
| 第 4 次（超限） | - | 标记为死信（1.5 任务） |

## 与现有代码的兼容性

- 表名 `domain_event_outbox` 与 `DomainEventOutbox.ts` raw SQL 完全一致
- 列名 `event_type`/`aggregate_type`/`aggregate_id`/`payload`/`status`/`created_at`/`processed_at`/`error_message`/`retry_count` 与现有代码逐一对应
- 新增 `next_execute_at` 列：现有代码不读取此列，向后兼容；1.4 任务改造时启用
- `status` 现有值 `pending`/`processed`/`failed` 保持不变；`dead_letter` 状态由 1.5 任务引入

## 迁移执行

```bash
# 方式1：直接执行 SQL
mysql -u root -p vnerpdacahng < database/migrations/001_create_domain_event_outbox.sql

# 方式2：通过 setup API（1.6 任务接入后可用）
# 当前作为独立迁移文件，需手动执行
```

## 验证

```sql
-- 验证表结构
DESCRIBE domain_event_outbox;

-- 验证索引
SHOW INDEX FROM domain_event_outbox;

-- 验证空表可查询
SELECT COUNT(*) FROM domain_event_outbox;
```
