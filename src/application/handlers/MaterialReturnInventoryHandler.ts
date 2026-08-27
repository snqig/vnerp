import { EventHandler } from '../../infrastructure/event-bus/EventBus';
import { MaterialReturnApprovedEvent } from '@/domain/production/events/PickOrderEvents';
import { transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';
import { InventoryCostService } from '@/application/services/InventoryCostService';
import { appendInventoryTransaction, recomputeInventorySummary } from '@/lib/inventory-ledger';

const costService = new InventoryCostService();

export class MaterialReturnInventoryHandler implements EventHandler<MaterialReturnApprovedEvent> {
  async handle(event: MaterialReturnApprovedEvent): Promise<void> {
    const { returnId, returnNo, warehouseId, items } = event.payload;

    await transaction(async (conn) => {
      for (const item of items) {
        const [existingInv] = await conn.execute(
          'SELECT id, quantity FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE',
          [item.materialId, warehouseId]
        );

        if (existingInv.length > 0) {
          const invRow = existingInv[0] as { id: number };
          await conn.execute(
            'UPDATE inv_inventory SET quantity = quantity + ?, available_qty = available_qty + ?, update_time = NOW() WHERE id = ?',
            [item.quantity, item.quantity, invRow.id]
          );
          if (item.unitPrice && item.unitPrice > 0) {
            await costService.onInbound(conn, invRow.id, item.quantity, item.unitPrice);
          }
        } else {
          const [newInv] = await conn.execute(
            `INSERT INTO inv_inventory (material_id, material_code, material_name, warehouse_id, quantity, available_qty, unit, create_time)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              item.materialId,
              item.materialCode || null,
              item.materialName,
              warehouseId,
              item.quantity,
              item.quantity,
              item.unit || '件',
            ]
          );
          const newInvId = (newInv as unknown as { insertId: number }).insertId;
          if (item.unitPrice && item.unitPrice > 0) {
            await costService.onInbound(conn, newInvId, item.quantity, item.unitPrice);
          }
        }

        if (item.batchNo) {
          // 优先用 batch_id 精确匹配，防止同名 batch_no 冲突
          let batchRow: any;
          if (item.batchId) {
            [batchRow] = await conn.execute(
              'SELECT id, available_qty, quantity, inbound_date FROM inv_inventory_batch WHERE id = ? AND material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE',
              [item.batchId, item.materialId, warehouseId]
            );
          }
          if (!batchRow || batchRow.length === 0) {
            [batchRow] = await conn.execute(
              'SELECT id, available_qty, quantity, inbound_date FROM inv_inventory_batch WHERE batch_no = ? AND material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE',
              [item.batchNo, item.materialId, warehouseId]
            );
          }

          if (batchRow.length > 0) {
            await conn.execute(
              'UPDATE inv_inventory_batch SET available_qty = available_qty + ?, quantity = quantity + ?, update_time = NOW() WHERE id = ?',
              [item.quantity, item.quantity, batchRow[0].id]
            );
          } else {
            // 批次不存在则新建，用 originalInboundDate 回填入库日期
            await conn.execute(
              `INSERT INTO inv_inventory_batch (batch_no, material_id, material_name, warehouse_id, available_qty, quantity, unit_price, inbound_date, status, create_time)
               VALUES (?, ?, ?, ?, ?, ?, 0, ?, 1, NOW())`,
              [
                item.batchNo,
                item.materialId,
                item.materialName,
                warehouseId,
                item.quantity,
                item.quantity,
                item.originalInboundDate || 'CURDATE()',
              ]
            );
          }

          // 批次明细已更新：派生重算汇总表
          await recomputeInventorySummary(conn, item.materialId, warehouseId);
        }

        // 财务级库存流水（'in' 退库入库），与库存变动同事务，失败整体回滚。
        await appendInventoryTransaction(conn, {
          transType: 'in',
          sourceType: 'material_return',
          sourceId: returnId,
          materialId: item.materialId,
          batchNo: item.batchNo || null,
          warehouseId,
          quantity: item.quantity,
          unitPrice: item.unitPrice || 0,
          totalAmount: (item.unitPrice || 0) * item.quantity,
          referenceNo: returnNo,
          remark: `物料退库入账: ${item.materialName}`,
          createBy: null,
        });
      }
    });

    secureLog('info', 'Inventory increased for material return', {
      returnNo,
      itemCount: items.length,
    });
  }
}
