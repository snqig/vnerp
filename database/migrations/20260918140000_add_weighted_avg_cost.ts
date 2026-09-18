/**
 * 物料移动加权平均成本列（inv_material.weighted_avg_cost）
 *
 * 背景（2026-09-18 运行时核实）：
 *   `MaterialCostProvider`（src/infrastructure/providers/MaterialCostProvider.ts:26）
 *   作为**配方/油墨成本的第一优先来源**查询 `inv_material.weighted_avg_cost`，
 *   但该列在库中**从未创建** → 查询抛 ER_BAD_FIELD_ERROR → 被空 catch 静默吞掉
 *   → 降级到第二来源 `base_ink.unit_price`，而 base_ink 共 3 行且 unit_price>0 为 0 行
 *   → **配方成本恒为 0**。
 *
 *   MaterialCostProvider 挂在活链路上：InkFormulaVersionService.ts:30/124
 *   → FormulaCostService:64。故本列是「成本能算出来」的前置条件。
 *
 * 正向迁移 (up):
 *   1. 给 inv_material 增加 weighted_avg_cost DECIMAL(18,4) NULL
 *      （MySQL8 不支持 ADD COLUMN IF NOT EXISTS，先查 INFORMATION_SCHEMA 探测；
 *        与 20260827132300_add_is_splittable.ts 保持同一写法）
 *   2. 初始回填：按物料聚合 inv_inventory.unit_cost 的数量加权平均
 *      （与库存台账同口径；仓库间按数量加权，总量为 0 时退化为简单平均）
 *
 * 反向迁移 (down): 删除该列。
 *
 * 幂等性：up 可重复执行（列存在则跳过 ALTER；回填 UPDATE 不覆盖已有非空值）。
 *
 * 后续维护（不是本迁移的职责，但缺了它本列会陈旧）：
 *   src/application/services/InventoryCostService.ts 的 onInbound /
 *   onInboundRollback 是唯一重算 inv_inventory.unit_cost 的地方，
 *   已在此同步刷新 inv_material.weighted_avg_cost。
 */
import { Connection } from 'mysql2/promise';

async function columnExists(conn: Connection, column: string): Promise<boolean> {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) as c FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_material' AND COLUMN_NAME = ?`,
    [column]
  );
  const result = rows as Array<{ c: number }>;
  return result[0]?.c > 0;
}

export async function up(conn: Connection): Promise<void> {
  if (!(await columnExists(conn, 'weighted_avg_cost'))) {
    await conn.execute(
      `ALTER TABLE inv_material
       ADD COLUMN weighted_avg_cost DECIMAL(18,4) NULL
       COMMENT '移动加权平均成本（由 inv_inventory.unit_cost 按物料数量加权聚合同步）'`
    );
  }

  // 初始回填：库存台账数量加权平均（与 InventoryCostService 的 moving_average 引擎同口径）
  await conn.execute(
    `UPDATE inv_material im
     JOIN (
       SELECT material_id,
              CASE
                WHEN SUM(CASE WHEN unit_cost > 0 THEN quantity ELSE 0 END) > 0
                  THEN SUM(CASE WHEN unit_cost > 0 THEN unit_cost * quantity ELSE 0 END)
                       / SUM(CASE WHEN unit_cost > 0 THEN quantity ELSE 0 END)
                ELSE AVG(CASE WHEN unit_cost > 0 THEN unit_cost END)
              END AS wac
         FROM inv_inventory
        WHERE unit_cost > 0 AND deleted = 0 AND material_id IS NOT NULL
        GROUP BY material_id
     ) agg ON agg.material_id = im.id
        SET im.weighted_avg_cost = ROUND(agg.wac, 4),
            im.update_time = NOW()
      WHERE im.weighted_avg_cost IS NULL
        AND im.deleted = 0
        AND im.material_code NOT LIKE 'TEST%'
        AND agg.wac > 0`
  );
}

export async function down(conn: Connection): Promise<void> {
  if (await columnExists(conn, 'weighted_avg_cost')) {
    await conn.execute(`ALTER TABLE inv_material DROP COLUMN weighted_avg_cost`);
  }
}
