# 油墨配方版本管理完整落地方案

> **适配技术栈** ：Print MIS 现有 DDD 架构 + Drizzle ORM + MySQL
> **前端** ：shadcn/ui + Handsontable
> **目标** ：实现配方版本全生命周期管理、一键复用、版本对比、成本自动计算，严格对齐行业最佳实践，完全复用项目现有架构范式。

---

## 一、核心业务规则（领域层强制约束）

所有规则封装在领域层，从根源避免版本混乱、数据不一致。

### 1. 核心实体关系

* **色号（Ink Color）** ：基础档案，一个色号对应多个配方版本。
* **配方版本（Formula Version）** ：核心实体，每个版本独立完整，包含全部原料配比与工艺参数。
* **配方明细（Formula Item）** ：版本从属实体，记录单种原料的比例、顺序、备注。

### 2. 版本状态与流转规则

| 枚举值 | 状态名 | 可执行操作                         | 约束规则                           |
| ------ | ------ | ---------------------------------- | ---------------------------------- |
| 1      | 草稿   | 编辑明细、修改信息、提交生效、删除 | 仅草稿可修改                       |
| 2      | 已生效 | 查看、复用、作废                   | 不可修改，生产工单仅引用已生效版本 |
| 3      | 已作废 | 查看                               | 不可用于生产，保留历史追溯         |

 **强制流转规则** ：

* 同一色号同一时间有且仅有一个已生效版本。
* 新版本生效时，旧生效版本自动置为「历史生效」（归档）。
* 已生效版本不可直接编辑，必须通过「一键复用」生成草稿版本后调整。
* 历史版本永久保留，仅逻辑删除，全链路可追溯。

### 3. 版本号生成规则

* 格式：`V{主版本号}.{次版本号}`（如 V1.0、V1.2、V2.0）。
* 一键复用：次版本号自动 +1（如 V1.2 → V1.3）。
* 重大调整可手动指定主版本号升级（如 V1.5 → V2.0）。

### 4. 一键复用核心逻辑

* 复制源版本全部明细、工艺参数、基础信息。
* 自动生成新版本号，状态强制设为「草稿」。
* 记录版本来源（源版本 ID），保留版本谱系。
* 草稿版本可自由修改后走生效流程。

### 5. 追溯与审计规则

* 每个版本记录：创建人、创建时间、修改人、修改时间、生效人、生效时间、作废原因。
* 支持任意两个版本的明细对比，高亮显示差异。
* 所有操作留痕，纳入系统操作日志。

---

## 二、数据模型设计（Drizzle ORM 实现）

严格遵循项目表命名规范：`dcprint_` 模块前缀 + 实体名，全量补齐外键约束与审计字段。

### 1. 色号基础档案表

**ts**

```
// src/lib/db/schema.ts
export const dcprintInkColor = mysqlTable('dcprint_ink_color', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  colorCode: varchar('color_code', { length: 50 }).notNull().unique(),
  colorName: varchar('color_name', { length: 100 }).notNull(),
  colorSeries: varchar('color_series', { length: 50 }),
  baseInkType: varchar('base_ink_type', { length: 50 }),
  remark: text('remark'),
  status: tinyint('status').notNull().default(1), // 1-启用 2-停用
  createBy: bigint('create_by', { mode: 'number' }),
  createTime: datetime('create_time').notNull().defaultNow(),
  updateBy: bigint('update_by', { mode: 'number' }),
  updateTime: datetime('update_time').onUpdateNow(),
  isDeleted: tinyint('is_deleted').notNull().default(0),
});
```

### 2. 配方版本主表（包含成本快照字段）

**ts**

