# Redis Streams vs BullMQ 对比分析

> **文档目的**：为 v0.3.0 迭代任务 02（异步任务队列基础设施接入）提供决策依据。项目已基于 Redis Streams 落地事件总线，本分析明确 BullMQ 的增量价值、迁移成本与收益，给出是否引入的明确建议。

---

## 1. 现状盘点：Redis Streams 已实现的能力

项目 `src/infrastructure/event-bus/` 已落地完整的 Redis Streams 事件总线，以下能力**已可用**：

| 能力 | 实现文件 | 说明 |
| --- | --- | --- |
| 事件持久化 | `DomainEventOutbox.ts` + `001_create_domain_event_outbox.sql` | 事件先落 `domain_event_outbox` 表，保证与业务事务原子性 |
| 可靠投递 | `OutboxPoller.ts` | 轮询 outbox 表 → XADD 到 `erp:domain-events` Stream |
| 消费者组 | `StreamConsumer.ts` | XREADGROUP 拉取 + XACK 确认，支持多消费者并行 |
| 死消费者恢复 | `StreamConsumer.ts` | XAUTOCLAIM 回收 idle > 60s 的遗留消息 |
| 幂等消费 | `IdempotentHandler.ts` + `IdempotencyGuard.ts` | `sys_event_processed` 表两阶段标记（processing → processed） |
| 失败重试 | `OutboxPoller.ts` | 指数退避（1s/3s/9s），最多 3 次后进死信 |
| 死信队列 | `OutboxPoller.ts` | `markAsDeadLetter()` 将事件标记为 dead_letter 状态 |
| Stream 裁剪 | `StreamPublisher.ts` | MAXLEN ~ 10000 近似裁剪，80% 阈值告警 |
| 崩溃恢复 | `OutboxPoller.ts` | reclaimStaleDispatching 重置卡住的 dispatching 状态 |
| 开发降级 | `MemoryDomainEventOutbox.ts` + `DomainEventOutboxFactory.ts` | 无 Redis 时降级为内存模式 |
| 健康检查 | `InfrastructureHealthCheck.ts` | database/redis/outbox/streamConsumer 四项检查 |
| 自动重启 | `StreamConsumer.ts` | consumeLoop 异常退出时带退避自动重启 |
| 畸形消息处理 | `StreamConsumer.ts` | NaN eventId / 畸形 JSON payload 自动 ACK 跳过 |

---

## 2. BullMQ 能力对比

### 2.1 功能矩阵

| 能力 | Redis Streams（现状） | BullMQ | 差距 |
| --- | --- | --- | --- |
| **持久化** | ✅ outbox 表 + Stream | ✅ Redis Hash + List | 持平 |
| **消费者组并行** | ✅ XREADGROUP | ✅ Worker concurrency | 持平 |
| **失败重试** | ✅ 指数退避（1s/3s/9s） | ✅ 指数退避 + 自定义策略 | BullMQ 更灵活（可配置 attempts/backoff） |
| **死信队列** | ✅ outbox dead_letter 状态 | ✅ DLQ 自动转移 | 持平 |
| **幂等消费** | ✅ sys_event_processed 表 | ❌ 需自行实现 | **Redis Streams 更强**（已落地） |
| **延迟任务** | ❌ 不支持 | ✅ delayed jobs | **BullMQ 独有** |
| **定时任务（cron）** | ❌ 不支持 | ✅ repeat jobs（cron 表达式） | **BullMQ 独有** |
| **优先级队列** | ❌ 不支持 | ✅ priority 参数 | **BullMQ 独有** |
| **任务状态查询** | ❌ 需查 outbox 表 | ✅ Job.toJSON() + BullMQ Dashboard | **BullMQ 更强** |
| **任务进度追踪** | ❌ 不支持 | ✅ job.updateProgress() | **BullMQ 独有** |
| **任务取消** | ❌ 不支持 | ✅ job.discard() | **BullMQ 独有** |
| ** Flow 编排** | ❌ 不支持 | ✅ FlowProducer（父子任务） | **BullMQ 独有** |
| **管理 UI** | ❌ 无 | ✅ BullMQ Board / Arena | **BullMQ 独有** |
| **事务性发件箱** | ✅ 原生支持 | ❌ 需额外实现 | **Redis Streams 更强** |
| **开发降级** | ✅ 内存模式 | ❌ 依赖 Redis | **Redis Streams 更强** |

