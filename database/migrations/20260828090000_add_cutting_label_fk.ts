/**
 * 引用完整性兜底（#22 · 切割标签 / #18 类4）
 *
 * 目标：inv_cutting_record.source_label_id 与 inv_cutting_detail.new_label_id
 * 当前【没有任何外键】，可写入指向不存在标签的悬空引用（#18 实测 live 曾长期
 * 存在 10+10 行悬空，且 NOT NULL 列无法置 NULL）。本迁移补齐外键，从根本上
 * 阻止该类悬空再次发生。
 *
 * 同时补齐 inv_cutting_detail.record_id → inv_cutting_record(id) 的父子外键
 * （ON DELETE CASCADE），避免孤立的分切明细行。
 *
 * 正向迁移 (up):
 *   对每个外键：
 *   1. 若已存在则跳过（幂等）。
 *   2. 防御性清理：删除该列指向不存在引用行的悬空数据（#18 类4 垃圾行）。
 *   3. 加外键（标签列 RESTRICT，record_id CASCADE）。
 *
 * 反向迁移 (down): 依次删除三个外键（不影响数据）。
 *
 * E2E 影响（#29）：
 *   - 活跃 reseed（core-flow-seed）用真实刚建的标签 ID（srcLabel.id /
 *     newLblRow[0].id），且切割/标签表不在其 clearTables 清单中，故加 FK 不会
 *     阻断 reseed，也不会触发清表顺序冲突。
 *   - legacy seed（full-seed-steps）原硬编码 srcId，已同步改为按 label_no 真实
 *     查 ID（见 src/lib/seeds/full-seed-steps.ts），与 auto_increment 解耦，
 *     在 FK 下始终合法。
 */
import { Connection } from 'mysql2/promise';

interface FkSpec {
  name: string;
  table: string;
  column: string;
  refTable: string;
  refColumn: string;
  onDelete: 'RESTRICT' | 'CASCADE' | 'SET NULL';
}

const FKS: FkSpec[] = [
  {
    name: 'fk_inv_cutting_record_source_label',
    table: 'inv_cutting_record',
    column: 'source_label_id',
    refTable: 'inv_material_label',
    refColumn: 'id',
    onDelete: 'RESTRICT',
  },
  {
    name: 'fk_inv_cutting_detail_new_label',
    table: 'inv_cutting_detail',
    column: 'new_label_id',
    refTable: 'inv_material_label',
    refColumn: 'id',
    onDelete: 'RESTRICT',
  },
  {
    name: 'fk_inv_cutting_detail_record',
    table: 'inv_cutting_detail',
    column: 'record_id',
    refTable: 'inv_cutting_record',
    refColumn: 'id',
    onDelete: 'CASCADE',
  },
];

async function fkExists(conn: Connection, name: string, table: string): Promise<boolean> {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) as c FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND CONSTRAINT_NAME = ?
       AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
    [table, name]
  );
  const result = rows as Array<{ c: number }>;
  return result[0]?.c > 0;
}

export async function up(conn: Connection): Promise<void> {
  for (const fk of FKS) {
    if (await fkExists(conn, fk.name, fk.table)) continue;

    // 防御性清理：删除指向不存在引用行的悬空数据（#18 类4 垃圾行）
    await conn.execute(
      `DELETE FROM ${fk.table} t
       WHERE t.${fk.column} IS NOT NULL
         AND t.${fk.column} > 0
         AND NOT EXISTS (
           SELECT 1 FROM ${fk.refTable} r WHERE r.${fk.refColumn} = t.${fk.column}
         )`
    );

    // 加外键
    await conn.execute(
      `ALTER TABLE ${fk.table}
       ADD CONSTRAINT ${fk.name}
       FOREIGN KEY (${fk.column}) REFERENCES ${fk.refTable} (${fk.refColumn})
       ON DELETE ${fk.onDelete} ON UPDATE CASCADE`
    );
  }
}

export async function down(conn: Connection): Promise<void> {
  // 逆序删除，避免依赖顺序问题
  for (const fk of [...FKS].reverse()) {
    if (await fkExists(conn, fk.name, fk.table)) {
      await conn.execute(`ALTER TABLE ${fk.table} DROP FOREIGN KEY ${fk.name}`);
    }
  }
}
