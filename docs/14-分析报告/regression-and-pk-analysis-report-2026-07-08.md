# 回归测试总结 + PK 类型统一分析报告

> 📌 历史快照（生成于 2026-07-08），内容反映当时状态，未随代码更新。仅作归档参考。

> 日期：2026-07-08  
> 范围：SQL 注入修复（#59-#64）、authFetch 收敛（#19）、diagnose 路由鉴权（#65）、extractToken Cookie 兼容（#68）  
> 目的：供团队同步当前质量状态与待办优先级

---

## 一、回归测试结果

### 1.1 测试范围

本次回归测试验证以下三项改动零回归：

| 改动 | 任务号 | 涉及文件 |
|------|--------|----------|
| P0 SQL 注入修复 | #59-#63 | soft-delete.ts、MaterialLifecycleService.ts、process-cards/route.ts、quality/incoming/route.ts、labels/route.ts、cutting/route.ts |
| P1 SQL 防御纵深 | #64 | labels/route.ts、settings/category-rules/route.ts、finance/aging/route.ts |
| authFetch 收敛 | #19 | finance/cost/page.tsx、api-client.ts |
| diagnose 路由鉴权 | #65 | 9 个 diagnose/*/route.ts 文件 |
| extractToken Cookie 兼容 | #68 | auth.ts |

### 1.2 TypeScript 编译检查

```
npx tsc --noEmit → 9 errors
```

| 文件 | 错误数 | 状态 |
|------|--------|------|
| `src/app/[locale]/finance/report/page.tsx` | 1 | 预存 |
| `src/app/[locale]/production/report/page.tsx` | 1 | 预存 |
| `src/app/[locale]/qrcode/page.tsx` | 1 | 预存 |
| `src/app/[locale]/reports/page.tsx` | 3 | 预存 |
| `src/lib/db/PurchaseOrder.ts` | 1 | 预存 |
| `src/lib/cost-engine.ts` | 1 | 预存 |
| `src/lib/sanitize.ts` | 1 | 预存 |

**结论：0 新增错误。**

### 1.3 Vitest 单元测试

```
Test Files  2 failed | 87 passed (89)
Tests       14 failed | 1577 passed (1591)
Duration    109.48s
```

| 失败文件 | 失败数 | 根因 | 状态 |
|----------|--------|------|------|
| `src/lib/__tests__/cost-engine.test.ts` | 13 | `roundTo` 函数 undefined（预存） | 预存 |
| `tests/unit/mrp-engine.test.ts` | 1 | MRP 引擎 BOM 展开断言（预存） | 预存 |

**关键验证**：以下本次改动涉及的文件均无测试失败：
- `src/app/api/diagnose/*/route.ts`（9 个文件）
- `src/app/api/dcprint/labels/route.ts`
- `src/lib/api-client.ts`
- `src/app/[locale]/finance/cost/page.tsx`
- `src/lib/auth.ts`

**结论：0 新增失败。14 个失败全部为预存问题。**

> 注：上次基线为 15 个失败（含 1 个 flaky `table.perf`），本次 flaky 测试通过，故 15→14。

### 1.4 改动安全性评估

| 维度 | 结果 |
|------|------|
| SQL 注入修复 | ✅ 零回归 |
| authFetch 收敛 | ✅ 零回归 |
| diagnose 路由鉴权 | ✅ 零回归 |
| extractToken Cookie 兼容 | ✅ 零回归（tsc 验证） |

---

## 二、PK 类型统一分析（Migration 027/028 + 缺口）

### 2.1 已有迁移覆盖范围

#### Migration 027：采购模块（3 列）

| 表 | 列 | 当前类型 | 目标类型 |
|----|----|----------|----------|
| `pur_purchase_order` | `id` | INT UNSIGNED | BIGINT UNSIGNED |
| `pur_purchase_order_line` | `id` | INT UNSIGNED | BIGINT UNSIGNED |
| `pur_purchase_order_line` | `po_id` | INT UNSIGNED | BIGINT UNSIGNED |

