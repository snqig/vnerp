import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { calculateWorkOrderCost } from '@/lib/finance-core';

import { withPermission } from '@/lib/api-permissions';
// 查询成本列表
export const GET = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const workOrderId = searchParams.get('workOrderId') || '';

  let where = 'WHERE deleted = 0';
  const params: Loose[] = [];

  if (workOrderId) {
    where += ' AND work_order_id = ?';
    params.push(Number(workOrderId));
  }

  const totalRows: Loose = await query(
    `SELECT COUNT(*) as total FROM work_order_costs ${where}`,
    params
  );
  const total = totalRows[0]?.total || 0;

  const rows: Loose = await query(
    `SELECT c.*, wo.work_order_no, wo.plan_qty, wo.completed_qty
     FROM work_order_costs c
     LEFT JOIN prd_work_order wo ON c.work_order_id = wo.id
     ${where}
     ORDER BY c.calculate_time DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  return successResponse({ list: rows, total, page, pageSize }, '获取成本列表成功');
});

// 计算工单成本
export const POST = withPermission(async (request: NextRequest) => {
  const body = await request.json();
  const { workOrderId } = body;

  if (!workOrderId) {
    return errorResponse('缺少workOrderId', 400, 400);
  }

  const result = await calculateWorkOrderCost(Number(workOrderId));

  if (!result.success) {
    return errorResponse(result.message, 400, 400);
  }

  return successResponse(result.cost, result.message);
});
