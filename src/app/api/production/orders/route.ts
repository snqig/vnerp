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
    SELECT wo.*
    FROM prd_work_order wo
    WHERE wo.deleted = 0
  `;
  const values: any[] = [];

  if (keyword) {
    sql += ` AND (wo.work_order_no LIKE ? OR wo.product_name LIKE ?)`;
    const likeKeyword = `%${keyword}%`;
    values.push(likeKeyword, likeKeyword);
  }

  if (status) {
    sql += ` AND wo.status = ?`;
    values.push(status);
  }

  sql += ` ORDER BY wo.create_time DESC LIMIT ? OFFSET ?`;
  values.push(pageSize, (page - 1) * pageSize);

  const orders = await query(sql, values);

  const result = (orders as any[]).map((order: any) => ({
    id: order.id,
    work_order_no: order.work_order_no,
    order_id: order.sales_order_id,
    order_no: order.order_no,
    product_name: order.product_name,
    plan_qty: parseFloat(order.plan_qty || '0'),
    unit: order.unit,
    status: order.status,
    priority: order.priority,
    plan_start_date: order.plan_start_date,
    plan_end_date: order.plan_end_date,
    actual_start_date: order.actual_start_date,
    actual_end_date: order.actual_end_date,
    remark: order.remark,
    create_time: order.create_time,
    update_time: order.update_time,
  }));

  let countSql = `SELECT COUNT(*) as total FROM prd_work_order wo WHERE wo.deleted = 0`;
  const countValues: any[] = [];
  if (keyword) {
    countSql += ` AND (wo.work_order_no LIKE ? OR wo.product_name LIKE ?)`;
    countValues.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (status) {
    countSql += ` AND wo.status = ?`;
    countValues.push(status);
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
