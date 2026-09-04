import { getTranslations } from 'next-intl/server';

import { EventHandler } from '../../infrastructure/event-bus/EventBus';
import { PurchaseOrderReceivedEvent } from '@/domain/purchase/events/PurchaseOrderEvents';
import { transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';

export class PurchaseReceivedHandler implements EventHandler<PurchaseOrderReceivedEvent> {
  async handle(event: PurchaseOrderReceivedEvent): Promise<void> {
    const { orderId, orderNo, receivedItems, totalReceivedAmount } = event.payload;

    await transaction(async (conn) => {
  const ts = await getTranslations('Common');
      for (const item of receivedItems) {
        // R4 修复：uk_material_warehouse 唯一键不含 deleted，软删行仍占位。
        // 原「SELECT deleted=0 后 INSERT」遇软删行会撞 Duplicate entry 导致整事务回滚，
        // 改为原子 UPSERT，同时覆盖 新建 / 累加 / 软删行复活 三种场景。
        await conn.execute(
          ts('k_1g9yxif'),
          [item.materialId, item.materialCode, item.materialName, item.warehouseId, item.quantity]
        );

        const [existingBatch] = await conn.execute(
          'SELECT id, available_qty, quantity FROM inv_inventory_batch WHERE batch_no = ? AND material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE',
          [item.batchNo, item.materialId, item.warehouseId]
        );

        if (existingBatch.length > 0) {
          await conn.execute(
            'UPDATE inv_inventory_batch SET available_qty = available_qty + ?, quantity = quantity + ?, update_time = NOW() WHERE id = ?',
            [item.quantity, item.quantity, existingBatch[0].id]
          );
        } else {
          await conn.execute(
            `INSERT INTO inv_inventory_batch (batch_no, material_id, material_name, warehouse_id, available_qty, quantity, unit_price, inbound_date, status, create_time)
             VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), 1, NOW())`,
            [
              item.batchNo,
              item.materialId,
              item.materialName,
              item.warehouseId,
              item.quantity,
              item.quantity,
              item.unitPrice,
            ]
          );
        }

        const transNo = 'TRX' + Date.now() + String(item.materialId).slice(-4);
        await conn.execute(
          `INSERT INTO inv_inventory_transaction (trans_no, trans_type, source_type, source_id, material_id, material_code, batch_no, warehouse_id, quantity, unit_price, total_amount, create_time)
           VALUES (?, 'in', 'purchase', ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            transNo,
            orderId,
            item.materialId,
            item.materialCode,
            item.batchNo,
            item.warehouseId,
            item.quantity,
            item.unitPrice,
            item.quantity * item.unitPrice,
          ]
        );
      }
    });

    secureLog('info', 'Inventory updated for purchase received', {
      orderNo,
      itemCount: receivedItems.length,
      totalReceivedAmount,
    });
  }
}
