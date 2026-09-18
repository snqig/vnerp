/**
 * src/app/api/dcprint/ink-surplus/route.ts 使用的 SQL 常量。
 *
 * 由 2026-09-18 的 P0 治理从 messages/*.json 的 i18n 合成键还原而来——
 * 这些值原先被 i18n codemod 当成「硬编码中文」抽成 k_xxxxxxxx 键，
 * 导致「改翻译文件 = 改实际执行的 DDL」。现回归为代码常量，禁止再写入 i18n。
 */

/** SELECT … */
export const SELECT_STMT = `
    SELECT
      ib.batch_no,
      ib.material_name,
      ib.available_qty,
      ib.unit_price,
      ib.expire_date,
      ib.inbound_date,
      ib.warehouse_id,
      w.warehouse_name,
      DATEDIFF(ib.expire_date, CURDATE()) as days_until_expiry,
      d.pantone_code,
      d.color_name as dispatch_color_name,
      d.formula_no,
      d.workorder_no as original_workorder
    FROM inv_inventory_batch ib
    LEFT JOIN inv_warehouse w ON ib.warehouse_id = w.id
    LEFT JOIN ink_dispatch d ON d.batch_no = ib.batch_no AND d.deleted = 0
    WHERE ib.deleted = 0 AND ib.available_qty > 0 AND ib.status = 1
      AND (ib.expire_date IS NULL OR ib.expire_date >= CURDATE())
      AND (ib.material_name LIKE '%专色%' OR ib.material_name LIKE '%调色%' OR ib.material_name LIKE '%余墨%'
        OR ib.batch_no LIKE 'INK%' OR ib.batch_no LIKE 'MIX%')
    ORDER BY ib.inbound_date ASC
  `;
