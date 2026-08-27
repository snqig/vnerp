# vnerp 项目全局蓝图与任务清单（OPC-Agent 中央协调文件）

> 维护角色：OPC-Agent 抵「产品 & 文档工程师」+「CEO 总调度」双视角
> 最后更新：2026-08-16 ｜ 配套：`.trae/specs/*` 为各 spec 局部任务；本文件为跨 spec 的全局唯一真相源
> 铁律提醒：①任何表结构 / 架构改动必须先出方案交老板确认再写码；②里程碑完成出报告

---

## 0. 如何使用本文件（断点续跑约定）

- 本文件是项目的**单一协调真相源**：全局蓝图 + 里程碑 + 任务 DAG + 待决策项。
- 任务状态图例：`✅ 已完成` ｜ `🟡 进行中` ｜ `⚪ 未启动` ｜ `⚠️ 有风险/待决策` ｜ `🔴 阻断`
- 每个任务带 `依赖` 与 `负责角色`（对应 OPC 七岗）；`⚠️/🔴` 任务会汇总到第 5 节上交老板。
- 详细实施方案不在此展开，引用专项计划：
  - 库存账实对齐 → `docs/inventory-reconcile-fix-plan.md`
  - 仓储体系升级七阶段 → `docs/warehouse-upgrade-execution-plan.md`
  - OPC 运行规范 → `docs/opc-agent-system-prompt.md`

---

## 1. 项目概况

- **定位**：`vnerp` —— 面向印刷（网印 / 丝印）企业的全链路 ERP。
- **技术栈**：Next.js（App Router）+ TypeScript + Drizzle ORM + MySQL 8.0；Docker Compose；DDD 分层（`domain / application / api / page`）。
- **规模**：真实库 `vnerpdacahng` 约 **229 表 / 16 业务模块前缀**；Drizzle 仅建模约 112 表（缺口见 2.4）。
- **运行约束**：迁移走裸 SQL（`scripts/migrate.ts` 执行 `database/migrations/*.sql` + 记 `sys_migration`），**严禁 `drizzle-kit push/generate`**（会 DROP 真实库 129 个 Drizzle 不知情的外键）。
- **测试基线（2026-08-16 体检实测 + 回归修复后）**：主验证门 `npx tsc --noEmit` = **0 错误（干净）**；`npx vitest run` = **1572 通过 / 19 失败 / 共 1591 用例 / 92 文件**（修复前 1568/23）。
  - 台账回归已修复：原疑 5 个 ledger 接线回归（e2e 4 个 + inbound-api 1 个）→ 实际仅 e2e 4 个为 ledger 引入（inbound-api 500 其 `InboundApplicationService` 整体 mock、不跑真实 handler SQL，属预存无关）；现 e2e 9/9 全绿，全量失败 23→19，**未引入任何新失败**。
  - 剩 19 个失败 = 18 既有（material-requisition mock 泄漏 4、qr-trace 缺 `qrcode_scan_log` 表 3、inventory-sync 9、workorder-api 2、cross-module 1）+ 1 inbound-api 预存 500，均与 ledger 改动无关。

---

## 2. 全局蓝图

### 2.1 架构分层与数据流

```
page (Next App Router)
  └─ api (withPermission / withAuthAndErrorHandler, authFetch+CSRF)
       └─ application (服务 / 事件 Handler)
            └─ domain (实体 / 事件 / 规约)
       └─ infrastructure/event-bus: DomainEventOutbox → OutboxPoller(5s) → EventBus → Handler
  lib: inventory-ledger(统一台账) / fifo-allocation / category-validation / db / db/errors
```

- 跨模块联动优先走**事件总线**（outbox 幂等、5s 轮询），避免同步 RPC。
- 库存写操作应**单一入口收口**；`inv_inventory_batch`(批次明细) 为权威源，`inv_inventory`(汇总) 由批次派生重算，禁止双写漂移。

### 2.2 模块地图（13 业务域 → 实际状态）

