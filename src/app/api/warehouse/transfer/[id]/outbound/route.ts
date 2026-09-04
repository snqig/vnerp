import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { queryOne, transaction } from '@/lib/db';
import { successResponse, errorResponse, commonErrors } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import type { DbRow } from '@/types/db';
import {
  appendInventoryTransaction,
  appendInventoryLog,
  recomputeInventorySummary,
} from '@/lib/inventory-ledger';

export const POST = withPermission(
  async (request: NextRequest, userInfo, { params }: { params: Promise<{ id: string }> }) => {
  const tc = await getTranslations('Common');
  const ts = await getTranslations('Common');
    const resolvedParams = await params;
    const transferId = parseInt(resolvedParams.id);
    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return errorResponse(ts('k_831vwd'), 400, 400);
    }

    const transfer = await queryOne(
      `SELECT * FROM inv_transfer_order WHERE id = ? AND deleted = 0`,
      [transferId]
    );

    if (!transfer) {
      return commonErrors.notFound(ts('k_118ryb8'));
    }

    if (transfer.status !== 1) {
      const statusMap: Record<number, string> = {
        0: ts('k_oc54qp'),
        1: ts('k_rkj3lq'),
        2: tc('issued'),
        3: ts('k_qug67t'),
        4: ts('k_1d8x36r'),
      };
      return errorResponse(`当前状态为"${statusMap[transfer.status]}"，不能执行出库操作`, 400, 400);
    }

    let totalOutQty = 0;
    let newStatus = transfer.status;

    // 使用事务保护调拨出库操作（批次权威 → 台账 → 汇总派生）
    await transaction(async (conn) => {
      for (const item of items) {
        const materialId = item.material_id;
        const quantity = Number(item.quantity);

        if (!materialId) {
          throw new Error(ts('k_ktgi83'));
        }
        if (!quantity || quantity <= 0) {
          throw new Error(ts('k_1rxflii'));
        }

        // FIFO 选择调出仓批次并扣减
        const [batchRows] = await conn.execute(
          `SELECT id, available_qty, unit_price, batch_no
           FROM inv_inventory_batch
           WHERE material_id = ? AND warehouse_id = ? AND deleted = 0 AND available_qty > 0
           ORDER BY create_time ASC, id ASC FOR UPDATE`,
          [materialId, transfer.from_warehouse_id]
        );
        const batches = batchRows as DbRow[];
        const totalAvail = batches.reduce((s: number, b: DbRow) => s + Number(b.available_qty), 0);
        if (totalAvail < quantity) {
          throw new Error(
            `物料ID ${materialId} 在调出仓库存不足（可用 ${totalAvail}，需 ${quantity}）`
          );
        }

        let remaining = quantity;
        let unitPrice = 0;
        for (const b of batches) {
          if (remaining <= 0) break;
          const avail = Number(b.available_qty);
          const take = Math.min(remaining, avail);
          unitPrice = Number(b.unit_price) || unitPrice;
          await conn.execute(
            `UPDATE inv_inventory_batch
             SET quantity = quantity - ?, available_qty = available_qty - ?, version = version + 1, update_time = NOW()
             WHERE id = ?`,
            [take, take, b.id]
          );
          remaining -= take;
        }

        // 财务级台账
        await appendInventoryTransaction(conn, {
          transType: 'out',
          sourceType: 'transfer_out',
          sourceId: transferId,
          sourceLineId: item.item_id || null,
          materialId,
          batchNo: item.batch_no || null,
          warehouseId: transfer.from_warehouse_id,
          locationId: item.location_id || null,
          quantity,
          unitPrice,
          totalAmount: quantity * unitPrice,
          referenceNo: transfer.transfer_no,
          remark: ts('k_1j10cql'),
        });

        // 库存流水日志（R5：统一 canonical 形态，弃用旧 change_type 形态）
        await appendInventoryLog(conn, {
          materialId,
          warehouseId: transfer.from_warehouse_id,
          operationType: 2,
          operationQty: quantity,
          businessType: 'transfer_out',
          businessNo: transfer.transfer_no,
          remark: ts('k_1j10cql'),
        });

        // 汇总由批次派生，杜绝双写漂移
        await recomputeInventorySummary(conn, materialId, transfer.from_warehouse_id);

        // 更新调拨明细出库数量
        await conn.execute(
          `UPDATE inv_transfer_item
           SET out_quantity = COALESCE(out_quantity, 0) + ?
           WHERE transfer_id = ? AND material_id = ? AND deleted = 0`,
          [quantity, transferId, materialId]
        );

        totalOutQty += quantity;
      }

      // 检查是否全部出库完成
      const [statsRows] = await conn.execute(
        `SELECT
          SUM(CASE WHEN out_quantity >= quantity THEN 1 ELSE 0 END) as complete_count,
          COUNT(*) as total_count
         FROM inv_transfer_item WHERE transfer_id = ? AND deleted = 0`,
        [transferId]
      );
      const allItemsOut = (statsRows as DbRow[])[0];

      newStatus = 1;
      if (Number(allItemsOut.complete_count) === Number(allItemsOut.total_count)) {
        newStatus = 2;
      }

      // 更新调拨单状态
      await conn.execute(
        `UPDATE inv_transfer_order SET status = ?, out_time = NOW(), update_time = NOW() WHERE id = ?`,
        [newStatus, transferId]
      );
    });

    const allItemsOut = await queryOne(
      `SELECT
        SUM(CASE WHEN out_quantity > 0 THEN 1 ELSE 0 END) as out_count,
        COUNT(*) as total_count
       FROM inv_transfer_item WHERE transfer_id = ? AND deleted = 0`,
      [transferId]
    );

    return successResponse(
      {
        transfer_no: transfer.transfer_no,
        status: newStatus,
        out_time: new Date().toISOString(),
        out_quantity: totalOutQty,
        progress: {
          out_count: allItemsOut.out_count,
          total_count: allItemsOut.total_count,
        },
      },
      ts('k_3ymbhy')
    );
  }
);
