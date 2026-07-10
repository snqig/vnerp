import { EventHandler } from '../../infrastructure/event-bus/EventBus';
import { InboundOrderApprovedEvent } from '@/domain/warehouse/events/InboundOrderEvents';
import { transaction } from '@/lib/db';
import { logger, secureLog } from '@/lib/logger';
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
    const ctx = { module: 'purchase-inbound', action: 'sync', inboundId, poId };
    let phase = 'init';

    if (!poId) {
      logger.info(ctx, '跳过：无采购订单关联', { inboundNo });
      return;
    }

    try {
      await transaction(async (conn) => {
        phase = 'load_po_lines';
        const [lineRows] = await conn.execute<RowDataPacket[]>(
          'SELECT id, line_no, material_id, order_qty, received_qty FROM pur_purchase_order_line WHERE po_id = ? FOR UPDATE',
          [poId]
        );

        if (!lineRows || lineRows.length === 0) {
          secureLog('warn', 'Purchase order lines not found for inbound sync', { poId, inboundNo });
          logger.warn(ctx, `采购订单行不存在 [phase=${phase}]`, { poId, inboundNo });
          return;
        }

        const lines = lineRows as unknown as PurchaseLineRow[];
        logger.info(ctx, '采购订单行加载完成', {
          poId,
          lineCount: lines.length,
          inboundItemCount: items.length,
        });
        let allFullyReceived = true;

        phase = 'update_received_qty';
        for (const item of items) {
          const line = lines.find((l) => l.material_id === item.materialId);
          if (!line) {
            secureLog('warn', 'Matching PO line not found for material', {
              poId,
              materialId: item.materialId,
              inboundNo,
            });
            logger.warn(ctx, '入库明细未匹配到采购行，跳过', {
              materialId: item.materialId,
              inboundQty: item.quantity,
            });
            continue;
          }

          const newReceivedQty = Number(line.received_qty) + item.quantity;
          logger.info(ctx, '准备更新采购行已收量', {
            lineId: line.id,
            materialId: item.materialId,
            oldReceived: Number(line.received_qty),
            inboundQty: item.quantity,
            newReceived: newReceivedQty,
            orderQty: Number(line.order_qty),
            paramCount: 2,
          });
          await conn.execute(
            'UPDATE pur_purchase_order_line SET received_qty = ?, update_time = NOW() WHERE id = ?',
            [newReceivedQty, line.id]
          );
          logger.info(ctx, `采购行已收量更新`, {
            lineId: line.id,
            materialId: item.materialId,
            oldReceived: Number(line.received_qty),
            inboundQty: item.quantity,
            newReceived: newReceivedQty,
            orderQty: Number(line.order_qty),
          });

          if (newReceivedQty < Number(line.order_qty)) {
            allFullyReceived = false;
          }
        }

        const notFullyReceivedLines: Array<{
          lineId: number;
          materialId: number;
          received: number;
          ordered: number;
        }> = [];
        for (const line of lines) {
          const notMatched = !items.some((i) => i.materialId === line.material_id);
          if (notMatched && Number(line.received_qty) < Number(line.order_qty)) {
            allFullyReceived = false;
            notFullyReceivedLines.push({
              lineId: line.id,
              materialId: line.material_id,
              received: Number(line.received_qty),
              ordered: Number(line.order_qty),
            });
          }
        }

        phase = 'update_po_status';
        const newStatus = allFullyReceived ? 50 : 40;
        logger.info(ctx, 'PO 状态决策', {
          poId,
          allFullyReceived,
          newStatus,
          notFullyReceivedLines: notFullyReceivedLines.length ? notFullyReceivedLines : undefined,
        });
        await conn.execute(
          'UPDATE pur_purchase_order SET status = ?, update_time = NOW() WHERE id = ? AND status IN (30, 40)',
          [newStatus, poId]
        );

        logger.info(ctx, `采购订单状态更新完成`, {
          poId,
          inboundNo,
          newStatus,
          allFullyReceived,
          itemCount: items.length,
        });
        secureLog('info', 'Purchase order synced from inbound approval', {
          poId,
          inboundNo,
          newStatus,
          allFullyReceived,
        });
      });
    } catch (err) {
      logger.error(ctx, `PurchaseInboundSync 失败 [phase=${phase}]`, {
        error: err instanceof Error ? err.message : String(err),
        inboundNo,
        poId,
      });
      throw err;
    }
  }
}
