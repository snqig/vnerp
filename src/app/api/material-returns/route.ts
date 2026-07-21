import { NextRequest } from 'next/server';
import { query, execute, queryOne } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { generateDocNo } from '@/lib/global-config';

import { withPermission } from '@/lib/api-permissions';
import { MATERIAL_RETURN_STATUS_LABEL } from '@/lib/status-labels';

const STATUS_MAP = MATERIAL_RETURN_STATUS_LABEL;

function generateReturnNo(): string {
  return generateDocNo('RT');
}

export const GET = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const status = searchParams.get('status') || '';
  const workOrderId = searchParams.get('workOrderId') || '';

  let where = 'WHERE mr.deleted = 0';
  const params: Loose[] = [];

  if (status) {
    where += ' AND mr.status = ?';
    params.push(Number(status));
  }
  if (workOrderId) {
    where += ' AND mr.work_order_id = ?';
    params.push(Number(workOrderId));
  }

  const totalRows: Loose = await query(
    `SELECT COUNT(*) as total FROM prd_material_return mr ${where}`,
    params
  );
  const total = totalRows[0]?.total || 0;

  const rows: Loose = await query(
    `SELECT mr.*, w.warehouse_name,
            wo.order_no as work_order_no
     FROM prd_material_return mr
     LEFT JOIN inv_warehouse w ON mr.warehouse_id = w.id
     LEFT JOIN prod_work_order wo ON mr.work_order_id = wo.id
     ${where}
     ORDER BY mr.create_time DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  return successResponse(
    {
      list: rows.map((row: Loose) => ({
        ...row,
        status_name: STATUS_MAP[row.status] || '未知',
      })),
      total,
      page,
      pageSize,
    },
    '获取退料单列表成功'
  );
});

export const POST = withPermission(async (request: NextRequest) => {
  const body = await request.json();
  const { workOrderId, warehouseId, items, applicantId, applicantName, remark } = body;

  if (!workOrderId) {
    return errorResponse('缺少工单ID', 400, 400);
  }

  if (!warehouseId) {
    return errorResponse('缺少仓库ID', 400, 400);
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return errorResponse('缺少退料明细', 400, 400);
  }

  const workOrder: Loose = await queryOne(
    `SELECT id, order_no FROM prod_work_order WHERE id = ? AND deleted = 0`,
    [Number(workOrderId)]
  );

  if (!workOrder) {
    return errorResponse('工单不存在', 400, 400);
  }

  const returnNo = generateReturnNo();

  const result: Loose = await execute(
    `INSERT INTO prd_material_return (
      return_no, work_order_id, work_order_no, warehouse_id,
      return_date, status, operator_id, operator_name,
      remark, create_time, update_time
    ) VALUES (?, ?, ?, ?, NOW(), 1, ?, ?, ?, NOW(), NOW())`,
    [
      returnNo,
      Number(workOrderId),
      workOrder.order_no,
      Number(warehouseId),
      applicantId || null,
      applicantName || null,
      remark || null,
    ]
  );

  const returnId = result.insertId;

  for (const item of items) {
    if (!item.materialId) continue;

    const material: Loose = await queryOne(
      `SELECT id, material_code, material_name FROM bas_material WHERE id = ?`,
      [Number(item.materialId)]
    );

    await execute(
      `INSERT INTO prd_material_return_item (
        return_id, material_id, material_code, material_name,
        return_qty, unit, batch_no, remark, create_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        returnId,
        Number(item.materialId),
        material?.material_code || '',
        material?.material_name || '',
        Number(item.quantity || 0),
        item.unit || null,
        item.batch_no || null,
        item.remark || null,
      ]
    );
  }

  return successResponse(
    {
      id: returnId,
      return_no: returnNo,
      status: 1,
    },
    '退料单创建成功'
  );
});

export const PUT = withPermission(async (request: NextRequest) => {
  const body = await request.json();
  const { id, action, operatorId: _operatorId, operatorName: _operatorName } = body;

  if (!id) {
    return errorResponse('缺少退料单ID', 400, 400);
  }

  const returnOrder: Loose = await queryOne(
    `SELECT * FROM prd_material_return WHERE id = ? AND deleted = 0`,
    [Number(id)]
  );

  if (!returnOrder) {
    return errorResponse('退料单不存在', 400, 400);
  }

  if (action === 'confirm') {
    if (returnOrder.status !== 1) {
      return errorResponse('只有待确认的退料单才能确认入库', 400, 400);
    }

    const returnItems: Loose[] = await query(
      `SELECT * FROM prd_material_return_item WHERE return_id = ?`,
      [Number(id)]
    );

    for (const item of returnItems) {
      await execute(
        `UPDATE inv_inventory
         SET quantity = quantity + ?, update_time = NOW()
         WHERE material_id = ? AND warehouse_id = ? AND deleted = 0`,
        [Number(item.return_qty), item.material_id, returnOrder.warehouse_id]
      );
    }

    await execute(`UPDATE prd_material_return SET status = 2, update_time = NOW() WHERE id = ?`, [
      Number(id),
    ]);

    return successResponse(null, '退料入库确认成功');
  }

  if (action === 'cancel') {
    if (returnOrder.status !== 1) {
      return errorResponse('只有待确认的退料单才能取消', 400, 400);
    }

    await execute(`UPDATE prd_material_return SET status = 3, update_time = NOW() WHERE id = ?`, [
      Number(id),
    ]);

    return successResponse(null, '退料单已取消');
  }

  return errorResponse('未知的操作类型', 400, 400);
});
