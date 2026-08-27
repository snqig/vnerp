import { transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';
import { appendInventoryTransaction, recomputeInventorySummary } from '@/lib/inventory-ledger';
import type { DomainEvent } from '@/domain/shared/DomainTypes';

/**
 * 领料单审核后的库存联动处理器
 * 监听：prod.pick.approved
 * 功能：扣减原材料库存（领料出库）
 *
 * T-INV-5 批次回填：先扣减指定 inv_inventory_batch（批次明细为权威源），再派生重算
 * inv_inventory 汇总，最后写统一财务流水。
 */
export class PickOrderInventoryHandler {
  async handle(event: DomainEvent): Promise<void> {
    const { pickOrderId, items } = event.payload as {
      pickOrderId: number;
      items: Array<{
        materialId: number;
        quantity: number;
        batchNo: string;
        warehouseId: number;
        batchId?: number | null;
        originalInboundDate?: string | null;
      }>;
    };

    secureLog('info', 'PickOrderInventoryHandler: processing pick order approval', {
      pickOrderId,
      itemCount: items.length,
    });

    await transaction(async (conn) => {
      for (const item of items) {
        // 1) 扣减指定批次（领料出库）
        const [batch] = (await conn.execute(
          'SELECT id, quantity, available_qty, inbound_date FROM inv_inventory_batch WHERE batch_no = ? AND material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE',
          [item.batchNo, item.materialId, item.warehouseId]
        )) as any;

        if (batch.length === 0) {
          throw new Error(`物料 ${item.materialId} 批次 ${item.batchNo} 不存在，无法领料出库`);
        }
        if (parseFloat(batch[0].available_qty) < item.quantity) {
          throw new Error(
            `物料 ${item.materialId} 批次 ${item.batchNo} 可用库存不足: 可用 ${batch[0].available_qty}, 需领 ${item.quantity}`
          );
        }
        const newQty = parseFloat(batch[0].quantity) - item.quantity;
        const newAvail = parseFloat(batch[0].available_qty) - item.quantity;
        if (newQty <= 0 || newAvail <= 0) {
          await conn.execute(
            'UPDATE inv_inventory_batch SET deleted = 1, update_time = NOW() WHERE id = ?',
            [batch[0].id]
          );
        } else {
          await conn.execute(
            'UPDATE inv_inventory_batch SET quantity = quantity - ?, available_qty = available_qty - ?, update_time = NOW() WHERE id = ?',
            [item.quantity, item.quantity, batch[0].id]
          );
        }

        // 2) 批次已变动：派生重算汇总（禁双写，汇总 = 批次 SUM）
        await recomputeInventorySummary(conn, item.materialId, item.warehouseId);

        // 3) 回填领料明细 batch_id + original_inbound_date（供追溯）
        await conn.execute(
          `UPDATE prd_material_issue_item
           SET batch_id = COALESCE(batch_id, ?), original_inbound_date = COALESCE(original_inbound_date, ?)
           WHERE issue_id = ? AND material_id = ? AND batch_no = ? AND deleted = 0`,
          [batch[0].id, batch[0].inbound_date, pickOrderId, item.materialId, item.batchNo]
        );

        // 4) 财务级流水（'out' 领料出库），与批次同事务，失败整体回滚
        await appendInventoryTransaction(conn, {
          transType: 'out',
          sourceType: 'prod_pick',
          sourceId: pickOrderId,
          materialId: item.materialId,
          batchNo: item.batchNo || null,
          warehouseId: item.warehouseId,
          quantity: item.quantity,
          unitPrice: 0,
          totalAmount: 0,
          referenceNo: String(pickOrderId),
          remark: `生产领料出库: ${item.batchNo || ''}`,
          createBy: null,
        });
      }
    });
  }
}
