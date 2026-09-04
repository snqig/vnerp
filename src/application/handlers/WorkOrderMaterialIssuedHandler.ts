import { getTranslations } from 'next-intl/server';

import { EventHandler } from '@/infrastructure/event-bus/EventBus';
import { WorkOrderMaterialIssuedEvent } from '@/domain/production/events/WorkOrderEvents';
import { transaction } from '@/lib/db';
import { logger, secureLog } from '@/lib/logger';
import { appendInventoryTransaction, recomputeInventorySummary } from '@/lib/inventory-ledger';

/**
 * 处理工单领料事件：扣减库存
 * - inv_inventory.quantity / available_qty 减少
 * - inv_inventory_batch.available_qty / quantity 减少
 * - inv_inventory_transaction 记录出库流水
 */
export class WorkOrderMaterialIssuedHandler implements EventHandler<WorkOrderMaterialIssuedEvent> {
  async handle(event: WorkOrderMaterialIssuedEvent): Promise<void> {
  const ts = await getTranslations('Common');
    const { workOrderId, workOrderNo, issuedItems } = event.payload;
    const ctx = { module: 'work-order-issue', action: 'deduct', workOrderId, workOrderNo };
    let phase = 'init';

    if (!issuedItems || issuedItems.length === 0) {
      logger.info(ctx, ts('k_mrgnrg'), { workOrderNo });
      return;
    }

    try {
      await transaction(async (conn) => {
        for (const item of issuedItems) {
          phase = 'load_inventory';
          const [invRows] = await conn.execute(
            `SELECT id, quantity, available_qty
             FROM inv_inventory
             WHERE material_id = ? AND warehouse_id = ? AND deleted = 0
             FOR UPDATE`,
            [item.materialId, item.warehouseId]
          ) as any;

          if (invRows.length === 0) {
            secureLog('warn', ts('k_1b05sov'), {
              workOrderNo,
              materialId: item.materialId,
              warehouseId: item.warehouseId,
            });
            logger.warn(ctx, `库存记录不存在，跳过 [phase=${phase}]`, {
              materialId: item.materialId,
              materialName: item.materialName,
              warehouseId: item.warehouseId,
            });
            continue;
          }

          const inv = invRows[0];
          const currentQty = Number(inv.quantity || 0);

          if (currentQty < item.quantity) {
            throw new Error(
              `物料${item.materialName}库存不足: 当前${currentQty}, 需领${item.quantity}`
            );
          }

          phase = 'update_inventory';
          await conn.execute(
            `UPDATE inv_inventory
             SET quantity = quantity - ?, available_qty = available_qty - ?, update_time = NOW()
             WHERE id = ?`,
            [item.quantity, item.quantity, inv.id]
          );
          logger.info(ctx, ts('k_15h50w8'), {
            inventoryId: inv.id,
            materialId: item.materialId,
            materialName: item.materialName,
            deductQty: item.quantity,
            oldQty: currentQty,
            newQty: currentQty - item.quantity,
          });

          if (item.batchNo) {
            phase = 'update_batch';
            const [batchRows] = await conn.execute(
              `SELECT id, available_qty, quantity
               FROM inv_inventory_batch
               WHERE batch_no = ? AND material_id = ? AND warehouse_id = ?
               FOR UPDATE`,
              [item.batchNo, item.materialId, item.warehouseId]
            ) as any;

            if (batchRows.length > 0) {
              const batch = batchRows[0];
              const newAvail = Number(batch.available_qty || 0) - item.quantity;
              const newQty = Number(batch.quantity || 0) - item.quantity;

              if (newAvail <= 0 || newQty <= 0) {
                await conn.execute(
                  `UPDATE inv_inventory_batch SET available_qty = 0, quantity = 0, status = 3, update_time = NOW() WHERE id = ?`,
                  [batch.id]
                );
                logger.info(ctx, ts('k_1gbbhug'), { batchId: batch.id, batchNo: item.batchNo });
              } else {
                await conn.execute(
                  `UPDATE inv_inventory_batch SET available_qty = available_qty - ?, quantity = quantity - ?, update_time = NOW() WHERE id = ?`,
                  [item.quantity, item.quantity, batch.id]
                );
                logger.info(ctx, ts('k_1920lw1'), {
                  batchId: batch.id,
                  batchNo: item.batchNo,
                  deductQty: item.quantity,
                });
              }
            }

            // 批次明细已扣减：派生重算汇总表（仅在确有批次写入时，避免无批次领料被静默回滚）。
            await recomputeInventorySummary(conn, item.materialId, item.warehouseId);
          }

          phase = 'insert_transaction';
          // 财务级库存流水（'out' 领料出库，数量取正、方向由 transType 表达），与批次扣减同事务。
          await appendInventoryTransaction(conn, {
            transType: 'out',
            sourceType: 'material_issue',
            sourceId: workOrderId,
            materialId: item.materialId,
            batchNo: item.batchNo || null,
            warehouseId: item.warehouseId,
            quantity: item.quantity,
            unitPrice: 0,
            totalAmount: 0,
            referenceNo: workOrderNo,
            remark: `工单领料出库: ${item.materialName || ''}`,
            createBy: null,
          });
          logger.info(ctx, ts('k_1ooa9c8'), {
            materialId: item.materialId,
            quantity: item.quantity,
          });
        }
      });

      secureLog('info', ts('k_1jwtr1v'), {
        workOrderNo,
        workOrderId,
        itemCount: issuedItems.length,
      });
      logger.info(ctx, ts('k_19ec1mk'), { workOrderNo, itemCount: issuedItems.length });
    } catch (err) {
      logger.error(ctx, `WorkOrderMaterialIssued 失败 [phase=${phase}]`, {
        error: err instanceof Error ? err.message : String(err),
        workOrderNo,
        issuedItems,
      });
      throw err;
    }
  }
}
