import { getTranslations } from 'next-intl/server';

;
﻿import { NextRequest } from 'next/server';
import { query, SqlValue } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { generatePayable } from '@/lib/finance-core';

import { withPermission } from '@/lib/api-permissions';
// 查询应付单列表
export const GET = withPermission(async (request: NextRequest) => {
  const ts = await getTranslations('Common');
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const status = searchParams.get('status') || '';
  const supplierId = searchParams.get('supplierId') || '';

  // 注意：列表查询中 fin_payable 被别名化为 p，MySQL 要求用别名 p 而非表名限定列，
  // 否则会报 Unknown column 'fin_payable.deleted'。COUNT 查询同样加别名 p 以保持一致。
  let where = 'WHERE p.deleted = 0';
  const params: SqlValue[] = [];

  if (status) {
    where += ' AND p.status = ?';
    params.push(Number(status));
  }
  if (supplierId) {
    where += ' AND p.supplier_id = ?';
    params.push(Number(supplierId));
  }

  const totalRows = await query(`SELECT COUNT(*) as total FROM fin_payable p ${where}`, params);
  const total = totalRows[0]?.total || 0;

  const rows = await query(
    `SELECT p.*, s.supplier_name
     FROM fin_payable p
     LEFT JOIN pur_supplier s ON p.supplier_id = s.id
     ${where}
     ORDER BY p.create_time DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  return successResponse({ list: rows, total, page, pageSize }, ts('k_oboibd'));
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
