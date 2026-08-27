# Drizzle Schema 补全计划（Warehouse 域 / DATA-001 实质处理）

> 目标：补全仓库域 Drizzle schema，使与 live `information_schema` 在「表 / 列 / 类型 / 索引 / FK」上一致。
> **实测修正（2026-08-25）**：live 共有 **82 张 `inv_*` 表**（其中约 44 张是 `_bak*` 备份表，系 08-16/17 链修复遗留，已排除不建模）；**核心 38 张已建模**（10 张手写于 `warehouse.ts` + 28 张 Phase 0 生成于 `_gen_warehouse_missing.ts`）。剩余缺口为约 129 个外键中未被建模的部分（详见 §0）。
> 原则：**只读生成、零破坏、可回滚、不依赖 `db:push` 建表**（表已存在，补全仅为类型安全 + studio 准确 + 未来 Drizzle 查询）。
> 关联文档：`docs/02-模块详细设计/WAREHOUSE-模块详解-校验版.md`（§2、§14、风险注已据本计划修正）。

---

## 0. 现状复核（2026-08-25 实测，纠正此前误判）

| 维度 | 真实状态 |
|---|---|
| 真实库 `inv_*` 表 | **82 张**（live `information_schema`）；其中约 **44 张为 `_bak*` 备份表**（08-16/17 链修复遗留），已排除不建模 |
| 核心 `inv_*` 表（非备份） | **38 张**均已建模 |
| ├ 手写于 `warehouse.ts` | **10 张**：`inv_material`、`inv_inventory_batch`、`inv_inbound_order`(导出名`invInboundOrders`)、`inv_inbound_item`(`invInboundItems`)、`inv_warehouse`、`inv_inventory`、`inv_outbound_order`(`invOutboundOrders`)、`inv_outbound_item`(`invOutboundItems`)、`inv_transfer_order`(`invTransferOrders`)、`inv_stocktaking` |
| └ Phase 0 生成于 `_gen_warehouse_missing.ts` | **28 张**（见 §4 列表），已与 live 逐列对齐 `missing=0/extra=0`、`tsc` 0 错误 |
| Drizzle FK 覆盖 | 28 张生成表内已声明 **14 个内部 FK**；**6 个被跳过**（1 自引用 + 5 跨域，见下） |
| 全库外键 | 共 **129 个**；其中 **48 个 `inv_*` 内部**、**81 个跨域**（指向 `sys_user`/`pur_purchase_order`/`sal_order` 等非仓库表，Drizzle 未建模这些表，暂以注释保留，依赖 safe-push 护栏） |
| `db:push`/`generate`/`migrate` | ⚠️ **`db:push` 已改造为安全护栏**（见 §3）：`package.json` 的 `db:push` 现指向 `scripts/safe-db-push.cjs`，命中任何 DROP 风险即硬拦截；专家绕行用 `db:push-raw`。`db:migrate`（drizzle-kit）指向空 `./drizzle`，无操作；增量迁移请用 `pnpm migrate` |

> ⚠️ 此前文档称「37 张 `inv_*` 全未建模」「待补 27 张」均基于**陈旧的 `vnerpdacahng_schema.sql`**（该 SQL 漏了迁移补的列，且表清单不全）。**本文及生成器一律以 live `information_schema` 为权威源**。现 38 张核心表已建模，DATA-001 的「表缺失」缺口已实质性闭合；剩余为**跨域外键 + 备份表**两类，非仓库表建模问题。

---

## 1. 目标与原则

- **目标**：先补齐 27 张仓库表 + 全量 ~129 外键（含指向 `inv_*` 的跨域 FK 与 `inv_*` 内部 FK）。
- **原则**
  1. **只读生成，零破坏**：生成器只 `SELECT information_schema`，永不写库。
  2. **不靠 `db:push` 建表**：表已存在；补全仅服务于类型安全 / `db:studio` / 未来查询。
  3. **任何写库（含 `db:push`）必须经 diff 守护确认无 `DROP` 才可执行**。
  4. **可回滚**：纯文件改动，走 git。

---

## 2. 策略：自动化 introspection 生成器（禁止手写 27 表）

手写 27 表 × ~15 列 + 129 FK 极易出错且难校验。改为「读 live `information_schema` → 生成 Drizzle 定义」：

