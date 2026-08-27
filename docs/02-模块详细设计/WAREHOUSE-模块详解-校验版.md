# 仓库管理（Warehouse）模块详解（代码校验版）

> **校验说明**：本文基于 `D:\dcprint\erp-project` 实际代码（2026-08-25 核查）逐条修订。
> 原稿中已核对正确的部分予以保留；**错误/过时部分用 `⚠️ 修正` 标注并给出真实情况**。
> 末附《校验结论清单》逐条列出每项声明的真伪。

---

## 1. 模块定位
仓储模块是典型的业务中枢，处理从采购入库、生产领料、销售出库到库存调拨的完整物流链路。采用 DDD 分层架构，分离了领域逻辑（`src/domain/warehouse/aggregates` + `entities`）、应用服务（`src/application/services`）、基础设施（`src/infrastructure`，含事件总线与 mysql2 访问层）与表现层（`src/app/[locale]/warehouse` + `src/app/api/warehouse`）。

```
销售/采购单 → 入库 → 库存 → 出库 → 财务凭证
      ↑         ↓      ↓      ↓        ↓
   生产工单 ← 领料 ← 盘点 ← 调拨 ← 质检结果
```

---

## 2. 核心数据模型（⚠️ 修正：原稿"8 张 inv_*（Drizzle 管理）+ 5 张遗留表（原生 SQL）"有误）

### ⚠️ 关键修正（2026-08-25 三次实测校正，以 live `information_schema` 为准）
- 仓库域 **运行时仍主要通过原生 SQL（`mysql2`）访问**，但 Drizzle **已实质覆盖核心表**：
  - **10 张手写于 `warehouse.ts`**：`inv_material`、`inv_inventory_batch`、`inv_inbound_order`(导出名`invInboundOrders`)、`inv_inbound_item`(`invInboundItems`)、`inv_warehouse`、`inv_inventory`、`inv_outbound_order`(`invOutboundOrders`)、`inv_outbound_item`(`invOutboundItems`)、`inv_transfer_order`(`invTransferOrders`)、`inv_stocktaking`（外加 2 张 `split_order`/`split_order_detail`）。
  - **28 张由 Phase 0 生成于 `_gen_warehouse_missing.ts`**（列已与 live 逐列对齐 `missing=0/extra=0`，含 14 个内部 FK）。
  - **合计 38 张核心 `inv_*` 表已全部建模**（详见 `DRIZZLE-SCHEMA-补全计划-WAREHOUSE.md` §0/§4）。
- 数量澄清：live 共有 **82 张 `inv_*` 表**，但其中约 **44 张是 `_bak*` 备份表**（08-16/17 链修复遗留），**已排除不建模**；核心仅 38 张。此前"37 张全部未建模 / 待补 27 张"均基于**陈旧的 `vnerpdacahng_schema.sql`**，**不实**。
- **FK 现状**：全库 live 共 **129 个外键**，其中 **48 个 `inv_*` 内部 / 81 个跨域**（指向 `sys_user`、`pur_purchase_order`、`sal_order` 等非仓库表）。Drizzle 已声明 14 个内部 FK；跨域 FK 因目标表未建模而暂以注释保留，**依赖 `safe-db-push` 护栏防止误 DROP**。
- 原稿"8 张 Drizzle + 5 张遗留"二分法不成立。正确表述：**核心 38 张 `inv_*` 表已全部建模；剩余为跨域外键与备份表，非仓库表缺失问题**。补全方案见 `DRIZZLE-SCHEMA-补全计划-WAREHOUSE.md`。

### 实际 `inv_*` 表清单（live 共 82 张，节选核心表；约 44 张为 `_bak*` 备份表已排除）
| 表名 | 功能 | 关键字段 | 访问方式 |
|---|---|---|---|
| inv_warehouse | 仓库主数据 | warehouse_code、warehouse_name、warehouse_type(raw/finished/semi/scrap)、status、manager_id | 原生 SQL |
| inv_inbound_order | 入库单 | order_no、warehouse_id、supplier_id、po_id、status、qc_status、currency、exchange_rate | 原生 SQL |
| inv_inbound_item | 入库明细 | material_id、batch_no、quantity、unit_price | 原生 SQL |
| inv_inventory | 库存台账 | material_id、warehouse_id、quantity、locked_qty、version | 原生 SQL |
| inv_outbound_order | 出库单 | order_no、warehouse_id、status | 原生 SQL |
| inv_transfer_order | 调拨单 | transfer_no、from_warehouse_id、to_warehouse_id、status | 原生 SQL |
| inv_stocktaking | 盘点单 | stocktaking_no、warehouse_id、status | 原生 SQL |
| inv_inventory_batch | 批次表 | batch_no、available_qty、locked_qty、inbound_date、expire_date | 原生 SQL |
| inv_inventory_transaction / inv_inventory_log | 库存流水/日志 | trans_type、quantity、before_qty、after_qty | 原生 SQL |
| inv_cutting_record / inv_cutting_detail | 切料记录 | — | 原生 SQL |
| inv_material / inv_material_category / inv_material_inventory | 物料主数据/库存 | — | 原生 SQL |
| inv_production_inbound(+_item) / inv_sales_outbound(+_item) | 生产入库/销售出库 | — | 原生 SQL |
| inv_stock_adjust(+_item) | 库存调整 | — | 原生 SQL |
| inv_unit_conversion / inv_location / inv_fifo_override_log / inv_scan_log / inv_trace_record(+_detail) / inv_warehouse_log … | 单位换算/库位/FIFO 覆盖/扫码/追溯/仓库日志 | — | 原生 SQL |

