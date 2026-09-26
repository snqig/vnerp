import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { query, SqlValue } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';

import { withPermission } from '@/lib/api-permissions';
import { stringFilter, numericFilter } from '@/lib/query-filter';
import {
  autoGenerateRequisition,
  submitOverRequisition,
  submitSupplementaryRequisition,
  approveRequisition,
} from '@/lib/material-requisition';

export const GET = withPermission(async (request: NextRequest) => {
  const ts = await getTranslations('Common');
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const type = stringFilter(searchParams.get('type'));
  const status = numericFilter(searchParams.get('status'));
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
    ts('k_jd6unu')
  );
});

// 2026-09-26 P0-1 契约修复：POST/PUT 与页面（material-requisitions/page.tsx）对齐，
// 统一写 material_requisitions（此前 POST 写遗留表 prd_material_issue，
// 导致新建单在 GET 的 material_requisitions 列表中不可见；PUT 审批契约断裂必 400）。
// 写路径统一走 @/lib/material-requisition 领域函数。
// 遗留 prd_material_issue 链路（车间领料）独立存在于 /api/production/material-issue，互不影响。
export const POST = withPermission(async (request: NextRequest, userInfo) => {
  const ts = await getTranslations('Common');
  const body = await request.json();
  const action = body.action;

  if (action === 'auto-generate') {
    const workOrderId = Number(body.workOrderId);
    if (!workOrderId) {
      return errorResponse(ts('k_729j1r'), 400, 400);
    }

    const result = await autoGenerateRequisition(
      workOrderId,
      userInfo.userId,
      userInfo.realName || userInfo.username
    );

    if (!result.success) {
      return errorResponse(result.message, 400, 400);
    }

    return successResponse(
      {
        id: result.requisitionId,
        requisition_no: result.requisitionNo,
        issue_no: result.requisitionNo,
      },
      result.message
    );
  }

  if (action === 'over-issue') {
    const workOrderId = Number(body.workOrderId);
    const materialId = Number(body.materialId);
    const quantity = Number(body.quantity);
    const reason = stringFilter(body.reason) ?? '';

    if (!workOrderId) {
      return errorResponse(ts('k_729j1r'), 400, 400);
    }
    if (!materialId) {
      return errorResponse(ts('k_1k4cyjb'), 400, 400);
    }
    if (!(quantity > 0)) {
      return errorResponse(ts('qtyMustBePositive'), 400, 400);
    }

    const result = await submitOverRequisition(
      workOrderId,
      materialId,
      quantity,
      reason,
      userInfo.userId,
      userInfo.realName || userInfo.username
    );

    if (!result.success) {
      return errorResponse(result.message, 400, 400);
    }

    return successResponse({ id: result.requisitionId }, result.message);
  }

  if (action === 'supplementary') {
    const originalRequisitionId = Number(body.originalRequisitionId);
    const materialId = Number(body.materialId);
    const quantity = Number(body.quantity);
    const reason = stringFilter(body.reason) ?? '';

    if (!originalRequisitionId) {
      return errorResponse(ts('k_3un9np'), 400, 400);
    }
    if (!materialId) {
      return errorResponse(ts('k_1k4cyjb'), 400, 400);
    }
    if (!(quantity > 0)) {
      return errorResponse(ts('qtyMustBePositive'), 400, 400);
    }

    const result = await submitSupplementaryRequisition(
      originalRequisitionId,
      materialId,
      quantity,
      reason,
      userInfo.userId,
      userInfo.realName || userInfo.username
    );

    if (!result.success) {
      return errorResponse(result.message, 400, 400);
    }

    return successResponse({ id: result.requisitionId }, result.message);
  }

  return errorResponse(ts('k_6u6nbn'), 400, 400);
});

// 2026-09-26 P0-1 契约修复：审批/驳回走 material_requisitions（0=待审批 → 1=待出库 / 3=已取消）。
// 发料出库走 POST /api/material-requisitions/[id]/issue（issueMaterial，同样读写 material_requisitions）。
export const PUT = withPermission(async (request: NextRequest, userInfo) => {
  const ts = await getTranslations('Common');
  const body = await request.json();
  const { id, status } = body;

  if (!id) {
    return errorResponse(ts('k_3un9np'), 400, 400);
  }

  const statusNum = Number(status);
  if (statusNum !== 1 && statusNum !== 3) {
    return errorResponse(ts('k_1j1q2oy'), 400, 400);
  }

  const result = await approveRequisition(
    Number(id),
    statusNum === 1,
    userInfo.userId,
    userInfo.realName || userInfo.username
  );

  if (!result.success) {
    return errorResponse(result.message, 400, 400);
  }

  return successResponse(null, result.message);
});
