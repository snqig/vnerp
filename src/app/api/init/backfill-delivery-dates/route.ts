import { getTranslations } from 'next-intl/server';
import { NextRequest } from 'next/server';
import { transaction } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

export const POST = withPermission(async (_request: NextRequest) => {
  const ts = await getTranslations('Common');
  const result = await transaction(async (conn) => {
    // 查找所有 delivery_date 为 NULL 的采购订单
    const [rows] = await conn.execute(
      `SELECT id, po_no, order_date, status FROM pur_purchase_order
       WHERE delivery_date IS NULL AND deleted = 0 ORDER BY id`
    ) as [import('@/types/db').DbRow[], unknown];

    const updated: string[] = [];
    const skipped: string[] = [];

    for (const row of rows) {
      const id = Number((row as any).id);
      const poNo = (row as any).po_no;
      const orderDate = (row as any).order_date;
      const status = Number((row as any).status);

      // 只更新草稿(10)或待审批(20)状态的订单，已审批/完成的跳过
      if (status !== 10 && status !== 20) {
        skipped.push(`${poNo} (status=${status})`);
        continue;
      }

      // 根据订单日期计算合理的交货日期（+7~14天）
      if (orderDate) {
        const date = new Date(orderDate as string);
        const daysOffset = 7 + (id % 8);
        date.setDate(date.getDate() + daysOffset);
        const deliveryDate = date.toISOString().slice(0, 10);

        await conn.execute(
          `UPDATE pur_purchase_order SET delivery_date = ? WHERE id = ? AND deleted = 0`,
          [deliveryDate, id]
        );
        updated.push(`${poNo} → ${deliveryDate}`);
      } else {
        skipped.push(`${poNo} (no order_date)`);
      }
    }

    return { updated, skipped, totalBackfilled: updated.length };
  });

  return successResponse({
    message: ts('k_mwby58'),
    stats: result,
  });
});