1. `information_schema.tables` → 取 27 张缺失 `inv_*` 表。
2. `information_schema.columns` → 按类型映射表生成列定义。
3. `information_schema.key_column_usage` + `referential_constraints` → 生成 `foreignKey()`。
4. `information_schema.statistics` → 生成索引。
5. 输出到新文件 `src/lib/db/schemas/_gen_warehouse_missing.ts`（不污染手写 `warehouse.ts`）。

---

## 3. 安全护栏（最高优先级）✅ 已落地（2026-08-26）

> ⚠️ **根本性结论（实测后重构）**：本仓库 Drizzle **仅建模 140 张表**，而 live 实际 **327 张**（含大量 `_ghost_backup_*` / `_bak_*` 修复残留表）。**`drizzle-kit push` 永远不安全**——它会 DROP 掉约 187 张「Drizzle 不认识」的 live 表及其全部数据。因此 Drizzle schema 的用途**仅限于 ORM 查询构建**，**任何结构变更都必须走增量迁移**（`pnpm migrate` → `scripts/migrate.ts` + `database/migrations/`），而非 push。

- **`db:push` 已改为安全护栏**：`package.json` 的 `db:push` 现指向 `node scripts/safe-db-push.cjs`。该脚本在真正 push 前做只读 introspection，检测三类 DROP 风险（弃表 / 弃列 / 弃键），**命中任意一项即 `exit 1` 硬拦截，绝不执行 push**。实测一次即捕获 **64 类 DROP 风险（194 弃表 + 多表弃列 + 多个指向 `crm_customer`/`eqp_equipment` 的弃键）**。
- **专家绕行通道**：原 `db:push-raw`（裸 `drizzle-kit push`）已于 2026-08-27 Phase 0 护栏中移除；任何 schema 变更一律走 `pnpm migrate`（`scripts/migrate.ts`）。`db:generate`/`db:migrate` 现由 `scripts/guard-drizzle-kit.cjs` 拦截。
- **`db:studio` 安全**：仅可视化查看，只读，无 DROP 风险，保持可用。
- **生成器只读**：仅 `SELECT`，不 `INSERT/UPDATE/ALTER`。
- **`verify-schema-sync.mjs`（索引/FK 级全量 diff）**：✅ 已由 `scripts/safe-db-push.cjs` 内置实现（表/列/键三级 diff），并额外提供 `scripts/_audit/verify_gen_aligned.cjs`（列级对齐）。独立 `verify-schema-sync.mjs` 非必需，护栏已覆盖其核心能力。
- **现有 10 张表**：列类型以手写版为准（保留注释），**仅由生成器补 FK 片段**，不覆盖手写列定义。

---

## 4. 分阶段执行

| 阶段 | 动作 | 产出 | 状态 |
|---|---|---|---|
| **Phase 0** | 写 `scripts/_audit/gen_warehouse_missing.cjs`（只读 introspection → 生成 `_gen_warehouse_missing.ts` + FK 片段） | 生成器脚本 | ✅ 已完成 |
| **Phase 1** | 运行生成器（live 只读连接，凭证取自 `.env`） | **28 张核心表定义**（排除 `_bak*`）+ 14 内部 FK 片段；列对齐 `missing=0/extra=0` | ✅ 已完成 |
| **Phase 2** | 合并：新增 `_gen_warehouse_missing.ts` 并 re-export 到 `src/lib/db/schema.ts`（`warehouse.ts` 10 张保持手写不动） | 更新后的 schema 文件；`tsc --noEmit` 0 错误 | ✅ 已完成 |
| **Phase 3** | 写并运行 `scripts/_audit/verify_gen_aligned.cjs`（列级对齐校验）；`safe-db-push.cjs` 内置表/列/键三级 diff（即 `verify-schema-sync` 能力） | 列级校验通过；全量 diff 由护栏覆盖 | ✅ 已完成 |
| **Phase 4** | `db:push` 改造为安全护栏（`scripts/safe-db-push.cjs`，含 DROP 硬拦截）；`package.json` `db:push` 已指向护栏，`db:push-raw` 保留专家绕行 | 受控的 schema 工具链 | ✅ 已完成（2026-08-26） |

> 28 张 Phase 0 生成表：`inv_auxiliary_inventory, inv_cutting_detail, inv_cutting_record, inv_fifo_override_log, inv_inbound_label, inv_inventory_log, inv_inventory_transaction, inv_inventory_transaction_log, inv_location, inv_material_category, inv_material_inventory, inv_material_label, inv_material_std, inv_outbound_batch_allocation, inv_product_inventory, inv_production_inbound, inv_production_inbound_item, inv_sales_outbound, inv_sales_outbound_item, inv_scan_log, inv_stock_adjust, inv_stock_adjust_item, inv_stocktaking_item, inv_trace_detail, inv_trace_record, inv_transfer_item, inv_unit_conversion, inv_warehouse_log`。

