/**
 * src/app/api/init/warehouse-category-seed/route.ts 使用的 SQL 常量。
 *
 * 由 2026-09-18 的 P0 治理从 messages/*.json 的 i18n 合成键还原而来——
 * 这些值原先被 i18n codemod 当成「硬编码中文」抽成 k_xxxxxxxx 键，
 * 导致「改翻译文件 = 改实际执行的 DDL」。现回归为代码常量，禁止再写入 i18n。
 */

/** ALTER */
export const ALTER_TABLE_INV_INVENTORY = `ALTER TABLE inv_inventory ADD COLUMN locked_qty DECIMAL(12,4) DEFAULT 0 COMMENT '锁定数量' AFTER quantity`;

/** ALTER */
export const ALTER_TABLE_INV_INVENTORY_2 = `ALTER TABLE inv_inventory ADD COLUMN available_qty DECIMAL(12,4) DEFAULT 0 COMMENT '可用数量' AFTER locked_qty`;

/** ALTER */
export const ALTER_TABLE_INV_WAREHOUSE = `ALTER TABLE inv_warehouse ADD COLUMN category_id INT UNSIGNED DEFAULT NULL COMMENT '仓库分类ID' AFTER id`;

/** ALTER */
export const ALTER_TABLE_INV_INVENTORY_3 = `ALTER TABLE inv_inventory ADD COLUMN batch_no VARCHAR(100) DEFAULT NULL COMMENT '批次号' AFTER available_qty`;