```
export const dcprintInkFormulaVersion = mysqlTable('dcprint_ink_formula_version', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  colorId: bigint('color_id', { mode: 'number' }).notNull().references(() => dcprintInkColor.id),
  versionNo: varchar('version_no', { length: 20 }).notNull(),
  versionName: varchar('version_name', { length: 100 }),
  status: tinyint('status').notNull().default(1), // 1-草稿 2-已生效 3-已作废
  changeReason: text('change_reason'),
  sourceVersionId: bigint('source_version_id', { mode: 'number' }),
  processNote: text('process_note'),

  // 成本相关字段（快照）
  theoreticalCost: decimal('theoretical_cost', { precision: 12, scale: 4 }),
  costSnapshotTime: datetime('cost_snapshot_time'),
  costCalcStatus: tinyint('cost_calc_status').notNull().default(0), // 0-未计算 1-完成 2-部分缺失
  costWarning: varchar('cost_warning', { length: 255 }),

  activateBy: bigint('activate_by', { mode: 'number' }),
  activateTime: datetime('activate_time'),
  cancelBy: bigint('cancel_by', { mode: 'number' }),
  cancelReason: text('cancel_reason'),
  cancelTime: datetime('cancel_time'),
  createBy: bigint('create_by', { mode: 'number' }),
  createTime: datetime('create_time').notNull().defaultNow(),
  updateBy: bigint('update_by', { mode: 'number' }),
  updateTime: datetime('update_time').onUpdateNow(),
  isDeleted: tinyint('is_deleted').notNull().default(0),
}, (table) => ({
  colorVersionIdx: uniqueIndex('color_version_idx').on(table.colorId, table.versionNo),
}));
```

### 3. 配方明细表（含快照成本）

**ts**

```
export const dcprintInkFormulaItem = mysqlTable('dcprint_ink_formula_item', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  versionId: bigint('version_id', { mode: 'number' }).notNull().references(() => dcprintInkFormulaVersion.id),
  materialId: bigint('material_id', { mode: 'number' }).notNull().references(() => invMaterial.id),
  materialCode: varchar('material_code', { length: 50 }).notNull(),
  materialName: varchar('material_name', { length: 100 }).notNull(),
  ratio: decimal('ratio', { precision: 6, scale: 3 }).notNull(),
  addOrder: int('add_order').notNull().default(0),
  processRemark: varchar('process_remark', { length: 255 }),
  sort: int('sort').notNull().default(0),

  // 成本快照
  snapshotUnitCost: decimal('snapshot_unit_cost', { precision: 12, scale: 4 }),

  createTime: datetime('create_time').notNull().defaultNow(),
});
```

---

## 三、DDD 分层落地实现

完全复用项目现有分层架构。

### 1. 领域层（`src/domain/dcprint/`）

**聚合根：`InkFormulaVersion`**
封装状态流转、明细校验、复用逻辑，核心方法：

**ts**

```
static createDraft(colorId, baseInfo, items): InkFormulaVersion
static duplicateFrom(sourceVersion): InkFormulaVersion
activate(operatorId): void
cancel(operatorId, reason): void
updateItems(newItems): void
snapshotCost(costResult, operatorId): void
```

 **值对象** ：

* `FormulaStatus`：状态枚举与校验
* `FormulaItem`：包含比例合法性校验
* `InkColorId`：色号标识

 **领域事件** ：

* `FormulaVersionActivatedEvent`
* `FormulaVersionCancelledEvent`

 **仓储接口** ：

**ts**

```
export interface IFormulaVersionRepository {
  findById(id: bigint): Promise<InkFormulaVersion | null>;
  findByIdWithItems(id: bigint): Promise<InkFormulaVersion | null>;
  findByColorId(colorId: bigint): Promise<InkFormulaVersion[]>;
  getActiveVersion(colorId: bigint): Promise<InkFormulaVersion | null>;
  save(version: InkFormulaVersion): Promise<void>;
}
```

 **领域服务** （版本对比、成本计算）：

* `FormulaCompareService`：纯函数实现版本差异计算。
* `FormulaCostService`：依赖 `IMaterialCostProvider` 接口，计算配方理论成本。

### 2. 应用层（`src/application/services/`）

`InkFormulaApplicationService` 负责业务流程编排，不包含业务规则：

* `createDraftVersion(dto)`：创建草稿
* `duplicateVersion(sourceId, dto)`：一键复用
* `activateVersion(id, operatorId)`：生效（自动失效旧版本，快照成本）
* `cancelVersion(id, operatorId, reason)`：作废
* `getVersionDetail(id)`：获取详情
* `listVersionByColor(colorId)`：列出版本
* `compareVersions(leftId, rightId)`：对比
* `previewCost(items)`：草稿成本预览
* `recalculateCost(id)`：手动重算草稿成本

