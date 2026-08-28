/**
 * 引用完整性兜底（#22 · 类2 / #18 类2）
 *
 * 目标：prd_material_issue.work_order_id 当前【没有任何外键】，导致可写入
 * 指向不存在工单的悬空引用（#18 实测 live 长期存在 40 行悬空）。
 * 本迁移补齐外键，从根本上阻止该类悬空再次发生。
 *
 * 正向迁移 (up):
 *   1. 若外键 fk_prd_material_issue_work_order 不存在：
 *      a. 先清理现有悬空引用 —— 将 work_order_id 指向不存在 prd_work_order 的行
 *         置为 NULL（该列 IS_NULLABLE=YES，允许 NULL；FK 不约束 NULL）。
 *      b. 加 RESTRICT 外键：引用 prd_work_order(id)，删除工单时若有领料则阻断。
 *   2. 幂等：外键已存在则跳过。
 *
 * 反向迁移 (down): 删除该外键（不影响数据）。
 *
 * 注意（E2E 影响）：加 FK 后，任何写入 prd_material_issue.work_order_id 指向不存在
 * 工单的 INSERT 都会被 MySQL 拒绝（ER_NO_REFERENCED_ROW）。这正是期望的完整性约束；
 * 若现有 E2E 用例用无效 work_order_id 造数，会暴露为测试失败 —— 属 #22 第二部分
 * （E2E 隔离/污染清理）要修复的点。
 */
import { Connection } from 'mysql2/promise';

const FK_NAME = 'fk_prd_material_issue_work_order';

async function fkExists(conn: Connection, name: string): Promise<boolean> {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) as c FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'prd_material_issue'
       AND CONSTRAINT_NAME = ?
       AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
    [name]
  );
  const result = rows as Array<{ c: number }>;
  return result[0]?.c > 0;
}

export async function up(conn: Connection): Promise<void> {
  if (await fkExists(conn, FK_NAME)) return;

  // 1) 清理悬空引用：work_order_id 指向不存在的 prd_work_order → 置 NULL
  await conn.execute(
    `UPDATE prd_material_issue mi
     SET mi.work_order_id = NULL
     WHERE mi.deleted = 0
       AND mi.work_order_id IS NOT NULL
       AND mi.work_order_id > 0
       AND NOT EXISTS (
         SELECT 1 FROM prd_work_order wo WHERE wo.id = mi.work_order_id
       )`
  );

  // 2) 加 RESTRICT 外键（InnoDB 会自动在该列建立索引）
  await conn.execute(
    `ALTER TABLE prd_material_issue
     ADD CONSTRAINT ${FK_NAME}
     FOREIGN KEY (work_order_id) REFERENCES prd_work_order (id)
     ON DELETE RESTRICT ON UPDATE CASCADE`
  );
}

export async function down(conn: Connection): Promise<void> {
  if (await fkExists(conn, FK_NAME)) {
    await conn.execute(`ALTER TABLE prd_material_issue DROP FOREIGN KEY ${FK_NAME}`);
  }
}