| # | 业务域 | 关键表 / 模块 | 现状 |
|---|--------|--------------|------|
| 1 | 主数据 MDM | `inv_material`/`mdm_material`、`customer`、`supplier`、`inv_warehouse`、分类校验(`sys_calc_param` #27-#31) | ✅ 基本可用；分类校验灰度(074 迁移已落地 8/13) |
| 2 | 采购 Purchase | `pur_purchase_order`、采购收货→`inbound.approved` | 🟡 运行；`PurchaseReceivedHandler` 未注册(死代码)待清 |
| 3 | 仓储库存 WH&Inv | `inbound`/`outbound`/`sales-outbound`、`inv_inventory_batch`、`inv_inventory`、`inv_inventory_transaction`、split/transfer/stocktaking/return | 🟡 **P1 ledger 归一化已完成(本会话)**；P2 去重/回填⚠️待决策 |
| 4 | 工装/印前 Tooling | `prd_screen_plate`/`prd_die`/`prd_ink`/`base_ink`/`ink_mixed_batch`/`dcprint_tool` | 🟡 基础表有；`ScreenPlateCostHandler` 成本归集存在；印前整合(七阶段P7)⚪ |
| 5 | 生产 Production | `prd_work_order`(遗留)/`prod_work_order`(权威)、领料/报工/完工/生产入库、委外 `outsource issue|receive` | 🟡 运行但多重地雷⚠️(双订阅/双写，见 2.4) |
| 6 | 销售 Sales | `sal_order`/`sales_order`(双表)、`delivery`/`shipment`、`fin_receivable` | 🟡 发货 handler 已归一化；`sales-outbound`⚠️财务列待决策；双表命名待统一 |
| 7 | 设备 Equipment | 设备档案/保养/维修/校准/点检 | ✅ 可用；保养保存 bug 已修(8/12) |
| 8 | 质量 QC | report 页面、质检记录 | ✅ 基本；软删覆盖 |
| 9 | 财务 Finance | `fin_voucher`、`fin_receivable`、`InventoryCostService`/`ToolCostHandler`/`ScreenPlateCostHandler` | 🟡 凭证自动生成；成本 handler 写 NULL material_id 流水⚠️待清理(P3) |
| 10 | 二维码/标签 QR | `qrcode_record`、`QRCodeScanner`、`/api/dcprint/scan`、CSS 标签模板 | 🟡 基础有；全闭环(七阶段P4)⚪ |
| 11 | Pad 端作业 | 车间响应式页面(盘点/领料/报工) | ⚪ 未启动(七阶段P5) |
| 12 | 系统设置 System | `sys_calc_param`、分类校验、权限(`withPermission`)、审批流、导入导出(5格式/31页) | ✅ 基本；安全治理 P2 已完成 |
| 13 | ModernWMS 集成 | 外部仓储 | ⚪ 未启动(七阶段P6，需定接口契约) |

### 2.3 既有约束（铁律级，改动前必读）

| 约束 | 说明 |
|------|------|
| 迁移走裸 SQL，不用 drizzle-kit | 真实库 129 FK 裸 SQL 建立，Drizzle 不知情 → `push` 会全 DROP |
| 软删 `deleted TINYINT DEFAULT 0` | 复合唯一键须含 `deleted` 列 |
| 唯一冲突统一转译 | `src/lib/db/errors.ts` 的 `isUniqueViolation` 已把 1062→409，业务层不各自处理 |
| 四件套 + `version` 乐观锁 | 高并发写用 `transactionWithRetry` |
| 事件总线优先 | 跨模块联动走 Outbox→EventBus，不写同步 RPC |
| 库存权威源=批次 | `inv_inventory` 由 `inv_inventory_batch` 派生，禁双写 |

### 2.4 已知技术债 / 风险（架构师审计）

- 🔴 **Drizzle 与真实库脱节**：229 表 / 129 FK，Drizzle 仅建模 ~112 表、0 个 `foreignKey()`/`relations()`。**严禁未补全就跑 `drizzle-kit`**。补齐须一次性建模全部 129 FK 且列/类型精确匹配 live。
- ⚠️ **双表并存 & 命名不一致**：工单 `prd_work_order`(遗留, 当前功能不读写) vs `prod_work_order`(权威，`/api/workorders` 只操作它)；销售 `sal_order` vs `sales_order` 并存；重复 FK 与命名不规范(`fk_inv_outbound_item_order` vs `fk_outbound_item_order`)。
- ⚠️ **库存写路径地雷**（详见 `inventory-reconcile-fix-plan.md` §10）：①静默回滚——只改汇总不改批次的路径(`return_order`/`pick`/`outsource`/`stocktaking`/`sales-ship`)加 recompute 会被覆盖；②重复写——`production-inbound` 路由直写+发 `prod.finish.approved` 触发 `FinishOrderInventoryHandler` 再写；`WorkOrderMaterialIssuedHandler` 双订阅 `workorder.material_issued`+`prod.report.approved`；③`sales-outbound` 流水含 `account_dr/cr/cr` 财务列，统一模块不支持，且 FIFO 只减 `available_qty` 不减 `quantity`。
- ⚠️ **排序规则三套混用**；状态码 `TINYINT/VARCHAR` 并存；主键 `INT/BIGINT` 混用。
- ⚠️ **死代码**：`PurchaseReceivedHandler`(未注册)、`OutboundInventoryHandler`(已取消订阅)。
- ✅ git 本地对象库曾损坏(8/13)已 fresh-clone 修复；凭据文件(`auth.json`/`cj.txt`/`login.json`)已 gitignore。

---

## 3. 里程碑（Milestones）与卡点

> 对齐 `warehouse-upgrade-execution-plan.md` 七阶段 + 库存对账主线。

| 里程碑 | 范围 | 状态 | 卡点 |
|--------|------|------|------|
| **M0 项目资产整理** | OPC 规范 + 全局蓝图 + 本 tasks.md | 🟡 进行中 | 本回合产出 |
| **M1 数据底座** | 唯一约束收尾(七阶段P1) + 库存账实对齐 | 🟡 进行中 | 库存 P2 去重✅/回填✅已实施；T-INV-6/7⚠️待决策 |
| **M2 FIFO + 效期** | 七阶段P2 | ⚪ 未启动 | 批次缺「保质期天数」列；2-2~2-9 TODO |
| **M3 分切 + 母子码** | 七阶段P3 | ⚪ 未启动 | `inv_cutting_record` 已有，需建事务/追溯 |
| **M4 二维码 + 标签** | 七阶段P4 | ⚪ 未启动 | 全环节闭环 |
| **M5 Pad 端作业** | 七阶段P5 | ⚪ 未启动 | — |
| **M6 ModernWMS 整合** | 七阶段P6 | ⚪ 未启动 | 外部接口契约 |
| **M7 印前整合** | 七阶段P7 | ⚪ 未启动 | 网板/刀模/油墨整合 |

**M1 细化**：
- 唯一约束：1-1/1-4/1-5/1-6/1-7/1-8/1-9 已完成(8/13，7 个幂等迁移)；仅剩 **1-2**(扫码出库唯一索引，落点待定：扩 `inv_scan_log` 或新建 `inv_outbound_scan`)、**1-3**(`inv_inventory_transaction` 加 `uk(source_type,source_id,source_line_id)`，实测 0 行 0 重复，可安全建)。
- 库存对账：**P1 ledger 归一化 100% 完成**；**P2 批次回填(T-INV-5)已实施**；**P2 去重(T-INV-3/4)已实施**(2026-08-17：D2 方案A 删路由直写、D3 报工不扣料、D1 删 PickOrder 双注册；D4 完工双 handler 条件性重叠待决)；**P2 剩余待决策**：sales-outbound 财务列(T-INV-6)、stocktaking(T-INV-7)。

---

## 4. 任务清单（Task DAG，按业务域）

> 依赖用 `→` 表示；负责角色见 OPC 七岗。

### 域 1 主数据 / 域 12 系统设置
- [✅] T-MDM-1 物料/客户/供应商/仓库 CRUD 与分类校验体系(#27-#31, 074 迁移) — 后端/文档
- [⚪] T-MDM-2 分类校验策略细化（enforce_on_create/update、require_on_business 灰度收口）— 后端

### 域 2 采购
- [🟡] T-PUR-1 采购收货→入库联动（走 `inbound.approved`）— 后端 ✅运行
- [⚠️] T-PUR-2 清理 `PurchaseReceivedHandler` 未注册死代码 — 后端（依赖老板确认删除范围）

### 域 3 仓储库存（核心，本会话重点）
- [✅] T-INV-1 库存台账统一模块 `inventory-ledger.ts`（append + recompute）— 后端
- [✅] T-INV-2 P1 ledger 归一化：outbound/confirm、outbound/fifo、InventorySyncHandler、MaterialReturn、split-order、inventory/route、InventoryRollbackHandler、02-generate-data — 后端
- [✅] T-INV-3 P2 去重：production-inbound 路由直写 vs FinishOrderInventoryHandler 二选一 — 架构师/后端（**✅2026-08-17 已裁定方案A并实施**：删路由直写，由 FinishOrderInventoryHandler 事件权威 + 写批次(inv_inventory_batch) + recompute；D1 顺手删 PickOrder 双注册）
- [✅] T-INV-4 P2 去重：WorkOrderMaterialIssuedHandler 双订阅合并 — 架构师/后端（**✅2026-08-17 已裁定"报工不扣料"并实施**：取消 prod.report.approved 对 WorkOrderMaterialIssuedHandler 的订阅，材料扣减唯一权威=领料事件 workorder.material_issued）
- [✅] T-INV-5 P2 批次回填：return_order/pick/outsource issue+receive 改走「写 `inv_inventory_batch` + recompute」(2026-08-17 实施，tsc 0 错、ReturnOrder 单测 4/4；FinishOrder 因与 WorkOrderCompletedHandler 双写重叠移出归 T-INV-3；stocktaking 归 T-INV-7；sales-ship 已于 P2 完成)
- [⚠️] T-INV-6 P2 sales-outbound 治理：流水含财务列(account_dr/cr) + FIFO 只减 available_qty — 后端/DBA（**待决策**）
- [⚠️] T-INV-7 P2 stocktaking 双路径治理(route 写 inv_inventory vs diff-process 写遗留 stock 表) — 架构师（**待决策**）
- [⚪] T-INV-8 定时对账 `inv_reconcile_alert`(hot-06) — 后端/DBA
- [⚪] T-INV-9 `inv_inventory_transaction` 唯一索引 uk(source_type,source_id,source_line_id)(§8#4) — DBA
- [✅] T-INV-10 台账接线测试回归修复：`recomputeInventorySummary` 结果处理加固为环境无关（`extractExecuteResult` 兜底 undefined/非元组，生产零影响）+ e2e 测试补齐 recompute 的 `conn.execute` 预设、断言改校验绑定参数。e2e 9/9 全绿；全量失败 23→19（仅剩 18 既有 + 1 inbound-api 预存，均非 ledger 引入）。

### 域 4 工装/印前
- [🟡] T-TL-1 网板/刀模/油墨档案 + 成本归集(ScreenPlateCostHandler) — 后端 ✅基础
- [⚠️] T-TL-2 成本 handler 写 NULL material_id 流水(P3 清理，移出权威流水表) — 后端（待决策是否动）
- [⚪] T-TL-3 印前整合(七阶段P7) — 后端

### 域 5 生产
- [🟡] T-PRD-1 工单双表收敛：确认 `prod_work_order` 权威、`prd_work_order` 遗留不读写 — 架构师（**待确认口径**）
- [✅] T-PRD-2 生产入库双写治理(production-inbound，同 T-INV-3) — 后端（✅2026-08-17 随 T-INV-3 方案A 实施）
- [✅] T-PRD-3 领料双订阅治理(同 T-INV-4) — 后端（✅2026-08-17 随 T-INV-4 报工不扣料 + PickOrder 双注册清理实施）
- [✅] T-PRD-4 委外 issue/receive 路由批次回填完成(2026-08-17，归 T-INV-5) — 后端

### 域 6 销售
- [🟡] T-SAL-1 发货 DeliveryShippedHandler/SalesShippedHandler 归一化(本会话) — 后端 ✅
- [⚠️] T-SAL-2 sales-outbound 财务列/批次 bug(同 T-INV-6) — 后端
- [⚠️] T-SAL-3 销售双表 `sal_order`/`sales_order` 命名统一 — 架构师（**待决策**）

### 域 7 设备 / 域 8 质量
- [✅] T-EQP-1 设备档案/保养/维修/校准 + 保养保存 bug 修复(8/12) — 后端

### 域 9 财务
- [🟡] T-FIN-1 凭证/应收/成本核算运行 — 后端
- [⚠️] T-FIN-2 成本 handler 流水污染清理(同 T-TL-2) — 后端

### 域 10 二维码/标签
- [🟡] T-QR-1 扫码/标签基础存在 — 前端/后端
- [⚪] T-QR-2 标签打印 CSS 模板 + 全闭环(七阶段P4) — 前端

### 域 11 / 13 Pad 端 / ModernWMS
- [⚪] T-PAD-1 Pad 响应式作业页(七阶段P5) — 前端
- [⚪] T-WMS-1 ModernWMS 集成(七阶段P6) — 后端

### 跨域技术债
- [🔴] T-TECH-1 Drizzle 补全 129 FK（一次性，禁 drizzle-kit push）— DBA/后端（**重大，须老板拍板策略**）
- [⚠️] T-TECH-2 双表/命名/FK 重复/排序规则/状态码混用统一 — 架构师（**待决策**）
- [✅] T-TECH-3 git 修复 + 凭据 gitignore — 已完

---

## 5. 待老板决策项（铁律②上交，确认后再动）

1. ~~**库存 P2 去重策略**（T-INV-3 / T-INV-4）：production-inbound 与 WorkOrderMaterialIssuedHandler 的重复写/双订阅。~~ ✅2026-08-17 已裁定并实施——**方案A 事件权威**（删 production-inbound 路由直写，改由 FinishOrderInventoryHandler 单一权威 + 写批次 + recompute）；**报工不扣料**（取消 prod.report.approved 对 WorkOrderMaterialIssuedHandler 订阅，材料扣减唯一权威=领料事件）；顺手删 PickOrder 双注册。D4 完工双 handler（FinishOrderInventoryHandler vs WorkOrderCompletedHandler）条件性重叠仍待决。
2. ~~**「只改汇总不写批次」路径的批次回填方式**（T-INV-5）：✅ 2026-08-17 已裁定并实施——退库建新批/出库扣指定批，统一走批次+recompute；FinishOrder 因与 WorkOrderCompletedHandler 双写重叠移出归 T-INV-3。~~
3. **sales-outbound 财务列**（T-INV-6 / T-SAL-2）：扩展统一台账模块支持 `account_dr/cr`，还是该路径保持原始 INSERT 只补批次 bug？
4. **成本 handler 流水污染**（T-TL-2 / T-FIN-2）：`ToolCost/ScreenPlateCost` 写的 NULL material_id 行是否移出 `inv_inventory_transaction`？
5. **双表/命名统一**（T-PRD-1 / T-SAL-3 / T-TECH-2）：工单、销售双表是否收敛统一？范围与时机？
6. **Drizzle 脱节**（T-TECH-1）：是否启动一次性补全 129 FK？风险高，须明确策略。
7. **台账接线测试回归**（T-INV-10）：✅ 已修复（老板 8/16 拍板"加固 ledger + 补 mock"）。`recomputeInventorySummary` 结果处理加固为环境无关（`extractExecuteResult` 兜底 undefined/非元组，生产零影响）；e2e 测试补齐 recompute 的 `conn.execute` 预设、断言改校验绑定参数。e2e 9/9 绿，全量失败 23→19。`inbound-api` 1 个 500 与该回归无关（其 `InboundApplicationService` 整体 mock，不跑真实 handler SQL），属预存问题，不在本次范围。

---

## 6. 参考文档

- `docs/opc-agent-system-prompt.md` — OPC-Agent 运行规范（角色/铁律/协议）
- `docs/inventory-reconcile-fix-plan.md` — 库存账实对齐方案(hot-01~07)与 P1/P2 审计
- `docs/warehouse-upgrade-execution-plan.md` — 仓储体系升级七阶段全量计划
- `.workbuddy/memory/2026-08-16.md` — 当日工作日志（含库存 P1 接线、OPC 规范产出细节）
