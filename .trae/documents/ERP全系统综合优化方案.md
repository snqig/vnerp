# ERP 全系统综合优化方案

> 基于 2026-07-03 实际代码探查编写。所有文件路径、行号、表名均来自实际核查。
> 勘误：用户报告中的部分 P0 项经核查已不成立（见第一章"报告勘误"），本方案以实际代码状态为准。
> 后台任务：4 个路由权限转换 agent 仍在运行，本方案与之协调。

---

## 一、报告勘误（重要，避免错误投入）

经实际探查，用户报告的以下结论与当前代码不符，需修正：

| 报告原文 | 实际状态 | 证据 |
|---------|---------|------|
| "MySQL 无数据持久化，容器删除后数据永久丢失，P0" | **prod 已有 bind mount** | `docker-compose.prod.yml` L24: `./data/mysql:/var/lib/mysql` |
| "未启用 Next.js standalone 模式，镜像体积过大" | **已启用 standalone** | `next.config.ts` L23: `output: 'standalone'`；`Dockerfile` L36-39 standalone 复制 |
| "接口级权限校验缺失，仅靠前端隐藏按钮" | **withPermission 已实现后端校验** | `api-permissions.ts` L843-863: 查 ROUTE_PERMISSIONS + `userInfo.permissions.includes()` |
| "CI 覆盖率阈值 80/70/80" | **实际阈值为 45/70/35/45** | `vitest.config.ts` 实际配置远低于 CI 注释声称的值 |
| "PR 阶段不执行生产构建" | **e2e-test job 在 PR 上执行 `pnpm build`** | `ci.yml` L75（e2e-test needs unit-test，在 PR 上运行） |

**真正的 P0 问题**（经核查确认）：
1. ~40 个 `/api/init/*` + `/api/debug/*` + `/api/diagnose/*` 路由无认证，生产可达，`/api/init/full-seed` 可截断业务表
2. 双 schema 不一致（SQL 80 表 vs Drizzle 2 表 vs Drizzle 迁移用扁平表名零重叠）
3. 默认 admin/admin123，firstLogin 强制改密仅在 withPermission 中生效
4. Refresh token 竞态漏洞（无原子性锁）
5. Rate limiting 基于内存 Map，多实例失效

---

## 二、现状总览（基于探查事实）

### 2.1 模块成熟度矩阵

| 模块 | API路由数 | 领域层 | 应用服务 | 仓储实现 | 状态机 | Mock页面 | 单测 |
|------|---------|-------|---------|---------|-------|---------|------|
| warehouse | 37 | ✅ 完整 | ✅ | ✅ Inbound | ✅ | 2页 | ✅ 6文件 |
| production | 18 | ✅ | ✅ | ✅ WorkOrder | ✅ | 0 | ✅ 4文件 |
| sales | 8 | ✅ | ✅ | ✅ SalesOrder | — | 1页 | 1文件(e2e) |
| purchase | 5 | ✅ | ✅ | ✅ PurchaseOrder | — | 1页 | 0 |
| finance | 17 | ❌ | ✅(仅服务) | ❌ | — | 0 | ✅ 4文件 |
| dcprint | 19 | ❌ | ❌ | ❌ | — | 2页 | 0 |
| quality | 13 | ❌ | ❌ | ❌ | — | 3页 | 0 |
| equipment | 5 | ❌ | ❌ | ❌ | — | 0 | 0 |
| hr | 6 | ❌ | ❌ | ❌ | — | 1页 | 0 |
| sample | 2 | ❌ | ❌ | ❌ | — | 0 | 0 |
| settings | 4 | ❌ | ❌ | ❌ | — | 0 | 0 |
| dashboard | 8 | ❌ | ✅(仅服务) | ❌ | — | 0 | 0 |

### 2.2 数据库现状

| 数据源 | 表数 | 字符集 | 索引 | 外键 | 用途 |
|-------|------|-------|------|------|------|
| `vnerpdacahng_schema.sql` | 80 | utf8mb4 ✅ | 227个 | 仅2个 | setup-db.mjs 初始化 |
| `src/lib/db/schema.ts` | 2 | 未指定 | 0 | 0 | Drizzle ORM（仅入库） |
| `drizzle/0000_*.sql` | 39 | 未指定 | — | 多个 | 扁平表名，与 SQL schema 零重叠 |
| `migrations/` | 4 | — | — | — | 增量 SQL（alerts/indexes/login/purchase） |
| `database/migrations/` | 7 | — | — | — | scripts/migrate.ts 使用，sys_migration 记录 |

