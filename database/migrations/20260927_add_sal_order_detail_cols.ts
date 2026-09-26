/**
 * 迁移：补齐 sal_order_detail 上「手写 SQL 在写、但库里没有」的列
 *
 * 为什么单独成对出现
 * ------------------
 * 20260927_add_sal_order_detail_material_code.ts 只补到了 material_code，
 * 结果 verify 阶段又撞见同一条 INSERT 还写了 `specification`（同样不存在）。
 * 这类幽灵列只能由「真实执行那条 INSERT」才会暴露，一补一个补丁会碎成文件坟场，
 * 所以本文件作为 **sal_order_detail 的持续补齐入口**：往后该表再发现缺列，
 * 直接往 COLUMNS 里追加一行即可，天然幂等、可重入。
 *
 * 字段清单取自 MysqlSalesOrderRepository.ts:183-186 的明细 INSERT，逐一比对库列得出。
 */
import type { Connection } from 'mysql2/promise';

const COLUMNS: { column: string; ddl: string; comment: string }[] = [
  { column: 'specification', ddl: 'VARCHAR(255) NULL', comment: '规格' },
];

export async function up(conn: Connection): Promise<void> {
  for (const { column, ddl, comment } of COLUMNS) {
    const [rows] = await conn.query(
      `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
       WHERE table_schema = DATABASE() AND table_name = 'sal_order_detail' AND column_name = ?`,
      [column]
    );
    if (Number((rows as { c: number }[])[0]?.c ?? 0) > 0) {
      console.log(`  · 已存在，跳过  sal_order_detail.${column}`);
      continue;
    }
    await conn.query(
      `ALTER TABLE \`sal_order_detail\` ADD COLUMN \`${column}\` ${ddl} COMMENT '${comment}'`
    );
    console.log(`  + 已加列  sal_order_detail.${column}  ${ddl}`);
  }
}
