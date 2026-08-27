import { NextRequest, NextResponse } from 'next/server';
import { query, execute, transaction, SqlValue } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { getMrPrefix, generateDocNo } from '@/lib/global-config';
import { getDomainEventOutbox } from '@/infrastructure/event-bus/DomainEventOutboxFactory';
import { MaterialReturnApprovedEvent } from '@/domain/production/events/PickOrderEvents';
import type { DbRow } from '@/types/db';

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const returnNo = searchParams.get('returnNo') || '';
  const status = searchParams.get('status') || '';

  let where = 'WHERE r.deleted = 0';
  const params: SqlValue[] = [];
  if (returnNo) {
    where += ' AND r.return_no LIKE ?';
    params.push('%' + returnNo + '%');
  }
  if (status) {
    where += ' AND r.status = ?';
    params.push(Number(status));
  }

  const totalRows = await query(
    'SELECT COUNT(*) as total FROM prd_material_return r ' + where,
    params
  );
  const total = totalRows[0]?.total || 0;
  const rows = await query(
    'SELECT r.*, w.warehouse_name FROM prd_material_return r LEFT JOIN inv_warehouse w ON r.warehouse_id = w.id ' +
      where +
      ' ORDER BY r.create_time DESC LIMIT ? OFFSET ?',
    [...params, pageSize, (page - 1) * pageSize]
  );
  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body = await request.json();
    const {
      work_order_id,
      warehouse_id,
      return_reason,
      remark,
      items,
    } = body;
    const _now = new Date();
    const returnNo = generateDocNo(getMrPrefix());

    const result = await execute(
      'INSERT INTO prd_material_return (return_no, work_order_id, warehouse_id, return_reason, remark) VALUES (?, ?, ?, ?, ?)',
      [
        returnNo,
        work_order_id || null,
        warehouse_id,
        return_reason || null,
        remark || null,
      ]
    );

    if (items && Array.isArray(items)) {
      for (const item of items) {
        await execute(
          'INSERT INTO prd_material_return_item (return_order_id, material_id, material_name, quantity, batch_no, batch_id, original_inbound_date, unit_cost, line_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            result.insertId,
            item.material_id || null,
            item.material_name || null,
            item.quantity || item.return_qty || 0,
            item.batch_no || null,
            item.batch_id || null,
            item.original_inbound_date || null,
            item.unit_cost || null,
            item.line_amount || null,
          ]
        );
      }
    }
    return successResponse({ id: result.insertId, return_no: returnNo }, '退料单创建成功');
  },
  { logTitle: '创建退料单', logType: 'business' }
);

export const PUT = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body = await request.json();
    const { id, status, remark, action } = body;

    if (action === 'confirm' && id) {
      const returnOrder = await query(
        'SELECT * FROM prd_material_return WHERE id = ? AND deleted = 0',
        [id]
      );
      if (!returnOrder || returnOrder.length === 0) {
        return errorResponse('退料单不存在', 404, 404);
      }
      const order = returnOrder[0];
      if (order.status !== 1) {
        return errorResponse('退料单状态不允许确认', 400, 400);
      }

      const itemRows = await query('SELECT * FROM prd_material_return_item WHERE return_id = ?', [
        id,
      ]);
      if (!itemRows || itemRows.length === 0) {
        return errorResponse('退料单无明细', 400, 400);
      }

      await transaction(async (conn) => {
        await conn.execute(
          'UPDATE prd_material_return SET status = 2, update_time = NOW() WHERE id = ?',
          [id]
        );

        await getDomainEventOutbox().saveEvents(conn, 'MaterialReturn', id, [
          new MaterialReturnApprovedEvent({
            returnId: id,
            returnNo: order.return_no,
            workOrderId: order.work_order_id || null,
            workOrderNo: null,
            warehouseId: order.warehouse_id,
            operatorName: null,
            items: itemRows.map((item: DbRow) => ({
              materialId: item.material_id,
              materialCode: null,
              materialName: item.material_name || null,
              quantity: Number(item.quantity),
              unit: null,
              batchNo: item.batch_no || null,
              batchId: item.batch_id || null,
              originalInboundDate: item.original_inbound_date || null,
            })),
          }),
        ]);
      });

      return successResponse(null, '退料单确认成功，库存已增加');
    }

    if (status !== undefined)
      await execute('UPDATE prd_material_return SET status = ? WHERE id = ? AND deleted = 0', [
        status,
        id,
      ]);
    if (remark !== undefined)
      await execute('UPDATE prd_material_return SET remark = ? WHERE id = ? AND deleted = 0', [
        remark,
        id,
      ]);
    return successResponse(null, '更新成功');
  },
  { logTitle: '更新退料单', logType: 'business' }
);

export const DELETE = withPermission(
  async (request: NextRequest, _userInfo) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, message: '缺少id' }, { status: 400 });
    await execute('UPDATE prd_material_return SET deleted = 1 WHERE id = ?', [Number(id)]);
    return successResponse(null, '删除成功');
  },
  { logTitle: '删除退料单', logType: 'business' }
);