### 2.2 结论

- **重叠能力**（持久化/消费组/重试/DLQ）：Redis Streams 已全部覆盖，BullMQ 无增量。
- **BullMQ 独有能力**：延迟任务、定时任务、优先级队列、任务状态查询、进度追踪、任务取消、Flow 编排、管理 UI。
- **Redis Streams 独有优势**：事务性发件箱（已落地）、开发降级（无 Redis 可用）、幂等消费（已落地）。

---

## 3. 迁移成本评估

### 3.1 引入 BullMQ 需要的工作量

| 工作项 | 预估工时 | 风险 |
| --- | --- | --- |
| 安装 `bullmq` 依赖 + 类型定义 | 0.5h | 低 |
| 封装 `src/infrastructure/queue/` 基类（Producer/Consumer/Worker） | 4h | 中 — 需设计统一抽象 |
| Redis 连接复用（与现有 ioredis 共享连接池） | 1h | 低 |
| 幂等消费迁移（BullMQ 无内建，需复用 IdempotencyGuard） | 2h | 中 — 需验证两套机制不冲突 |
| 死信队列对接（BullMQ DLQ → 现有 dead_letter 流程） | 2h | 中 |
| 环境变量 + 降级逻辑（无 Redis 时回退） | 1h | 低 |
| 试点改造（入库单审核等场景） | 4h | 中 — 需保证不破坏现有事件流 |
| 单元测试 + 集成测试 | 6h | 高 — 两套队列机制并存增加测试复杂度 |
| BullMQ Board 管理 UI 集成 | 2h | 低 |
| 文档 + 使用说明 | 2h | 低 |
| **合计** | **24.5h（约 3 人日）** | — |

### 3.2 隐性成本

1. **双队列机制并存**：Redis Streams（事件总线）+ BullMQ（任务队列）同时运行，运维需同时监控两套系统，排障复杂度翻倍。
2. **幂等性双重保护**：IdempotentHandler（StreamConsumer 侧）+ BullMQ 自定义幂等中间件，逻辑重叠但实现不同，容易产生"假安全感"。
3. **Redis 资源争用**：两套系统共享同一 Redis 实例，高负载时可能互相影响。需评估是否需要独立 Redis 实例。
4. **团队学习曲线**：BullMQ 有自己的 API 风格（Queue/Worker/Job/Flow），团队需额外学习。
5. **版本依赖风险**：BullMQ 5.x 要求 Node.js 16+，与项目 Next.js 16 + Node 20 兼容，但未来升级可能有摩擦。

---

## 4. 收益评估

### 4.1 实际业务场景需求

| 场景 | 是否需要 BullMQ 独有能力 | 说明 |
| --- | --- | --- |
| 领域事件投递（入库→库存→审计） | ❌ 不需要 | Redis Streams 已覆盖 |
| 批量操作（批量审核、批量导入） | 🔄 可选 | 可用现有 Stream，但 BullMQ 的进度追踪更好 |
| 报表生成（耗时 30s+） | ✅ 需要 | 延迟任务 + 进度追踪 + 任务取消 |
| 定时任务（每日库存盘点、月结） | ✅ 需要 | cron 定时，Redis Streams 不支持 |
| 邮件/通知发送 | 🔄 可选 | 可用现有 Stream，但 BullMQ 的重试策略更灵活 |
| MRP 物料需求计算（长耗时） | ✅ 需要 | 延迟任务 + 进度追踪 + Flow 编排 |

### 4.2 收益量化

- **高价值场景**（报表生成、定时任务、MRP 计算）：3 个场景确实需要 BullMQ 独有能力，无法用 Redis Streams 替代。
- **中价值场景**（批量操作、邮件通知）：BullMQ 体验更好但非必需，现有 Stream 可勉强支撑。
- **低价值场景**（领域事件）：完全不需要 BullMQ，引入反而增加复杂度。

