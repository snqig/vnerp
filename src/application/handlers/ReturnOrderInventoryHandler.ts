import { transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';
import { appendInventoryTransaction, recomputeInventorySummary } from '@/lib/inventory-ledger';
import type { DomainEvent } from '@/domain/shared/DomainTypes';

/**
 * 退料单审核后的库存联动处理器
 * 监听：prod.return.approved
 * 功能：增加原材料库存（退库）
 *
 * T-INV-5 批次回填：先 UPSERT inv_inventory_batch（批次明细为权威源），再派生重算
 * inv_inventory 汇总，最后写统一财务流水。消除「只改汇总不写批次」的静默回滚地雷。
 */
export class ReturnOrderInventoryHandler {
  async handle(event: DomainEvent): Promise<void> {
    const { returnOrderId, items } = event.payload as {
      returnOrderId: number;
      items: Array<{
        materialId: number;
        quantity: number;
        batchNo: string;
        warehouseId: number;
      }>;
    };

    secureLog('info', 'ReturnOrderInventoryHandler: processing return order approval', {
      returnOrderId,
      itemCount: items.length,
    });

    await transaction(async (conn) => {
      for (const item of items) {
        // 1) UPSERT 批次：批次存在则加数量，否则新建（退料入库=批次回库）
        const [batch] = (await conn.execute(
          'SELECT id, quantity, available_qty FROM inv_inventory_batch WHERE batch_no = ? AND material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE',
          [item.batchNo, item.materialId, item.warehouseId]
        )) as any;

        if (batch.length > 0) {
          await conn.execute(
            'UPDATE inv_inventory_batch SET quantity = quantity + ?, available_qty = available_qty + ?, update_time = NOW() WHERE id = ?',
            [item.quantity, item.quantity, batch[0].id]
          );
        } else {
          const [mat] = (await conn.execute(
            'SELECT material_code, material_name, unit FROM inv_material WHERE id = ?',
            [item.materialId]
          )) as any;
          const today = new Date().toISOString().slice(0, 10);
          await conn.execute(
            `INSERT INTO inv_inventory_batch
             (material_id, material_name, batch_no, quantity, available_qty, warehouse_id, inbound_date, status, create_time)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
            [
              item.materialId,
              (mat[0]?.material_name as string) || '',
              item.batchNo,
              item.quantity,
              item.quantity,
              item.warehouseId,
              today,
            ]
          );
        }

        // 2) 批次已变动：派生重算汇总（禁双写，汇总 = 批次 SUM）
        await recomputeInventorySummary(conn, item.materialId, item.warehouseId);

        // 3) 财务级流水（'in' 退料入库），与批次同事务，失败整体回滚
        await appendInventoryTransaction(conn, {
          transType: 'in',
          sourceType: 'prod_return',
          sourceId: returnOrderId,
          materialId: item.materialId,
          batchNo: item.batchNo || null,
          warehouseId: item.warehouseId,
          quantity: item.quantity,
          unitPrice: 0,
          totalAmount: 0,
          referenceNo: String(returnOrderId),
          remark: `退料入库: ${item.batchNo || ''}`,
          createBy: null,
        });
      }
    });
  }
}
