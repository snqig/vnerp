# #21 分切物料类型限制 — 交付概览

**目标**：仅卷材类物料（白名单 `FILM / PAPER / PKG / RAW`）允许创建 / 审核分切单，其余在后端拦截（400），前端同步提示并禁用。

## 改动清单

### 1. 数据层（迁移 + 初始化）
- 新增 `database/migrations/20260827132300_add_is_splittable.ts`
  - `inv_material` 加列 `is_splittable TINYINT(1) NOT NULL DEFAULT 0`（INFORMATION_SCHEMA 探测后 ALTER，兼容 MySQL8 无 `IF NOT EXISTS`）+ 索引 `(is_splittable, deleted)`。
  - `up`：按 `inv_material_category.category_code IN ('FILM','PAPER','PKG','RAW')` JOIN 置位 1；`down`：删列。`up` 幂等。
- **已在 live 库执行验证**：列已建，784 个物料置位（未删物料共 4085）。
  - ⚠️ live 库易变（reseed 会丢列）；正式落库走 `npx tsx scripts/migrate.ts up`（ledger 未记此条，官方 up 幂等补录）。

### 2. Schema 同步
- `src/lib/db/schemas/warehouse.ts`：`invMaterial` 加 `isSplittable`（避开 `drizzle-kit push`，防 DROP 现有 FK）。

### 3. 后端守卫（核心）
- `src/lib/reference-validation.ts`：新增纯函数 `assertMaterialSplittable(material?)` —— 不可切 / 缺物料抛 `AppError.badRequest(400)`。
- `src/app/api/warehouse/split-order/route.ts`：
  - **POST**：取母料批次后查 `inv_material.is_splittable` 并断言。
  - **PATCH `audit`**：SELECT 带 `m.is_splittable`，审核前再次断言（防绕过前端直调 API）。
  - 错误出口确认：`withPermission`→`withAuthAndErrorHandler` 对 `AppError` 按 `statusCode` 返回 → **400**。

### 4. 主数据（读暴露 + 手动覆盖开关）
- `src/app/api/materials/route.ts`：GET 列表返回 `is_splittable`。
- `src/app/api/materials/[id]/route.ts`（新增）：`PATCH` 改写 `is_splittable`，支持人工覆盖白名单默认值（仅登录校验，与 GET 同权限档）。
- `src/app/api/warehouse/batch-inventory/route.ts`：GET JOIN `inv_material` 暴露 `is_splittable`，供前端选母料提示。

### 5. 前端
- `src/app/[locale]/warehouse/split-order/page.tsx`：选母料批次后按 `is_splittable` 判定，不可切则 toast 警告 + 红色提示条 + 禁用「创建分切单」。

### 6. 测试
- `tests/unit/lib/reference-validation.test.ts`：增 4 用例（可切 / 不可切点名 / 缺 flag / 物料不存在）→ **13 passed**。

## 验证结果
- 单测：✅ 13/13 通过。
- tsc：`npx tsc --noEmit` 在我改动区域 **零新增错误**。`split-order/route.ts` 另有 51 个 tsc 错误，全属该文件既有 `DbRow`/`unknown` baseline（GET 与 transaction 段），我新增的两处守卫块（约 95–105、225–230 行）已确认干净。

## 遗留风险（非本次引入，待定）
分切单前端 `searchParentBatch` 调 `/api/warehouse/batch-inventory`（查 `inv_batch_inventory`），但后端 `split-order` 取母料用 `inv_inventory_batch`。若两表非同源 / 不同步，POST 会先在 `SELECT ... FROM inv_inventory_batch WHERE id=?` 处报「母料批次不存在」（500），本次新增的可切守卫可能够不着。属既有集成问题，不在 #21 范围；如需根治须先确认两表关系（视图或 ETL 同步）。

## 后续建议
- #22：DB 层 FK 兜底（原生 SQL ALTER 加 `ON DELETE RESTRICT`，避 Drizzle）+ E2E 隔离 / 污染清理（根因治理，呼应 #18 易变 DB 结论）。
- 修复 `inv_batch_inventory` 与 `inv_inventory_batch` 的母料批次 ID 一致性（上条遗留风险）。
