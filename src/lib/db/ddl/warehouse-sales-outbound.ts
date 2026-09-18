/**
 * src/app/api/warehouse/sales-outbound/route.ts 使用的 SQL 常量。
 *
 * 由 2026-09-18 的 P0 治理从 messages/*.json 的 i18n 合成键还原而来——
 * 这些值原先被 i18n codemod 当成「硬编码中文」抽成 k_xxxxxxxx 键，
 * 导致「改翻译文件 = 改实际执行的 DDL」。现回归为代码常量，禁止再写入 i18n。
 */

/** INSERT … */
export const INSERT_INTO_INV_FIFO_OVERRIDE_LOG = `INSERT INTO inv_fifo_override_log (source_type, source_id, source_no, material_id, material_name, recommended_batch, actual_batch, reason, operator_name, approval_status)
               VALUES ('sales_outbound', ?, ?, ?, ?, ?, ?, '手动指定批次', ?, 0)`;

/** INSERT … */
export const INSERT_INTO_FIN_VOUCHER = `INSERT INTO fin_voucher (voucher_no, voucher_date, source_type, source_id, source_no, debit_account, credit_account, amount, cost_price, quantity, batch_no, material_id, material_name, warehouse_id)
             VALUES (?, CURDATE(), 'sales_outbound', ?, ?, '应收账款', '成品库存', ?, ?, ?, ?, ?, ?, ?)`;
