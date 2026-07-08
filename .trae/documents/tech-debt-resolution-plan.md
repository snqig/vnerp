# ERP 技术债务清偿计划

## Context

全栈重新分析报告 (`docs/全栈重新分析报告_2026-07-07.md` 第132-140行) 识别出多项"部分修复"和"未修复"问题。本计划系统性地解决这些遗留债务，按优先级分4个 Sprint 执行。

**已验证现状**：
- 错误边界：仅 1 个 `warehouse/error.tsx`，140 页面无 `global-error.tsx`
- 超大组件：`warehouse/inbound` 2902行(10个Dialog)、`hr/employee` 2156行(3个Dialog)
- 调试目录：4个（debug/test-api/diagnostic/test），各1个 page.tsx
- localStorage Token：27处/16文件，其中7个页面文件内联了 `authFetch` 重复实现
- Drizzle ORM：2/83表有schema，仅1个"演示性"消费者，`drizzle/`目录已标DEPRECATED
- schema.sql：37个迁移已执行但未重新导出

---

## Sprint A: P0 快速见效（错误边界 + 调试清理）

### A.1 创建错误边界

**模板**：`src/app/[locale]/warehouse/error.tsx`（34行，AlertCircle + 重试按钮）

**新建文件**（共20个）：

| 文件 | 说明 |
|------|------|
| `src/app/global-error.tsx` | 根级错误边界，需完整 `<html><body>`，硬编码中文（无 Provider 可用） |
| `src/app/[locale]/error.tsx` | locale 级错误边界，可用 `useTranslations` |
| `src/app/[locale]/not-found.tsx` | 404 页面 |
| `src/app/[locale]/sales/error.tsx` | 模块级错误边界 |
| `src/app/[locale]/hr/error.tsx` | 同上 |
| `src/app/[locale]/finance/error.tsx` | 同上 |
| `src/app/[locale]/production/error.tsx` | 同上 |
| `src/app/[locale]/sample/error.tsx` | 同上 |
| `src/app/[locale]/purchase/error.tsx` | 同上 |
| `src/app/[locale]/settings/error.tsx` | 同上 |
| `src/app/[locale]/dashboard/error.tsx` | 同上 |
| `src/app/[locale]/quality/error.tsx` | 同上 |
| `src/app/[locale]/equipment/error.tsx` | 同上 |
| `src/app/[locale]/orders/error.tsx` | 同上 |
| `src/app/[locale]/outsource/error.tsx` | 同上 |
| `src/app/[locale]/dcprint/error.tsx` | 同上 |
| `src/app/[locale]/engineering/error.tsx` | 同上 |
| `src/app/[locale]/crm/error.tsx` | 同上 |
| `src/app/[locale]/plm/error.tsx` | 同上 |
| `src/app/[locale]/system/error.tsx` | 同上（如有此目录） |

每个模块级 `error.tsx` 是 `warehouse/error.tsx` 的结构克隆，仅改组件名。

### A.2 删除调试目录

**删除**：
- `src/app/[locale]/debug/` (含 `inbound/page.tsx`)
- `src/app/[locale]/test-api/` (含 `page.tsx`)
- `src/app/[locale]/diagnostic/` (含 `page.tsx`)
- `src/app/[locale]/test/` (含 `page.tsx`)

**删除前检查**：
- Grep 确认无其他文件 import 这些路由
- 检查 `sidebar.tsx`、菜单配置、`menu-service.ts` 无导航链接指向这些路径

**验证**：`pnpm build` + `npx tsc --noEmit` 通过

---

## Sprint B: P0 组件拆分

### B.1 拆分 `warehouse/inbound/page.tsx`（2902行 → 目标 <350行）

**当前结构**：
- L1-82: 导入
- L84-266: 类型定义（InboundItem, Warehouse, PrintLabel等）
- L268-827: ~60个useState/useCallback + 5个fetch函数
- L829-1510: 主JSX（工具栏、标签页、表格）
- L1511-2984: **10个内联Dialog**（~1470行）

