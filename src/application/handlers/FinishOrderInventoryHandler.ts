import { transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';
import type { DomainEvent } from '@/domain/shared/DomainTypes';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

/**
 * 完工入库单审核后的库存联动处理器
 * 监听：prod.finish.approved
 * 功能：增加成品库存，回写工单完工数量
 *
 * 幂等性：通过 INSERT IGNORE + 唯一索引 uk_inv_txn_source (source_type, source_id)
 * 防止 XAUTOCLAIM 重投递导致的重复处理（TOCTOU 竞态）。
 * 事务保证 INSERT IGNORE + 库存 UPDATE + 流水 INSERT 三步原子性。
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

    await transaction(async (conn) => {
      // 获取工单的产品信息
      const [woRows] = await conn.execute<RowDataPacket[]>(
        'SELECT product_id, product_code, product_name FROM prod_work_order WHERE id = ? AND deleted = 0',
        [workOrderId]
      );
      const wo = woRows[0];
      if (!wo) {
        secureLog('warn', 'FinishOrderInventoryHandler: work order not found', { workOrderId });
        return;
      }

      const productId = wo.product_id || wo.productId;
      const productCode = wo.product_code || wo.productCode;

      const transNo = `FN${Date.now()}`;

      // Idempotency: INSERT IGNORE into inv_inventory_transaction, guarded by unique index
      // uk_inv_txn_source (source_type, source_id).
      // - affectedRows === 0 → already processed, skip (idempotent)
      // - affectedRows === 1 → first time, continue with inventory update
      const [txnResult] = await conn.execute<ResultSetHeader>(
        `INSERT IGNORE INTO inv_inventory_transaction
         (trans_no, trans_type, source_type, source_id, material_id, warehouse_id, quantity, create_time)
         VALUES (?, 'in', 'prod_finish', ?, ?, ?, ?, NOW())`,
        [transNo, finishOrderId, productId, warehouseId, qualifiedQty]
      );

      if (txnResult.affectedRows === 0) {
        secureLog('info', 'FinishOrderInventoryHandler: already processed, skipping', {
          finishOrderId,
        });
        return;
      }

      // 增加成品库存
      const [existing] = await conn.execute<RowDataPacket[]>(
        'SELECT id FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0',
        [productId, warehouseId]
      );

      if (existing.length > 0) {
        await conn.execute(
          `UPDATE inv_inventory SET quantity = quantity + ?,
           available_qty = available_qty + ?, update_time = NOW()
           WHERE material_id = ? AND warehouse_id = ? AND deleted = 0`,
          [qualifiedQty, qualifiedQty, productId, warehouseId]
        );
      } else {
        await conn.execute(
          `INSERT INTO inv_inventory
           (material_id, material_code, material_name, warehouse_id, quantity, available_qty, unit, create_time)
           VALUES (?, ?, ?, ?, ?, ?, '件', NOW())`,
          [productId, productCode, productName, warehouseId, qualifiedQty, qualifiedQty]
        );
      }
    });
  }
}
