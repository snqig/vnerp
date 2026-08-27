/**
 * 080 长度/尺寸类物料按"面积"计量库存
 * 分切(母卷分条)时按面积守恒，避免卷数虚增。
 * 仅 ADD COLUMN，不改动既有 quantity(卷) 语义。幂等（information_schema 探测）。
 */
import { Connection } from 'mysql2/promise';

const COLS: Array<[string, string, string]> = [
  ['inv_inventory_batch', 'area', "DECIMAL(18,4) DEFAULT NULL COMMENT '面积(宽×长×数量)，长度类物料计量用'"],
  ['inv_inventory_batch', 'available_area', "DECIMAL(18,4) DEFAULT NULL COMMENT '可用面积'"],
  ['inv_inventory', 'area', "DECIMAL(18,4) DEFAULT NULL COMMENT '面积汇总(派生自批次)'"],
  ['inv_inventory', 'available_area', "DECIMAL(18,4) DEFAULT NULL COMMENT '可用面积汇总'"],
];

export async function up(conn: Connection): Promise<void> {
  for (const [table, col, def] of COLS) {
    const [rows] = await conn.query(
      `SELECT COUNT(*) c FROM information_schema.columns
       WHERE table_schema = 'vnerpdacahng' AND table_name = ? AND column_name = ?`,
      [table, col]
    );
    if ((rows as any[])[0].c === 0) {
      await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${col}\` ${def}`);
      console.log(`+ added ${table}.${col}`);
    } else {
      console.log(`= exists ${table}.${col}`);
    }
  }
}

export async function down(conn: Connection): Promise<void> {
  for (const [table, col] of COLS) {
    const [rows] = await conn.query(
      `SELECT COUNT(*) c FROM information_schema.columns
       WHERE table_schema = 'vnerpdacahng' AND table_name = ? AND column_name = ?`,
      [table, col]
    );
    if ((rows as any[])[0].c > 0) {
      await conn.query(`ALTER TABLE \`${table}\` DROP COLUMN \`${col}\``);
      console.log(`- dropped ${table}.${col}`);
    }
  }
}