**目标目录结构**：
```
src/app/[locale]/warehouse/inbound/
  page.tsx                    (编排器，<350行)
  types.ts                    (共享接口)
  hooks/
    use-inbound-data.ts       (fetchInboundRecords等5个fetch)
    use-label-operations.ts   (handleCutting, handleQRCodeView等)
    use-inbound-form.ts       (add/edit表单状态)
  components/
    inbound-toolbar.tsx       (操作按钮栏)
    inbound-records-table.tsx (记录表格+筛选)
    label-list-panel.tsx      (标签列表面板)
    dialogs/
      cutting-dialog.tsx
      cutting-result-dialog.tsx
      qr-code-dialog.tsx
      print-preview-dialog.tsx
      qr-scan-dialog.tsx
      generate-dialog.tsx
      add-dialog.tsx
      mixed-add-dialog.tsx
      audit-dialog.tsx
      edit-dialog.tsx
```

**提取模式**：每个Dialog接收所需state和callback作为props，翻译函数各自调用 `useTranslations`。

### B.2 拆分 `hr/employee/page.tsx`（2156行 → 目标 <300行）

**当前结构**：
- L1-72: 导入
- L74-84: **内联 authFetch**（重复实现，需替换为 import）
- L86-128: 类型定义
- L129-1700: 组件函数
- L1702-2093: **3个内联Dialog**（EmployeeForm ~290行, Print ~70行, BatchPrint ~25行）

**目标目录结构**：
```
src/app/[locale]/hr/employee/
  page.tsx                    (编排器，<300行)
  types.ts                    (Employee, Department, Role)
  hooks/
    use-employees.ts          (CRUD + fetch)
    use-photo-upload.ts       (照片上传)
    use-employee-print.ts     (打印/批量打印)
  components/
    employee-toolbar.tsx
    employee-table.tsx
    dialogs/
      employee-form-dialog.tsx
      print-dialog.tsx
      batch-print-dialog.tsx
```

**验证**：`npx tsc --noEmit` + `pnpm build` + 手动测试每个Dialog功能

---

## Sprint C: P1 安全清理

### C.1 替换内联 authFetch 为集中导入

**修改文件**（7个页面 + 2个hooks/components）：

| 文件 | 操作 |
|------|------|
| `warehouse/inventory/page.tsx` | 删除内联authFetch，改为import |
| `finance/receivable/page.tsx` | 同上 |
| `finance/cost/page.tsx` | 同上 |
| `settings/roles/page.tsx` | 同上 |
| `purchase/orders/page.tsx` | 同上 |
| `hooks/useCompanyName.ts` | 用authFetch替换手动token+headers |
| `components/layout/sidebar.tsx` | 用authFetch替换PUT请求的token获取 |

**保持不变**（合法localStorage使用）：
- `lib/auth-fetch.ts` — 集中实现（需localStorage做refresh token）
- `contexts/AuthContext.tsx` — 管理auth生命周期
- `lib/api-client.ts` — 替代API客户端

### C.2 重新导出 schema.sql

1. `pnpm migrate:status` 确认所有迁移已执行
2. `mysqldump --no-data --routines --triggers` 导出
3. 验证：FK数 ~147、utf8mb4_0900_ai_ci表 ~72%、BIGINT UNSIGNED PK ~92.8%
4. `pnpm setup:db` 在全新数据库上测试

---

## Sprint D: P1 Drizzle ORM 扩大覆盖

### 决策：扩大覆盖（用户选择）

**现状**：
- `src/lib/db/schema.ts` 仅定义 2 张表（invInboundOrders, invInboundItems）
- 18 个仓储实现中仅 1 个用 Drizzle（`DrizzleInboundOrderRepository`，演示性）
- 17 个 `Mysql*Repository` 全用原生 SQL via `mysql2`
- `drizzle/` 目录已标 DEPRECATED（drizzle-kit 迁移路径废弃，但 ORM 查询仍可用）

**扩展策略**：分阶段推进，本 Sprint 完成第一阶段（核心业务表 schema + 2个示范仓储）

### D.1 扩展 schema.ts — 添加核心业务表定义

**现有 2 表**：`invInboundOrders`, `invInboundItems`

**新增表**（按业务模块分组，优先覆盖已有 Repository 的表）：

