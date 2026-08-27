/**
 * 082 出库明细支持"需求宽度"，用于长度类物料按宽度做 FIFO 横切(宽卷分条)。
 * 不传则后端回退到物料标称宽度。幂等（information_schema 探测）。
 */
import { Connection } from 'mysql2/promise';

const COLS: Array<[string, string, string]> = [
  ['inv_outbound_item', 'width', "DECIMAL(18,4) DEFAULT NULL COMMENT '需求宽度(mm)，长度类物料按此宽度做 FIFO 横切'"],
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
