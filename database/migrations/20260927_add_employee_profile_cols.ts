/**
 * 迁移：补齐 sys_employee 的 bank_account / emergency_contact / emergency_phone
 *
 * 背景（含一次自我纠错，勿再重复）
 * --------------------------------
 * 这批列先前被「僵尸声明」判定误伤：当时用 `precise-refs.mts` 复核，条件是
 * 「同一文件内同时出现表名 + 列名」，结论是这 3 列除 schema 声明行外无任何引用，
 * 于是删掉了声明。删完立刻被 tsc 打脸：
 *   - EmployeeRepository.ts:32  `row.emergencyContact`
 *   - EmployeeRepository.ts:54  `emp.emergencyContact`
 *   - api/hr/finance-sync/salary-transfer/route.ts  `bankAccount`
 * 它们用 camelCase 读字段，走的是映射层，**不会命中「表名+列名」的文本匹配**。
 * 更糟的是这类写法不会报错——`row.emergencyContact || ''` 永远取到 undefined，
 * 静默丢数据。所以「无引用」的判据只能是运行时/类型检查，**不能是文本搜索**。
 *
 * 类型沿用原声明：bank_account VARCHAR(50) / emergency_contact VARCHAR(50) /
 * emergency_phone VARCHAR(20)，均可空（历史库里没有，补列不该拒绝现有 11 名员工）。
 */
import type { Connection } from 'mysql2/promise';

const COLUMNS: { column: string; ddl: string; comment: string }[] = [
  { column: 'bank_account', ddl: 'VARCHAR(50) NULL', comment: '银行账号' },
  { column: 'emergency_contact', ddl: 'VARCHAR(50) NULL', comment: '紧急联系人' },
  { column: 'emergency_phone', ddl: 'VARCHAR(20) NULL', comment: '紧急联系电话' },
];

export async function up(conn: Connection): Promise<void> {
  for (const { column, ddl, comment } of COLUMNS) {
    const [rows] = await conn.query(
      `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
       WHERE table_schema = DATABASE() AND table_name = 'sys_employee' AND column_name = ?`,
      [column]
    );
    if (Number((rows as { c: number }[])[0]?.c ?? 0) > 0) {
      console.log(`  · 已存在，跳过  sys_employee.${column}`);
      continue;
    }
    await conn.query(
      `ALTER TABLE \`sys_employee\` ADD COLUMN \`${column}\` ${ddl} COMMENT '${comment}'`
    );
    console.log(`  + 已加列  sys_employee.${column}  ${ddl}`);
  }
}
