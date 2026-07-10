import { EventHandler } from '../../infrastructure/event-bus/EventBus';
import { InboundOrderUnapprovedEvent } from '@/domain/warehouse/events/InboundOrderEvents';
import { transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';
import { InventoryCostService } from '@/application/services/InventoryCostService';
import type { RowDataPacket } from 'mysql2';

const costService = new InventoryCostService();

/** 入库单行类型 */
interface InboundRow {
  warehouse_id: number;
}

/** 入库明细行类型 */
interface InboundItemRow {
  material_id: number;
  material_name: string;
  quantity: string | number;
  batch_no: string | null;
  unit_price: string | number;
}

/** 库存行类型 */
interface InventoryRow {
  id: number;
  quantity: string | number;
}

/** 库存批次行类型 */
interface InventoryBatchRow {
  id: number;
  available_qty: string | number;
  quantity: string | number;
}

export class InventoryRollbackHandler implements EventHandler<InboundOrderUnapprovedEvent> {
  async handle(event: InboundOrderUnapprovedEvent): Promise<void> {
    const { inboundId, inboundNo } = event.payload;

    await transaction(async (conn) => {
      // Fetch inbound order details from database
      const [inboundRows] = await conn.execute<RowDataPacket[]>(
        'SELECT warehouse_id FROM inv_inbound_order WHERE id = ? AND deleted = 0 LIMIT 1',
        [inboundId]
      );

      if (inboundRows.length === 0) {
        secureLog('warn', 'Inbound order not found for rollback', { inboundId });
        return;
      }

      const warehouseId = (inboundRows[0] as unknown as InboundRow).warehouse_id;

      // Fetch inbound items
      const [itemRows] = await conn.execute<RowDataPacket[]>(
        'SELECT material_id, material_name, quantity, batch_no, unit_price FROM inv_inbound_item WHERE order_id = ? AND deleted = 0',
        [inboundId]
      );

      const items = (itemRows as unknown[] as InboundItemRow[]).map((row) => ({
        materialId: row.material_id,
        materialName: row.material_name,
        quantity: Number(row.quantity),
        batchNo: row.batch_no,
        unitPrice: Number(row.unit_price) || 0,
      }));

      const sortedItems = [...items].sort((a, b) => a.materialId - b.materialId);

      for (const item of sortedItems) {
        const [existingInv] = await conn.execute<RowDataPacket[]>(
          'SELECT id, quantity FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE',
          [item.materialId, warehouseId]
        );

        if (existingInv.length > 0) {
          const invRow = existingInv[0] as unknown as InventoryRow;
          const newQty = parseFloat(String(invRow.quantity)) - item.quantity;
          if (newQty <= 0) {
            await conn.execute(
              'UPDATE inv_inventory SET quantity = 0, update_time = NOW() WHERE id = ?',
              [invRow.id]
            );
          } else {
            await conn.execute(
              'UPDATE inv_inventory SET quantity = quantity - ?, update_time = NOW() WHERE id = ?',
              [item.quantity, invRow.id]
            );
          }
          if (item.unitPrice > 0) {
            await costService.onInboundRollback(conn, invRow.id, item.quantity, item.unitPrice);
          }
        }

        const [existingBatch] = await conn.execute<RowDataPacket[]>(
          'SELECT id, available_qty, quantity FROM inv_inventory_batch WHERE batch_no = ? AND material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE',
          [item.batchNo, item.materialId, warehouseId]
        );

        if (existingBatch.length > 0) {
          const batchRow = existingBatch[0] as unknown as InventoryBatchRow;
          const newAvailableQty = parseFloat(String(batchRow.available_qty)) - item.quantity;
          const newQty = parseFloat(String(batchRow.quantity)) - item.quantity;
          if (newAvailableQty <= 0 || newQty <= 0) {
            await conn.execute(
              'UPDATE inv_inventory_batch SET deleted = 1, update_time = NOW() WHERE id = ?',
              [batchRow.id]
            );
          } else {
            await conn.execute(
              'UPDATE inv_inventory_batch SET available_qty = available_qty - ?, quantity = quantity - ?, update_time = NOW() WHERE id = ?',
              [item.quantity, item.quantity, batchRow.id]
            );
          }
        }
      }
    });

    secureLog('info', 'Inventory rolled back for unapproved inbound order', {
      orderNo: inboundNo,
    });
  }
}
