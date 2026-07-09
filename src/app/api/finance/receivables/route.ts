import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import { generateReceivable } from '@/lib/finance-core';

import { withPermission } from '@/lib/api-permissions';
// 查询应收单列表
export const GET = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const status = searchParams.get('status') || '';
  const customerId = searchParams.get('customerId') || '';

  let where = 'WHERE deleted = 0';
  const params: Loose[] = [];

  if (status) {
    where += ' AND status = ?';
    params.push(Number(status));
  }
  if (customerId) {
    where += ' AND customer_id = ?';
    params.push(Number(customerId));
  }

  const totalRows: Loose = await query(
    `SELECT COUNT(*) as total FROM fin_receivable ${where}`,
    params
  );
  const total = totalRows[0]?.total || 0;

  const rows: Loose = await query(
    `SELECT r.*, c.customer_name
     FROM fin_receivable r
     LEFT JOIN crm_customer c ON r.customer_id = c.id
     ${where}
     ORDER BY r.create_time DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  return successResponse({ list: rows, total, page, pageSize }, '获取应收单列表成功');
});

// 生成应收单
export const POST = withPermission(async (request: NextRequest) => {
  const body = await request.json();
  const { salesOrderId, shipmentId, amount, dueDate } = body;

  const result = await generateReceivable(
    Number(salesOrderId),
    Number(shipmentId),
    Number(amount),
    dueDate
  );

  if (!result.success) {
    return successResponse(null, result.message, 400);
  }

  return successResponse(
    { receivableId: result.receivableId, receivableNo: result.receivableNo },
    result.message
  );
});
