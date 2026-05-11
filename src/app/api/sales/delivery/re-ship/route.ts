import { NextRequest } from 'next/server';
import { query, execute, queryOne } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  commonErrors,
  withErrorHandler,
} from '@/lib/api-response';
import { getShPrefix, generateDocNo } from '@/lib/global-config';

// POST /api/sales/delivery/re-ship - 提交补发申请（符合设计文档 5.4 节）
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { parent_shipment_id, quantity, reason } = body;

  if (!parent_shipment_id) {
    return errorResponse('缺少原发货单ID', 400, 400);
  }

  if (!quantity || parseFloat(quantity) <= 0) {
    return errorResponse('补发数量必须大于0', 400, 400);
  }

  // 查询原发货单
  const parentShipment = await queryOne<any>(
    `SELECT * FROM shipments WHERE id = ? AND deleted = 0`,
    [parent_shipment_id]
  );

  if (!parentShipment) {
    return commonErrors.notFound('原发货单不存在');
  }

  // 创建补发发货单
  const shipmentNo = generateDocNo(getShPrefix());

  const result = await execute(
    `INSERT INTO shipments (
      shipment_no, sales_order_id, type, status,
      customer_id, customer_name, warehouse_id,
      total_quantity, shipped_quantity,
      parent_shipment_id, remark
    ) VALUES (?, ?, 're_ship', 2, ?, ?, ?, ?, 0, ?, ?)`,
    [
      shipmentNo,
      parentShipment.sales_order_id,
      parentShipment.customer_id,
      parentShipment.customer_name,
      parentShipment.warehouse_id,
      quantity,
      parent_shipment_id,
      reason || `客户反馈问题，补发${quantity}件`,
    ]
  );

  // 复制原发货单的明细到补发单
  const parentItems = await query<any>(
    `SELECT * FROM shipment_items WHERE shipment_id = ?`,
    [parent_shipment_id]
  );

  if (parentItems.length > 0) {
    for (const item of parentItems.slice(0, 1)) {
      // 只复制第一个产品作为补发对象
      await execute(
        `INSERT INTO shipment_items (
          shipment_id, material_id, material_name, specification,
          quantity, shipped_quantity, unit
        ) VALUES (?, ?, ?, ?, ?, 0, ?)`,
        [
          result.insertId,
          item.material_id,
          item.material_name,
          item.specification,
          Math.min(parseFloat(quantity), item.quantity),
          item.unit,
        ]
      );
    }
  }

  return successResponse({
    id: result.insertId,
    shipment_no: shipmentNo,
    type: 're_ship',
    status: 2, // 待审批
  }, '补发申请提交成功');
}, '提交补发申请失败');
