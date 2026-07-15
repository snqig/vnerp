# 技术决策记录：引入 BaseRepository 通用模板

> 编号：VNERP-DEC-004 | 日期：2026-07-14 | 状态：已决定（带后续修订建议）

## 背景

印前/打样/生产三模块新增 7 张表，若每个仓储独立实现 CRUD/分页/软删除/状态更新，将产生大量重复代码（预估每表 ~200 行 × 10+ 仓储 = 2000+ 行冗余）。团队此前无抽象基类先例。

## 选项

### 选项 A：继续每个仓储独立实现

- 优势：无框架依赖、灵活性高
- 劣势：代码重复、维护成本高、分页/软删除语义不统一

### 选项 B：引入泛型抽象基类

- 优势：DRY 消除重复、新仓储接入成本低、分页/软删除语义统一
- 劣势：基类可能引入硬编码假设、子类可能"继承即用"而不审视默认实现

## 决策

选择 **选项 B**：在 `infrastructure/repositories/` 层引入泛型抽象基类 `BaseRepository<T, F extends BaseFilters>`。

## 实现

`BaseRepository` 提供：

- 10 个通用方法：`findById`、`findByCode`、`findList`、`findAll`、`insertRow`、`updateFields`、`updateStatus`、`softDelete`、`existsByCode`、`countByStatus`
- 2 个 protected 辅助方法：`queryPaginatedRaw`、`buildWhereClause`
- 1 个 abstract 方法：`mapRow`（强制子类实现行映射）

子类继承并实现 `mapRow` 即可。`insertRow`/`updateFields` 被设计为 `protected`，强制外部调用通过子类语义化方法（如 `save()`、`update()`）发起。

## 权衡

| 得到 | 放弃 |
|------|------|
| DRY 消除，新仓储接入成本从 ~200 行降至 ~50 行 | `buildWhereClause` 硬编码三个假设：所有表都有 `name`/`create_time`/`status` 字段 |
| 分页/软删除语义统一 | 基类直接耦合 `@/lib/db`，弱化了 `REPOSITORY_IMPL` 切换能力 |
| 模板方法模式运用得当 | abstract 方法较少，子类可能"继承即用"而不审视默认实现 |

## 后续修订建议

1. 将 `buildWhereClause` 改为 `abstract`，强制子类声明过滤语义
2. 抽取 `DbExecutor` 接口让基类依赖抽象而非 `@/lib/db`
3. 在基类顶部文档中显式声明"硬编码假设清单"

## 影响

- 所有新增仓储继承 `BaseRepository`
- 现有仓储可逐步迁移
- 需注意 `buildWhereClause` 的硬编码假设在工艺卡、打样反馈等表上的适用性