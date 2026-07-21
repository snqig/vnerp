import { NextRequest } from 'next/server';
import { query, execute, queryOne } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { getMrPrefix, generateDocNo } from '@/lib/global-config';

import { withPermission } from '@/lib/api-permissions';
import { ISSUE_TYPE_LABEL, MATERIAL_REQUISITION_STATUS_LABEL } from '@/lib/status-labels';

const ISSUE_TYPE_MAP = ISSUE_TYPE_LABEL;
const STATUS_MAP = MATERIAL_REQUISITION_STATUS_LABEL;

function generateIssueNo(): string {
  return generateDocNo(getMrPrefix());
}

export const GET = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const issueType = searchParams.get('type') || '';
  const status = searchParams.get('status') || '';
  const workOrderId = searchParams.get('workOrderId') || '';

  let where = 'WHERE mi.deleted = 0';
  const params: Loose[] = [];

  if (issueType) {
    where += ' AND mi.issue_type = ?';
    params.push(Number(issueType));
  }
  if (status) {
    where += ' AND mi.status = ?';
    params.push(Number(status));
  }
  if (workOrderId) {
    where += ' AND mi.work_order_id = ?';
    params.push(Number(workOrderId));
  }

  const totalRows: Loose = await query(
    `SELECT COUNT(*) as total FROM prd_material_issue mi ${where}`,
    params
  );
  const total = totalRows[0]?.total || 0;

  const rows: Loose = await query(
    `SELECT mi.*, w.warehouse_name,
            wo.order_no as work_order_no
     FROM prd_material_issue mi
     LEFT JOIN inv_warehouse w ON mi.warehouse_id = w.id
     LEFT JOIN prod_work_order wo ON mi.work_order_id = wo.id
     ${where}
     ORDER BY mi.create_time DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  return successResponse(
    {
      list: rows.map((row: Loose) => ({
        ...row,
        requisition_no: row.issue_no,
        type_name: ISSUE_TYPE_MAP[row.issue_type] || '未知',
        status_name: STATUS_MAP[row.status] || '未知',
      })),
      total,
      page,
      pageSize,
    },
    '获取领料单列表成功'
  );
});

export const POST = withPermission(async (request: NextRequest) => {
  const body = await request.json();
  const {
    workOrderId,
    warehouseId,
    issueType = 1,
    applicantId,
    applicantName,
    remark,
    items,
  } = body;

  if (!workOrderId) {
    return errorResponse('缺少工单ID', 400, 400);
  }

  if (!warehouseId) {
    return errorResponse('缺少仓库ID', 400, 400);
  }

  const workOrder: Loose = await queryOne(
    `SELECT id, order_no FROM prod_work_order WHERE id = ? AND deleted = 0`,
    [Number(workOrderId)]
  );

  if (!workOrder) {
    return errorResponse('工单不存在', 400, 400);
  }

  const issueNo = generateIssueNo();

  const result: Loose = await execute(
    `INSERT INTO prd_material_issue (
      issue_no, work_order_id, work_order_no, warehouse_id,
      issue_date, issue_type, status, operator_id, operator_name,
      remark, create_time, update_time
    ) VALUES (?, ?, ?, ?, NOW(), ?, 1, ?, ?, ?, NOW(), NOW())`,
    [
      issueNo,
      Number(workOrderId),
      workOrder.order_no,
      Number(warehouseId),
      Number(issueType),
      applicantId || null,
      applicantName || null,
      remark || null,
    ]
  );

  const issueId = result.insertId;

  if (items && Array.isArray(items)) {
    for (const item of items) {
      if (!item.materialId) continue;

      const material: Loose = await queryOne(
        `SELECT id, material_code, material_name FROM bas_material WHERE id = ?`,
        [Number(item.materialId)]
      );

      await execute(
        `INSERT INTO prd_material_issue_item (
          issue_id, material_id, material_code, material_name,
          required_qty, issued_qty, unit, batch_no, create_time
        ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, NOW())`,
        [
          issueId,
          Number(item.materialId),
          material?.material_code || '',
          material?.material_name || '',
          Number(item.quantity || item.requiredQty || 0),
          item.unit || null,
          item.batch_no || null,
        ]
      );
    }
  }

  return successResponse(
    {
      id: issueId,
      requisition_no: issueNo,
      issue_no: issueNo,
      status: 1,
    },
    '领料单创建成功'
  );
});

export const PUT = withPermission(async (request: NextRequest) => {
  const body = await request.json();
  const { id, action, items, approverId: _approverId, approverName: _approverName } = body;

  if (!id) {
    return errorResponse('缺少领料单ID', 400, 400);
  }

  const issue: Loose = await queryOne(
    `SELECT * FROM prd_material_issue WHERE id = ? AND deleted = 0`,
    [Number(id)]
  );

  if (!issue) {
    return errorResponse('领料单不存在', 400, 400);
  }

  if (action === 'issue') {
    if (issue.status !== 1) {
      return errorResponse('只有待出库的领料单才能出库', 400, 400);
    }

    if (items && Array.isArray(items)) {
      for (const item of items) {
        await execute(
          `UPDATE prd_material_issue_item
           SET issued_qty = ?
           WHERE id = ? AND issue_id = ?`,
          [Number(item.issuedQty || item.quantity || 0), item.id, Number(id)]
        );
      }
    }

    await execute(`UPDATE prd_material_issue SET status = 2, update_time = NOW() WHERE id = ?`, [
      Number(id),
    ]);

    return successResponse(null, '领料出库成功');
  }

  if (action === 'cancel') {
    if (issue.status !== 1) {
      return errorResponse('只有待出库的领料单才能取消', 400, 400);
    }

    await execute(`UPDATE prd_material_issue SET status = 3, update_time = NOW() WHERE id = ?`, [
      Number(id),
    ]);

    return successResponse(null, '领料单已取消');
  }

  return errorResponse('未知的操作类型', 400, 400);
});