迁移特点：幂等守卫（INFORMATION_SCHEMA 检查），FK 先删后建。

#### Migration 028：总账 + 系统模块（7 列）

| 表 | 列 | 当前类型 | 目标类型 |
|----|----|----------|----------|
| `fin_account` | `id` | INT UNSIGNED | BIGINT UNSIGNED |
| `fin_account` | `parent_id` | INT UNSIGNED | BIGINT UNSIGNED |
| `fin_period` | `id` | INT UNSIGNED | BIGINT UNSIGNED |
| `fin_voucher_line` | `account_id` | INT UNSIGNED | BIGINT UNSIGNED |
| `fin_account_balance` | `account_id` | INT UNSIGNED | BIGINT UNSIGNED |
| `sys_event_processed` | `id` | BIGINT（缺 UNSIGNED） | BIGINT UNSIGNED |
| `sys_migration` | `id` | INT（缺 UNSIGNED） | BIGINT UNSIGNED |

迁移特点：幂等守卫，自引用列同步，无 FK 引用列可直接 MODIFY。

### 2.2 未覆盖缺口（需新建 Migration 029+）

#### P0 优先：Drizzle ORM 消费表 FK 类型不一致

这些表被 Drizzle ORM 活跃使用，PK/FK 类型不一致会导致 JOIN 查询隐式转换、索引失效：

| 表 | 列 | 当前类型 | 目标类型 | 原因 |
|----|----|----------|----------|------|
| `inv_inbound_item` | `order_id` | INT | BIGINT UNSIGNED | FK → `inv_inbound_order.id`（serial/BIGINT），类型不匹配 |
| `inv_inbound_item` | `material_id` | INT | BIGINT UNSIGNED | 其他表（inv_inventory、inv_outbound_item）均用 bigint |
| `pur_purchase_order` | `create_by` | INT UNSIGNED | BIGINT UNSIGNED | FK → `sys_user.id`（BIGINT） |
| `pur_purchase_order` | `update_by` | INT UNSIGNED | BIGINT UNSIGNED | FK → `sys_user.id` |
| `pur_purchase_order` | `audit_by` | INT UNSIGNED | BIGINT UNSIGNED | FK → `sys_user.id` |
| `pur_purchase_order` | `close_by` | INT UNSIGNED | BIGINT UNSIGNED | FK → `sys_user.id` |
| `pur_purchase_return` | `id` | BIGINT（缺 UNSIGNED） | BIGINT UNSIGNED | 与全局标准一致 |
| `pur_purchase_reconciliation` | `id` | BIGINT（缺 UNSIGNED） | BIGINT UNSIGNED | 与全局标准一致 |

#### P0 优先：高引用度主表

`sys_user.id` 被全库数十个 `create_by`/`update_by`/`operator_id` 等列引用，必须优先迁移：

| 表 | 列 | 当前类型 | 目标类型 | 影响范围 |
|----|----|----------|----------|----------|
| `sys_user` | `id` | INT | BIGINT UNSIGNED | 全库所有 `*_by` 列（需级联） |

#### P1：SQL Schema 中的 INT 主键（未被 Drizzle 消费，但存在于 DB）

以下表在 `database/vnerpdacahng_schema.sql` 中使用 INT 主键，需统一为 BIGINT UNSIGNED：

| 模块 | 表 | 列 | 当前类型 |
|------|----|----|----------|
| 生产 | `bom_header` | `id` | INT |
| 生产 | `bom_line` | `id` | INT |
| 生产 | `prd_die` | `id` | INT |
| 生产 | `prd_ink` | `id` | INT |
| 生产 | `prd_screen_plate` | `id` | INT |
| 库存 | `inv_auxiliary_inventory` | `id` | INT |
| 库存 | `inv_inventory_batch` | `id` | INT UNSIGNED |
| 库存 | `inv_inventory_transaction_log` | `id` | INT |
| 库存 | `inv_material_inventory` | `id` | INT |
| 库存 | `inv_product_inventory` | `id` | INT |
| 采购 | `pur_request` | `id` | INT UNSIGNED |
| 采购 | `pur_request_item` | `id` | INT UNSIGNED |
| 采购 | `pur_request_approve` | `id` | INT |
| 系统 | `sys_employee` | `id` | INT |
| 系统 | `sys_login_log` | `id` | INT |
| 物流 | `delivery_vehicle` | `id` | INT |

