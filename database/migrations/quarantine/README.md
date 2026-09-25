# 隔离迁移文件说明（quarantine/）

> 生成时间：2026-09-22
> 背景：在「受控对齐」策略下，`scripts/migrate.ts status` 已从 36 pending 归零（110 applied / 0 pending）。
> 本目录存放 **14 个被隔离、未纳入 `sys_migration` 登记的迁移文件**。隔离原因分四类：
> ① 语法错（MySQL 8 不支持 MariaDB 的 `ADD COLUMN IF NOT EXISTS` / `DELIMITER //` 存储过程）；
> ② 数据冲突（唯一索引撞重复行）；
> ③ 已生效冗余（目标列/表已在库，裸 `ADD COLUMN` 报 Duplicate column）；
> ④ 生成器/改写工具 bug（注入模板串或非法 `ADD COLUMN \`IF\`` 守卫）。
>
> **重要**：隔离≠无害。经 `INFORMATION_SCHEMA` 全量比对，14 个文件意图补的 264 个目标列中，
> **仍有 30 个列在真实库中确实缺失**（见末节），属真实缺口，需后续以干净迁移补齐（见各文件建议）。

---

## 1. 057_unify_pk_to_bigint.sql
- **隔离原因**：注释称"统一主键为 BIGINT"，但 SQL 实际 `MODIFY COLUMN id INT UNSIGNED`（会**降级** PK）。
- **核验**：25 张目标表 PK 现已是 `bigint unsigned`（25/25）→ 隔离安全。
- **建议**：无需动作。若未来真要统一 BIGINT，应改 `MODIFY COLUMN id BIGINT UNSIGNED`。

## 2. 061_add_unique_index_inv_inventory_transaction.sql
- **隔离原因**：`inv_inventory_transaction` 已有 `(source_type, source_id)` 重复行，建 `uk_inv_txn_source` 撞数据。
- **核验**：`uk_inv_txn_source` 索引**缺失**。
- **建议**：先去重再建索引。`FinishOrderInventoryHandler` 已用 `INSERT IGNORE`，唯一索引是幂等底座，建议补：
  ```sql
  -- 去重（保留最小 id）
  DELETE t FROM inv_inventory_transaction t
   JOIN (SELECT source_type, source_id, MIN(id) mid
         FROM inv_inventory_transaction GROUP BY source_type, source_id
         HAVING COUNT(*)>1) d
   ON t.source_type=d.source_type AND t.source_id=d.source_id AND t.id>d.mid;
  -- 建索引（幂等）
  SET @i=(SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
          WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_inventory_transaction' AND INDEX_NAME='uk_inv_txn_source');
  SET @s=IF(@i=0,'ALTER TABLE inv_inventory_transaction ADD UNIQUE INDEX uk_inv_txn_source (source_type, source_id)','SELECT 1');
  PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
  ```

## 3. 066_inventory_multi_currency.sql
- **隔离原因**：首句 `ALTER TABLE inv_inbound_order ADD COLUMN currency` 因列已存在报 Duplicate column，整文件中断。
- **核验**：入库侧（`inv_inbound_order.currency/exchange_rate/base_total_amount`、`inv_inbound_item.base_unit_price/base_amount`）**已存在**；
  **缺失 23 列**：`inv_outbound_order.exchange_rate/base_total_amount`、`inv_outbound_item.base_unit_price/base_amount`、
  `sal_order_detail.currency/exchange_rate/base_unit_price/base_amount/base_tax_amount`、`sal_delivery.exchange_rate`、
  `sal_delivery_detail.base_unit_price/base_amount`、`sal_return.exchange_rate`、`sal_return_detail.base_unit_price/base_amount`、
  `sal_reconciliation` 的 8 个 base_* 列。
- **建议**：重写为逐列 `INFORMATION_SCHEMA.COLUMNS` 守卫后补列 + 旧数据回填（`base_x = x`）。

## 4. 067_sales_multi_currency.sql
- **隔离原因**：同 066（首句列已存在中断）。
- **核验**：`sal_order.base_*`、`sal_delivery.currency`、`sal_return.currency` 已存在；**缺失 19 列**（见上 066 缺失清单中 sal_* 部分）。
- **建议**：同 066。

## 5. 071_create_work_order_bom_and_sample_quotation.sql
- **隔离原因**：MySQL 8 不支持 `ADD COLUMN IF NOT EXISTS`（MariaDB 语法）。
- **核验**：`sample_order` 表**不存在**（真实表名 `sal_sample_order`）；`prd_work_order_bom`、`sal_sample_quotation` 表**已存在**。
  `sal_sample_order` 已有 `customer_id/process_card_id/work_order_id/sales_order_id/create_by`，仅缺 `update_by`。
- **建议**：表名改 `sal_sample_order`，去掉 `IF NOT EXISTS`，补 `update_by`；两张 CREATE TABLE 因已存在可跳过（或保留 `IF NOT EXISTS` 无害）。

## 6. 072_add_standard_card_obsolete_fields.sql
- **隔离原因**：MariaDB `ADD COLUMN IF NOT EXISTS`。
- **核验**：`prd_standard_card.obsolete_reason/obsolete_by/obsolete_at` **3 列缺失**。
- **建议**：改写为 `INFORMATION_SCHEMA.COLUMNS` 守卫补列。

## 7. 075_add_material_fields_to_sal_order_item.sql
- **隔离原因**：MariaDB `ADD COLUMN IF NOT EXISTS`。
- **核验**：`sal_order_item.material_id/material_code/deleted` **缺失**。
- **建议**：改写补列 + 按 `material_name` 回填 `material_id/material_code`。

