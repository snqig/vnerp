import { EventHandler } from '../../infrastructure/event-bus/EventBus';
import { InboundOrderApprovedEvent } from '@/domain/warehouse/events/InboundOrderEvents';
import { transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';
import type { RowDataPacket } from 'mysql2';

interface PurchaseLineRow {
  id: number;
  line_no: number;
  material_id: number;
  order_qty: number;
  received_qty: number;
}

export class PurchaseInboundSyncHandler implements EventHandler<InboundOrderApprovedEvent> {
  async handle(event: InboundOrderApprovedEvent): Promise<void> {
    const { inboundId, inboundNo, poId, items } = event.payload;

    if (!poId) return;

    await transaction(async (conn) => {
      const [lineRows] = await conn.execute<RowDataPacket[]>(
        'SELECT id, line_no, material_id, order_qty, received_qty FROM pur_purchase_order_line WHERE po_id = ? FOR UPDATE',
        [poId]
      );

      if (!lineRows || lineRows.length === 0) {
        secureLog('warn', 'Purchase order lines not found for inbound sync', { poId, inboundNo });
        return;
      }

      const lines = lineRows as unknown as PurchaseLineRow[];
      let allFullyReceived = true;

      for (const item of items) {
        const line = lines.find((l) => l.material_id === item.materialId);
        if (!line) {
          secureLog('warn', 'Matching PO line not found for material', {
            poId,
            materialId: item.materialId,
            inboundNo,
          });
          continue;
        }

        const newReceivedQty = Number(line.received_qty) + item.quantity;
        await conn.execute(
          'UPDATE pur_purchase_order_line SET received_qty = ?, update_time = NOW() WHERE id = ?',
          [newReceivedQty, line.id]
        );

        if (newReceivedQty < Number(line.order_qty)) {
          allFullyReceived = false;
        }
      }

      for (const line of lines) {
        const notMatched = !items.some((i) => i.materialId === line.material_id);
        if (notMatched && Number(line.received_qty) < Number(line.order_qty)) {
          allFullyReceived = false;
        }
      }

      const newStatus = allFullyReceived ? 50 : 40;
      await conn.execute(
        'UPDATE pur_purchase_order SET status = ?, update_time = NOW() WHERE id = ? AND status IN (30, 40)',
        [newStatus, poId]
      );

      secureLog('info', 'Purchase order synced from inbound approval', {
        poId,
        inboundNo,
        newStatus,
        allFullyReceived,
      });
    });
  }
}
