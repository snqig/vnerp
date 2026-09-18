/**
 * src/app/api/warehouse/ink-mixing/route.ts 使用的 SQL 常量。
 *
 * 由 2026-09-18 的 P0 治理从 messages/*.json 的 i18n 合成键还原而来——
 * 这些值原先被 i18n codemod 当成「硬编码中文」抽成 k_xxxxxxxx 键，
 * 导致「改翻译文件 = 改实际执行的 DDL」。现回归为代码常量，禁止再写入 i18n。
 */

/** INSERT … */
export const INSERT_INTO_INV_INVENTORY_TRANSACTION = `INSERT INTO inv_inventory_transaction (trans_no, trans_type, source_type, source_id, material_id, material_code, batch_no, warehouse_id, quantity, unit_price, total_amount, account_dr, account_cr, create_time)
         SELECT ?, 'out', 'ink_mixing', ?, ib.material_id, ib.material_code, ib.batch_no, ib.warehouse_id, ?, ib.unit_price, ? * ib.unit_price, '生产成本', '原材料库存', NOW()
         FROM inv_inventory_batch ib WHERE ib.id = ?`;
