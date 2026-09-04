# #22 切割标签外键（#30）+ E2E 造数合法性（#29）

## 一、定位结果（verify-before-act）
- `inv_cutting_record.source_label_id` 与 `inv_cutting_detail.new_label_id` 真实引用表是 **`inv_material_label`**（不是 `inv_label`——该表在库里根本不存在）。
- 依据：`src/app/api/warehouse/inbound/cutting/route.ts:122` `LEFT JOIN inv_material_label l ON r.source_label_id = l.id`；`src/app/api/init/full-tables/route.ts` 注释「源标签ID / 新标签ID」。
- 加 FK 前 live 现状：两类列**悬空 0**（全部指向合法 `inv_material_label`），切割表无 `deleted` 列、无既有 FK → 加 RESTRICT FK 现在安全。

## 二、DB 层 FK 兜底（#30 核心交付）
迁移 `database/migrations/20260828090000_add_cutting_label_fk.ts`（幂等 `up`/`down`，`up` 含防御性清理悬空）：
| 外键 | 引用 | 删除规则 |
|---|---|---|
| `fk_inv_cutting_record_source_label` | `inv_material_label(id)` | RESTRICT |
| `fk_inv_cutting_detail_new_label` | `inv_material_label(id)` | RESTRICT |
| `fk_inv_cutting_detail_record` | `inv_cutting_record(id)` | CASCADE |

- 已用内联脚本（沿用验证过的 heredoc + 手工读 `.env` 模式）应用到 live：3 FK 全部落地，**清理悬空 0 行，剩余悬空 0/0/0**。
- **负向验证通过**：插入 `source_label_id=999999999`（不存在）被 `ER_NO_REFERENCED_ROW_2` 拒绝，且行数 1→1 未污染。→ 证明 FK 生效、#18 类4 悬空被结构性阻断。

## 三、E2E 造数合法性（#29）
关键调研：`core-flow-seed`（`/api/init/core-flow-seed`，活跃 reseed）用**真实刚建的标签 ID**（`srcLabel.id` / `newLblRow[0].id`），且切割/标签表**不在其 `clearTables` 清单** → 加 FK **不会阻断 reseed、也无清表顺序冲突**。

加固 legacy seed：`src/lib/seeds/full-seed-steps.ts` 原硬编码 `srcId`（1,2,5,6,7），依赖 auto_increment 顺序，**非干净库重跑会指向错误/不存在标签 → 触发 FK 违例**。已改为循环顶部按 `label_no` 真实查 ID（业务键），与 auto_increment 解耦，在 FK 下始终合法。3 处 `cr.srcId` 全部替换（无残留）；tsc 改动区域零新增错误（该文件 752/1528/1536/1553/1714 为既有 `unknown` 基线，未扩大回归面）。

## 四、验证汇总
- 迁移文件 `20260828090000_add_cutting_label_fk.ts`：tsc 零错误。
- `full-seed-steps.ts`：改动区零新增 tsc 错误。
- live FK 元数据：3 个 FK 全部 `→ inv_material_label / inv_cutting_record`，规则正确。
- 负向测试：非法引用被拒 + 无脏数据。

## 五、两点说明
1. **迁移未写 `sys_migration` ledger**：官方 `npx tsx scripts/migrate.ts up` 会幂等补录（`up` 已含存在性探测，不会重复加）。
2. **E2E 完整 DB 隔离未做**：本次仅解决「造数合法性」（seed 只造合法引用 + FK 强制）。若未来 E2E 要在脏库运行，FK 会拒绝非法引用——这是期望的完整性约束，但要求测试自身造数合法（已通过 #29 加固保证）。
