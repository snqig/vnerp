import { NextRequest } from 'next/server';
import { execute, queryOne } from '@/lib/db';
import { successResponse, errorResponse, commonErrors } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { getShPrefix, generateDocNo } from '@/lib/global-config';

// POST /api/sales/delivery/partial - 提交部分发货申请（符合设计文档 5.3 节）
export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body = await request.json();
    const { sales_order_id, quantity, remark } = body;

    if (!sales_order_id) {
      return errorResponse('缺少销售订单ID', 400, 400);
    }

    if (!quantity || parseFloat(quantity) <= 0) {
      return errorResponse('发货数量必须大于0', 400, 400);
    }

    // 查询销售订单
    const order = await queryOne<Loose>(`SELECT * FROM sal_order WHERE id = ? AND deleted = 0`, [
      sales_order_id,
    ]);

    if (!order) {
      return commonErrors.notFound('销售订单不存在');
    }

    // 验证部分发货数量不超过订单剩余数量
    const shippedQty = order.shipped_qty ?? 0;
    const remainingQty = (order.total_qty || 0) - shippedQty;
    if (parseFloat(quantity) > remainingQty) {
      return errorResponse(`部分发货数量${quantity}超过订单剩余数量${remainingQty}`, 400, 400);
    }

    // 创建部分发货单
    const shipmentNo = generateDocNo(getShPrefix());

    const result = await execute(
      `INSERT INTO shipments (
      shipment_no, sales_order_id, type, status,
      customer_id, customer_name, warehouse_id,
      total_quantity, shipped_quantity, remark
    ) VALUES (?, ?, 'partial', 2, ?, ?, ?, ?, 0, ?)`,
      [
        shipmentNo,
        sales_order_id,
        order.customer_id,
        order.customer_name,
        order.warehouse_id || 1,
        quantity,
        remark || `先发货${quantity}件，剩余${remainingQty - parseFloat(quantity)}件明天发货`,
      ]
    );

    return successResponse(
      {
        id: result.insertId,
        shipment_no: shipmentNo,
        type: 'partial',
        status: 2, // 待审批
      },
      '部分发货申请提交成功'
    );
  },
  { logTitle: '提交部分发货申请', logType: 'business' }
);
