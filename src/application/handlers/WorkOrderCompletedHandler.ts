import { EventHandler } from '@/infrastructure/event-bus/EventBus';
import { WorkOrderCompletedEvent } from '@/domain/production/events/WorkOrderEvents';
import { transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';
import { InventoryCostService } from '@/application/services/InventoryCostService';
import { appendInventoryTransaction, recomputeInventorySummary } from '@/lib/inventory-ledger';

const costService = new InventoryCostService();

/**
 * 处理工单完工事件：成品入库（增加库存）
 * - inv_inventory.quantity / available_qty 增加（不存在则创建）
 * - inv_inventory_batch 创建新批次
 * - inv_inventory_transaction 记录入库流水
 */
export class WorkOrderCompletedHandler implements EventHandler<WorkOrderCompletedEvent> {
  async handle(event: WorkOrderCompletedEvent): Promise<void> {
    const { workOrderId, workOrderNo, productId, productName, completedQty, warehouseId } =
      event.payload;

    if (completedQty <= 0) return;

    const batchNo = `WO${workOrderNo}${Date.now().toString().slice(-6)}`;
    const today = new Date().toISOString().slice(0, 10);

    await transaction(async (conn) => {
      const [invRows] = await conn.execute(
        `SELECT id, quantity, available_qty, unit
         FROM inv_inventory
         WHERE material_id = ? AND warehouse_id = ?
         FOR UPDATE`,
        [productId, warehouseId]
      ) as any;

      let materialCode = '';
      let unit = '件';

      const [matRows] = await conn.execute(
        `SELECT material_code, unit FROM inv_material WHERE id = ?`,
        [productId]
      ) as any;
      if (matRows.length > 0) {
        materialCode = matRows[0].material_code || '';
        unit = matRows[0].unit || '件';
      }

      if (invRows.length > 0) {
        const inv = invRows[0];
        await conn.execute(
          `UPDATE inv_inventory
           SET quantity = quantity + ?, available_qty = available_qty + ?, update_time = NOW()
           WHERE id = ?`,
          [completedQty, completedQty, inv.id]
        );
        unit = inv.unit || unit;
      } else {
        const [newInv] = await conn.execute(
          `INSERT INTO inv_inventory
             (material_id, material_code, material_name, warehouse_id, quantity, available_qty, unit, create_time)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
          [productId, materialCode, productName, warehouseId, completedQty, completedQty, unit]
        );
        const newInvId = (newInv as unknown as { insertId: number }).insertId;
        await costService.onInbound(conn, newInvId, completedQty, 0);
      }

      await conn.execute(
        `INSERT INTO inv_inventory_batch
           (material_id, material_name, batch_no, quantity, available_qty, warehouse_id, inbound_date, status, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
        [productId, productName, batchNo, completedQty, completedQty, warehouseId, today]
      );

      // 批次明细已新增：派生重算汇总表，杜绝双写漂移。
      await recomputeInventorySummary(conn, productId, warehouseId);

      // 财务级库存流水（'in' 工单完工入库），与批次新增同事务，失败整体回滚。
      await appendInventoryTransaction(conn, {
        transType: 'in',
        sourceType: 'workorder_completion',
        sourceId: workOrderId,
        materialId: productId,
        batchNo: batchNo,
        warehouseId,
        quantity: completedQty,
        unitPrice: 0,
        totalAmount: 0,
        referenceNo: workOrderNo,
        remark: `工单完工入库: ${productName}`,
        createBy: null,
      });
    });

    secureLog('info', '工单完工入库完成', {
      workOrderNo,
      workOrderId,
      productId,
      productName,
      completedQty,
      warehouseId,
      batchNo,
    });
  }
}
