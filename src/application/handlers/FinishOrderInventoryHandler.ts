import { execute } from '@/lib/db';
import { secureLog } from '@/lib/logger';
import type { DomainEvent } from '@/domain/shared/DomainTypes';

/**
 * 完工入库单审核后的库存联动处理器
 * 监听：prod.finish.approved
 * 功能：增加成品库存，回写工单完工数量
 */
export class FinishOrderInventoryHandler {
  async handle(event: DomainEvent): Promise<void> {
    const { finishOrderId, workOrderId, productName, qualifiedQty, warehouseId } =
      event.payload as {
        finishOrderId: number;
        finishNo: string;
        workOrderId: number;
        workOrderNo: string;
        productName: string;
        qualifiedQty: number;
        defectiveQty: number;
        warehouseId: number;
        userId: number;
      };

    secureLog('info', 'FinishOrderInventoryHandler: processing finish order approval', {
      finishOrderId,
      workOrderId,
      qualifiedQty,
      warehouseId,
    });

    // Idempotency: skip if this finish order was already processed (prevents double-counting
    // when the production-inbound route has already performed the inventory updates).
    const existingTxn = await execute(
      'SELECT id FROM inv_inventory_transaction WHERE source_type = ? AND source_id = ? LIMIT 1',
      ['prod_finish', finishOrderId]
    );
    if ((existingTxn as any).length > 0) {
      secureLog('info', 'FinishOrderInventoryHandler: already processed, skipping', {
        finishOrderId,
      });
      return;
    }

    // 获取工单的产品信息
    const woRows = await execute(
      'SELECT product_id, product_code, product_name FROM prod_work_order WHERE id = ? AND deleted = 0',
      [workOrderId]
    );
    const wo = (woRows as any)[0];
    if (!wo) {
      secureLog('warn', 'FinishOrderInventoryHandler: work order not found', { workOrderId });
      return;
    }

    const productId = wo.product_id || wo.productId;
    const productCode = wo.product_code || wo.productCode;

    const transNo = `FN${Date.now()}`;

    // 增加成品库存
    const existing = await execute(
      'SELECT id FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0',
      [productId, warehouseId]
    );

    if ((existing as any).length > 0) {
      await execute(
        `UPDATE inv_inventory SET quantity = quantity + ?,
         available_qty = available_qty + ?, update_time = NOW()
         WHERE material_id = ? AND warehouse_id = ? AND deleted = 0`,
        [qualifiedQty, qualifiedQty, productId, warehouseId]
      );
    } else {
      await execute(
        `INSERT INTO inv_inventory
         (material_id, material_code, material_name, warehouse_id, quantity, available_qty, unit, create_time)
         VALUES (?, ?, ?, ?, ?, ?, '件', NOW())`,
        [productId, productCode, productName, warehouseId, qualifiedQty, qualifiedQty]
      );
    }

    await execute(
      `INSERT INTO inv_inventory_transaction
       (trans_no, trans_type, source_type, source_id, material_id, warehouse_id, quantity, create_time)
       VALUES (?, 'in', 'prod_finish', ?, ?, ?, ?, NOW())`,
      [transNo, finishOrderId, productId, warehouseId, qualifiedQty]
    );
  }
}
