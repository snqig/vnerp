import { getTranslations } from 'next-intl/server';

;
﻿import { NextRequest } from 'next/server';
import { query, SqlValue } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { generateReceivable } from '@/lib/finance-core';

import { withPermission } from '@/lib/api-permissions';
// 查询应收单列表
export const GET = withPermission(async (request: NextRequest) => {
  const ts = await getTranslations('Common');
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  // 详情查询：传入 id 时返回单行（含客户名与收款记录），供前端详情弹窗使用。
  // 列表查询（无 id）仍返回列表信封 { list, total, page, pageSize }。
  if (id) {
    const rows = await query(
      `SELECT r.*, c.customer_name
       FROM fin_receivable r
       LEFT JOIN crm_customer c ON r.customer_id = c.id
       WHERE r.id = ? AND r.deleted = 0`,
      [Number(id)]
    );
    if (rows.length === 0) {
      return errorResponse(ts('k_167sbwh'), 404, 404);
    }
    const row = rows[0];
    const receipts = await query(
      `SELECT * FROM fin_receipt_record WHERE receivable_id = ? AND deleted = 0 ORDER BY receipt_date DESC`,
      [Number(id)]
    );
    return successResponse({ ...row, receipts });
  }

  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const status = searchParams.get('status') || '';
  const customerId = searchParams.get('customerId') || '';

  // 注意：列表查询中 fin_receivable 被别名化为 r，MySQL 要求用别名 r 而非表名限定列，
  // 否则会报 Unknown column 'fin_receivable.deleted'。COUNT 查询同样加别名 r 以保持一致。
  let where = 'WHERE r.deleted = 0';
  const params: SqlValue[] = [];

  if (status) {
    where += ' AND r.status = ?';
    params.push(Number(status));
  }
  if (customerId) {
    where += ' AND r.customer_id = ?';
    params.push(Number(customerId));
  }

  const totalRows = await query(`SELECT COUNT(*) as total FROM fin_receivable r ${where}`, params);
  const total = totalRows[0]?.total || 0;

  const rows = await query(
    `SELECT r.*, c.customer_name
     FROM fin_receivable r
     LEFT JOIN crm_customer c ON r.customer_id = c.id
     ${where}
     ORDER BY r.create_time DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  return successResponse({ list: rows, total, page, pageSize }, ts('k_16bs9pb'));
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

// 删除应收单（软删除）；原单数路由 /api/finance/receivable 的 DELETE 无处理器（405），
// 合并后由本路由统一承接。
export const DELETE = withPermission(async (request: NextRequest) => {
  const ts = await getTranslations('Common');
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return successResponse(null, ts('k_vrgtdc'), 400);
  }
  await query(
    `UPDATE fin_receivable SET deleted = 1, update_time = NOW() WHERE id = ? AND deleted = 0`,
    [Number(id)]
  );
  return successResponse(null, ts('k_1hlqs'));
});
