import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import { withErrorHandler, successResponse, errorResponse } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const supplierName = searchParams.get('supplierName') || '';
  const supplierLevel = searchParams.get('supplierLevel') || '';
  const evalPeriod = searchParams.get('evalPeriod') || '';

  let where = 'WHERE e.deleted = 0';
  const params: any[] = [];
  if (supplierName) { where += ' AND e.supplier_name LIKE ?'; params.push('%' + supplierName + '%'); }
  if (supplierLevel) { where += ' AND e.supplier_level = ?'; params.push(supplierLevel); }
  if (evalPeriod) { where += ' AND e.eval_period = ?'; params.push(evalPeriod); }

  const totalRows: any = await query('SELECT COUNT(*) as total FROM srm_supplier_eval e ' + where, params);
  const total = totalRows[0]?.total || 0;
  const rows: any = await query('SELECT e.* FROM srm_supplier_eval e ' + where + ' ORDER BY e.create_time DESC LIMIT ? OFFSET ?', [...params, pageSize, (page - 1) * pageSize]);

  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { supplier_id, supplier_name, eval_period, period_start, period_end, quality_score, delivery_score, price_score, service_score, total_score, quality_rate, on_time_rate, order_count, defect_count, supplier_level, evaluator, remark, items } = body;

  if (!supplier_id) return errorResponse('供应商ID不能为空', 400, 400);

  const now = new Date();
  const evalNo = 'SE' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + String(Math.floor(Math.random() * 10000)).padStart(4, '0');

  const result: any = await execute(
    `INSERT INTO srm_supplier_eval (eval_no, supplier_id, supplier_name, eval_period, period_start, period_end, quality_score, delivery_score, price_score, service_score, total_score, quality_rate, on_time_rate, order_count, defect_count, supplier_level, status, evaluator, eval_time, remark)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 2, ?, NOW(), ?)`,
    [evalNo, supplier_id, supplier_name || '', eval_period || 'quarter', period_start || null, period_end || null, quality_score || null, delivery_score || null, price_score || null, service_score || null, total_score || null, quality_rate || null, on_time_rate || null, order_count || 0, defect_count || 0, supplier_level || 'C', evaluator || null, remark || null]
  );

  const evalId = result.insertId;

  if (items && Array.isArray(items) && items.length > 0) {
    for (const item of items) {
      await execute(
        `INSERT INTO srm_supplier_eval_item (eval_id, category, item_name, weight, score, actual_value, target_value, remark, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [evalId, item.category || null, item.item_name || '', item.weight || 0, item.score || 0, item.actual_value || null, item.target_value || null, item.remark || null, item.sort_order || 0]
      );
    }
  }

  return successResponse({ id: evalId, eval_no: evalNo }, '供应商评估创建成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, ...fields } = body;
  if (!id) return errorResponse('ID不能为空', 400, 400);

  const updateFields: string[] = [];
  const updateValues: any[] = [];
  const allowedFields = ['quality_score', 'delivery_score', 'price_score', 'service_score', 'total_score', 'quality_rate', 'on_time_rate', 'order_count', 'defect_count', 'supplier_level', 'status', 'approver', 'approve_time', 'remark'];
  for (const field of allowedFields) {
    if (fields[field] !== undefined) { updateFields.push(`${field} = ?`); updateValues.push(fields[field]); }
  }
  if (updateFields.length > 0) {
    await execute(`UPDATE srm_supplier_eval SET ${updateFields.join(', ')} WHERE id = ? AND deleted = 0`, [...updateValues, id]);
  }

  if (fields.items && Array.isArray(fields.items)) {
    await execute('DELETE FROM srm_supplier_eval_item WHERE eval_id = ?', [id]);
    for (const item of fields.items) {
      await execute(
        `INSERT INTO srm_supplier_eval_item (eval_id, category, item_name, weight, score, actual_value, target_value, remark, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, item.category || null, item.item_name || '', item.weight || 0, item.score || 0, item.actual_value || null, item.target_value || null, item.remark || null, item.sort_order || 0]
      );
    }
  }

  return successResponse(null, '更新成功');
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return errorResponse('ID不能为空', 400, 400);
  await execute('UPDATE srm_supplier_eval SET deleted = 1 WHERE id = ?', [id]);
  return successResponse(null, '删除成功');
});
