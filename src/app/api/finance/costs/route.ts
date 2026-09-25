import { NextRequest, NextResponse } from 'next/server';
import { query, execute, SqlValue } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { calculateWorkOrderCost } from '@/lib/finance-core';
import { withPermission } from '@/lib/api-permissions';
import { getTranslations } from 'next-intl/server';

// 查询成本记录列表（用于成本明细页面）
export const GET = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const keyword = searchParams.get('keyword') || '';
  const costType = searchParams.get('cost_type') || '';
  const workOrderNo = searchParams.get('workOrderNo') || '';

  let where = 'WHERE r.deleted = 0';
  const params: SqlValue[] = [];

  if (keyword) {
    where += ' AND (r.cost_no LIKE ? OR r.description LIKE ? OR r.remark LIKE ?)';
    const like = `%${keyword}%`;
    params.push(like, like, like);
  }
  if (costType) {
    where += ' AND r.cost_type = ?';
    params.push(costType);
  }
  if (workOrderNo) {
    where += ' AND wo.work_order_no LIKE ?';
    params.push(`%${workOrderNo}%`);
  }

  const totalRows = await query(
    `SELECT COUNT(*) as total FROM fin_cost_record r
     LEFT JOIN prod_work_order wo ON r.source_id = wo.id
     ${where}`,
    params
  );
  const total = totalRows[0]?.total || 0;

  const rows = await query(
    `SELECT r.*, wo.work_order_no
     FROM fin_cost_record r
     LEFT JOIN prod_work_order wo ON r.source_id = wo.id
     ${where}
     ORDER BY r.cost_date DESC, r.id DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  const costSummary = await query(`
    SELECT
      COALESCE(SUM(CASE WHEN cost_type = 'material' THEN amount ELSE 0 END), 0) as material,
      COALESCE(SUM(CASE WHEN cost_type = 'labor' THEN amount ELSE 0 END), 0) as labor,
      COALESCE(SUM(CASE WHEN cost_type = 'overhead' THEN amount ELSE 0 END), 0) as manufacturing,
      COALESCE(SUM(amount), 0) as total
    FROM fin_cost_record WHERE deleted = 0
  `);

  return successResponse({
    list: rows,
    total,
    page,
    pageSize,
    cost_summary: costSummary[0] || { material: 0, labor: 0, manufacturing: 0, total: 0 },
  });
});

// 计算工单成本（POST 保持不变）
export const POST = withPermission(async (request: NextRequest) => {
  const ts = await getTranslations('Common');
  const body = await request.json();
  const { workOrderId } = body;

  if (!workOrderId) {
    return errorResponse(ts('k_1x4yi3i'), 400, 400);
  }

  const result = await calculateWorkOrderCost(Number(workOrderId));

  if (!result.success) {
    return errorResponse(result.message, 400, 400);
  }

  return successResponse(result.cost, result.message);
});
