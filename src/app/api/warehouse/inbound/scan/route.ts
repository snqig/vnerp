import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  withErrorHandler,
} from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const qrCode = request.nextUrl.searchParams.get('qrCode');

  if (!qrCode) {
    return errorResponse('二维码内容不能为空', 400, 400);
  }

  const parts = qrCode.split('-');
  const orderNo = parts[0];
  const itemIdx = parts.length > 1 ? parseInt(parts[1]) - 1 : 0;

  const orders = await query(
    `SELECT o.id, o.order_no, o.supplier_name, o.status, o.inbound_date, o.create_time, o.remark
     FROM inv_inbound_order o
     WHERE o.order_no = ? AND o.deleted = 0`,
    [orderNo]
  );

  if (!orders || (orders as any[]).length === 0) {
    return errorResponse('未找到对应的入库记录', 404, 404);
  }

  const order = (orders as any[])[0];

  const items = await query(
    `SELECT id, material_id, material_name, material_spec, batch_no, quantity, unit, unit_price, warehouse_location
     FROM inv_inbound_item
     WHERE order_id = ?`,
    [order.id]
  );

  const itemList = items as any[];
  const targetItem = itemList[itemIdx] || itemList[0] || {};

  const history = [];
  history.push({
    event: 'IN',
    time: order.create_time,
    detail: `入库单 ${order.order_no}`,
  });

  if (order.status === 'approved' || order.status === 'completed') {
    history.push({
      event: 'AUDIT',
      time: order.update_time || order.create_time,
      detail: '审核通过',
    });
  }

  return successResponse({
    materialId: targetItem.material_id || '',
    materialCode: targetItem.material_id || '',
    materialName: targetItem.material_name || '',
    specification: targetItem.material_spec || '',
    supplier: order.supplier_name || '',
    inboundTime: order.create_time || '',
    status: order.status === 'approved' || order.status === 'completed' ? 'IN' : order.status,
    qrCode: qrCode,
    quantity: targetItem.quantity || 0,
    unit: targetItem.unit || '',
    batchNo: targetItem.batch_no || '',
    history,
    nextAction: order.status === 'approved' || order.status === 'completed' ? '可分切/出库' : '待审核',
  });
}, '扫码查询失败');
