/**
 * src/app/api/init/business-seed/route.ts 使用的 SQL 常量。
 *
 * 由 2026-09-18 的 P0 治理从 messages/*.json 的 i18n 合成键还原而来——
 * 这些值原先被 i18n codemod 当成「硬编码中文」抽成 k_xxxxxxxx 键，
 * 导致「改翻译文件 = 改实际执行的 DDL」。现回归为代码常量，禁止再写入 i18n。
 */

/** INSERT … */
export const INSERT_INTO_PRD_BOM_DETAIL = `INSERT INTO prd_bom_detail (bom_id, material_id, material_name, quantity, unit, loss_rate, unit_cost, total_cost, item_type, create_time) VALUES (?, ?, ?, ?, '卷', 0.05, 10, 100, 1, NOW())`;

/** INSERT … */
export const INSERT_INTO_SAL_ORDER_ITEM = `INSERT INTO sal_order_item (order_id, material_name, quantity, unit_price, total_price, unit, create_time)
         VALUES (?, 'PET薄膜', 1000, 50, 50000, '张', NOW())`;

/** INSERT … */
export const INSERT_INTO_INV_INBOUND_ITEM = `INSERT INTO inv_inbound_item (order_id, material_id, material_name, quantity, unit, unit_price, total_price, create_time)
         VALUES (?, 1, ?, ?, '卷', 10, ?, NOW())`;