> 完整 37 张：`inv_auxiliary_inventory, inv_cutting_detail, inv_cutting_record, inv_fifo_override_log, inv_inbound_item, inv_inbound_label, inv_inbound_order, inv_inventory, inv_inventory_batch, inv_inventory_log, inv_inventory_transaction, inv_inventory_transaction_log, inv_location, inv_material, inv_material_category, inv_material_inventory, inv_material_label, inv_material_std, inv_outbound_item, inv_outbound_order, inv_product_inventory, inv_production_inbound, inv_production_inbound_item, inv_sales_outbound, inv_sales_outbound_item, inv_scan_log, inv_stock_adjust, inv_stock_adjust_item, inv_stocktaking, inv_stocktaking_item, inv_trace_detail, inv_trace_record, inv_transfer_item, inv_transfer_order, inv_unit_conversion, inv_warehouse, inv_warehouse_log`。

---

## 3. 核心聚合根与应用服务（✅ 原稿准确）
### 4 大聚合根（`src/domain/warehouse/aggregates/`）
- `InboundOrder`（InboundOrder.ts）
- `OutboundOrder`（OutboundOrder.ts）
- `TransferOrder`（TransferOrder.ts）
- `StocktakingOrder`（StocktakingOrder.ts）

> 另有 `src/domain/warehouse/entities/` 下的行项实体：`InboundItem / OutboundItem / StocktakingItem / TransferItem`。

### 6 个应用服务（`src/application/services/`，全部存在 ✅）
- `InboundApplicationService` — 入库审批、创建、查询
- `OutboundApplicationService` — 出库、FIFO 分配
- `TransferApplicationService` — 调拨管理
- `StocktakingApplicationService` — 盘点、差异处理
- `InventoryValidationService` — 库存验证
- `InventoryCostService` — 成本计算

---

## 4. 关键业务流程

### 4.1 入库规则 📥（✅ 原稿基本准确）
入口：`POST /api/warehouse/inbound`

支持 action 子路由（均真实存在 ✅）：`inbound/cutting`、`inbound/scan`、`inbound/audit`、`inbound/from-po`、`inbound/with-po`、`inbound/labels`。
核心流程与原稿一致：校验物料/仓库 → 事务内写 `inv_inventory_batch`(status='normal') + `inv_inventory_transaction`(trans_type='in') + `inv_inventory_log` → `generateDocumentNo('inbound')` 生成单号 → `logOperation` → 发布领域事件。
切料优化见 §8（触发 `action=cutting`，算法在 `src/lib/cutting-optimizer.ts` ✅）。

### 4.2 出库规则 📤（✅ 原稿准确）
入口：`POST /api/warehouse/outbound`
- FIFO 分配实现位于 **`src/lib/fifo-allocation.ts`**（含 `allocateFIFO` 与 `executeFIFODeductionWithRetry`，最多 3 次指数退避重试，乐观锁 `WHERE id=? AND available_qty>=? AND version=?`）✅。
- 金额计算使用 **`decimal.js`**（`import Decimal from 'decimal.js'`，避免浮点误差）✅。
- 两种模式（指定批次 / FIFO 自动）与结果结构（batchDetails / totalCost / warning）与原稿一致 ✅。

### 4.3 调拨规则 🔄（⚠️ 修正：非单步 UPDATE warehouse_id）
入口：`POST /api/warehouse/transfer`，并配套两个子步骤路由：
- `POST /api/warehouse/transfer/[id]/outbound`（先源仓出库）
- `POST /api/warehouse/transfer/[id]/inbound`（后目标仓入库，校验"需先完成出库"）

