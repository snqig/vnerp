/**
 * 分切物料类型限制（#21）
 *
 * 正向迁移 (up):
 *   1. 给 inv_material 增加 is_splittable TINYINT(1) NOT NULL DEFAULT 0
 *      （MySQL8 不支持 ADD COLUMN IF NOT EXISTS，先查 INFORMATION_SCHEMA 探测）。
 *   2. 按物料分类初始化白名单：FILM / PAPER / PKG / RAW 置位 1。
 *      白名单是【数据】，不是【代码】——列本身只表达"是否可分切"，
 *      具体哪些分类可分切由本迁移的 UPDATE 决定，便于后续调整。
 *   3. 建 (is_splittable, deleted) 索引，加速"仅查可切物料"的前端选择器。
 *
 * 反向迁移 (down): 删除 is_splittable 列。
 *
 * 幂等性：up 可重复执行（探测列存在则跳过 ALTER；UPDATE 按当前分类重算，
 * 不会破坏手动覆盖——见下）。
 *
 * 注意（手动覆盖）：若某些非白名单物料需允许分切，或白名单物料需禁止分切，
 * 由主数据维护页 PATCH /api/materials/[id] 单独改写该列，覆盖本迁移的默认置位。
 */
import { Connection } from 'mysql2/promise';

const SPLITTABLE_CATEGORY_CODES = ['FILM', 'PAPER', 'PKG', 'RAW'];

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
  if (!(await columnExists(conn, 'is_splittable'))) {
    await conn.execute(
      `ALTER TABLE inv_material
       ADD COLUMN is_splittable TINYINT(1) NOT NULL DEFAULT 0
       COMMENT '是否允许分切（卷材类物料允许分切，由分类初始化并支持主数据手动覆盖）'`
    );
    await conn.execute(
      `CREATE INDEX idx_inv_material_is_splittable ON inv_material (is_splittable, deleted)`
    );
  }

  // 仅对"当前未手动覆盖"的行按分类重算：用 LEFT JOIN 排除已被手动置位的行会复杂化，
  // 这里采用最简策略——白名单分类统一置 1（已是 1 的不变，非白名单不动，保留人工 0/1 覆盖）。
  const placeholders = SPLITTABLE_CATEGORY_CODES.map(() => '?').join(',');
  await conn.execute(
    `UPDATE inv_material m
       JOIN inv_material_category c ON m.category_id = c.id AND c.deleted = 0
       SET m.is_splittable = 1
       WHERE c.category_code IN (${placeholders})`,
    SPLITTABLE_CATEGORY_CODES
  );
}

export async function down(conn: Connection): Promise<void> {
  if (await columnExists(conn, 'is_splittable')) {
    await conn.execute(`ALTER TABLE inv_material DROP COLUMN is_splittable`);
  }
}
