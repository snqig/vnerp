import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { generatePayable, recordPayment, queryPayableSummary } from '@/lib/finance-core';

import { withPermission } from '@/lib/api-permissions';
// 查询应付单列表
export const GET = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const status = searchParams.get('status') || '';
  const supplierId = searchParams.get('supplierId') || '';

  let where = 'WHERE deleted = 0';
  const params: any[] = [];

  if (status) {
    where += ' AND status = ?';
    params.push(Number(status));
  }
  if (supplierId) {
    where += ' AND supplier_id = ?';
    params.push(Number(supplierId));
  }

  const totalRows: any = await query(`SELECT COUNT(*) as total FROM fin_payable ${where}`, params);
  const total = totalRows[0]?.total || 0;

  const rows: any = await query(
    `SELECT p.*, s.supplier_name
     FROM fin_payable p
     LEFT JOIN pur_supplier s ON p.supplier_id = s.id
     ${where}
     ORDER BY p.create_time DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  return successResponse({ list: rows, total, page, pageSize }, '获取应付单列表成功');
});

// 生成应付单
export const POST = withPermission(async (request: NextRequest) => {
  const body = await request.json();
  const { purchaseOrderId, inboundId, amount, dueDate } = body;

  const result = await generatePayable(
    Number(purchaseOrderId),
    Number(inboundId),
    Number(amount),
    dueDate
  );

  if (!result.success) {
    return errorResponse(result.message, 400, 400);
  }

  return successResponse(
    { payableId: result.payableId, payableNo: result.payableNo },
    result.message
  );
});