以下表在其他 SQL 文件中使用 INT UNSIGNED 主键：

| 模块 | 表 | 列 | 当前类型 | 来源文件 |
|------|----|----|----------|----------|
| 组织 | `sys_department` | `id` | INT UNSIGNED | organization.sql |
| 组织 | `sys_position` | `id` | INT UNSIGNED | organization.sql |
| 组织 | 其他 2 张 | `id` | INT UNSIGNED | organization.sql |
| 仓库 | `inv_warehouse` | `id` | INT UNSIGNED | warehouse.sql |
| 仓库 | `inv_warehouse_category` | `id` | INT UNSIGNED | warehouse_category.sql |
| 仓库 | 其他 3 张 | `id` | INT UNSIGNED | warehouse_inbound.sql |
| 质检 | `qc_incoming_inspection` | `id` | INT | quality_incoming.sql |
| 质检 | 其他 1 张 | `id` | INT | quality_incoming.sql |
| 考勤 | `hr_attendance` 相关表 | `id` | INT | hr_attendance.sql |
| 物料 | `material_lifecycle` 相关表 | `id` | INT UNSIGNED | material_lifecycle_migration.sql |

### 2.3 Drizzle Schema 与 SQL 不一致

| 表 | 列 | Drizzle 类型 | SQL 类型 | 说明 |
|----|----|-------------|----------|------|
| `inv_inbound_order` | `id` | `serial`（BIGINT） | INT UNSIGNED | Drizzle 已超前声明，需 SQL 迁移跟上 |
| `pur_purchase_order_line` | `id` | `serial`（BIGINT） | INT UNSIGNED | 同上，027 会将其对齐 |
| `pur_purchase_order` | `id` | `int unsigned` | INT UNSIGNED | 一致，但 027 后需更新 Drizzle 为 bigint |

### 2.4 推荐执行顺序

1. **执行 027/028**（已就绪）→ 采购 + 总账 + 系统模块 10 列对齐
2. **同步 Drizzle schema.ts** → `pur_purchase_order.id` 改为 `bigint`，`po_id` 改为 `bigint`
3. **新建 Migration 029**（P0 缺口）→ `inv_inbound_item.order_id`/`material_id` + `pur_purchase_order` 四个 `*_by` 列 + `pur_purchase_return/reconciliation.id` 补 UNSIGNED
4. **新建 Migration 030**（sys_user 级联）→ `sys_user.id` INT → BIGINT UNSIGNED + 全库所有 `*_by` 引用列级联
5. **新建 Migration 031**（P1 批量）→ 上述 P1 表的 INT 主键批量迁移

---

## 三、当前待办事项清单

### P0（安全/数据完整性，必须处理）

| 任务 | 状态 | 说明 |
|------|------|------|
| localStorage Token → HttpOnly Cookie 迁移 | Phase 1 已完成 | extractToken() 已支持 Cookie 回退；Phase 2-4 待执行 |
| PK 类型统一 — 027/028 | 已就绪 | 迁移脚本已写好，待执行 |
| PK 类型统一 — Drizzle schema 同步 | 待办 | 027/028 执行后更新 schema.ts |
| PK 类型统一 — Migration 029（P0 缺口） | 待办 | inv_inbound_item FK + pur_purchase_order *_by 列 |
| PK 类型统一 — Migration 030（sys_user 级联） | 待办 | sys_user.id + 全库 *_by 引用列 |

### P1（重要/质量提升）