| 模块 | 表名 | 对应 Repository |
|------|------|----------------|
| warehouse | `inv_outbound_order`, `inv_outbound_item` | MysqlOutboundOrderRepository |
| warehouse | `inv_transfer_order` | MysqlTransferOrderRepository |
| warehouse | `inv_stocktaking_order` | MysqlStocktakingOrderRepository |
| warehouse | `inv_inventory` | (核心库存表) |
| warehouse | `inv_warehouse` | (仓库主数据) |
| sales | `sal_order`, `sal_order_detail` | MysqlSalesOrderRepository |
| sales | `sal_delivery` | MysqlDeliveryRepository |
| sales | `sal_return_order` | MysqlReturnOrderRepository |
| sales | `sal_reconciliation` | MysqlReconciliationRepository |
| purchase | `pur_order`, `pur_order_detail` | MysqlPurchaseOrderRepository |
| purchase | `pur_return_order` | MysqlPurchaseReturnRepository |
| purchase | `pur_reconciliation` | MysqlPurchaseReconciliationRepository |
| finance | `fin_receivable` | MysqlReceivableRepository |
| finance | `fin_payable` | MysqlPayableRepository |
| finance | `fin_voucher` | MysqlVoucherRepository |
| production | `prd_work_order` | MysqlWorkOrderRepository |
| quality | `qc_unqualified` | MysqlUnqualifiedRepository |
| standard-card | `eng_standard_card` | MysqlStandardCardRepository |

**翻译模式**（遵循现有 `invInboundOrders` 模式）：
- 从 `database/vnerpdacahng_schema.sql` 读取 DDL
- 逐列翻译为 Drizzle 列类型（`mysqlTable`, `varchar`, `int`, `decimal`, `datetime`, `boolean`）
- 定义索引（`index()`）
- 导出类型（`$inferSelect`）
- 按模块分组注释

**文件组织**：schema.ts 按 9 个限界上下文分区块，每区块前加注释标题。

### D.2 创建 2 个示范 Drizzle 仓储

选择 `sal_order` 和 `pur_order` 作为示范（业务价值高，查询模式代表性好）：

1. **`DrizzleSalesOrderRepository.ts`** — 实现 `ISalesOrderRepository` 接口
   - findById: `drizzleDb.query.salOrder.findFirst` + `inArray` 加载明细
   - findByStatus: `select().from().where(and(...))` + count + orderBy + limit
   - save: `insert(values)` + batch insert items (transaction)
   - updateStatus: `update().set().where(and(eq, eq))` 乐观锁
   - softDelete: `update().set({deleted:true}).where(eq)`

2. **`DrizzlePurchaseOrderRepository.ts`** — 同上模式

**并行运行策略**：新 Drizzle 仓储与现有 MySQL 仓储并存，通过环境变量 `REPOSITORY_IMPL=drizzle|mysql` 切换，默认 mysql，验证通过后切换。

### D.3 清理 drizzle/ 废弃目录

- 删除 `drizzle/` 目录（drizzle-kit 迁移文件已废弃，不影响 ORM 查询）
- 保留 `src/lib/db/schema.ts` 和 `drizzleDb` 导出
- 更新 `DEPRECATED.md` 说明：drizzle-kit 迁移废弃，但 ORM 查询活跃使用中

### D.4 长期路线图（本 Sprint 不完成）

- Phase 2: 为剩余 65+ 张表添加 schema 定义
- Phase 3: 将 15 个 MySQL 仓储迁移为 Drizzle 仓储
- Phase 4: 统一切换到 Drizzle 仓储，删除 MySQL 仓储
- Phase 5: 评估 `drizzle-kit push` 作为迁移工具的可行性

**验证**：`npx tsc --noEmit` + `pnpm build` + `pnpm vitest run` + 手动测试新仓储查询结果与 MySQL 仓储一致

---

## 执行顺序

```
Sprint A (快速见效) → Sprint B (组件拆分) → Sprint C (安全清理) → Sprint D (Drizzle扩大覆盖)
```

Sprint B 的组件拆分过程中会顺带删除内联 authFetch，部分推进 C.1。

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| 组件拆分破坏Dialog状态流 | 逐个提取Dialog，每次提取后测试 |
| global-error.tsx 缺少Provider导致UX差 | 硬编码最小样式和中文字符串，提供返回登录链接 |
| schema.sql重导出引入DDL差异 | Diff新旧文件，全新DB上测试 `pnpm setup:db` |
| localStorage清理改变错误行为 | 集中authFetch有401-refresh逻辑，是改进而非退化 |
| Drizzle schema与实际DB不一致 | 从 schema.sql 逐表翻译，添加后用 `drizzleDb.query.X.findFirst()` 验证每张表可查询 |
| Drizzle仓储查询结果与MySQL不一致 | 并行运行对比测试，环境变量控制切换 |
