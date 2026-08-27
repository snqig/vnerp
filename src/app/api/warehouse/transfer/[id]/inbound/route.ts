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
    const resolvedParams = await params;
    const transferId = parseInt(resolvedParams.id);
    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return errorResponse('缺少入库明细数据', 400, 400);
    }

    const transfer = await queryOne(
      `SELECT * FROM inv_transfer_order WHERE id = ? AND deleted = 0`,
      [transferId]
    );

    if (!transfer) {
      return commonErrors.notFound('调拨单不存在');
    }

    if (transfer.status !== 2) {
      const statusMap: Record<number, string> = {
        0: '草稿',
        1: '待审批',
        2: '已出库',
        3: '已入库',
        4: '已取消',
      };
      return errorResponse(
        `当前状态为"${statusMap[transfer.status]}"，不能执行入库操作（需要先完成出库）`,
        400,
        400
      );
    }

    let totalInQty = 0;
    let newStatus = 2;

    await transaction(async (conn) => {
      for (const item of items) {
        const materialId = item.material_id;
        const quantity = Number(item.quantity);

        if (!materialId) {
          throw new Error('每项必须提供物料ID');
        }
        if (!quantity || quantity <= 0) {
          throw new Error('入库数量必须大于0');
        }

        const [matRows] = await conn.execute(
          `SELECT id, material_code, material_name, unit, purchase_price, cost_price
           FROM inv_material WHERE id = ? AND deleted = 0`,
          [materialId]
        );
        const mat = (matRows as DbRow[])[0];
        if (!mat) {
          throw new Error(`物料ID ${materialId} 不存在`);
        }
        const [whRows] = await conn.execute(
          `SELECT warehouse_name FROM inv_warehouse WHERE id = ?`,
          [transfer.to_warehouse_id]
        );
        const whName = (whRows as DbRow[])[0]?.warehouse_name || '';
        const unit = mat.unit || '件';
        const unitPrice = Number(mat.cost_price || mat.purchase_price || 0);

        // 调入仓批次：以调拨单号+物料编码标识，已存在则累加，否则新建
        const batchNo = `TRF-${transfer.transfer_no}-${mat.material_code}`;
        const [existRows] = await conn.execute(
          `SELECT id FROM inv_inventory_batch
           WHERE batch_no = ? AND material_id = ? AND warehouse_id = ? AND deleted = 0
           FOR UPDATE`,
          [batchNo, materialId, transfer.to_warehouse_id]
        );
        const exist = (existRows as DbRow[])[0];
        if (exist) {
          await conn.execute(
            `UPDATE inv_inventory_batch
             SET quantity = quantity + ?, available_qty = available_qty + ?, version = version + 1, update_time = NOW()
             WHERE id = ?`,
            [quantity, quantity, exist.id]
          );
        } else {
          await conn.execute(
            `INSERT INTO inv_inventory_batch
              (batch_no, material_id, material_name, warehouse_id, warehouse_name,
               quantity, available_qty, locked_qty, unit, unit_price, inbound_date, status, version, create_time, update_time, deleted)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, CURDATE(), 1, 1, NOW(), NOW(), 0)`,
            [
              batchNo,
              materialId,
              mat.material_name,
              transfer.to_warehouse_id,
              whName,
              quantity,
              quantity,
              unit,
              unitPrice,
            ]
          );
        }

        // 财务级台账
        await appendInventoryTransaction(conn, {
          transType: 'in',
          sourceType: 'transfer_in',
          sourceId: transferId,
          sourceLineId: item.item_id || null,
          materialId,
          batchNo: item.batch_no || null,
          warehouseId: transfer.to_warehouse_id,
          locationId: item.location_id || null,
          quantity,
          unitPrice,
          totalAmount: quantity * unitPrice,
          referenceNo: transfer.transfer_no,
          remark: '调拨入库',
        });

        // 库存流水日志（R5：统一 canonical 形态，弃用旧 change_type 形态）
        await appendInventoryLog(conn, {
          materialId,
          warehouseId: transfer.to_warehouse_id,
          operationType: 1,
          operationQty: quantity,
          businessType: 'transfer_in',
          businessNo: transfer.transfer_no,
          remark: '调拨入库',
        });

        // 汇总由批次派生，杜绝双写漂移
        await recomputeInventorySummary(conn, materialId, transfer.to_warehouse_id);

        // 更新调拨明细入库数量
        await conn.execute(
          `UPDATE inv_transfer_item
           SET in_quantity = COALESCE(in_quantity, 0) + ?
           WHERE transfer_id = ? AND material_id = ? AND deleted = 0`,
          [quantity, transferId, materialId]
        );

        totalInQty += quantity;
      }

      // 检查是否全部入库完成
      const [statsRows] = await conn.execute(
        `SELECT
          SUM(CASE WHEN in_quantity >= quantity THEN 1 ELSE 0 END) as complete_count,
          COUNT(*) as total_count
         FROM inv_transfer_item WHERE transfer_id = ? AND deleted = 0`,
        [transferId]
      );
      const allItemsIn = (statsRows as DbRow[])[0];

      newStatus = 2;
      if (Number(allItemsIn.complete_count) === Number(allItemsIn.total_count)) {
        newStatus = 3;
      }

      await conn.execute(
        `UPDATE inv_transfer_order SET status = ?, in_time = NOW(), update_time = NOW() WHERE id = ?`,
        [newStatus, transferId]
      );
    });

    return successResponse(
      {
        transfer_no: transfer.transfer_no,
        status: newStatus,
        in_time: new Date().toISOString(),
        in_quantity: totalInQty,
      },
      newStatus === 3 ? '调拨入库完成' : '部分入库成功'
    );
  }
);