| 任务 | 状态 | 说明 |
|------|------|------|
| diagnose/* 路由鉴权 | ✅ 已完成 | 9 个路由已加 withPermission |
| SQL 防御纵深（escapeId） | ✅ 已完成 | labels、category-rules、aging、diagnose |
| authFetch 收敛 | ✅ 已完成 | api-client.ts + finance/cost/page.tsx |
| SELECT * 消除 | 待办 | 150+ 处，影响索引覆盖与网络传输 |
| N+1 INSERT 批量化 | 待办 | 批量插入场景性能优化 |
| COLLATE 统一 | 待办 | utf8mb4_0900_ai_ci vs utf8mb4_unicode_ci 混用 |
| DECIMAL 精度统一 | 待办 | 部分表 precision/scale 不一致 |
| 冗余索引清理 | 待办 | 重复索引影响写入性能 |
| 财务表审计字段补全 | 待办 | 部分财务表缺 create_by/update_by |
| PK 类型统一 — Migration 031（P1 批量） | 待办 | 20+ 张表 INT → BIGINT UNSIGNED |
| Sprint B.2：hr/employee 拆分 | 待办 | 2156 行大文件拆分 |

### P2（技术债务/长期）

| 任务 | 状态 | 说明 |
|------|------|------|
| 迁移命名规范化 | 待办 | 数字前缀 vs 日期前缀混用 |
| API 文档自动生成 | 待办 | OpenAPI/Swagger 与代码同步 |
| 业务文档补充 | 待办 | 流程描述 + 领域模型 |
| 移动端适配 | 待办 | 仓库扫码 + 车间报工场景 |
| DDD 领域层落地 | 待办 | 财务/生产/销售核心模块 |

---

## 四、本次会话改动文件清单

| 文件 | 改动类型 | 说明 |
|------|----------|------|
| `src/lib/auth.ts` | 修改 | extractToken() 增加 Cookie 回退（Phase 1） |
| `src/lib/api-client.ts` | 修改 | ApiClient 委托 authFetch（#19） |
| `src/app/[locale]/finance/cost/page.tsx` | 修改 | 移除局部 authFetch 遮蔽（#19） |
| `src/app/api/dcprint/labels/route.ts` | 修改 | fieldColumnMap + escapeId（#64） |
| `src/app/api/settings/category-rules/route.ts` | 修改 | escapeId(tableName)（#64） |
| `src/app/api/finance/aging/route.ts` | 修改 | escapeId(tableName)（#64） |
| `src/app/api/diagnose/column-types/route.ts` | 修改 | withPermission（#65） |
| `src/app/api/diagnose/table-schema/route.ts` | 修改 | withPermission（#65） |
| `src/app/api/diagnose/final-inspection-schema/route.ts` | 修改 | withPermission（#65） |
| `src/app/api/diagnose/label-status/route.ts` | 修改 | withPermission（#65） |
| `src/app/api/diagnose/inventory-schema/route.ts` | 修改 | withPermission（#65） |
| `src/app/api/diagnose/inbound/route.ts` | 修改 | withPermission（#65） |
| `src/app/api/diagnose/all-tables/route.ts` | 修改 | withPermission + escapeId（#65） |
| `src/app/api/diagnose/insert-test/route.ts` | 修改 | withPermission（#65） |
| `src/app/api/diagnose/material/route.ts` | 修改 | withPermission + escapeId（#65） |
| `docs/localStorage-to-httponly-cookie-migration-plan.md` | 新建 | Cookie 迁移 4 阶段方案 |

---

## 五、结论

- **回归测试通过**：SQL 注入修复、authFetch 收敛、diagnose 路由鉴权、extractToken Cookie 兼容四项改动均零回归。
- **PK 类型统一**：027/028 已就绪覆盖 10 列；P0 缺口 8 列（Drizzle 消费表 FK 不一致）+ sys_user 级联需新建 029/030；P1 批量 20+ 张表需新建 031。
- **下一步**：执行 027/028 → 同步 Drizzle schema → 新建 029/030 → 继续 Cookie 迁移 Phase 2。
