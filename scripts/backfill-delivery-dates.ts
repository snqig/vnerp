/**
 * 回填采购订单的期望到货日期
 * 对 delivery_date 为 NULL 的草稿/待审批状态订单进行回填
 * 使用方法: npx tsx scripts/backfill-delivery-dates.ts
 */

import { query, execute } from '../src/lib/db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

type DbRow = RowDataPacket & { [column: string]: unknown };

async function main() {
  console.log('========================================');
  console.log('回填采购订单期望到货日期');
  console.log('========================================\n');

  try {
    // 查找 delivery_date 为 NULL 的订单
    const orders = await query(
      `SELECT id, po_no, status, order_date FROM pur_purchase_order
       WHERE deleted = 0 AND delivery_date IS NULL
       AND status IN (10, 20)
       ORDER BY id`
    ) as DbRow[];

    if (orders.length === 0) {
      console.log('没有需要回填的订单（所有订单已有期望到货日期）');
      return;
    }

    console.log(`找到 ${orders.length} 条需要回填的订单:\n`);

    let updatedCount = 0;
    for (const order of orders) {
      // 期望到货日期 = 订单日期 + 随机 7~14 天
      const baseDate = order.order_date || new Date().toISOString().slice(0, 10);
      const offsetDays = 7 + (Number(order.id) % 8);
      const deliveryDate = new Date(
        new Date(baseDate).getTime() + offsetDays * 86400000
      ).toISOString().slice(0, 10);

      const result = await execute(
        `UPDATE pur_purchase_order SET delivery_date = ? WHERE id = ?`,
        [deliveryDate, order.id]
      ) as ResultSetHeader;

      if (result.affectedRows > 0) {
        console.log(`✓ ${order.po_no}: ${baseDate} → ${deliveryDate} (+${offsetDays}天)`);
        updatedCount++;
      }
    }

    console.log(`\n========================================`);
    console.log(`回填完成: ${updatedCount}/${orders.length} 条`);
    console.log('========================================');

  } catch (error: any) {
    console.error('\n执行失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
