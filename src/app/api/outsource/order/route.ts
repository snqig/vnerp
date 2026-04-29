import { NextRequest } from 'next/server';
import { query, execute, transaction } from '@/lib/db';
import { withErrorHandler, successResponse, errorResponse } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const orderNo = searchParams.get('orderNo') || '';
  const supplierName = searchParams.get('supplierName') || '';
  const status = searchParams.get('status') || '';

  let where = 'WHERE o.deleted = 0';
  const params: any[] = [];
  if (orderNo) { where += ' AND o.order_no LIKE ?'; params.push('%' + orderNo + '%'); }
  if (supplierName) { where += ' AND o.supplier_name LIKE ?'; params.push('%' + supplierName + '%'); }
  if (status) { where += ' AND o.status = ?'; params.push(Number(status)); }

  const totalRows: any = await query('SELECT COUNT(*) as total FROM outsource_order o ' + where, params);
  const total = totalRows[0]?.total || 0;
  const rows: any = await query(
    'SELECT o.* FROM outsource_order o ' + where + ' ORDER BY o.create_time DESC LIMIT ? OFFSET ?',
    [...params, pageSize, (page - 1) * pageSize]
  );

  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { work_order_id, work_order_no, supplier_id, supplier_name, product_id, product_code, product_name,
    plan_qty, unit, unit_price, delivery_date, outsource_type, process_name, remark } = body;

  if (!supplier_id) return errorResponse('供应商不能为空', 400, 400);

  const now = new Date();
  const orderNo = 'OS' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + String(Math.floor(Math.random() * 10000)).padStart(4, '0');

  const totalAmount = (Number(plan_qty) || 0) * (Number(unit_price) || 0);

  const result: any = await execute(
    `INSERT INTO outsource_order (order_no, work_order_id, work_order_no, supplier_id, supplier_name, product_id, product_code, product_name, plan_qty, unit, unit_price, total_amount, delivery_date, outsource_type, process_name, status, remark)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [orderNo, work_order_id || null, work_order_no || null, supplier_id, supplier_name || null,
     product_id || null, product_code || null, product_name || null, plan_qty || 0, unit || null,
     unit_price || 0, totalAmount, delivery_date || null, outsource_type || 1, process_name || null, remark || null]
  );

  return successResponse({ id: result.insertId, order_no: orderNo }, '委外订单创建成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, action, status, remark, unit_price, delivery_date } = body;

  if (!id) return errorResponse('订单ID不能为空', 400, 400);

  if (action === 'cancel') {
    await execute('UPDATE outsource_order SET status = 9 WHERE id = ? AND deleted = 0', [id]);
    return successResponse(null, '委外订单已取消');
  }

  const fields: string[] = [];
  const values: any[] = [];
  if (status !== undefined) { fields.push('status = ?'); values.push(status); }
  if (remark !== undefined) { fields.push('remark = ?'); values.push(remark); }
  if (unit_price !== undefined) {
    fields.push('unit_price = ?'); values.push(unit_price);
    fields.push('total_amount = ?'); values.push(0);
  }
  if (delivery_date !== undefined) { fields.push('delivery_date = ?'); values.push(delivery_date); }

  if (fields.length > 0) {
    if (unit_price !== undefined) {
      const order: any = await query('SELECT plan_qty FROM outsource_order WHERE id = ? AND deleted = 0', [id]);
      if (order && order.length > 0) {
        values[values.indexOf(0)] = (Number(order[0].plan_qty) || 0) * (Number(unit_price) || 0);
      }
    }
    values.push(id);
    await execute(`UPDATE outsource_order SET ${fields.join(', ')} WHERE id = ? AND deleted = 0`, values);
  }

  return successResponse(null, '委外订单更新成功');
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return errorResponse('缺少id', 400, 400);
  await execute('UPDATE outsource_order SET deleted = 1 WHERE id = ?', [Number(id)]);
  return successResponse(null, '删除成功');
});