⚠️ 实际并非原稿所述"仅 UPDATE warehouse_id、warehouse_name 一步改归属"。它是**先出库、后入库的两阶段流程**（`[id]/outbound` 扣减源仓、`[id]/inbound` 入目标仓）。
- ⚠️ **INV-002（无"在途"中间态）仍为已知简化限制** ✅ 原稿判定正确：当前模型没有显式 `in_transit` 状态，跨仓移动通过 out→in 两步隐含表达。复杂多仓场景可增强。

### 4.4 盘点规则 📊（✅ 流程存在，freeze 字段未逐项核实）
入口：`POST /api/warehouse/stocktaking`，配套 `stocktaking/[id]/scan`、`stocktaking/[id]/split-summary`、`stocktaking/diff-process`。
> 注：原稿所述 `freeze=1` 仓库冻结机制在本次核查中未在 stocktaking 路由/服务内直接命中 `freeze=1` 字面量，可能实现于仓库表字段或 inventory 冻结接口（`/api/warehouse/freeze` 真实存在）。逻辑（创建→扫码→差异→调整→完成解冻）与路由结构吻合，视为基本准确，freeze 落库位置待进一步确认。

---

## 5. 库存预警与安全机制 ⚠️（接口路径需修正）
预警分级逻辑与原稿一致，但入口路径修正：
- 库存列表/预警：`GET /api/warehouse/inventory`（✅ 存在）
- 预警专用：`GET /api/warehouse/inventory/warning`（✅ 存在，原稿未列出）
- 补货建议：`checkShortageAndWarn` 相关逻辑存在于库存服务/预警路由中。

并发控制（乐观锁 version + 重试、事件同步 `InventorySyncHandler`、回滚 `InventoryRollbackHandler`）✅ 与原稿一致。

---

## 6. 单据作废机制 ❌（⚠️ 修正：INV-001 已修复）
实现：`src/lib/soft-delete.ts`（✅ 存在）。
- 经查 `soft-delete.ts` 第 84–85 行：`inbound_order: { tableName: 'inv_inbound_order' }` —— **表名映射已正确，无 `warehouse_inbound` 陈旧映射**。
- 原稿 INV-001「soft-delete.ts 表名映射过时（warehouse_inbound vs inv_inbound_order）🔴 待修复」**不成立，该问题已修复**。
- 作废流程（查询→状态/业务约束检查→`status='cancelled'` 软删 + `document_cancel_log` 快照→发布 `DocumentCancelledEvent`）、可作废单据清单，与原稿一致 ✅。

---

## 7. 二维码追溯 🔗（✅ 原稿准确）
- `src/lib/qrcode-service.ts`（✅ 存在）
- `QrCodeGenerationHandler`（`src/application/handlers/QrCodeGenerationHandler.ts` ✅ 存在，另有 `InboundQrInvalidationHandler`）
- 扫码接口：`/api/dcprint/scan`（✅ 存在，`src/app/api/dcprint/scan/route.ts`）

---

## 8. 切料优化 ✂️（✅ 原稿准确）
- 算法：`src/lib/cutting-optimizer.ts`（✅ 存在）
- 落库表：`inv_cutting_record` + `inv_cutting_detail`（✅ 真实存在）
- 触发：`POST /api/warehouse/inbound?action=cutting`（`/api/warehouse/inbound/cutting/route.ts` ✅ 存在）

---

## 9. 多币种支持 💱（✅ 原稿准确）
- `inv_inbound_order` 确含 `currency`(varchar(10) DEFAULT 'CNY') 与 `exchange_rate`(decimal) 列（schema SQL 第 3385–3386 行附近）✅。
- 出库单 `inv_outbound_order` 同样含 `currency`/`exchange_rate`（第 2789–2790 行）✅。
- 汇率来源：系统本位币配置 + `currencyService.getLatestRate()`（实现细节以代码为准）。

---

## 10. 页面与 API 路由 🗂️（⚠️ 修正：原稿页面/路由列表与实际不符）