### 3. 基础设施层（`src/infrastructure/`）

* **仓储实现** ：`MysqlFormulaVersionRepository` 基于 Drizzle ORM，处理事务。
* **成本提供者** ：`MaterialCostProvider` 实现 `IMaterialCostProvider`，对接库存模块物料成本表。
* **事件总线** ：接入现有事件发布机制。

### 4. 表现层（API 路由）

薄控制器，仅参数校验和协议转换。

---

## 四、API 接口设计

路径前缀：`/api/dcprint/formula`，统一响应格式与权限校验。

| 方法 | 路径                                  | 功能                         |
| ---- | ------------------------------------- | ---------------------------- |
| GET  | `/color/list`                       | 色号列表（分页+筛选）        |
| POST | `/color`                            | 新增色号                     |
| PUT  | `/color/:id`                        | 编辑色号                     |
| GET  | `/version/list`                     | 按色号查版本列表（倒序）     |
| GET  | `/version/:id`                      | 获取版本详情（含明细）       |
| POST | `/version`                          | 新建草稿版本                 |
| POST | `/version/:id/duplicate`            | 一键复用                     |
| POST | `/version/:id/activate`             | 版本生效                     |
| POST | `/version/:id/cancel`               | 版本作废                     |
| PUT  | `/version/:id`                      | 编辑草稿基础信息             |
| POST | `/version/:id/items`                | 更新明细                     |
| GET  | `/version/compare?leftId=&rightId=` | 版本对比（返回结构化差异）   |
| POST | `/version/:id/preview-cost`         | 草稿成本预览（传入明细列表） |
| POST | `/version/:id/recalculate-cost`     | 手动重算成本                 |

---

## 五、前端页面设计

### 1. 色号管理页

* 表格：色号编码、名称、色系、当前生效版本、状态、操作。
* 新增/编辑/停用色号，点击色号进入版本管理。

### 2. 配方版本管理页（色号维度）

* **顶部** ：色号信息 + 当前生效版本标识。
* **左侧** ：版本时间线列表，标注状态。
* **右侧** ：版本详情区
* 基础信息（版本号、变更原因、工艺说明、理论成本）。
* 明细表格（Handsontable 可编辑）。
* 底部操作栏：保存、提交生效、作废、一键复用、对比。
* **状态驱动** ：已生效只读，草稿可编辑。

### 3. 版本对比弹窗

* **两种视图** ：
* 合并差异视图：按「新增/修改/删除/未变更」分组，颜色高亮。
* 双栏对照视图：左右并排，同步滚动，差异单元格标红。
* **导出** ：支持导出对比结果为 Excel。

### 4. 成本展示

* 明细编辑区底部实时显示理论成本与缺失警告。
* 明细行悬浮显示原料当前库存单位成本。
* 生效前确认成本快照值。

---

## 六、版本对比功能详细实现

### 1. 核心业务规则

* 仅同色号版本可对比。
* 以 `materialId` 为匹配键，识别新增、删除、修改、未变更行。
* 字段级差异：`ratio`、`addOrder`、`processRemark`。
* 对比结果为只读快照。

### 2. 数据结构

**ts**

```
export interface FormulaCompareResult {
  baseInfo: {
    left: FormulaVersionBaseInfo;
    right: FormulaVersionBaseInfo;
    diffFields: string[];
  };
  items: {
    added: FormulaItemDiff[];
    removed: FormulaItemDiff[];
    modified: FormulaItemModified[];
    unchanged: FormulaItemDiff[];
  };
  summary: {
    totalLeft: number;
    totalRight: number;
    addedCount: number;
    removedCount: number;
    modifiedCount: number;
    unchangedCount: number;
  };
}
```

### 3. 分层实现

* **领域服务** `FormulaCompareService.compare()`：纯函数实现 diff 算法。
* **应用层** ：调用仓储获取两个完整版本，调用领域服务，返回结果。
* **API** ：GET 接口返回 JSON 结果。
* **前端** ：根据视图模式渲染。

---

## 七、配方成本自动计算联动逻辑

### 1. 核心业务规则

