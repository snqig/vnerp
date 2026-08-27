# 全库 Drizzle 覆盖率专项

> 建立日期：2026-08-26 ｜ 状态：基线已建立，等待执行策略确认
> 关联提交：`2b2b309d`（safe-db-push 护栏 + 配置注释校正，已推 origin/main）
> 发现脚本：`scripts/_audit/coverage_discovery.cjs`（只读，可复跑）
> 基线数据：`scripts/_audit/coverage_discovery.json`

## 1. 背景与目标

`db:push` 已被 `scripts/safe-db-push.cjs` 包裹：任何会 **DROP 未建模表/列/外键** 的操作都会直接 `ABORT(exit 1)`。
护栏只是"止血"——根本问题是 **Drizzle schema 未覆盖全库**，导致 `db:push`（以及残缺 schema 上的 `db:generate`）始终存在把真实结构改写/误删的高危。

本专项目标：**让 db:push 未来"可能安全"**——要么把 Drizzle 覆盖到所有真实核心表，要么清掉所有无关残留表，使覆盖率分母收敛到"只含业务表"。

## 2. 基线（2026-08-26 只读发现）

| 指标 | 值 |
|------|-----|
| 真实库总表 | 327 |
| Drizzle 已建模 | 133 |
| **整体覆盖率** | **41%** |
| 残留备份表（_bak* / _ghost_backup_*） | 88 |
| **未建模核心表（真正缺口）** | **106** |

### 域覆盖率矩阵（按 total 降序，备份表已剔除出核心缺口）

| 域 | total | modeled | 覆盖率 | 未建模核心 | 备份表 |
|----|------:|--------:|------:|----------:|------:|
| inv | 82 | 38 | 46% | 0 | 44 |
| prd | 37 | 24 | 65% | 4 | 9 |
| sys | 28 | 14 | 50% | 13 | 1 |
| sal | 27 | 9 | 33% | 11 | 7 |
| pur | 25 | 6 | 24% | 9 | 10 |
| hr | 24 | 13 | 54% | 6 | 5 |
| fin | 14 | 2 | 14% | 9 | 3 |
| qc | 8 | 0 | 0% | 5 | 3 |
| eqp | 6 | 0 | 0% | 6 | 0 |
| crm | 5 | 0 | 0% | 5 | 0 |
| ink | 5 | 0 | 0% | 5 | 0 |
| material | 5 | 0 | 0% | 5 | 0 |
| outsource | 5 | 0 | 0% | 5 | 0 |
| …其余 19 个域 | 1–3 | 0–2 | 0–100% | 1–3 | 0–2 |

- `dcprint / org / qrcode / split / label / saga` 已 100% 覆盖。
- `qc / eqp / crm / ink / material / outsource / qms / eng / eq / plm / bom / srm / base / biz / domain / mdm / qr / work` 覆盖率 0%，多为未接入 Drizzle 的独立小模块。
- 88 张备份表命名规律：`_bak_20260816_gen` / `_bak_20260817` / `_bak_chain_20260817` / `_bak_pur_20260817` / `_bak_inv_20260817b` / `_ghost_backup_inv_*`，均为 2026-08 多次"重建采购链路 / 库存回填 / 分切重建"产生的临时快照，业务代码不再读写。完整清单见 `coverage_discovery.json.backupTables`。

## 3. 两条路径

### 路径 A：建模补齐（增覆盖，安全，可逆）
- 复用已验证流程：**live `information_schema` → 生成 `_gen_<domain>.ts` → `schema.ts` 重导出 → `npx tsc --noEmit` 校验**。
- 每张表处理：列对齐、索引（唯一键/普通索引）、内部 FK；**跨域 FK 暂缓声明**（避免前向引用 TDZ 与 `fk_` 命名冲突，与仓库域做法一致）。
- 优先顺序（业务价值 + FK 依赖度）：`sys`（系统参数/基础数据）→ `pur`（采购）→ `sal`（销售）→ `fin`（财务）→ 其余小域。
- 工作量：约 **106 张核心表** + 后续跨域 FK 校准（约 81 条跨域 FK 待补，见历史记忆）。

### 路径 B：清理残留备份表（减真实表数，破坏性）
- 88 张 `_bak*` / `_ghost_backup_*` 表清理后，真实表数 327 → 239，且这些表永不进入 Drizzle，覆盖率分母显著缩小。
- **执行前置条件（缺一不可）**：
  1. 全库 `mysqldump` 物理备份；
  2. 确认这些表无外键被任何核心表引用（FK 反向检查）；
  3. 逐域 `DROP` 或 `RENAME` 到独立归档库。