### 2.3 安全现状

| 能力 | 状态 | 详情 |
|------|------|------|
| JWT 认证 | ✅ 存在 | Access(24h)+Refresh(7d)+Redis 黑名单 |
| Refresh 竞态 | 🔴 漏洞 | `refresh/route.ts` verify→store→remove 无原子性 |
| 权限校验 | ⚠️ 框架有/覆盖不全 | withPermission 强制；withErrorHandler 无认证 |
| 未保护路由 | 🔴 P0 | ~40 个 /api/init/* + /api/debug/* + /api/diagnose/* |
| Rate limiting | ⚠️ 内存版 | `rate-limit.ts` Map，多实例失效 |
| 登录锁定 | ✅ DB版 | 5次/15分钟，login_fail_count/lock_time |
| CSRF | ❌ 缺失 | 全局零匹配 |
| XSS 输入过滤 | ⚠️ 仅输出 | sanitizeInput 用于响应，输入未过滤 |
| Env 校验 | ❌ 缺失 | 无 zod schema，仅 JWT_SECRET 检查 |
| 默认口令 | 🔴 admin/admin123 | seed 数据，firstLogin 仅 withPermission 拦截 |
| 敏感日志 | ⚠️ 部分 | maskSensitiveData 存在但 login route 用 console.error |

### 2.4 测试现状

| 维度 | 状态 | 详情 |
|------|------|------|
| 单测文件 | ~33个 | 集中在 warehouse/production/finance/auth/UI |
| 零测试模块 | HR/equipment/purchase/quality | — |
| 覆盖率阈值 | 45/70/35/45 | CI 注释谎称 80/70/80 |
| 覆盖率范围 | 白名单制 | 仅 warehouse+shared+部分 lib 计入，其余模块排除 |
| E2E | 5个文件 | 仅冒烟级，无完整业务闭环 |
| 集成测试 | 1个 | `end-to-end-flow.test.ts`（真实 DB） |
| 视觉测试 | 🔴 失效 | Chromatic workflow 存在但无 .stories 文件 |
| 测试 DB | ❌ 缺失 | 集成测试共享生产 DB 连接 |
| 迁移测试 | ❌ 缺失 | 零覆盖 |

---

## 三、实施方案（8 阶段，按依赖顺序）

### Phase 0：紧急安全修复（P0，立即执行）

**目标**：堵住生产环境可达的未认证路由 + refresh 竞态 + 强制改密全局生效。

#### 0-1. 封堵未认证路由（最高优先级）

**文件**：`src/middleware.ts`

**改动**：
1. `BLOCKED_ROUTES` 数组增加：`'/api/init'`, `'/api/debug'`, `'/api/diagnose'`
2. matcher 增加这些路径模式
3. 生产环境直接返回 404

```typescript
const BLOCKED_ROUTES = [
  '/debug', '/test-api', '/diagnostic', '/test', '/qrcode',
  '/api/init', '/api/debug', '/api/diagnose'  // 新增
];
```

**验证**：生产环境 `curl /api/init/full-seed` 返回 404

#### 0-2. 全局强制改密（firstLogin）

**文件**：`src/lib/api-auth.ts`

**改动**：在 `withAuth` 和 `withAuthAndErrorHandler` 中（L24, L87），在步骤 3（获取 userInfo）后，增加 firstLogin 检查（与 `withPermission` L866-877 相同逻辑），确保不使用 withPermission 的路由也受保护。

**白名单**：`/api/auth/change-password`, `/api/auth/logout`, `/api/auth/refresh`

#### 0-3. 修复 Refresh Token 竞态

**文件**：`src/app/api/auth/refresh/route.ts`

**改动**：使用 Redis `SETNX` 原子锁：
```typescript
const lockKey = `refresh_lock:${refreshToken}`;
const acquired = await redis.set(lockKey, '1', 'PX', 5000, 'NX');
if (!acquired) {
  return errorResponse('正在刷新，请稍后', 429);
}
try {
  // verify → issue new → revoke old
} finally {
  await redis.del(lockKey);
}
```

#### 0-4. 协调后台 agent 完成路由转换

4 个后台 agent 正在将 `withErrorHandler` → `withPermission`。Phase 0 完成后：
1. 检查 agent 产出，修复 3 个已知工程冲突（double-logging、error-message regression、context.params 丢失）
2. 对剩余无法自动转换的路由（如动态路由 `[id]`）手动处理
3. 全量 `pnpm ts-check` 验证

**验证**：`grep -r "withErrorHandler" src/app/api/` 仅返回安全白名单路由

---

### Phase 1：数据库 Schema 统一（P0）

**目标**：消除双 schema，建立单一真相来源 + 可靠迁移链。

**决策**：以 `vnerpdacahng_schema.sql`（80 表，成熟）为唯一真相来源。Drizzle schema.ts 按需增量扩展（仅当某模块需要 ORM 时才加表定义）。废弃 `drizzle/` 目录的扁平表名迁移。

#### 1-1. 废弃 Drizzle 扁平迁移

**操作**：
1. `drizzle/` 目录标记为 deprecated（保留但不使用）
2. `drizzle.config.ts` 指向新空目录或删除 generate/push 脚本
3. `package.json` 移除 `db:generate`, `db:push` 脚本（或改为警告提示）

#### 1-2. 统一迁移链

**保留两条路径，职责明确**：
- `pnpm setup:db`（`scripts/setup-db.mjs`）：全量初始化，执行 `vnerpdacahng_schema.sql` + seeds。仅用于新环境搭建。
- `pnpm migrate`（`scripts/migrate.ts`）：增量迁移，执行 `database/migrations/*.sql`，记录 `sys_migration` 表。用于版本迭代。

**操作**：
1. 将 `migrations/`（项目根）的 4 个文件合并到 `database/migrations/`（scripts/migrate.ts 使用的目录）
2. 确保迁移文件编号连续（005, 006, ...）
3. setup-db.mjs 在执行全量 SQL 后，自动标记所有已有迁移为已执行

#### 1-3. Drizzle schema.ts 增量对齐

**文件**：`src/lib/db/schema.ts`

**原则**：仅当某模块需要通过 Drizzle ORM 查询时才添加表定义。当前仅入库模块使用 Drizzle（2 表）。

**操作**：
1. 修复 `updateTime` 缺少 `ON UPDATE CURRENT_TIMESTAMP`（L41）
2. 添加字符集声明（Drizzle 表级 `{ charset: 'utf8mb4' }`）
3. 为已定义的 2 表添加索引（与 SQL schema 对齐）

#### 1-4. 索引与外键规范化

**文件**：`database/migrations/006_add_indexes_and_fks.sql`（新建）

**操作**：
1. 审计高频查询字段（订单号、批次号、时间范围、material_id、warehouse_id），补充缺失索引
2. 对核心关联添加外键（inv_inventory_batch → inv_material, inv_outbound_item → inv_outbound_order 等）
3. 使用幂等 `CREATE INDEX IF NOT EXISTS` 语法

**验证**：`pnpm migrate:status` 显示所有迁移已执行；`EXPLAIN` 验证关键查询走索引

---

### Phase 2：安全加固（P0-P1）

**目标**：修复认证漏洞、限流、CSRF、XSS、Env 校验。

#### 2-1. Redis 限流

**文件**：`src/lib/rate-limit.ts`

**改动**：将内存 Map 改为 Redis 滑动窗口：
```typescript
// 伪代码
const key = `rate:${identifier}:${window}`;
const count = await redis.incr(key);
if (count === 1) await redis.expire(key, windowSeconds);
if (count > limit) return false;
return true;
```
保留内存降级（REDIS_URL 缺失时）。

#### 2-2. CSRF 防护

**文件**：`src/middleware.ts`（或新建 `src/lib/csrf.ts`）

**策略**：Double Submit Cookie
1. 登录时下发 `csrf_token` cookie（HttpOnly=false，前端可读）
2. 非安全方法（POST/PUT/DELETE/PATCH）校验 `X-CSRF-Token` header 与 cookie 一致
3. API 路由豁免（仅对 `application/x-www-form-urlencoded` 和 `multipart/form-data` 表单生效，JSON API 可豁免或也校验）

#### 2-3. 输入 XSS 过滤

**文件**：新建 `src/lib/sanitize.ts`

**策略**：
1. 对长文本字段（备注、工艺说明、描述）入库前调用 `sanitizeHtml` 或手动转义
2. 不引入重型依赖（DOMPurify 需 DOM），用 `he` 库做 HTML 实体编码
3. 在 `execute`/`query` 包装层或应用服务层统一调用

#### 2-4. Env 校验

**文件**：新建 `src/lib/env.ts`

```typescript
import { z } from 'zod';

const envSchema = z.object({
  DB_HOST: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  REDIS_URL: z.string().optional(),
  // ...
});

export const env = envSchema.parse(process.env);
```

在 `next.config.ts` 顶部 import 触发启动时校验。

#### 2-5. 默认口令处理

**文件**：`database/seeds/vnerp-seed-data.sql`（或 `database/login.sql`）

**操作**：
1. seed 数据中 admin 用户设置 `first_login = 1`（已有 firstLogin 字段，确保 seed 标记）
2. Phase 0-2 全局强制改密生效后，首次登录即被拦截
3. 文档（README）标注默认口令及必须改密

**验证**：新环境首次登录 admin 被拦截，必须改密后才能访问

---

### Phase 3：核心业务模块补全（P1）

**目标**：将骨架模块推进到"领域+服务+仓储+状态机"完整闭环。

#### 3-1. 仓储深拆（恢复已有 8 阶段方案）

**文件**：`.trae/documents/仓储管理模块深拆实施方案.md`（已存在）

**状态**：Phase A ✅, Phase B ✅, Phase E-1 🔄（进行中）

**继续执行**：
1. Phase E-1 剩余：`transfer/route.ts`（表名+中间件）、`inventory/route.ts`（stock_qty）、`stock-adjust/route.ts`（adjust_type）、`outbound/route.ts`（withPermission 参数）
2. Phase C：OutboundOrder/TransferOrder/StocktakingOrder 聚合根
3. Phase D：仓储实现 + 应用服务
4. Phase F：FIFO + 批次追溯
5. Phase G：移除 10 个页面的 mock 数据
6. Phase H：测试补全

#### 3-2. 生产管理补全

**缺失**：排产算法、MRP 物料需求运算

**操作**：
1. `src/domain/production/` 已有 WorkOrder 聚合根，扩展排产值对象
2. 实现 MRP 引擎（BOM 展开 → 库存比对 → 采购建议）
3. `src/app/api/production/schedule/route.ts` 对接排产算法
4. `src/app/api/production/mrp/route.ts` 对接 MRP 运算

#### 3-3. 销售管理补全

**缺失**：对账核销、退货退款逆向流程、应收联动

**操作**：
1. `src/domain/sales/` 已有 SalesOrder 聚合根，扩展退货聚合
2. 实现 `SalesSettlementService`（对账核销）
3. `src/app/api/sales/return/route.ts` 对接退货+退款+库存回收
4. 应收凭证自动生成（事件 → FinanceVoucherHandler）

#### 3-4. 采购管理补全

**缺失**：审批流、退换货、应付联动

**操作**：
1. `src/domain/purchase/` 已有 PurchaseOrder 聚合根，扩展审批状态机
2. 实现 `PurchaseApprovalService`
3. `src/app/api/purchase/return/route.ts` 退换货流程
4. 应付凭证自动生成

#### 3-5. 财务管理补全

**缺失**：领域层、仓储、应收应付核销、成本卷积

**操作**：
1. 新建 `src/domain/finance/`：Receivable/Payable/Voucher 聚合根
2. 新建 `src/infrastructure/repositories/MysqlFinanceRepository.ts`
3. `FinanceApplicationService` 已存在，补全核销+卷积逻辑
4. 路由迁移到 DDD（参照 inbound/route.ts 模式）

---

### Phase 4：测试与质量保障（P1）

**目标**：诚实覆盖率、完整 E2E 闭环、修复失效的视觉测试。

#### 4-1. 修正覆盖率配置

**文件**：`vitest.config.ts`

**操作**：
1. 将 coverage.include 从白名单改为 `src/**`（全量计量）
2. 阈值设为当前实际值（lines 48, functions 76, branches 39, statements 49）作为反退化基线
3. 修正 `ci.yml` L39-41 注释，移除虚假的 80/70/80 声明
4. 后续迭代逐步提升阈值（每次 +5%）

#### 4-2. 补全零测试模块

**优先级**：
1. purchase（已有领域层，补 `PurchaseOrder.test.ts`）
2. quality（新建 `src/domain/quality/` 后补测试）
3. hr/equipment（基础 CRUD 测试）

#### 4-3. E2E 业务闭环

**文件**：`tests/warehouse/outbound-flow.spec.ts`（新建）

**操作**：
1. 入库审批 → 库存变更 → 出库创建 → FIFO 分配 → 出库确认 → 库存扣减 → 流水记录
2. 调拨流程：创建 → 审批 → 出库 → 入库 → 双仓库库存验证
3. 参照已有 `src/lib/__tests__/end-to-end-flow.test.ts`（集成测试）补充 Playwright E2E

#### 4-4. 修复视觉测试

**文件**：`.github/workflows/chromatic.yml`

**操作**（二选一）：
- **方案 A（推荐）**：移除 chromatic.yml（无 stories 文件，workflow 已失效）
- **方案 B**：为核心组件添加 .stories.tsx 文件，配置 storybook

#### 4-5. 测试数据库隔离

**文件**：新建 `src/tests/setup-db.ts`

**操作**：
1. 使用独立测试数据库（`vnerp_test`）
2. 每次 integration 测试前 TRUNCATE + 重新 seed
3. `vitest.config.ts` setupFiles 引入

#### 4-6. 迁移测试

**文件**：`tests/migrations/migration.test.ts`（新建）

**操作**：
1. 对每个迁移文件执行 `up` → 验证表结构 → `down` → 验证回滚
2. 幂等性测试（重复执行不报错）

---

### Phase 5：国际化补全（P1-P2）

**目标**：后端文案国际化 + 本地化格式封装。

#### 5-1. 后端 i18n 框架

**文件**：新建 `src/lib/i18n-server.ts`

**操作**：
1. 从请求 `Accept-Language` 或 JWT 用户偏好获取 locale
2. 加载 `messages/${locale}.json` 的 `Api` 命名空间
3. 提供 `tApi(key, params)` 函数供路由使用
4. 逐步将 280 个路由文件的 57,252 个中文字符迁移到 i18n（可分批，优先迁移面向用户的错误消息）

#### 5-2. 本地化格式封装

**文件**：新建 `src/lib/formatters.ts`

**操作**：
1. `formatCurrency(amount, locale)` — 多币种
2. `formatDate(date, locale, format)` — 多时区
3. `formatNumber(num, locale)` — 千分位/小数点
4. 页面层统一调用，不直接用 `toFixed`/`toLocaleString`

#### 5-3. 语言偏好持久化

**文件**：`src/i18n/request.ts`, `src/middleware.ts`

**操作**：
1. next-intl 默认用 cookie 持久化 locale（确认 `localeDetection` 开启）
2. 登录时将用户 locale 偏好存入 `sys_user.locale` 字段
3. 后续请求从用户偏好加载（覆盖 cookie）

---

### Phase 6：工程化质量（P2）

**目标**：本地门禁、环境锁定、技术栈稳定。

#### 6-1. Pre-commit 强化

**文件**：`.husky/pre-commit`

**改动**：
```bash
pnpm exec lint-staged
pnpm ts-check  # 新增
```

#### 6-2. Node 版本锁定

**文件**：新建 `.nvmrc`

```
20
```

**文件**：`package.json` engines 增加 node：
```json
"engines": { "pnpm": ">=9.0.0", "node": ">=20 <21" }
```

#### 6-3. ESLint 规则强化

**文件**：`eslint.config.mjs`（或 `.eslintrc`）

**操作**：
1. 扩展自定义规则检测常量文件、工具函数中的硬编码中文（当前仅检测 JSX 字面量）
2. 逐步清理 2754 个 `no-explicit-any` 警告（分批，不阻塞）

---

### Phase 7：部署与运维（P2）

**目标**：反向代理、日志收集、监控告警。

#### 7-1. Nginx 反向代理

**文件**：新建 `deploy/nginx.conf`

**操作**：
1. HTTPS 终止 + HSTS
2. 静态资源缓存
3. API 限流（nginx 层）
4. 代理到 Node.js 5000 端口

#### 7-2. 结构化日志

**文件**：`src/lib/logger.ts`

**操作**：
1. 生产环境输出 JSON 格式日志（便于收集）
2. 日志级别可配（LOG_LEVEL env）
3. 确保敏感字段自动脱敏

#### 7-3. 健康检查增强

**文件**：`src/app/api/health/route.ts`

**操作**：
1. 已有基础 healthcheck，扩展为含 DB/Redis/Outbox 状态的深度检查
2. `/api/health` 返回浅检查（200），`/api/health/deep` 返回各项状态

#### 7-4. 密钥管理

**文件**：`.env.production.example`

**操作**：
1. 文档标注生产密钥管理方案（Docker Secrets / Vault / 环境变量注入）
2. 移除任何硬编码密钥

---

### Phase 8：文档体系（P2）

**目标**：业务文档、API 文档、运维手册。

#### 8-1. 业务文档

**文件**：`docs/business/` 目录

**操作**：
1. 印刷行业业务流程说明（入库→生产→出库→交付）
2. 领域模型详解（聚合根、实体、值对象关系图）
3. 各模块功能清单

#### 8-2. API 自动生成

**操作**：
1. 评估 Next.js Route Handler 的 OpenAPI 生成方案（如 `next-rest-docs` 或手动 JSDoc → Swagger）
2. 优先为核心模块生成 API 文档

#### 8-3. 运维手册

**文件**：`docs/ops/` 目录

**操作**：
1. 备份恢复流程（已有 `pnpm backup` 脚本）
2. 故障排查指南
3. 常见报错处理

#### 8-4. 问题跟踪

**操作**：
1. 将本方案的所有问题录入 GitHub Issues（或内部跟踪系统）
2. 标注优先级（P0/P1/P2）和负责人

---

## 四、执行顺序与依赖

```
Phase 0 (紧急安全) ──→ Phase 1 (Schema统一) ──→ Phase 2 (安全加固)
                                                        │
                                                        ↓
Phase 3-1 (仓储深拆, 恢复) ──────────────────────────→ Phase 3-2~5 (其他模块)
                                                        │
                                                        ↓
Phase 4 (测试) ←───────────────────────────────────────┘
                                                        │
                                                        ↓
Phase 5 (i18n) ──→ Phase 6 (工程化) ──→ Phase 7 (部署) ──→ Phase 8 (文档)
```

**立即执行**：Phase 0（紧急安全修复）
**第二批**：Phase 1 + Phase 2 + Phase 3-1（并行）
**第三批**：Phase 3-2~5 + Phase 4
**最后**：Phase 5 → 6 → 7 → 8

---

## 五、与后台任务的协调

### 5.1 4 个路由权限转换 agent

| Agent | 范围 | 协调方式 |
|-------|------|---------|
| sales+purchase+orders | 销售采购订单路由 | 完成后检查产出，修复 3 个工程冲突 |
| system+ops | 系统运维路由 | 同上 |
| org+reports+misc | 组织报表杂项 | 同上 |
| production+dcprint+prepress | 生产印前路由 | 同上 |

**冲突修复**（Phase 0-4）：
1. **double-logging**：withPermission 内部已 logOperation，外层路由又调 → 删除外层 logOperation
2. **error-message regression**：withPermission 丢弃 error.message → 修改 `api-permissions.ts` 保留 `error.message`
3. **context.params 丢失**：withPermission 不转发 context → 修改签名支持 context 透传

### 5.2 Dev server（后台运行）

保留运行，Phase 0-3 修改后通过 dev server 验证。

---

## 六、验证检查点

| Phase | 验证命令/方法 | 预期结果 |
|-------|-------------|---------|
| 0 | `curl /api/init/full-seed`（生产模式） | 404 |
| 0 | 并发 refresh token 测试 | 无重复签发 |
| 1 | `pnpm migrate:status` | 所有迁移已执行 |
| 1 | `pnpm setup:db`（新空库） | 80 表全部创建 |
| 2 | Redis 限流测试 | 多实例生效 |
| 3 | `pnpm ts-check` | 0 错误 |
| 3 | `pnpm build` | 构建成功 |
| 4 | `pnpm test:coverage` | 覆盖率 ≥ 基线 |
| 4 | `pnpm test`（E2E） | 全绿 |
| 5 | API 返回多语言错误消息 | 按 Accept-Language 切换 |
| 7 | `docker compose -f docker-compose.prod.yml up` | 健康 |
