import { NextRequest } from 'next/server';
import { query, execute, queryOne, transaction } from '@/lib/db';
import { withErrorHandler, successResponse, errorResponse, commonErrors } from '@/lib/api-response';

export const POST = withErrorHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const resolvedParams = await params;
    const transferId = parseInt(resolvedParams.id);
    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return errorResponse('缺少出库明细数据', 400, 400);
    }

    const transfer: any = await queryOne(`SELECT * FROM inv_transfer_order WHERE id = ? AND deleted = 0`, [
      transferId,
    ]);

    if (!transfer) {
      return commonErrors.notFound('调拨单不存在');
    }

    if (transfer.status !== 1) {
      const statusMap: Record<number, string> = {
        0: '草稿',
        1: '待审批',
        2: '已出库',
        3: '已入库',
        4: '已取消',
      };
      return errorResponse(`当前状态为"${statusMap[transfer.status]}"，不能执行出库操作`, 400, 400);
    }

    let totalOutQty = 0;

    // 使用事务保护调拨出库操作
    await transaction(async (conn) => {
      for (const item of items) {
        const { material_id, qr_code, quantity } = item;

        if (!qr_code && !material_id) {
          throw new Error('每项必须提供二维码或物料ID');
        }

        if (!quantity || quantity <= 0) {
          throw new Error('出库数量必须大于0');
        }

        let inventoryItem: any;
        if (qr_code) {
          const [rows] = await conn.execute(
            `SELECT * FROM inv_inventory WHERE qr_code = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE`,
            [qr_code, transfer.from_warehouse_id]
          );
          inventoryItem = (rows as any[])[0];
        } else {
          const [rows] = await conn.execute(
            `SELECT * FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0 ORDER BY create_time ASC LIMIT 1 FOR UPDATE`,
            [material_id, transfer.from_warehouse_id]
          );
          inventoryItem = (rows as any[])[0];
        }

        if (!inventoryItem || inventoryItem.quantity < quantity) {
          const itemName = qr_code ? `二维码 ${qr_code}` : `物料ID ${material_id}`;
          throw new Error(`${itemName} 库存不足或不存在`);
        }

        // 扣减库存
        await conn.execute(
          `UPDATE inv_inventory SET quantity = quantity - ?, update_time = NOW() WHERE id = ?`,
          [quantity, inventoryItem.id]
        );

        // 记录库存流水
        await conn.execute(
          `INSERT INTO inv_inventory_log (material_id, warehouse_id, change_qty, change_type, ref_no, ref_id, create_time)
           VALUES (?, ?, ?, 'TRANSFER_OUT', ?, ?, NOW())`,
          [inventoryItem.material_id, transfer.from_warehouse_id, -quantity, transfer.transfer_no, transferId]
        );

        // 更新调拨明细
        await conn.execute(
          `UPDATE inv_transfer_order_item SET out_quantity = ?, qr_code = COALESCE(?, qr_code) WHERE transfer_id = ? AND material_id = ?`,
          [quantity, qr_code || null, transferId, material_id || inventoryItem.material_id]
        );

        totalOutQty += parseFloat(quantity);
      }

      // 检查是否全部出库完成
      const [statsRows] = await conn.execute(
        `SELECT
          SUM(CASE WHEN out_quantity > 0 THEN 1 ELSE 0 END) as out_count,
          COUNT(*) as total_count,
          SUM(CASE WHEN out_quantity >= quantity THEN 1 ELSE 0 END) as complete_count
         FROM inv_transfer_order_item WHERE transfer_id = ?`,
        [transferId]
      );
      const allItemsOut = (statsRows as any[])[0];

      let newStatus = 1;
      if (allItemsOut.complete_count === allItemsOut.total_count) {
        newStatus = 2;
      }

      // 更新调拨单状态
      await conn.execute(
        `UPDATE inv_transfer_order SET status = ?, out_time = NOW(), update_time = NOW() WHERE id = ?`,
        [newStatus, transferId]
      );
    });

    const allItemsOut: any = await queryOne(
      `SELECT
        SUM(CASE WHEN out_quantity > 0 THEN 1 ELSE 0 END) as out_count,
        COUNT(*) as total_count
       FROM inv_transfer_order_item WHERE transfer_id = ?`,
      [transferId]
    );

    return successResponse(
      {
        transfer_no: transfer.transfer_no,
        status: 2,
        out_time: new Date().toISOString(),
        out_quantity: totalOutQty,
        progress: {
          out_count: allItemsOut.out_count,
          total_count: allItemsOut.total_count,
        },
      },
      '出库完成'
    );
  }
);