* **计算口径** ：`理论成本 = Σ（配比比例% × 原料单位成本）`。
* **成本取值** ：优先取库存模块的移动加权平均成本，无则取计划价，均无则标记缺失。
* **快照机制** ：
* 草稿状态：实时预览，不持久化。
* 生效瞬间：抓取当前成本，计算后固化到版本表及明细表。
* **已生效版本** ：成本永久不变，不受后续库存波动影响。
* **精度** ：成本保留 4 位小数，配比保留 3 位。

### 2. 数据模型扩展（已包含在第二部分的表中）

* 版本表新增：`theoreticalCost`, `costSnapshotTime`, `costCalcStatus`, `costWarning`。
* 明细表新增：`snapshotUnitCost`。

### 3. 分层实现

* **领域层** ：定义 `IMaterialCostProvider` 接口（依赖倒置），`FormulaCostService` 计算成本。
* **基础设施层** ：`MaterialCostProvider` 实现接口，查询库存成本。
* **应用层** ：
* `previewCost()`：草稿预览，不存库。
* `activateVersion()`：生效时计算并快照。
* `recalculateCost()`：手动重算草稿成本（更新预览值）。
* **前端** ：实时显示成本，缺失警告，生效确认。

### 4. 联动扩展

* 生产工单引用配方时，自动携带快照成本。
* 成本分析：对比不同版本成本差异。
* 实际成本对比：完工后对比理论成本与实际领料成本。

---

## 八、给 Trae CN 的执行 TODO 清单

严格遵循 DDD 分层，表命名规范，所有接口走统一权限与响应格式。交付前通过 `pnpm lint`、`pnpm ts-check`。

### 前置准备

* 确认库存模块物料成本字段（`weightedAvgCost` 等）。
* 确认现有事件总线机制。
* 安装 Handsontable（如尚未集成）。

### 任务 1：数据模型与迁移脚本

* 在 `schema.ts` 中定义三张表（含成本字段）。
* 生成迁移文件，补充外键与索引。
* 执行 `pnpm db:push` 验证表结构。
* **验收** ：表结构符合设计，无报错。

### 任务 2：领域层核心实现

* 实现 `InkFormulaVersion` 聚合根及状态流转。
* 实现值对象、领域事件、仓储接口。
* 实现 `FormulaCompareService` 对比逻辑。
* 实现 `FormulaCostService` 成本计算及 `IMaterialCostProvider` 接口定义。
* 编写单元测试：状态流转、复用、对比、成本计算（覆盖率 ≥80%）。
* **验收** ：核心规则通过单元测试。

### 任务 3：应用层与基础设施层

* 实现 `InkFormulaApplicationService`，编排所有流程。
* 实现 `MysqlFormulaVersionRepository`（含事务）。
* 实现 `MaterialCostProvider`，对接库存成本。
* 接入事件总线，发布领域事件。
* **验收** ：流程调用正常，事务一致性保障，成本查询正常。

### 任务 4：API 接口开发

* 实现所有路由（含对比、成本预览/重算）。
* 接入 Zod 参数校验与权限中间件。
* 编写接口单元测试（覆盖核心场景）。
* **验收** ：接口可调用，校验生效，错误码统一。

### 任务 5：前端页面开发

* 色号管理列表页（分页、筛选、增删改）。
* 配方版本管理页（版本列表 + Handsontable 明细编辑）。
* 状态区分：草稿可编辑，生效只读。
* 一键复用、生效、作废交互。
* 版本对比弹窗（两种视图，导出 Excel）。
* 成本实时预览与警告。
* **验收** ：交互流畅，样式统一，约束生效。

### 任务 6：联调与测试

* 前后端全流程联调（从创建色号→新建配方→复用→生效→作废）。
* 补充 E2E 测试覆盖关键路径。
* 修复边界问题（如并发生效、成本缺失等）。
* **验收** ：完整业务流程可正常走通，数据一致。

---

## 九、补充说明

* **版本对比** ：对比结果中基础信息差异字段 `diffFields` 包含版本名称、变更原因、工艺说明、理论成本等字段的对比。
* **成本计算** ：草稿态成本预览需按前端当前编辑的明细实时计算，通过 API 获取。
* **安全审计** ：所有操作均记录操作人、时间、原因，纳入系统日志。
* **性能优化** ：版本列表分页加载，对比时只取必要数据。