---

## 5. 验证（当前进度）

- ✅ `npx tsc --noEmit`：**0 错误**（含新增 28 表 + re-export）。
- ✅ `scripts/_audit/verify_gen_aligned.cjs`：**28 张表全部 `[OK]`，`missing=0/extra=0`**（列级对齐）。
- ✅ `scripts/safe-db-push.cjs`（即 `verify-schema-sync` 能力）：表/列/键三级 diff，命中 DROP 即硬拦截；实测捕获 64 类 DROP 风险并 abort（证明护栏有效）。
- ✅ 现有仓库 API（原生 SQL）回归：**未改运行时查询路径**，仅补 Drizzle 类型定义，无影响。
- 🚫 **`db:push` 已永久禁用为安全护栏**；结构变更一律走 `pnpm migrate`（增量迁移）。`db:studio` 仍可只读查看。

---

## 6. 风险与回滚

- 生成器只读 → **零风险**。
- 合并阶段为纯文件写入 → `git revert` / 分支回滚即可。
- `db:push` 的 DROP-FK 风险 → 由 §3 护栏彻底消除（默认禁止 + diff 守护）。
- 既有 10 张表手写列可能与 live 存在小漂移 → Phase 3 校验会暴露，按需单独对齐（不强迫覆盖手写注释）。

---

## 7. 类型映射表（MySQL → Drizzle `mysql-core`）

| MySQL 类型 | Drizzle |
|---|---|
| `int` / `integer` | `int()` |
| `bigint` | `bigint()` |
| `tinyint(1)` | `boolean()` |
| `tinyint` | `tinyint()` |
| `smallint` / `mediumint` | `smallint()` / `mediumint()` |
| `varchar(n)` / `char(n)` | `varchar(n)` / `char(n)` |
| `text` / `longtext` | `text()` / `longtext()` |
| `decimal(p,s)` | `decimal(p, s)` |
| `float` / `double` | `float()` / `double()` |
| `datetime` / `timestamp` | `datetime()` / `timestamp()` |
| `date` | `date()` |
| `time` | `time()` |
| `json` | `json()` |
| `blob` / `mediumblob` | `blob()` / `mediumblob()` |
| `enum(...)` | `mysqlEnum('x', [...])` |

> 注意：`NOT NULL`、默认值、`unsigned`、`autoIncrement`、`onUpdate` 均需从 `columns` / `extra` 字段还原；`charset`/`collate` 一般可省（继承库默认）。

---

## 8. 待确认 / 下一步

1. **Phase 0–4 已全部完成**（28 张核心表建模 + 列对齐 + 14 内部 FK + re-export + tsc 0 错误 + 安全护栏 `safe-db-push.cjs` 落地并实测有效）。这部分改动已**独立 commit**（`4f275ea0` 仓库表补全 + 本次护栏），尚未 push。
2. **可选：补 6 处跳过的 FK**（1 自引用 `inv_material_category.parent_id` + 5 跨域）——目前由护栏兜底，非紧急。
3. **`drizzle.config.ts` 过时「已废弃」注释**：可顺手修正（注释称 db:push 是警告提示，实际已是安全护栏），避免误导后续接手者。
4. **跨域 81 外键 / 44 张 `_bak*` 备份表 / 全库仅 140/327 表建模**：属更深层的「全库 Drizzle 覆盖率」问题，超出本仓库域范围。建议另立专项：建模 `sys_*`/`pur_*`/`sal_*` 等域，或先清理 `_ghost_backup_*`/`_bak_*` 修复残留表，使 Drizzle 覆盖度提升；在此之前 `db:push` 永远不安全。

> 结论：DATA-001 的「仓库表缺失」缺口已**实质闭合**（38 张核心 `inv_*` 全部建模、列对齐、tsc 通过），且 **DROP 高危已通过 `safe-db-push.cjs` 护栏彻底消除**——`db:push` 默认硬拦截，结构变更一律走增量迁移 `pnpm migrate`。Drizzle 在本仓库的定位是「ORM 查询构建 + 类型安全」，而非「schema 同步源」。
