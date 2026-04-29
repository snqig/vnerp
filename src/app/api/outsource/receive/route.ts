import { NextRequest } from 'next/server';
import { query, execute, transaction } from '@/lib/db';
import { withErrorHandler, successResponse, errorResponse } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const receiveNo = searchParams.get('receiveNo') || '';
  const outsourceOrderNo = searchParams.get('outsourceOrderNo') || '';
  const status = searchParams.get('status') || '';

  let where = 'WHERE r.deleted = 0';
  const params: any[] = [];
  if (receiveNo) { where += ' AND r.receive_no LIKE ?'; params.push('%' + receiveNo + '%'); }
  if (outsourceOrderNo) { where += ' AND r.outsource_order_no LIKE ?'; params.push('%' + outsourceOrderNo + '%'); }
  if (status) { where += ' AND r.status = ?'; params.push(Number(status)); }

  const totalRows: any = await query('SELECT COUNT(*) as total FROM outsource_receive r ' + where, params);
  const total = totalRows[0]?.total || 0;
  const rows: any = await query(
    'SELECT r.*, w.warehouse_name FROM outsource_receive r LEFT JOIN inv_warehouse w ON r.warehouse_id = w.id ' + where + ' ORDER BY r.create_time DESC LIMIT ? OFFSET ?',
    [...params, pageSize, (page - 1) * pageSize]
  );

  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { outsource_order_id, outsource_order_no, warehouse_id, receive_date, receive_qty, qualified_qty, defective_qty, operator_name, remark } = body;

  if (!outsource_order_id) return errorResponse('委外订单不能为空', 400, 400);
  if (!warehouse_id) return errorResponse('入库仓库不能为空', 400, 400);

  const now = new Date();
  const receiveNo = 'OR' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + String(Math.floor(Math.random() * 10000)).padStart(4, '0');

  const result: any = await execute(
    `INSERT INTO outsource_receive (receive_no, outsource_order_id, outsource_order_no, warehouse_id, receive_date, receive_qty, qualified_qty, defective_qty, qc_status, status, operator_name, remark)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)`,
    [receiveNo, outsource_order_id, outsource_order_no || null, warehouse_id, receive_date || null,
     receive_qty || 0, qualified_qty || 0, defective_qty || 0, operator_name || null, remark || null]
  );

  return successResponse({ id: result.insertId, receive_no: receiveNo }, '委外收货单创建成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, action, status, qc_status, qualified_qty, defective_qty, remark } = body;

  if (!id) return errorResponse('收货单ID不能为空', 400, 400);

  if (action === 'post') {
    const result = await transaction(async (conn) => {
      const [receiveRows]: any = await conn.execute(
        'SELECT id, receive_no, outsource_order_id, outsource_order_no, warehouse_id, status, qc_status, receive_qty, qualified_qty FROM outsource_receive WHERE id = ? AND deleted = 0 FOR UPDATE',
        [id]
      );
      if (receiveRows.length === 0) throw new Error('收货单不存在');
      const receive = receiveRows[0];
      if (receive.status >= 3) throw new Error('收货单已完成或已取消，不能重复过账');
      if (receive.qc_status === 3) throw new Error('质检不合格，不能入库');

      const orderRows: any = await query('SELECT product_id, product_code, product_name FROM outsource_order WHERE id = ? AND deleted = 0', [receive.outsource_order_id]);
      const order = orderRows && orderRows.length > 0 ? orderRows[0] : {};

      const [existing]: any = await conn.execute(
        'SELECT id, quantity FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE',
        [order.product_id, receive.warehouse_id]
      );

      const inQty = Number(receive.qualified_qty) || Number(receive.receive_qty) || 0;

      if (existing.length > 0) {
        await conn.execute('UPDATE inv_inventory SET quantity = quantity + ?, update_time = NOW() WHERE id = ?', [inQty, existing[0].id]);
      } else {
        await conn.execute(
          'INSERT INTO inv_inventory (material_id, material_code, material_name, warehouse_id, quantity, unit) VALUES (?, ?, ?, ?, ?, ?)',
          [order.product_id, order.product_code || '', order.product_name || '', receive.warehouse_id, inQty, '个']
        );
      }

      const transNo = 'TRX' + Date.now() + String(id).slice(-4);
      await conn.execute(
        `INSERT INTO inv_inventory_transaction (trans_no, trans_type, source_type, source_id, material_id, material_code, batch_no, warehouse_id, quantity, unit_price, total_amount, account_dr, account_cr, create_time)
         VALUES (?, 'in', 'outsource_receive', ?, ?, ?, '', ?, ?, 0, 0, '委外成品库存', '委外加工成本', NOW())`,
        [transNo, id, order.product_id, order.product_code || '', receive.warehouse_id, inQty]
      );

      await conn.execute(
        'UPDATE outsource_receive SET status = 3, qc_status = COALESCE(qc_status, 2), update_time = NOW() WHERE id = ?',
        [id]
      );

      await conn.execute(
        `UPDATE outsource_order SET received_qty = COALESCE(received_qty, 0) + ?, qualified_qty = COALESCE(qualified_qty, 0) + ?,
         status = CASE WHEN COALESCE(received_qty, 0) + ? >= plan_qty THEN 4 WHEN COALESCE(received_qty, 0) + ? > 0 THEN 3 ELSE status END
         WHERE id = ? AND deleted = 0`,
        [Number(receive.receive_qty) || 0, inQty, Number(receive.receive_qty) || 0, Number(receive.receive_qty) || 0, receive.outsource_order_id]
      );

      return { id, status: 3 };
    });
    return successResponse(result, '入库过账成功');
  }

  if (action === 'qc_pass') {
    await execute('UPDATE outsource_receive SET qc_status = 2 WHERE id = ? AND deleted = 0', [id]);
    return successResponse(null, '质检合格');
  }
  if (action === 'qc_fail') {
    await execute('UPDATE outsource_receive SET qc_status = 3 WHERE id = ? AND deleted = 0', [id]);
    return successResponse(null, '质检不合格');
  }

  const fields: string[] = [];
  const values: any[] = [];
  if (status !== undefined) { fields.push('status = ?'); values.push(status); }
  if (qc_status !== undefined) { fields.push('qc_status = ?'); values.push(qc_status); }
  if (qualified_qty !== undefined) { fields.push('qualified_qty = ?'); values.push(qualified_qty); }
  if (defective_qty !== undefined) { fields.push('defective_qty = ?'); values.push(defective_qty); }
  if (remark !== undefined) { fields.push('remark = ?'); values.push(remark); }
  if (fields.length > 0) {
    values.push(id);
    await execute(`UPDATE outsource_receive SET ${fields.join(', ')} WHERE id = ? AND deleted = 0`, values);
  }

  return successResponse(null, '收货单更新成功');
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return errorResponse('缺少id', 400, 400);
  await execute('UPDATE outsource_receive SET deleted = 1 WHERE id = ?', [Number(id)]);
  return successResponse(null, '删除成功');
});
