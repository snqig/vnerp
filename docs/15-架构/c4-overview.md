# ERP 系统架构概览（C4 模型）

> 本文档描述 VNERP/DCPrint ERP 系统的运行时架构、部署拓扑与数据流。
> 最后更新: 2026-07-23

## 1. 系统上下文（C4 Level 1）

```
┌─────────────┐     HTTPS/JSON      ┌──────────────────────────────────┐
│  浏览器 / PWA│◄────────────────────►│  Next.js API Routes (Vercel)     │
│  (Warehouse) │                     │  /api/qrcode/*                   │
│  (Sales)     │                     │  /api/warehouse/*                │
│  (Finance)   │                     │  /api/workorders/*               │
└─────────────┘                     └──────────────────────────────────┘
                                              │
                                              │ mysql2 / Redis
                                              ▼
                                   ┌──────────────────────────┐
                                   │  MySQL 8.x (主库)        │
                                   │  - 业务表 (sal_*, inv_*) │
                                   │  - domain_event_outbox   │
                                   │  - qrcode_record         │
                                   └──────────────────────────┘
                                              │
                                              │ (可选)
                                              ▼
                                   ┌──────────────────────────┐
                                   │  Redis 7+ (缓存/Streams) │
                                   │  - trace:qr:*            │
                                   │  - outbox stream          │
                                   └──────────────────────────┘
```

外部依赖:
- **数据库**: MySQL 8.x，单主库 + 可选的只读从库
- **缓存**: Redis 7+，用于追溯查询缓存与事件 Stream
- **部署**: Vercel 托管 Next.js API + 前端
- **打印**: 浏览器原生 `window.print()` + WebSerial（可选）

## 2. 容器架构（C4 Level 2）

### 2.1 前端层

| 分层 | 职责 | 技术 |
|------|------|------|
| `src/app/[locale]/` | 页面路由、服务端组件 | Next.js App Router |
| `src/components/` | 共享组件（Sidebar/Header/QRCodePrinter） | React Server/Client |
| `src/hooks/` | 离线扫描、网络状态、表单状态 | use-network-status |
| `src/lib/` | 离线扫描队列、打印任务队列、API client | IndexedDB, Web Workers |

### 2.2 API 层

```
src/app/api/
├── qrcode/                  # 二维码 CRUD / 追溯 / 打印
│   ├── trace/route.ts       # GET 追溯（Redis cache-through）
│   ├── scan/route.ts        # 扫码登记（invalidate cache）
│   └── print/route.ts       # 打印任务分发
├── warehouse/               # 仓储三大模块
│   ├── inbound/             # 入库（审核/切割/上架）
│   ├── outbound/            # 出库（FIFO扣减）
│   └── stocktaking/         # 盘点（锁库/差异）
├── admin/archive/           # 归档 cron（02:00 冷数据迁移）
└── init/supplement-tables/  # 补表/索引迁移
```

每个 route 的典型流程:
1. 鉴权 (`withPermission`) → 2. 应用服务 (`*ApplicationService`) → 3. 仓储 (`Mysql*Repository`) → 4. 返回 `successResponse`

### 2.3 领域层

```
src/domain/
├── shared/           # DomainEvent, DomainError, Result
├── trace/            # QRCode 聚合根 + 事件（生成/分切/扫码）
├── sales/            # SalesOrder 聚合根 + 事件（审核/发货）
├── production/       # WorkOrder 聚合根 + 事件（完工/领料）
├── warehouse/        # InboundOrder / OutboundOrder 聚合根
├── finance/          # Receivable / Payable 聚合根
├── sample/           # SampleOrder / SampleProcessCard 聚合根
└── ...               # 采购、HR、质量、设备等
```

变更流程:
- 聚合根承载业务 invariant
- 领域事件推入 `_domainEvents`
- 应用服务调用 `saveEvents(conn, ...)` 原子写入 `domain_event_outbox`

### 2.4 异步处理层

```
OutboxPoller (每 5 秒)
   ├── 读取 domain_event_outbox
   ├── 包装为 IdempotentHandler
   └── 发布到 EventBus
         ├── InMemoryEventBus (开发/少量数据)
         │     └── Promise.allSettled 并发执行 handlers
         └── StreamConsumer (生产/Redis 可用)
               └── XREADGROUP 消费 Redis Stream
```

关键 handlers:
- `SalesToWorkOrderHandler` — 销售→工单自动生成
- `WorkOrderCompletedHandler` — 工单完工→入库
- `FinanceVoucherHandler` — 自动生应收/应付凭证
- `QRCodeGeneratedHandler` — 入库后生成二维码

## 3. 部署架构（C4 Level 3）

```
                                  ┌─────────────────┐
                                  │   Vercel Edge   │
                                  │   Next.js       │
                                  └────────┬────────┘
                                           │
                                 mysql / redis env vars
                                           │
                          ┌────────────────┴────────────────┐
                          │                                  │
                 ┌────────▼────────┐               ┌─────────▼─────────┐
                 │  MySQL Primary   │               │  Redis Cloud /     │
                 │  (Railway/ALI)   │               │  Upstash           │
                 └──────────────────┘               └───────────────────┘
```

环境变量:
- `DATABASE_URL` — MySQL 连接串
- `REDIS_URL` — Redis 连接串（可选，缺失则 fallback 到 in-memory）
- `EVENT_BUS_TYPE` — `db`（生产）或 `memory`（单测）
- `JWT_SECRET` — 认证密钥

## 4. 核心数据流

### 4.1 入库审核 + 二维码生成（同步 + 异步）

```
POST /api/warehouse/inbound/{id}/audit
  → InboundApplicationService.auditInbound()
  → transaction:
      UPDATE inv_inbound_order SET status=2
      INSERT INTO qrcode_record (x N)
      saveEvents(conn, 'InboundOrder', id, [
        InboundOrderApprovedEvent,
        QRCodeGeneratedEvent
      ])
  ← 200 OK
  ← OutboxPoller (5s) → QRCodeGeneratedHandler → 打印任务入队
```

### 4.2 追溯查询（缓存穿透）

```
GET /api/qrcode/trace?qr_code=QR-MAT-001
  → TraceCacheService.getCachedTrace(qrCode)
  → cache.get('trace:qr:QR-MAT-001')
      HIT  → 返回缓存
      MISS → query DB (qrcode_record, qrcode_scan_log, ...)
            → cache.set(key, ttl=300)
            → 返回
```

### 4.3 扫码登记（写 + 缓存失效）

```
POST /api/trace/qr/scan
  → execute(
      INSERT INTO qrcode_scan_log ...,
      UPDATE qrcode_record SET scan_count=scan_count+1
    )
  → cache.invalidatePattern('trace:qr:*')
  → 200 OK
```

## 5. 待演进架构（P2）

| 主题 | 现状 | 目标 |
|------|------|------|
| 仓储抽象 | BaseRepository 已注入 DbExecutor，但仅 MysqlQRCodeRepository 跟进 | 推广到所有 Mysql*Repository |
| 事件驱动 | CrossModuleSagaHandler 直连 InMemoryEventBus | 改为注入 EventBus 接口 |
| 离线扫码 | IndexedDB 队列就绪，未接入扫码组件 | 接入 QRScanDialog + Service Worker |
| 打印队列 | PrintJobQueue 已实现，未接入 API | 接入 QRCodePrinter |
