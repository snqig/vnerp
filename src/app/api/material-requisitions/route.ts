import { NextRequest } from 'next/server';
import { query, execute, queryOne, SqlValue } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { getMrPrefix, generateDocNo } from '@/lib/global-config';

import { withPermission } from '@/lib/api-permissions';
import { checkMaterialsCategorized } from '@/lib/category-validation';
import { secureLog } from '@/lib/logger';
import type { DbRow } from '@/types/db';

function generateIssueNo(): string {
  return generateDocNo(getMrPrefix());
}

export const GET = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const type = searchParams.get('type') || '';
  const status = searchParams.get('status') || '';
  const workOrderId = searchParams.get('workOrderId') || '';

  let where = 'WHERE mr.deleted = 0';
  const params: SqlValue[] = [];

  if (type) {
    where += ' AND mr.type = ?';
    params.push(type);
  }
  if (status) {
    where += ' AND mr.status = ?';
    params.push(Number(status));
  }
  if (workOrderId) {
    where += ' AND mr.work_order_id = ?';
    params.push(Number(workOrderId));
  }

  const totalRows = await query(
    `SELECT COUNT(*) as total FROM material_requisitions mr ${where}`,
    params
  );
  const total = totalRows[0]?.total || 0;

  const rows = await query(
    `SELECT mr.*, w.warehouse_name
     FROM material_requisitions mr
     LEFT JOIN inv_warehouse w ON mr.warehouse_id = w.id
     ${where}
     ORDER BY mr.create_time DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  return successResponse(
    {
      list: rows,
      total,
      page,
      pageSize,
    },
    '获取领料单列表成功'
  );
});

// 注意：GET 读取 material_requisitions（页面契约来源）；POST/PUT 仍写入遗留表
// prd_material_issue。两表 taxonomy 不同（mr.type='production' vs mi.issue_type）。
// 新建领料单经 POST 落 prd_material_issue，不会出现在 GET 的 material_requisitions 结果中。
// 完整迁移需统一写路径到 material_requisitions，超出本次字段映射修复范围。
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

  const workOrder = await queryOne(
    `SELECT id, order_no FROM prod_work_order WHERE id = ? AND deleted = 0`,
    [Number(workOrderId)]
  );

  if (!workOrder) {
    return errorResponse('工单不存在', 400, 400);
  }

  // 系统设置 category.require_on_business：领料单要求物料已归类
  const materialIds = (items as DbRow[]).map((item: DbRow) => item.materialId).filter(Boolean);
  secureLog('info', '[material-requisitions] 开始物料分类校验', {
    itemCount: items.length,
    materialIds,
  });
  const categoryCheck = await checkMaterialsCategorized(materialIds);
  secureLog('info', '[material-requisitions] 物料分类校验完成', {
    blocked: categoryCheck.blocked,
    uncategorizedCount: categoryCheck.uncategorized.length,
  });
  if (categoryCheck.blocked) {
    secureLog('warn', '[material-requisitions] 物料分类校验阻断提交', {
      message: categoryCheck.message,
    });
    return errorResponse(categoryCheck.message!, 400, 400);
  }
  if (categoryCheck.message) {
    secureLog('warn', '[material-requisitions] 物料分类校验警告', {
      message: categoryCheck.message,
    });
  }

  const issueNo = generateIssueNo();

  const result = await execute(
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

      const material = await queryOne(
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
      uncategorizedMaterials: categoryCheck.uncategorized,
    },
    categoryCheck.message ? `领料单创建成功。${categoryCheck.message}` : '领料单创建成功'
  );
});

export const PUT = withPermission(async (request: NextRequest) => {
  const body = await request.json();
  const { id, action, items, approverId: _approverId, approverName: _approverName } = body;

  if (!id) {
    return errorResponse('缺少领料单ID', 400, 400);
  }

  const issue = await queryOne(`SELECT * FROM prd_material_issue WHERE id = ? AND deleted = 0`, [
    Number(id),
  ]);

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
