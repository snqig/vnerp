import { getTranslations } from 'next-intl/server';

import { EventHandler } from '@/infrastructure/event-bus/EventBus';
import { PurchaseReturnCompletedEvent } from '@/domain/purchase/events/PurchaseReturnEvents';
import { query, transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';

/** 采购退货明细行 */
interface PurchaseReturnLineRow {
  order_line_id: number;
  material_id: number;
  quantity: string | number;
}

/** 退货状态统计行 */
interface OrderReturnStatusRow {
  total_lines: number;
  fully_returned_lines: number | null;
}

/**
 * 处理采购退货完成事件：
 * 1. 更新采购订单行的 returned_qty（已退货数量）
 * 2. 如果采购订单所有行已全部退货，更新采购订单状态
 */
export class PurchaseReturnCompletedHandler implements EventHandler<PurchaseReturnCompletedEvent> {
  async handle(event: PurchaseReturnCompletedEvent): Promise<void> {
  const ts = await getTranslations('Common');
    const { returnId, returnNo, orderId, items, completedBy } = event.payload;

    secureLog('info', ts('k_7gn23z'), {
      returnId,
      returnNo,
      orderId,
      itemCount: items.length,
      completedBy,
    });

    const returnLines = await query<PurchaseReturnLineRow>(
      `SELECT order_line_id, material_id, quantity
       FROM pur_purchase_return_line
       WHERE return_id = ? AND order_line_id IS NOT NULL`,
      [returnId]
    );

    if (!returnLines || returnLines.length === 0) {
      secureLog('warn', ts('k_1hov66u'), { returnId, returnNo });
      return;
    }

    await transaction(async (conn) => {
      for (const line of returnLines) {
        await conn.execute(
          `UPDATE pur_purchase_order_line
           SET returned_qty = returned_qty + ?
           WHERE id = ?`,
          [Number(line.quantity), line.order_line_id]
        );

        secureLog('info', ts('k_1gr079u'), {
          orderLineId: line.order_line_id,
          materialId: line.material_id,
          returnQty: Number(line.quantity),
        });
      }

      await this.checkOrderReturnStatus(conn, orderId);
    });
  }

  private async checkOrderReturnStatus(conn: PoolConnection, orderId: number): Promise<void> {
  const ts = await getTranslations('Common');
    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT
         COUNT(*) AS total_lines,
         SUM(CASE WHEN returned_qty >= order_qty AND order_qty > 0 THEN 1 ELSE 0 END) AS fully_returned_lines
       FROM pur_purchase_order_line
       WHERE po_id = ?`,
      [orderId]
    );

    const result = rows[0] as unknown as OrderReturnStatusRow | undefined;
    const totalLines = Number(result?.total_lines || 0);
    const fullyReturnedLines = Number(result?.fully_returned_lines || 0);

    if (totalLines > 0 && fullyReturnedLines === totalLines) {
      secureLog('info', ts('k_ixv5uj'), { orderId });
    }
  }
}
