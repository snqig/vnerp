/**
 * src/application/handlers/PurchaseReceivedHandler.ts 使用的 SQL 常量。
 *
 * 由 2026-09-18 的 P0 治理从 messages/*.json 的 i18n 合成键还原而来——
 * 这些值原先被 i18n codemod 当成「硬编码中文」抽成 k_xxxxxxxx 键，
 * 导致「改翻译文件 = 改实际执行的 DDL」。现回归为代码常量，禁止再写入 i18n。
 */

/** INSERT … */
export const INSERT_INTO_INV_INVENTORY = `INSERT INTO inv_inventory (material_id, material_code, material_name, warehouse_id, quantity, unit, deleted, create_time, update_time)
           VALUES (?, ?, ?, ?, ?, '件', 0, NOW(), NOW())
           ON DUPLICATE KEY UPDATE
             quantity = quantity + VALUES(quantity),
             material_code = VALUES(material_code),
             material_name = VALUES(material_name),
             deleted = 0,
             update_time = NOW()`;