- ⚠️ **破坏性操作，必须用户显式确认并先完成备份**，不可自动执行。

## 4. 推荐执行顺序

1. **路径 B 安全预检（只读，无破坏）**：列出 88 张备份表的行数 + 是否被核心表 FK 引用，产出风险评级清单。→ 见任务 T1。
2. 用户确认后 **执行路径 B 清理**（带备份）。→ 见任务 T2。
3. 并行/随后 **推进路径 A 按域建模**，从 `sys` 起步。→ 见任务 T3–T6。
4. 跨域 FK 校准。→ 见任务 T7。
5. 覆盖率复测 + 评估"能否解除 db:push 护栏"。→ 见任务 T8。

## 5. 风险与护栏约束

- `scripts/safe-db-push.cjs` **保持常驻**，任何路径下都不可移除，直到确认无 DROP 风险。
- `db:push-raw`（裸 `drizzle-kit push`）仅在专项显式声明"已全量覆盖 / 无 DROP 风险"时方可使用。
- 路径 A 生成的 `_gen_*.ts` 属脚手架代码，命名/类型与 live 对齐前不得用于 `db:generate`，否则仍可能产出 DROP 语句。

## 6. 任务清单（见项目 TaskList）

- T1 路径B 安全预检（88 张备份表引用关系 + 行数，产出清理清单）
- T2 路径B 清理执行（备份后 DROP / 归档，需用户确认）
- T3 路径A 建模 sys_ 域（13 张未建模核心）
- T4 路径A 建模 pur_ 域（9 张）
- T5 路径A 建模 sal_ 域（11 张）
- T6 路径A 建模 fin_ + 其余小域（约 73 张）
- T7 跨域 FK 校准（约 81 条）
- T8 覆盖率复测 + 护栏解除评估

## 7. T1 预检结果（2026-08-26，结论：100% 可安全清理）

只读核查脚本：`scripts/_audit/backup_precheck.cjs` ｜ 证据：`scripts/_audit/backup_precheck.json`

**三重核查全部通过：**

| 核查项 | 方法 | 结果 |
|--------|------|------|
| DB 反向外键 | `KEY_COLUMN_USAGE` 查 REFERENCED_TABLE_NAME=备份表 | **0 张**被核心表引用（88 张全 SAFE，CAUTION=0 / LOW=0） |
| 应用代码引用 | `src/` Grep `_ghost_backup`/`_bak_2026`/`_bak_chain`/`_bak_pur`/`_bak_inv`/`_bak_gen` | **0 命中** |
| 触发器写入 | `information_schema.TRIGGERS` 全库扫描 | **0 个**触发器（任何表都不会被触发写入） |
| 数据量 | `TABLE_ROWS` 聚合 | 88 张合计 **~1595 行**，最大 127 行，30 张为空 —— 纯小快照 |

**按域分布（共 88 张）：** inv 44 · pur 10 · prd 9 · sal 7 · hr 5 · fin 3 · qc 3 · prod 3 · sys 1 · eng 1 · `_ghost_backup_` 2

**结论：** 88 张备份表是 2026-08 多次"重建采购链路 / 库存回填 / 分切重建"操作产生的临时快照，**完全孤立**（无 FK、无代码、无触发器、几乎无数据）。DROP / 归档不会破坏任何业务结构或数据，路径 B 可在「**全库 mysqldump 物理备份 + 用户显式确认**」后执行。

**T2 推荐做法（可逆优先）：** 先做全库 `mysqldump` 备份，再将 88 张 `RENAME` 到独立归档库（如 `vnerp_archive`），从活动库移除但随时可恢复；若确认无碍再考虑硬 `DROP`。

## 8. T2 清理执行结果（2026-08-26，✅ 完成）

- **物理备份**：`D:/dcprint/db_backups/vnerpdacahng_20260826_0853_before_bak_cleanup.sql`（3.8MB，全库 `mysqldump`，置于仓库外目录，**不入库**）。
- **执行**：`CREATE DATABASE vnerp_archive` + 单条 `RENAME TABLE` 原子移动 88 张备份表（任一失败全回滚，未动任何源表）。
- **校验**：归档库 `vnerp_archive` 88 张 / 源库 `vnerpdacahng` 残留 0 张 ✅。
- **效果（重跑覆盖率发现 `coverage_discovery.cjs`）**：

