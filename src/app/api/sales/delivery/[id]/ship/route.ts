import { NextRequest } from 'next/server';
import { query, execute, queryOne } from '@/lib/db';
import { successResponse, errorResponse, commonErrors, withErrorHandler } from '@/lib/api-response';

// POST /api/sales/delivery/[id]/ship - 扫码发货（符合设计文档 5.2 节）
export const POST = withErrorHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const resolvedParams = await params;
    const shipmentId = parseInt(resolvedParams.id);
    const body = await request.json();
    const { items, logistics_company, tracking_no } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return errorResponse('缺少发货明细数据', 400, 400);
    }

    // 查询发货单
    const shipment = await queryOne<any>(`SELECT * FROM shipments WHERE id = ? AND deleted = 0`, [
      shipmentId,
    ]);

    if (!shipment) {
      return commonErrors.notFound('发货单不存在');
    }

    // 验证发货单状态（只有待发货状态才能执行发货操作）
    if (shipment.status !== 3) {
      const statusMap: Record<number, string> = {
        1: '草稿',
        2: '待审批',
        3: '待发货',
        4: '部分发货',
        5: '已发货',
        6: '已取消',
      };
      return errorResponse(`当前状态为"${statusMap[shipment.status]}"，不能执行发货操作`, 400, 400);
    }

    // 验证每个二维码
    for (const item of items) {
      const { qr_code } = item;

      // 查询二维码记录
      const qrRecord = await queryOne<any>(
        `SELECT * FROM qrcode_record WHERE qr_code = ? AND deleted = 0`,
        [qr_code]
      );

      if (!qrRecord) {
        return errorResponse(`二维码 ${qr_code} 不存在`, 404, 404);
      }

      // 检查是否已发货
      if (qrRecord.status === 'shipped') {
        return errorResponse(`二维码 ${qr_code} 对应的成品已发货`, 400, 400);
      }
    }

    // 执行发货事务
    let totalShippedQty = 0;

    for (const item of items) {
      const { material_id, qr_code, quantity } = item;

      // 更新明细表已发货数量
      await execute(
        `UPDATE shipment_items
       SET shipped_quantity = shipped_quantity + ?, qr_code = ?
       WHERE shipment_id = ? AND material_id = ?`,
        [quantity, qr_code, shipmentId, material_id]
      );

      // 扣减库存（符合设计文档"实时同步"原则）
      await execute(
        `UPDATE wh_inventory
       SET quantity = quantity - ?, updated_at = NOW()
       WHERE qr_code = ?`,
        [quantity, qr_code]
      );

      // 更新二维码状态为已发货
      await execute(
        `UPDATE qrcode_record
       SET status = 'shipped', shipped_at = NOW(), shipment_id = ?
       WHERE qr_code = ?`,
        [shipmentId, qr_code]
      );

      totalShippedQty += parseFloat(quantity);
    }

    // 更新发货单主表
    const newShippedQty = (shipment.shipped_quantity || 0) + totalShippedQty;
    const newStatus = newShippedQty >= shipment.total_quantity ? 5 : 4; // 已发货 or 部分发货

    await execute(
      `UPDATE shipments
     SET shipped_quantity = ?, status = ?, ship_time = NOW(),
     logistics_company = COALESCE(?, logistics_company),
     tracking_no = COALESCE(?, tracking_no)
     WHERE id = ?`,
      [newShippedQty, newStatus, logistics_company || null, tracking_no || null, shipmentId]
    );

    // 更新销售订单已发货数量（符合设计文档"实时同步"原则）
    await execute(
      `UPDATE sal_order
     SET shipped_qty = IFNULL(shipped_qty, 0) + ?, status =
       CASE WHEN IFNULL(shipped_qty, 0) + ? >= total_qty THEN 4 ELSE status END
     WHERE id = ?`,
      [totalShippedQty, totalShippedQty, shipment.sales_order_id]
    );

    // 如果全部发货完成，自动生成应收单（符合设计文档 3.2 节第7步）
    if (newStatus === 5) {
      const receivableNo = `AR${Date.now()}`;
      await execute(
        `INSERT INTO fin_receivable (
        receivable_no, order_id, order_type, customer_id,
        amount, status, create_time
      ) VALUES (?, ?, 'sales', ?, 0, 1, NOW())`,
        [receivableNo, shipment.sales_order_id, shipment.customer_id]
      );
    }

    return successResponse(
      {
        shipment_no: shipment.shipment_no,
        status: newStatus,
        ship_time: new Date().toISOString(),
        shipped_quantity: newShippedQty,
      },
      '扫码发货成功'
    );
  },
  '扫码发货失败'
);