---

## 5. 决策建议

### 5.1 推荐方案：按需引入 BullMQ，不替换 Redis Streams

```
┌─────────────────────────────────────────────────┐
│              领域事件（事件驱动）                   │
│  Redis Streams + OutboxPoller + StreamConsumer   │
│  （已落地，保持不变，承载所有 DomainEvent 投递）      │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│              异步任务（任务调度）                   │
│  BullMQ + Queue + Worker                         │
│  （新增，仅承载报表生成/定时任务/MRP 等长耗时业务）    │
└─────────────────────────────────────────────────┘
```

**理由**：
1. Redis Streams 已稳定运行，替换它（迁移成本 3 人日 + 高风险）换不来增量价值。
2. BullMQ 的延迟任务、定时任务、进度追踪、管理 UI 是真实业务需求（报表/MRP/月结）。
3. 两套系统职责清晰分离：**Streams 管事件，BullMQ 管任务**，不存在职责重叠。
4. 幂等性：Streams 侧保留 IdempotentHandler，BullMQ 侧复用同一 `IdempotencyGuard`（基于 `sys_event_processed` 表），统一保护。

### 5.2 不推荐方案

| 方案 | 否决理由 |
| --- | --- |
| 用 BullMQ 替换 Redis Streams | 迁移成本 3 人日 + 丧失事务性发件箱 + 丧失开发降级能力 + 高风险 |
| 不引入 BullMQ，用 Redis Streams 凑合 | 定时任务/延迟任务/进度追踪无法实现，报表生成和 MRP 计算场景无解 |
| 用 `node-cron` + 自建延迟队列替代 BullMQ | 重复造轮子，自建延迟队列的可靠性远不如 BullMQ，维护成本高 |

### 5.3 实施路线图（如采纳推荐方案）

| 阶段 | 内容 | 工时 | 优先级 |
| --- | --- | --- | --- |
| Phase 1 | 安装 bullmq + 封装 `src/infrastructure/queue/` 基类 | 6h | P0 |
| Phase 2 | 复用 IdempotencyGuard + 对接死信流程 | 4h | P0 |
| Phase 3 | 试点：报表生成异步化（进度追踪 + 取消） | 4h | P1 |
| Phase 4 | 试点：每日库存盘点定时任务（cron） | 2h | P1 |
| Phase 5 | BullMQ Board 管理 UI（仅开发/运维可访问） | 2h | P2 |
| Phase 6 | 单元测试 + 集成测试 + 文档 | 6h | P0 |
| **合计** | | **24h（约 3 人日）** | |

### 5.4 注意事项

1. **Redis 连接隔离**：BullMQ 建议使用独立 Redis 连接（或至少独立 db），避免与 StreamConsumer 的 XREADGROUP 阻塞操作互相影响。
2. **降级策略**：BullMQ 强依赖 Redis，无内存降级。开发环境需确保 Redis 可用（docker-compose 已含 Redis 服务）。
3. **监控**：BullMQ 的 Worker/Queue 状态应接入 `InfrastructureHealthCheck.ts`，与现有 outbox/streamConsumer 检查并列。
4. **环境变量**：新增 `BULLMQ_PREFIX`（默认 `bull`）、`BULLMQ_CONCURRENCY`（默认 5）等配置项。
5. **不要迁移现有领域事件**：已基于 Stream 的 20+ 事件处理器保持不变，BullMQ 仅承接新业务场景。

---

## 6. 总结

| 维度 | 结论 |
| --- | --- |
| 是否需要引入 BullMQ | ✅ 需要，但仅用于任务调度，不替换事件总线 |
| 迁移成本 | 3 人日（新增，非替换） |
| 核心收益 | 延迟任务、定时任务、进度追踪、管理 UI — 解锁报表/MRP/月结场景 |
| 风险 | 双系统并存增加运维复杂度，需通过职责分离 + 统一幂等保护 mitigate |
| 建议 | 采纳推荐方案：Streams 管事件 + BullMQ 管任务，Phase 1-6 分阶段实施 |
