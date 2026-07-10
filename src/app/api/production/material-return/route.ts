import { NextRequest, NextResponse } from 'next/server';
import { query, execute, transaction } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { getMrPrefix, generateDocNo } from '@/lib/global-config';
import { getDomainEventOutbox } from '@/infrastructure/event-bus/DomainEventOutboxFactory';
import { MaterialReturnApprovedEvent } from '@/domain/production/events/PickOrderEvents';

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const returnNo = searchParams.get('returnNo') || '';
  const status = searchParams.get('status') || '';

  let where = 'WHERE r.deleted = 0';
  const params: Loose[] = [];
  if (returnNo) {
    where += ' AND r.return_no LIKE ?';
    params.push('%' + returnNo + '%');
  }
  if (status) {
    where += ' AND r.status = ?';
    params.push(Number(status));
  }

  const totalRows: Loose = await query(
    'SELECT COUNT(*) as total FROM prd_material_return r ' + where,
    params
  );
  const total = totalRows[0]?.total || 0;
  const rows: Loose = await query(
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
      work_order_no,
      warehouse_id,
      return_date,
      operator_name,
      remark,
      items,
    } = body;
    const _now = new Date();
    const returnNo = generateDocNo(getMrPrefix());

    const result: Loose = await execute(
      'INSERT INTO prd_material_return (return_no, work_order_id, work_order_no, warehouse_id, return_date, operator_name, remark) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        returnNo,
        work_order_id || null,
        work_order_no || null,
        warehouse_id,
        return_date,
        operator_name || null,
        remark || null,
      ]
    );

    if (items && Array.isArray(items)) {
      for (const item of items) {
        await execute(
          'INSERT INTO prd_material_return_item (return_id, material_id, material_code, material_name, return_qty, unit, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            result.insertId,
            item.material_id,
            item.material_code || null,
            item.material_name || null,
            item.return_qty,
            item.unit || null,
            item.batch_no || null,
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
      const returnOrder: Loose = await query(
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

      const itemRows: Loose = await query(
        'SELECT * FROM prd_material_return_item WHERE return_id = ? AND deleted = 0',
        [id]
      );
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
            workOrderNo: order.work_order_no || null,
            warehouseId: order.warehouse_id,
            operatorName: order.operator_name || null,
            items: itemRows.map((item: Loose) => ({
              materialId: item.material_id,
              materialCode: item.material_code || null,
              materialName: item.material_name || null,
              quantity: Number(item.return_qty),
              unit: item.unit || null,
              batchNo: item.batch_no || null,
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