| 指标 | 清理前 | 清理后 |
|------|------:|------:|
| 真实库总表 | 327 | **239** |
| 残留备份表 | 88 | **0** |
| Drizzle 整体覆盖率 | 41% | **56%** |
| 未建模核心表（真实缺口） | 106 | 106（不变） |

- `inv` 域因移除 44 张 `_bak*`，覆盖率 **46% → 100%**。
- **完全可逆**：恢复只需 `RENAME TABLE vnerp_archive.x TO vnerpdacahng.x`，或用备份文件 `mysql` 还原。
- **下一步**：路径 A 按域建模补齐 106 张未建模核心表（优先级 `sys`→`pur`→`sal`→`fin`→小域），见 T3–T6。

## 9. T3 sys_ 域建模结果（2026-08-26，✅ 完成）

生成器：`scripts/_audit/gen_sys.cjs`（复用 `gen_warehouse_missing.cjs` 的列/类型/索引/拓扑排序逻辑，针对 13 张未建模核心表）｜ 产物：`src/lib/db/schemas/_gen_sys.ts` + `schema.ts` 接入。

**13 张表**（均来自 live `information_schema`，列数与 live 逐一核对一致）：
`sys_announcement` · `sys_announcement_read` · `sys_calc_param` · `sys_company` · `sys_dict_data` · `sys_dict_type` · `sys_event_processed` · `sys_migration` · `sys_notice` · `sys_oper_log` · `sys_operation_log` · `sys_scheduled_task` · `sys_task_execution_log`

- 内部 FK 实写 1 条：`sys_dict_data.dictTypeId → sys_dict_type.id`（拓扑排序保证父表在前）。
- 跨域 FK 0 跳过（这些表无对外的强制外键约束）。
- `sys_calc_param` 便是此前迁移 074 已补列、由 `CalcParamService` 消费的分类编码参数表——现正式进入 Drizzle 建模。
- **校验**：`npx tsc --noEmit` 通过（exit 0）；13 张表列数与 live 100% 对齐。

**效果（重跑覆盖率发现）：**

| 指标 | T2 后 | T3 后 |
|------|------:|------:|
| 真实库总表 | 239 | 239 |
| Drizzle 已建模 | 133 | **146** |
| 整体覆盖率 | 56% | **61%** |
| 未建模核心表 | 106 | **93** |
| `sys` 域覆盖率 | 50% | **100%**（27/27） |

- **下一步**：T4 建模 `pur_` 域（9 张未建模核心）；随后 T5 `sal_`（11）、T6 `fin_`+小域（约 73）。

## 10. T4 pur_ 域建模结果（2026-08-26，✅ 完成）

生成器：`scripts/_audit/gen_pur.cjs`（复用列/类型/索引/拓扑排序逻辑）｜ 产物：`src/lib/db/schemas/_gen_pur.ts` + `schema.ts` 接入。

**9 张表**（来自 live，列数逐一核对一致）：
`pur_request` · `pur_request_detail`（FK→pur_request）· `pur_request_item` · `pur_supplier_material` · `pur_purchase_reconciliation_writeoff` · 以及 **5 张 `*_deprecated` 废弃表**（`pur_order_deprecated` + `pur_order_detail_deprecated`[FK→purOrderDeprecated]、`pur_receipt_deprecated` + `pur_receipt_detail_deprecated`、`pur_receipt_detail_deprecated` 独立）。

> ⚠️ 5 张 `*_deprecated` 是历史废弃表，业务代码不读写，但**真实存在**于 live。建模它们是为避免 safe-db-push 护栏把它们判为"应 DROP 的未建模表"而误 abort；同时避免将来真要清理时漏判。属于"防御性建模"。

- 内部 FK 实写 2 条：`purOrderDetailDeprecated.orderId → purOrderDeprecated.id`、`purRequestDetail.requestId → purRequest.id`（拓扑排序保证父表在前）。
- 跨域 FK 0 跳过（pur 域对 sys_user/inv_material 等引用在 live 未建强制外键约束）。
- **校验**：`npx tsc --noEmit` 通过；9 张表列数与 live 100% 对齐。

**效果（重跑覆盖率发现）：**

| 指标 | T3 后 | T4 后 |
|------|------:|------:|
| Drizzle 已建模 | 146 | **155** |
| 整体覆盖率 | 61% | **65%** |
| 未建模核心表 | 93 | **84** |
| `pur` 域覆盖率 | 40% | **100%**（15/15） |

- **下一步**：T5 建模 `sal_` 域（11 张未建模核心）；随后 T6 `fin_`+小域。

## 11. T5 sal_ 域建模结果（2026-08-26，✅ 完成）

