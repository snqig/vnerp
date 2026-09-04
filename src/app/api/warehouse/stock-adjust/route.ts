import { getTranslations } from 'next-intl/server';

;
import { NextRequest, NextResponse } from 'next/server';
import { query, execute, SqlValue } from '@/lib/db';
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
  const params: SqlValue[] = [];
  if (adjustNo) {
    where += ' AND a.adjust_no LIKE ?';
    params.push('%' + adjustNo + '%');
  }
  if (adjustType) {
    where += ' AND a.adjust_type = ?';
    params.push(Number(adjustType));
  }

  const totalRows = await query(
    'SELECT COUNT(*) as total FROM inv_stock_adjust a ' + where,
    params
  );
  const total = totalRows[0]?.total || 0;
  const rows = await query(
    'SELECT a.*, w.warehouse_name FROM inv_stock_adjust a LEFT JOIN inv_warehouse w ON a.warehouse_id = w.id ' +
      where +
      ' ORDER BY a.create_time DESC LIMIT ? OFFSET ?',
    [...params, pageSize, (page - 1) * pageSize]
  );
  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
  const body = await request.json();
  const { warehouse_id, adjust_date, adjust_type, operator_name, remark, items } = body;
  const now = new Date();
  const adjustNo =
    'TZ' +
    now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(Math.floor(Math.random() * 10000)).padStart(4, '0');

  const result = await execute(
    'INSERT INTO inv_stock_adjust (adjust_no, warehouse_id, adjust_date, adjust_type, operator_name, remark) VALUES (?, ?, ?, ?, ?, ?)',
    [adjustNo, warehouse_id, adjust_date, adjust_type || 1, operator_name || null, remark || null]
  );

  if (items && Array.isArray(items)) {
    for (const item of items) {
      await execute(
        'INSERT INTO inv_stock_adjust_item (adjust_id, material_id, material_code, material_name, before_qty, adjust_qty, after_qty, unit, batch_no, batch_id, location_id, original_inbound_date, qr_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
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
          item.batch_id || null,
          item.location_id || null,
          item.original_inbound_date || null,
          item.qr_code || null,
        ]
      );
    }
  }
  return successResponse({ id: result.insertId, adjust_no: adjustNo }, ts('k_10ywx0d'));
});

export const PUT = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
  const body = await request.json();
  const { id, status, remark, expectedStatus } = body;

  // 状态变更采用乐观锁：前端传入 expectedStatus（当前状态），UPDATE 带 status 条件
  // 防止多人同时审批同一调整单导致重复扣减库存
  if (status !== undefined) {
    if (expectedStatus === undefined) {
      return errorResponse(ts('k_n3n518'), 400, 400);
    }

    secureLog('debug', ts('k_86f1fk'), {
      operation: 'updateStockAdjustStatus',
      id,
      targetStatus: status,
      expectedStatus,
    });

    const result = await execute(
      'UPDATE inv_stock_adjust SET status = ?, update_time = NOW() WHERE id = ? AND deleted = 0 AND status = ?',
      [status, id, expectedStatus]
    );

    secureLog('debug', ts('k_1nxvb77'), {
      operation: 'updateStockAdjustStatus',
      id,
      affectedRows: result.affectedRows,
      expectedStatus,
      targetStatus: status,
    });

    if (result.affectedRows === 0) {
      secureLog('warn', ts('k_awftru'), {
        operation: 'updateStockAdjustStatus',
        id,
        expectedStatus,
        targetStatus: status,
      });
      return errorResponse(ts('k_a8ypem'), 409, 409);
    }
  }

  if (remark !== undefined)
    await execute('UPDATE inv_stock_adjust SET remark = ? WHERE id = ? AND deleted = 0', [
      remark,
      id,
    ]);
  return successResponse(null, ts('k_1795bzg'));
});

export const DELETE = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, message: ts('k_js4lo9') }, { status: 400 });
  await execute('UPDATE inv_stock_adjust SET deleted = 1 WHERE id = ?', [Number(id)]);
  return successResponse(null, ts('k_1hlqs'));
});
