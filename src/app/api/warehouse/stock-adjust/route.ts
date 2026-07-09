import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { secureLog } from '@/lib/logger';

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const adjustNo = searchParams.get('adjustNo') || '';
  const adjustType = searchParams.get('adjustType') || '';

  let where = 'WHERE a.deleted = 0';
  const params: Loose[] = [];
  if (adjustNo) {
    where += ' AND a.adjust_no LIKE ?';
    params.push('%' + adjustNo + '%');
  }
  if (adjustType) {
    where += ' AND a.adjust_type = ?';
    params.push(Number(adjustType));
  }

  const totalRows: Loose = await query(
    'SELECT COUNT(*) as total FROM inv_stock_adjust a ' + where,
    params
  );
  const total = totalRows[0]?.total || 0;
  const rows: Loose = await query(
    'SELECT a.*, w.warehouse_name FROM inv_stock_adjust a LEFT JOIN inv_warehouse w ON a.warehouse_id = w.id ' +
      where +
      ' ORDER BY a.create_time DESC LIMIT ? OFFSET ?',
    [...params, pageSize, (page - 1) * pageSize]
  );
  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withPermission(async (request: NextRequest, _userInfo) => {
  const body = await request.json();
  const { warehouse_id, adjust_date, adjust_type, operator_name, remark, items } = body;
  const now = new Date();
  const adjustNo =
    'TZ' +
    now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(Math.floor(Math.random() * 10000)).padStart(4, '0');

  const result: Loose = await execute(
    'INSERT INTO inv_stock_adjust (adjust_no, warehouse_id, adjust_date, adjust_type, operator_name, remark) VALUES (?, ?, ?, ?, ?, ?)',
    [adjustNo, warehouse_id, adjust_date, adjust_type || 1, operator_name || null, remark || null]
  );

  if (items && Array.isArray(items)) {
    for (const item of items) {
      await execute(
        'INSERT INTO inv_stock_adjust_item (adjust_id, material_id, material_code, material_name, before_qty, adjust_qty, after_qty, unit, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          result.insertId,
          item.material_id,
          item.material_code || null,
          item.material_name || null,
          item.before_qty || 0,
          item.adjust_qty || 0,
          item.after_qty || 0,
          item.unit || null,
          item.batch_no || null,
        ]
      );
    }
  }
  return successResponse({ id: result.insertId, adjust_no: adjustNo }, '调整单创建成功');
});

export const PUT = withPermission(async (request: NextRequest, _userInfo) => {
  const body = await request.json();
  const { id, status, remark, expectedStatus } = body;

  // 状态变更采用乐观锁：前端传入 expectedStatus（当前状态），UPDATE 带 status 条件
  // 防止多人同时审批同一调整单导致重复扣减库存
  if (status !== undefined) {
    if (expectedStatus === undefined) {
      return errorResponse('缺少 expectedStatus 参数（当前状态）', 400, 400);
    }

    secureLog('debug', 'stock-adjust 状态变更（乐观锁）', {
      operation: 'updateStockAdjustStatus',
      id,
      targetStatus: status,
      expectedStatus,
    });

    const result: Loose = await execute(
      'UPDATE inv_stock_adjust SET status = ?, update_time = NOW() WHERE id = ? AND deleted = 0 AND status = ?',
      [status, id, expectedStatus]
    );

    secureLog('debug', 'stock-adjust UPDATE 结果', {
      operation: 'updateStockAdjustStatus',
      id,
      affectedRows: result.affectedRows,
      expectedStatus,
      targetStatus: status,
    });

    if (result.affectedRows === 0) {
      secureLog('warn', '乐观锁并发冲突', {
        operation: 'updateStockAdjustStatus',
        id,
        expectedStatus,
        targetStatus: status,
      });
      return errorResponse('并发冲突: 调整单状态已被其他操作变更，请刷新后重试', 409, 409);
    }
  }

  if (remark !== undefined)
    await execute('UPDATE inv_stock_adjust SET remark = ? WHERE id = ? AND deleted = 0', [
      remark,
      id,
    ]);
  return successResponse(null, '更新成功');
});

export const DELETE = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, message: '缺少id' }, { status: 400 });
  await execute('UPDATE inv_stock_adjust SET deleted = 1 WHERE id = ?', [Number(id)]);
  return successResponse(null, '删除成功');
});