生成器：`scripts/_audit/gen_sal.cjs` ｜ 产物：`src/lib/db/schemas/_gen_sal.ts` + `schema.ts` 接入。

**11 张表**（来自 live，列数逐一核对一致）：`sal_delivery` · `sal_delivery_detail` · `sal_delivery_order_item` · `sal_order_item` · `sal_reconciliation_detail` · `sal_reconciliation_line` · `sal_reconciliation_writeoff` · `sal_return` · `sal_return_detail` · `sal_return_order_item` · `sal_sample_inventory`

> ⚠️ **命名冲突规避**：`sal_delivery_order` 已占用导出名 `salDelivery`（sales.ts），故 `sal_delivery` 导出名改为 **`salDeliveryHdr`**。`schema.ts` 接入处已加注释说明。

- 已建模 sal 表分散在 3 文件：sales.ts 5 张（`sal_order`/`sal_order_detail`/`sal_delivery_order`/`sal_return_order`/`sal_reconciliation`）+ sample.ts 2 张（`sal_sample_feedback`/`sal_sample_quotation`）+ quote.ts 2 张（`sal_quote`/`sal_quote_item`）= 9，+11 生成 = **sal 域 20/20 = 100%**。
- 内部 FK 实写 **10 条**（如 `salOrderItem.orderId→salOrder`、`salReturnDetail.returnId→salReturn`、`salDeliveryDetail.deliveryId→salDeliveryHdr` 等，拓扑排序保证父表在前）；跨域 FK 跳过 **7 条**（`sal_delivery.customerId→crm_customer`、`sal_delivery.warehouseId→inv_warehouse` 等，留待 T7 跨域校准）。
- **校验**：`npx tsc --noEmit` 通过；11 张表列数与 live 100% 对齐。

**效果（重跑覆盖率发现）：**

| 指标 | T4 后 | T5 后 |
|------|------:|------:|
| Drizzle 已建模 | 155 | **166** |
| 整体覆盖率 | 65% | **69%** |
| 未建模核心表 | 84 | **73** |
| `sal` 域覆盖率 | 45% | **100%**（20/20） |

- 路径 A 已连下 **sys / pur / sal 三域达 100%**，累计覆盖率 **69%**。
- **下一步**：T6 建模 `fin_` 域（9 张未建模核心）+ 其余 0% 小域（qc/eqp/crm/ink/material/outsource/qms/eng/eq/plm/bom/srm 等，约 64 张）。

## 12. T6 fin_ 域建模结果（2026-08-26，✅ 完成）

生成器：`scripts/_audit/gen_fin.cjs` ｜ 产物：`src/lib/db/schemas/_gen_fin.ts` + `schema.ts` 接入。

**9 张表**（来自 live，列数逐一核对一致）：`fin_account` · `fin_account_balance` · `fin_cost_record` · `fin_payment_record` · `fin_period` · `fin_receipt_record` · `fin_receivable_line` · `fin_voucher` · `fin_voucher_line`

- 已建模 fin 表：finance.ts 2 张（`fin_receivable`/`fin_payable`）+ 9 生成 = **fin 域 11/11 = 100%**。
- 内部 FK 实写 **5 条**（`finAccountBalance.accountId→finAccount`、`finAccountBalance.periodCode→finPeriod`、`finVoucher.periodCode→finPeriod`、`finVoucherLine.accountId→finAccount`、`finVoucherLine.voucherId→finVoucher`，拓扑排序保证父表在前）；跨域 FK 跳过 **2 条**（`fin_voucher_line.customerId→crm_customer`、`fin_voucher_line.supplierId→pur_supplier`，留待 T7）。
- **校验**：`npx tsc --noEmit` 通过；9 张表列数与 live 100% 对齐。

**效果（重跑覆盖率发现）：**

| 指标 | T5 后 | T6 后 |
|------|------:|------:|
| Drizzle 已建模 | 166 | **175** |
| 整体覆盖率 | 69% | **73%** |
| 未建模核心表 | 73 | **64** |
| `fin` 域覆盖率 | 18% | **100%**（11/11） |

- 路径 A 已连下 **sys / pur / sal / fin 四域达 100%**，累计覆盖率 **73%**。
- **下一步**：T6 续——补齐其余 0% 小域（qc/eqp/crm/ink/material/outsource/qms/eng/eq/plm/bom/srm 等，约 64 张未建模核心）。这些域多为独立小模块，可一次性批量生成。

## 13. T6 续：剩余 18 个 0% 覆盖域批量建模（2026-08-26，✅ 完成）

