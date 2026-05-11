import { NextRequest } from 'next/server';
import { query, execute, queryOne } from '@/lib/db';
import { withErrorHandler, successResponse, errorResponse, commonErrors } from '@/lib/api-response';

export const POST = withErrorHandler(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const resolvedParams = await params;
  const transferId = parseInt(resolvedParams.id);
  const body = await request.json();
  const { items } = body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return errorResponse('缺少出库明细数据', 400, 400);
  }

  const transfer: any = await queryOne(
    `SELECT * FROM transfers WHERE id = ? AND deleted = 0`,
    [transferId]
  );

  if (!transfer) {
    return commonErrors.notFound('调拨单不存在');
  }

  if (transfer.status !== 1) {
    const statusMap: Record<number, string> = {
      0: '草稿', 1: '待审批', 2: '已出库', 3: '已入库', 4: '已取消'
    };
    return errorResponse(
      `当前状态为"${statusMap[transfer.status]}"，不能执行出库操作`,
      400, 400
    );
  }

  let totalOutQty = 0;

  for (const item of items) {
    const { material_id, qr_code, quantity } = item;

    if (!qr_code && !material_id) {
      return errorResponse('每项必须提供二维码或物料ID', 400, 400);
    }

    if (!quantity || quantity <= 0) {
      return errorResponse('出库数量必须大于0', 400, 400);
    }

    let inventoryItem: any;
    if (qr_code) {
      inventoryItem = await queryOne(
        `SELECT * FROM wh_inventory
         WHERE qr_code = ?
           AND warehouse_id = ?
           AND quantity >= ?
           AND deleted = 0`,
        [qr_code, transfer.from_warehouse_id, quantity]
      );
    } else {
      inventoryItem = await queryOne(
        `SELECT * FROM wh_inventory
         WHERE material_id = ?
           AND warehouse_id = ?
           AND quantity >= ?
           AND deleted = 0
         ORDER BY inbound_date ASC
         LIMIT 1`,
        [material_id, transfer.from_warehouse_id, quantity]
      );
    }

    if (!inventoryItem) {
      const itemName = qr_code ? `二维码 ${qr_code}` : `物料ID ${material_id}`;
      return errorResponse(`${itemName} 库存不足或不存在`, 400, 400);
    }

    await execute(
      `UPDATE wh_inventory
       SET quantity = quantity - ?,
           updated_at = NOW()
       WHERE id = ?`,
      [quantity, inventoryItem.id]
    );

    await execute(
      `UPDATE transfer_items
       SET out_quantity = ?,
           qr_code = COALESCE(?, qr_code)
       WHERE transfer_id = ? AND material_id = ?`,
      [quantity, qr_code || null, transferId, material_id || inventoryItem.material_id]
    );

    totalOutQty += parseFloat(quantity);
  }

  const allItemsOut: any = await queryOne(
    `SELECT
      SUM(CASE WHEN out_quantity > 0 THEN 1 ELSE 0 END) as out_count,
      COUNT(*) as total_count,
      SUM(CASE WHEN out_quantity >= quantity THEN 1 ELSE 0 END) as complete_count
     FROM transfer_items
     WHERE transfer_id = ?`,
    [transferId]
  );

  let newStatus = 1;
  if (allItemsOut.complete_count === allItemsOut.total_count) {
    newStatus = 2;
  }

  await execute(
    `UPDATE transfers
     SET status = ?, out_time = NOW(), update_time = NOW()
     WHERE id = ?`,
    [newStatus, transferId]
  );

  return successResponse({
    transfer_no: transfer.transfer_no,
    status: newStatus,
    out_time: new Date().toISOString(),
    out_quantity: totalOutQty,
    progress: {
      out_count: allItemsOut.out_count,
      total_count: allItemsOut.total_count
    }
  }, newStatus === 2 ? '全部出库完成' : '部分出库成功');
});