---

## 十、实现状态对照（基于代码现状）

> 本节基于 2026-07-09 代码事实标注，核心链路已全量落地。

### 10.1 已实现 ✅

| 项                                        | 实际位置                                                                                                                          |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 三张数据表（色号/版本/明细）              | `database/migrations/047_create_ink_formula_version_tables.sql`                                                                 |
| 应用服务                                  | `src/application/services/InkFormulaVersionService.ts`                                                                          |
| API 路由（色号/版本 CRUD/生效/作废/复用） | `src/app/api/dcprint/formula/color/route.ts`、`version/route.ts`、`version/[id]/{route,activate,cancel,duplicate}/route.ts` |
| 前端版本管理页                            | `src/app/[locale]/dcprint/ink-formula/page.tsx`                                                                                 |

### 10.2 实际表结构相对本文档的差异

迁移 047 在本文档设计基础上额外落地了以下印刷行业专属字段：

- `dcprint_ink_color` 增补 `pantone_code`（Pantone 色号）
- `dcprint_ink_formula_version` 增补 `total_weight` / `unit` / `shelf_life_hours`（配方总重量、单位、保质期小时数，适配油墨现配现用特性）
- `dcprint_ink_formula_item` 增补 `ink_type` / `brand` / `weight` / `is_base`（油墨类型、品牌、重量、是否基墨）

> 明细表 `ratio` 精度由设计的 `DECIMAL(6,3)` 调整为 `DECIMAL(8,4)`，以容纳更高精度的配比。

### 10.3 待完善 🚧

| 能力                                       | 现状         | 说明                                                                                                                                                                                                             |
| ------------------------------------------ | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 版本对比 `FormulaCompareService`         | ✅           | `compareVersions` 算法已在 Service 实现（`version/route.ts?compare=1` 及新增 `version/compare` 路由均可调用）                                                                                              |
| 成本预览 `/version/:id/preview-cost`     | ✅           | 新增 `version/[id]/preview-cost` 路由，`previewCost` 已实现                                                                                                                                                  |
| 成本重算 `/version/:id/recalculate-cost` | ✅           | 新增 `version/[id]/recalculate-cost` 路由，`recalculateCost` 已实现                                                                                                                                          |
| 明细更新 `/version/:id/items`            | ✅           | 新增 `version/[id]/items` 路由，`updateVersionItems` 已实现（仅草稿可改，更新后重置成本状态）                                                                                                                |
| `FormulaVersionActivatedEvent` 事件      | ✅（已发布） | 已在 `activateVersion` / `cancelVersion` 通过 `getDomainEventOutbox().saveEvents` 发布 `FormulaVersionActivatedEvent` / `FormulaVersionCancelledEvent`；下游消费者（工单引用配方携带快照成本）仍待接入 |

### 10.4 TODO 清单进度（对应第八节）

| 任务                  | 状态 | 验收                                                                                                                                                               |
| --------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. 数据模型与迁移脚本 | ✅   | 047 迁移已执行，含行业增补字段                                                                                                                                     |
| 2. 领域层核心实现     | 🚧   | 应用服务已实现并跑通业务流程；聚合根 `InkFormulaVersion` / 值对象 / 仓储接口的纯领域层封装待补（事件类已落地 `domain/dcprint/events/FormulaVersionEvents.ts`） |
| 3. 应用层与基础设施层 | 🚧   | Service 已实现；`MysqlFormulaVersionRepository` 独立仓储未抽离（当前 Service 内联 mysql2 查询）                                                                  |
| 4. API 接口开发       | ✅   | 色号/版本 CRUD + 生效/作废/复用/对比/成本预览/重算/明细独立路由已全部落地                                                                                          |
| 5. 前端页面开发       | ✅   | 色号管理 + 版本管理页已实现；版本对比弹窗、成本实时预览已接入                                                                                                      |
| 6. 联调与测试         | 🚧   | 核心流程跑通；E2E 覆盖、并发边界场景待补                                                                                                                           |

> 最后更新：2026-07-09
