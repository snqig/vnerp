# #22 DB 层 FK 兜底 — 进展（第 1 击：material_issue 工单引用）

## 背景
#18 发现销售/生产数据的 4 类悬空引用，并得出"live DB 易变（E2E reseed）"结论。
#22 的目标是用**结构性外键**兜底，从根上阻止悬空再次发生（应用层 #20 防新建，DB 层 FK 防破坏/误删）。

## 调研结论
- 权威参考 schema `database/vnerpdacahng_schema.sql` 含 **120 条 FK**；迁移目录累计 **171 条 ADD CONSTRAINT**（017/018/029-033…）。
- E2E `tests/global-setup.ts` **只重置 admin 登录锁，不重建表结构** → 通过迁移加的 FK **可跨 E2E 持久**（E2E 只动数据行，不动 schema）。
- #18 四类悬空核对：
  | 列 | 现状 | 处置 |
  |---|---|---|
  | `prd_material_issue.work_order_id` | 无 FK，live 40 行悬空 | ✅ 已补 FK |
  | `sys_user.department_id` | 已有 FK | 已覆盖 |
  | `sal_order.customer_id` | 已有 FK | 已覆盖 |
  | `inv_inbound_item.material_id` | 无 FK，但类1是 ≤0 自由录入 | 留 #20 应用层校验（不加 RESTRICT FK 以免破坏自由录入） |
  | `inv_cutting_record.source_label_id` / `inv_cutting_detail.new_label_id` | 无 FK，`inv_label` 不存在 | ⏸ 暂缓，需先定位标签表（#30） |

## 已交付
- 迁移 `database/migrations/20260828080000_add_material_issue_work_order_fk.ts`（幂等 `up/down`）：
  - `up`：若 FK 不存在 → 先置空 40 行悬空 `work_order_id`（列 `IS_NULLABLE=YES`）→ 加 `fk_prd_material_issue_work_order` → `prd_work_order(id)` `ON DELETE RESTRICT ON UPDATE CASCADE`。
  - `down`：仅删 FK，不动数据。
- 已应用到 live（内联脚本，避免触发其他挂起迁移）：
  - 置空悬空行：**40**
  - 剩余悬空：**0**
  - FK 元数据：`REFERENCED_TABLE_NAME=prd_work_order, DELETE_RULE=RESTRICT, UPDATE_RULE=CASCADE` ✅
- tsc：迁移文件零错误。

## 注意（E2E 侧连锁）
加 FK 后，任何写入 `prd_material_issue.work_order_id` 指向不存在工单的 INSERT 都会被 MySQL 拒绝（ER_NO_REFERENCED_ROW）。这是**期望的完整性约束**；若现存 E2E 用例用无效 `work_order_id` 造数，会暴露为测试失败——属 #22 第二部分（E2E 隔离/污染清理，任务 #29）要修的点。

## 下一步（已建任务）
- **#30** 切割标签外键：先定位 `source_label_id/new_label_id` 实际引用表（`inv_inbound_label` / `inv_material_label` / `label_template` / `prd_product_label` 候选），再补 RESTRICT FK（含悬空清理）。
- **#29** E2E 隔离/污染清理：确保 E2E 造数用合法引用或隔离库，避免 FK 误伤测试。
