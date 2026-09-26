/**
 * 迁移：sys_employee 增加 exit_date 列（离职日期）
 *
 * 背景
 * ----
 * turnover 报表原本用 `status = 3` 统计离职人数，但：
 * 1. sys_employee.status 默认值为 1（在职），从未有员工被手动置为 status=3
 * 2. 即使人工修改 status，也无法追溯「哪个月离职」，月度趋势图无法计算
 *
 * 解法：新增 exit_date 列，离职时填写实际离岗日期；
 * turnover 报表改为 `exit_date IS NOT NULL` 判离职，
 * 并按 MONTH(exit_date) 计算月度离职趋势。
 *
 * 与 status 的关系：
 * - exit_date IS NOT NULL 且 status != 1 → 明确离职
 * - exit_date IS NULL 且 status = 1    → 在职（含试用期）
 * - exit_date IS NULL 且 status != 1  → 灰色状态，报表按当前 status 语义处理
 */
import type { Connection } from 'mysql2/promise';

const DDL = `ALTER TABLE \`sys_employee\` ADD COLUMN \`exit_date\` DATE NULL COMMENT '离职日期'`;
const CHECK = `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
               WHERE table_schema = DATABASE() AND table_name = 'sys_employee'
                 AND column_name = 'exit_date'`;

export async function up(conn: Connection): Promise<void> {
  const [rows] = await conn.query(CHECK);
  const present = Number((rows as { c: number }[])[0]?.c ?? 0) > 0;
  if (present) {
    console.log('  · sys_employee.exit_date 已存在，跳过');
    return;
  }
  await conn.query(DDL);
  console.log('  + 已加列  sys_employee.exit_date  DATE NULL');
}
