/**
 * 迁移补丁：补 sal_order_detail.material_code
 *
 * 为什么单独一个文件
 * ------------------
 * `20260927_add_missing_business_columns.ts` 已登记于 sys_migration(batch=144) 并执行完，
 * 但它的 19 列清单是**按 Drizzle schema 声明 + 少量 SQL 追查**得出的，不完备。
 * 执行后的 verify 阶段才撞见：MysqlSalesOrderRepository.ts:183-186 的明细 INSERT 还在写
 * `material_code`，库里只有 `material_name`。
 * 这类幽灵列是打地鼠式的——逐个发现逐个补会永远补不完，
 * 所以本补丁只补这一个确证的列，其余候选已另行普查上报，不在这里擅自加。
 *
 * 类型依据：同表 material_name 为 VARCHAR(100)；`material_code` 在各域ordinarily 取 50
 * （参见 prd_material_issue_item.materialCode 的声明），此处跟随 VARCHAR(50) 可空。
 */
import type { Connection } from 'mysql2/promise';

const DDL = "ALTER TABLE `sal_order_detail` ADD COLUMN `material_code` VARCHAR(50) NULL COMMENT '物料编码'";
const CHECK = `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
               WHERE table_schema = DATABASE() AND table_name = 'sal_order_detail'
                 AND column_name = 'material_code'`;

export async function up(conn: Connection): Promise<void> {
  const [rows] = await conn.query(CHECK);
  const present = Number((rows as { c: number }[])[0]?.c ?? 0) > 0;
  if (present) {
    console.log('  · sal_order_detail.material_code 已存在，跳过');
    return;
  }
  await conn.query(DDL);
  console.log('  + 已加列 sal_order_detail.material_code  VARCHAR(50) NULL');
}