### 前端页面（`src/app/[locale]/warehouse/`，实际存在 ✅）
```
warehouse/
  ├── page.tsx                    # 批次库存查询（综合面板）
  ├── inbound/page.tsx            # 入库单管理
  ├── inbound-simple/page.tsx     # 简化入库（快速录入）
  ├── outbound/page.tsx           # 出库单管理
  ├── inventory/page.tsx          # 库存详情与批量操作
  ├── transfer/page.tsx           # 调拨管理
  ├── stocktaking/page.tsx        # 盘点管理
  ├── setup/page.tsx              # 仓库主数据配置
  ├── split-order/page.tsx        # ⚠️ 分切单管理（原稿误写为 cutting/page.tsx）
  ├── stock-adjust/page.tsx       # 库存调整（原稿缺失）
  ├── cost/page.tsx               # 库存成本（原稿缺失）
  ├── production-inbound/page.tsx # 生产入库（原稿缺失）
  ├── sales-outbound/page.tsx     # 销售出库（原稿缺失）
  ├── trace/page.tsx              # ⚠️ 批次追溯（原稿误写为 batch-trace/page.tsx）
  ├── batch/page.tsx              # 批次管理（原稿缺失）
  ├── error.tsx / loading.tsx      # 错误/加载边界（原稿缺失）
```

### 后端 API（`src/app/api/warehouse/`，实际存在 ✅，原稿严重不全）
```
/api/warehouse/
  ├── route.ts                        # 仓库列表 / 创建
  ├── inbound/*                       # CRUD、audit、cutting、from-po、scan、with-po、labels
  ├── outbound/*                      # route、confirm、fifo
  ├── inventory/*                     # route、adjust、export、logs、warning
  ├── transfer/*                      # route、[id]/outbound、[id]/items、[id]/inbound
  ├── stocktaking/*                   # route、[id]/items、[id]/scan、[id]/split-summary、diff-process
  ├── batch/*                         # route、trace
  ├── freeze                          # 库存冻结/解冻
  ├── alert-push                      # 预警推送（原稿缺失）
  ├── batch-inventory                 # 批次库存（原稿缺失）
  ├── categories                      # 仓库分类（原稿缺失）
  ├── cost                            # 库存成本（原稿缺失）
  ├── fifo-config / fifo-recommend    # FIFO 配置/推荐（原稿缺失）
  ├── ink-mixing / ink-opening        # 油墨相关（原稿缺失）
  ├── monthly-report                  # 月度报表（原稿缺失）
  ├── production-inbound / sales-outbound  # 生产入库/销售出库（原稿缺失）
  ├── split-order                     # 分切单（原稿缺失，对应 split-order/page.tsx）
  ├── stock-adjust                    # 库存调整（原稿缺失）
  └── unit-conversion                 # 单位换算（原稿缺失）
```
> 原稿仅列出约 9 个路由，实际有 40+ 个 `route.ts`。上述为核查到的真实集合（节选）。

---

## 11. 仓储管理最佳实践（✅ 与原稿一致）
A. 并发安全：乐观锁(version+重试)、行级锁(FOR UPDATE)、事件驱动最终一致 ✅
B. 数据完整性：软删除、取消快照(snapshot_data)、原子事务 ✅
C. 业务约束：FIFO 推荐+过期预警、可选允许过期、缺货/低库存预警 ✅
D. 成本管理：单位成本追踪、加权平均/FIFO 行成本、decimal.js 精度 ✅

---

## 12. 常见业务场景（✅ 与原稿一致）
场景 1 采购收货 / 场景 2 销售发货 / 场景 3 跨仓调拨（两阶段 out→in）/ 场景 4 月末盘点 —— 流程与原稿一致（调拨细节按 §4.3 修正理解）。

---

## 13. 技术栈与依赖（⚠️ 修正 Drizzle 覆盖范围）
| 层级 | 技术 | 说明 |
|---|---|---|
| ORM | Drizzle ORM `^0.45.1` | 管理**非仓库域**约 112 张表（系统/财务/采购/销售/生产等）；**仓库 `inv_*` 表不在 Drizzle 内** |
| 并发 | mysql2 `^3.20` + 乐观锁 | 连接池 + `version` 字段；仓库表走 `@/lib/db` 的 `query`/`execute` 原生 SQL |
| 事件 | Redis Streams + Outbox | `AppInitializer` 中：Redis 可用则 `StreamConsumer`(XREADGROUP) 消费；否则 `OutboxPoller` 降级为直接 publish ✅ |
| 金额 | decimal.js `^10.6` | FIFO/成本精确算术 ✅ |
| 业务 | `src/lib/fifo-allocation.ts` | FIFO 分配 & 重试（`allocateFIFO`/`executeFIFODeductionWithRetry`）✅ |
| 审计 | `AuditLogHandler` / `soft-delete.ts` | 操作日志 / 作废快照 ✅ |
| 二维码 | `qrcode-service.ts` | 生成与追溯 ✅ |

---

