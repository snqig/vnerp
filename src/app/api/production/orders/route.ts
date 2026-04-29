import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, withErrorHandler } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const page = parseInt(searchParams.get('page') || '1');
  const keyword = searchParams.get('keyword');
  const status = searchParams.get('status');

  let sql = `
    SELECT pc.*, sc.customer_name
    FROM prd_process_card pc
    LEFT JOIN prd_standard_card sc ON pc.product_code = sc.id
    WHERE pc.deleted = 0
  `;
  const values: any[] = [];

  if (keyword) {
    sql += ` AND (pc.card_no LIKE ? OR pc.work_order_no LIKE ? OR pc.product_name LIKE ?)`;
    const likeKeyword = `%${keyword}%`;
    values.push(likeKeyword, likeKeyword, likeKeyword);
  }

  if (status) {
    sql += ` AND pc.burdening_status = ?`;
    values.push(parseInt(status));
  }

  sql += ` ORDER BY pc.create_time DESC LIMIT ? OFFSET ?`;
  values.push(pageSize, (page - 1) * pageSize);

  const orders = await query(sql, values);

  const result = (orders as any[]).map((order: any) => ({
    id: order.id,
    work_order_no: order.work_order_no || order.card_no,
    card_no: order.card_no,
    product_name: order.product_name,
    product_code: order.product_code,
    plan_qty: parseFloat(order.plan_qty || '0'),
    quantity: parseFloat(order.plan_qty || '0'),
    unit: order.unit,
    burdening_status: order.burdening_status,
    status: order.burdening_status,
    work_order_date: order.work_order_date,
    customer_name: order.customer_name,
    remark: order.remark,
    create_time: order.create_time,
    update_time: order.update_time,
  }));

  let countSql = `SELECT COUNT(*) as total FROM prd_process_card pc WHERE pc.deleted = 0`;
  const countValues: any[] = [];
  if (keyword) {
    countSql += ` AND (pc.card_no LIKE ? OR pc.work_order_no LIKE ? OR pc.product_name LIKE ?)`;
    countValues.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (status) {
    countSql += ` AND pc.burdening_status = ?`;
    countValues.push(parseInt(status));
  }
  const countResult = await query(countSql, countValues);
  const total = (countResult as any[])[0]?.total || 0;

  return successResponse({
    list: result,
    total,
    page,
    pageSize,
  });
});
