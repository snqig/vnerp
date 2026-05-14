import { NextRequest } from 'next/server';
import { query, execute, queryOne } from '@/lib/db';
import { withErrorHandler, successResponse, errorResponse, commonErrors } from '@/lib/api-response';
import { getTrPrefix, generateDocNo } from '@/lib/global-config';

export const POST = withErrorHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const resolvedParams = await params;
    const transferId = parseInt(resolvedParams.id);
    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return errorResponse('缺少入库明细数据', 400, 400);
    }

    const transfer: any = await queryOne(`SELECT * FROM transfers WHERE id = ? AND deleted = 0`, [
      transferId,
    ]);

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

    for (const item of items) {
      const { material_id, qr_code, quantity } = item;

      if (!qr_code && !material_id) {
        return errorResponse('每项必须提供二维码或物料ID', 400, 400);
      }

      if (!quantity || quantity <= 0) {
        return errorResponse('入库数量必须大于0', 400, 400);
      }

      const targetQrCode = qr_code || `${transfer.transfer_no}-${Date.now()}`;

      const existingInventory: any = await queryOne(
        `SELECT * FROM wh_inventory
       WHERE warehouse_id = ?
         AND material_id = ?
         AND qr_code = ?
         AND deleted = 0`,
        [transfer.to_warehouse_id, material_id || 0, targetQrCode]
      );

      if (existingInventory) {
        await execute(
          `UPDATE wh_inventory
         SET quantity = quantity + ?,
             updated_at = NOW()
         WHERE id = ?`,
          [quantity, existingInventory.id]
        );
      } else {
        const batchNo = generateDocNo(getTrPrefix());

        await execute(
          `INSERT INTO wh_inventory (
          warehouse_id, material_id, qr_code, batch_no,
          quantity, warehouse_location, inbound_date,
          created_at, updated_at, deleted
        ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW(), 0)`,
          [
            transfer.to_warehouse_id,
            material_id || 0,
            targetQrCode,
            batchNo,
            quantity,
            transfer.to_location || null,
          ]
        );
      }

      await execute(
        `UPDATE transfer_items
       SET in_quantity = COALESCE(in_quantity, 0) + ?
       WHERE transfer_id = ? AND material_id = ?`,
        [quantity, transferId, material_id || 0]
      );

      totalInQty += parseFloat(quantity);
    }

    const allItemsIn: any = await queryOne(
      `SELECT
      SUM(CASE WHEN in_quantity >= quantity THEN 1 ELSE 0 END) as complete_count,
      COUNT(*) as total_count
     FROM transfer_items
     WHERE transfer_id = ?`,
      [transferId]
    );

    let newStatus = 2;
    if (allItemsIn.complete_count === allItemsIn.total_count) {
      newStatus = 3;
    }

    await execute(
      `UPDATE transfers
     SET status = ?, in_time = NOW(), update_time = NOW()
     WHERE id = ?`,
      [newStatus, transferId]
    );

    return successResponse(
      {
        transfer_no: transfer.transfer_no,
        status: newStatus,
        in_time: new Date().toISOString(),
        in_quantity: totalInQty,
        progress: {
          complete_count: allItemsIn.complete_count,
          total_count: allItemsIn.total_count,
        },
      },
      newStatus === 3 ? '调拨入库完成' : '部分入库成功'
    );
  }
);