**目标**：补齐路径 A 剩余全部 0% 覆盖小域，使全库 Drizzle 覆盖率达到 **100%**。

**通用工具链**（均落库 `scripts/_audit/`）：
- `gen_misc.cjs`：用法 `node gen_misc.cjs <domain>`。扫描全部 `schemas/*.ts` 构建全局「导出名→表名→文件」注册表，用于 FK import 与冲突检测；自动规避导出名冲突（派生名已占用则追加 `Gen` 序号后缀，如 `prdPickOrderGen2`）；内部/已建模 FK 实写并自动 import，跨域 FK 以注释保留；拓扑排序保证父表在前。列/索引/FK 数据均直接来自 live `information_schema`。
- `wire_misc.cjs`：将生成的 `_gen_*.ts` 幂等接入 `schema.ts`（带 `AUTO-WIRED-MISC` 锚点块，重复执行先清后写）。
- `verify_columns.cjs`：逐表比对「生成文件列数」与「live `information_schema` 列数」。

**新增 20 个域的 `_gen_*.ts`**（含 18 个原 0% 域 + 复用通用器补的 prd/eqp 等）：

| 文件 | 域 | 建模表（节选） |
|------|------|------|
| `_gen_prd.ts` | prd | prd_pick_order / prd_pick_order_item / prd_return_order / prd_return_order_item |
| `_gen_eqp.ts` | eqp | equipment_maintenance / equipment_repair / equipment_inspection … |
| `_gen_hr.ts` | hr | hr_employee / hr_attendance / hr_leave … |
| `_gen_crm.ts` | crm | crm_customer / crm_contact / crm_customer_analysis … |
| `_gen_ink.ts` | ink | ink_* 油墨/版库相关 |
| `_gen_material.ts` | material | material_* 物料主数据相关 |
| `_gen_outsource.ts` | outsource | outsource_* 委外相关 |
| `_gen_qc.ts` / `_gen_qms.ts` | qc/qms | 质检/质量体系 |
| `_gen_eng.ts` / `_gen_plm.ts` / `_gen_bom.ts` | eng/plm/bom | 工程/PLM/BOM |
| `_gen_srm.ts` | srm | 供应商关系 |
| `_gen_eq.ts` | eq | 设备 |
| `_gen_base.ts` / `_gen_biz.ts` / `_gen_domain.ts` / `_gen_mdm.ts` / `_gen_qr.ts` / `_gen_work.ts` | base/biz/domain/mdm/qr/work | 基础/业务/域/主数据/二维码/工单 |

**校验结果**：
- `verify_columns.cjs` 比对 **134 张**生成表（含 sys/pur/sal/fin/warehouse_missing 及本批 64 张）与 live 列数：**全部一致**（`✅ 所有生成表列数与 live 100% 一致`）。
- `npx tsc --noEmit` 通过（exit 0）。
- `coverage_discovery.json` 刷新：**239/239 = 100%**，未建模核心 **0**。

**提交**：`01cffebd`（`feat(db)+T6续: ...`），已推送 `origin/main`（`760adcef..01cffebd`，25 文件 +2171/−130）。

**效果（覆盖率发现重跑）**：

| 指标 | T6 后 | T6 续后 |
|------|------:|------:|
| Drizzle 已建模 | 175 | **239** |
| 整体覆盖率 | 73% | **100%** |
| 未建模核心表 | 64 | **0** |

## 14. 全库覆盖率达标后的待办（T7 / T8）

- **T7 跨域 FK 校准**：当前所有跨域外键（→ `sys_user` / `crm_customer` / `inv_*` / `pur_*` / `sal_*` / `prd_work_order` 等，约 81 处）以 `// SKIP-FK` 注释保留，未实写。需逐域把 `foreignKey()` + `relations()` 补回 Drizzle，且列/类型必须与 live 精确匹配（参考 §0 的「FK 充足但 Drizzle 不知情」警告——**绝不可直接 `drizzle-kit push`**，必须经 `safe-db-push.cjs` 守卫）。
- **T8 覆盖率复测 + 守卫评估**：在 real 库上重跑 `drizzle-kit push --dry-run` 或 `safe-db-push.cjs`，确认无「DROP 未建模表/列/键」触发；评估是否可解除/收紧 `safe-db-push` 拦截策略。
- **已知遗留（非阻断）**：部分 `sal_delivery` 等多选/回填历史债（V2 回填不完整）与 split-order 母料 version 静默不扣减 bug，详见工作记忆，与本专项解耦。