## 14. 已知问题与优化空间（⚠️ 修正状态）
| 问题代码 | 原稿说明 | 校验状态 |
|---|---|---|
| INV-001 | soft-delete.ts 表名映射过时（warehouse_inbound vs inv_inbound_order） | ❌ **已修复，无需处理**：`soft-delete.ts` 第 84–85 行已是 `inbound_order → 'inv_inbound_order'`，无陈旧映射。原稿"🔴 待修复"不成立 |
| INV-002 | 调拨没有"在途"中间态 | ✅ **仍准确**：两阶段 out→in，无显式 in_transit 状态，可增强 |
| DATA-001 | vnerpdacahng_schema.sql 与 schema.ts 表名不一致 | ⚠️ **已实质处理（2026-08-25 第三轮实测）**：真实缺口是「`inv_*` 核心 38 张表中，10 张手写 + 28 张 Phase 0 生成于 `_gen_warehouse_missing.ts`，均已建模并与 live 列对齐、tsc 0 错误」。**跨域 81 个 FK + 44 张 `_bak*` 备份表**仍超出本域范围（见计划文档 §0/§8）。🚨 **高危仍未消除**：`package.json` 中 `db:push`/`db:generate`/`db:migrate` 仍是真实命令（drizzle.config.ts 注释"已废弃"已过时），若误跑 `drizzle-kit push` 仍可能按残缺 schema DROP 真实跨域外键——**在 `safe-db-push` 护栏（计划 §3/§4）落地前严禁 `db:push`**。详细方案见 `DRIZZLE-SCHEMA-补全计划-WAREHOUSE.md` |

---

## 📊 核心指标与监控（✅ 与原稿一致）
关键 KPI：库存周转率、缺货率、盘点差异率、批次过期率。监控 SQL 示例（低库存、临期批次、缓慢移动物料）与原稿一致，可直接使用。

---

# 校验结论清单（逐条）
| # | 原稿声明 | 核查结果 |
|---|---|---|
| 1 | 8 inv_* 表由 Drizzle 管理 | ❌ 错：live 共 82 张 `inv_*`（44 张 `_bak*` 备份表已排除），核心 38 张已全部建模（10 手写 + 28 生成），非"全原生 SQL" |
| 2 | +5 张遗留表（原生 SQL） | ⚠️ 二分法不成立，已重述 |
| 3 | 4 大聚合根 InboundOrder/OutboundOrder/TransferOrder/StocktakingOrder | ✅ 准确（`src/domain/warehouse/aggregates/`） |
| 4 | 6 个应用服务 | ✅ 准确（全部存在） |
| 5 | 入库 action：cutting/scan/audit/from-po/with-po | ✅ 准确（对应子路由存在） |
| 6 | 出库 FIFO：`allocateFIFO`/`executeFIFODeductionWithRetry`、decimal.js | ✅ 准确（`fifo-allocation.ts` + `decimal.js`） |
| 7 | 调拨：仅 UPDATE warehouse_id | ❌ 错：两阶段 out→in（`[id]/outbound`+`[id]/inbound`） |
| 8 | 盘点 freeze=1 | ⚠️ 流程存在，freeze 落库位置未逐项确认 |
| 9 | 作废 soft-delete.ts 表名陈旧（INV-001） | ❌ 已修复，原稿判定过时 |
| 10 | 二维码：qrcode-service / QrCodeGenerationHandler / /api/dcprint/scan | ✅ 准确 |
| 11 | 切料：cutting-optimizer.ts + inv_cutting_record/detail | ✅ 准确 |
| 12 | 多币种：inv_inbound_order.currency/exchange_rate | ✅ 准确（列真实存在） |
| 13 | 页面列表（含 cutting、batch-trace） | ❌ 错：实际为 split-order、trace、batch 等；原稿列名/遗漏多项 |
| 14 | API 路由列表 | ❌ 不全：实际 40+ 路由，原稿仅约 9 个 |
| 15 | 技术栈：Drizzle/decimal.js/Redis Streams+Outbox/qrcode | ✅ 准确（仅 Drizzle 覆盖范围需修正） |
| 16 | DATA-001 表名不一致 | ⚠️ 重新定性为"Drizzle 覆盖面缺口" |

**最需要关注的风险（DATA-001）**：仓库 38 张核心 `inv_*` 表现已全部建模（10 手写 + 28 生成），但 **Drizzle 仅建模全库 140/327 张表**，`db:push` 永远会 DROP 其余约 187 张 live 表。🚨 **`db:push` 已改造为安全护栏 `scripts/safe-db-push.cjs`**（命中任何 DROP 风险即硬拦截，实测捕获 64 类风险并 abort），专家绕行用 `db:push-raw`；**结构变更一律走增量迁移 `pnpm migrate`**（不再直接 push）。详见 `DRIZZLE-SCHEMA-补全计划-WAREHOUSE.md` §3。