## 8. 077_qrcode_unique.sql
- **隔离原因**：注释含异常字面（原隔离理由待核，迁移本身幂等写法正确）。
- **核验**：`qrcode_record.uk_qr_code` 索引**已存在** → 隔离安全。
- **建议**：可安全删除（意图已实现）；如需保留登记，直接登记即可（幂等无副作用）。

## 9. 20260827_add_batch_id_to_detail_tables.sql
- **隔离原因**：含 `DELIMITER //` 存储过程 `add_column_if_not_exists`，迁移运行器按 `;` 拆分执行报错。
- **核验**：出库/入库/调拨/盘点/调整明细的 batch_id 等多数已存在；
  **缺失**：`prd_material_issue_item.batch_id/original_inbound_date`、`prd_material_return_item.batch_id/original_inbound_date`；
  6 个 `idx_batch_id` 索引（`inv_sales_outbound_item/prd_material_issue_item/prd_material_return_item/inv_transfer_item/inv_stocktaking_item/inv_stock_adjust_item`）**缺失**。
- **建议**：去掉存储过程，逐列 `INFORMATION_SCHEMA` 守卫补两表批次列 + 建 6 个 `idx_batch_id`（幂等）。

## 10. 20260922_pur_supplier_add_default_currency.sql
- **隔离原因**：裸 `ADD COLUMN`（若已存在报 Duplicate）。
- **核验**：`pur_supplier.default_currency` **缺失**（前端供应商编辑弹窗 + API 已读写）。
- **建议**：加 `INFORMATION_SCHEMA.COLUMNS` 守卫后补列 + 回填 `'CNY'`。

## 11. 20260922_mass_add_missing_cols.sql
- **隔离原因**：生成器 bug——L232 注入未替换模板串 `prd_standard_card.${fields.join(...)}` 导致 SQL 语法错。
- **核验**：采样目标列此前已确认 31/31 在库；全量比对 264 目标列 present=229 / **missing=30**。
- **建议**：丢弃损坏生成器产物；按末节"缺失列清单"用干净迁移补齐。

## 12. 20260922_add_missing_business_cols.sql
- **隔离原因**：被 buggy fixer 污染（注入非法守卫 SQL）。
- **核验**：目标列（eqp_repair/outsource_order/inv_scan_log/inv_outbound_item/inv_transfer_item/inv_stocktaking/inv_stock_adjust_item/fin_receivable/sal_order/inv_inventory_batch）多数已存在，少数在缺失清单内。
- **建议**：以干净 `INFORMATION_SCHEMA` 守卫重跑缺失项。

## 13. 20260922_add_p1_ui_columns.sql
- **隔离原因**：同上污染。
- **核验**：`inv_outbound_item.is_raw_material`、`prd_die_template.category/tags`、`prd_standard_card.template_category/tags` **缺失**。
- **建议**：干净补列。

## 14. 20260922_field_alignment_fix.sql
- **隔离原因**：buggy fixer 把 `ADD COLUMN <col>` 篡改为 `ADD COLUMN \`IF\` NOT EXISTS <col>`（非法：`IF` 是保留字，且 `NOT EXISTS` 位置错）。
- **核验**：意图列 264 项，present=229 / **missing=30**。此文件**作废**。
- **建议**：不应用本文件；按末节清单用干净迁移补齐。

---

## 缺失列汇总（真实缺口，需后续补齐）
共 **30 列** + 9 索引（其中 `uk_qr_code` 已存在，余 8 缺）：

### 列（30）
- 多币种本位币（066/067 未落地）：`inv_outbound_order.exchange_rate/base_total_amount`、`inv_outbound_item.base_unit_price/base_amount`、
  `sal_order_detail.currency/exchange_rate/base_unit_price/base_amount/base_tax_amount`、`sal_delivery.exchange_rate`、
  `sal_delivery_detail.base_unit_price/base_amount`、`sal_return.exchange_rate`、`sal_return_detail.base_unit_price/base_amount`、
  `sal_reconciliation.base_delivery_amount/base_return_amount/base_net_amount/base_discount_amount/base_received_amount/base_balance_amount`（23 列）
- 标准卡作废：`prd_standard_card.obsolete_reason/obsolete_by/obsolete_at`（3 列）
- 销售订单明细物料：`sal_order_item.material_id/material_code/deleted`（3 列）
- 生产领/退料批次追溯：`prd_material_issue_item.batch_id/original_inbound_date`、`prd_material_return_item.batch_id/original_inbound_date`（4 列）
- 打样单：`sal_sample_order.update_by`（1 列）

### 索引（8 缺）
- `inv_inventory_transaction.uk_inv_txn_source`（需先去重）
- `sal_sample_order.idx_process_card` / `idx_work_order`（表名实际 `sal_sample_order`）
- `inv_sales_outbound_item/prd_material_issue_item/prd_material_return_item/inv_transfer_item/inv_stocktaking_item/inv_stock_adjust_item` 的 `idx_batch_id`（6 个）

---

## 后续处理原则
1. **绝不**把本目录文件移回 `database/migrations/` 直接重跑——它们含语法错/降级/bug，会再次失败。
2. 补齐缺口时，统一用 `INFORMATION_SCHEMA` 守卫的**幂等**写法（探测存在再 `ALTER`），且**先全库备份**再执行。
3. 每补一批，登记 `sys_migration`（文件名含扩展名），保持 `migrate status` 归零。
4. `057` / `077` 意图已实现，可删除或仅登记；其余 12 个按上面建议重写为干净迁移。
