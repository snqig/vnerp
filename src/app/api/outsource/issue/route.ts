import { NextRequest } from 'next/server';
import { query, execute, transaction } from '@/lib/db';
import { withErrorHandler, successResponse, errorResponse } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const issueNo = searchParams.get('issueNo') || '';
  const outsourceOrderNo = searchParams.get('outsourceOrderNo') || '';
  const status = searchParams.get('status') || '';

  let where = 'WHERE i.deleted = 0';
  const params: any[] = [];
  if (issueNo) { where += ' AND i.issue_no LIKE ?'; params.push('%' + issueNo + '%'); }
  if (outsourceOrderNo) { where += ' AND i.outsource_order_no LIKE ?'; params.push('%' + outsourceOrderNo + '%'); }
  if (status) { where += ' AND i.status = ?'; params.push(Number(status)); }

  const totalRows: any = await query('SELECT COUNT(*) as total FROM outsource_issue i ' + where, params);
  const total = totalRows[0]?.total || 0;
  const rows: any = await query(
    'SELECT i.*, w.warehouse_name FROM outsource_issue i LEFT JOIN inv_warehouse w ON i.warehouse_id = w.id ' + where + ' ORDER BY i.create_time DESC LIMIT ? OFFSET ?',
    [...params, pageSize, (page - 1) * pageSize]
  );

  for (const row of rows) {
    const items: any = await query('SELECT * FROM outsource_issue_item WHERE issue_id = ?', [row.id]);
    row.items = items;
  }

  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { outsource_order_id, outsource_order_no, warehouse_id, issue_date, operator_name, remark, items } = body;

  if (!outsource_order_id) return errorResponse('委外订单不能为空', 400, 400);
  if (!warehouse_id) return errorResponse('仓库不能为空', 400, 400);

  const now = new Date();
  const issueNo = 'OI' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + String(Math.floor(Math.random() * 10000)).padStart(4, '0');

  const result: any = await execute(
    `INSERT INTO outsource_issue (issue_no, outsource_order_id, outsource_order_no, warehouse_id, issue_date, status, operator_name, remark)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
    [issueNo, outsource_order_id, outsource_order_no || null, warehouse_id, issue_date || null, operator_name || null, remark || null]
  );

  if (items && Array.isArray(items)) {
    for (const item of items) {
      await execute(
        'INSERT INTO outsource_issue_item (issue_id, material_id, material_code, material_name, quantity, unit, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [result.insertId, item.material_id, item.material_code || null, item.material_name || null, item.quantity, item.unit || null, item.batch_no || null]
      );
    }
  }

  return successResponse({ id: result.insertId, issue_no: issueNo }, '委外发料单创建成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, action, status, remark } = body;

  if (!id) return errorResponse('发料单ID不能为空', 400, 400);

  if (action === 'post') {
    const result = await transaction(async (conn) => {
      const [issueRows]: any = await conn.execute(
        'SELECT id, issue_no, outsource_order_id, outsource_order_no, warehouse_id, status FROM outsource_issue WHERE id = ? AND deleted = 0 FOR UPDATE',
        [id]
      );
      if (issueRows.length === 0) throw new Error('发料单不存在');
      const issue = issueRows[0];
      if (issue.status >= 3) throw new Error('发料单已完成或已取消，不能重复过账');

      const [itemRows]: any = await conn.execute(
        'SELECT * FROM outsource_issue_item WHERE issue_id = ?',
        [id]
      );

      for (const item of itemRows) {
        const [invRows]: any = await conn.execute(
          'SELECT id, quantity FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE',
          [item.material_id, issue.warehouse_id]
        );
        if (invRows.length === 0) throw new Error(`物料 ${item.material_name} 库存记录不存在`);
        if (Number(invRows[0].quantity) < Number(item.quantity)) {
          throw new Error(`物料 ${item.material_name} 库存不足: 可用 ${invRows[0].quantity}, 需发 ${item.quantity}`);
        }
        await conn.execute('UPDATE inv_inventory SET quantity = quantity - ?, update_time = NOW() WHERE id = ?', [item.quantity, invRows[0].id]);

        const transNo = 'TRX' + Date.now() + String(item.id).slice(-4);
        const [matRows]: any = await conn.execute('SELECT material_code FROM mdm_material WHERE id = ?', [item.material_id]);
        const matCode = matRows.length > 0 ? matRows[0].material_code : '';
        await conn.execute(
          `INSERT INTO inv_inventory_transaction (trans_no, trans_type, source_type, source_id, material_id, material_code, batch_no, warehouse_id, quantity, unit_price, total_amount, account_dr, account_cr, create_time)
           VALUES (?, 'out', 'outsource_issue', ?, ?, ?, ?, ?, ?, 0, 0, '委外加工', '原材料库存', NOW())`,
          [transNo, id, item.material_id, matCode, item.batch_no || '', issue.warehouse_id, -item.quantity]
        );
      }

      await conn.execute('UPDATE outsource_issue SET status = 3, update_time = NOW() WHERE id = ?', [id]);

      const totalIssuedQty = itemRows.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0);
      await conn.execute(
        'UPDATE outsource_order SET issued_qty = COALESCE(issued_qty, 0) + ?, status = CASE WHEN status < 2 THEN 2 ELSE status END WHERE id = ? AND deleted = 0',
        [totalIssuedQty, issue.outsource_order_id]
      );

      return { id, status: 3 };
    });
    return successResponse(result, '发料过账成功');
  }

  if (action === 'cancel') {
    await execute('UPDATE outsource_issue SET status = 9 WHERE id = ? AND deleted = 0', [id]);
    return successResponse(null, '发料单已取消');
  }

  const fields: string[] = [];
  const values: any[] = [];
  if (status !== undefined) { fields.push('status = ?'); values.push(status); }
  if (remark !== undefined) { fields.push('remark = ?'); values.push(remark); }
  if (fields.length > 0) {
    values.push(id);
    await execute(`UPDATE outsource_issue SET ${fields.join(', ')} WHERE id = ? AND deleted = 0`, values);
  }

  return successResponse(null, '发料单更新成功');
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return errorResponse('缺少id', 400, 400);
  await execute('UPDATE outsource_issue SET deleted = 1 WHERE id = ?', [Number(id)]);
  return successResponse(null, '删除成功');
});
