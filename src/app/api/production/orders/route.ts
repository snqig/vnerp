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
    SELECT wo.*,
           so.order_no AS sales_order_no,
           m.name AS material_name,
           m.code AS material_code
    FROM prd_work_order wo
    LEFT JOIN sal_order so ON wo.sales_order_id = so.id
    LEFT JOIN bas_material m ON wo.material_id = m.id
    WHERE wo.deleted = 0
  `;
  const values: any[] = [];

  if (keyword) {
    sql += ` AND (wo.work_order_no LIKE ? OR m.name LIKE ? OR m.code LIKE ?)`;
    const likeKeyword = `%${keyword}%`;
    values.push(likeKeyword, likeKeyword, likeKeyword);
  }

  if (status) {
    sql += ` AND wo.status = ?`;
    values.push(parseInt(status));
  }

  sql += ` ORDER BY wo.create_time DESC LIMIT ? OFFSET ?`;
  values.push(pageSize, (page - 1) * pageSize);

  const orders = await query(sql, values);

  const result = (orders as any[]).map((order: any) => ({
    id: order.id,
    work_order_no: order.work_order_no,
    sales_order_id: order.sales_order_id,
    sales_order_no: order.sales_order_no,
    material_id: order.material_id,
    material_name: order.material_name,
    material_code: order.material_code,
    plan_qty: parseFloat(order.plan_qty || '0'),
    completed_qty: parseFloat(order.completed_qty || '0'),
    quantity: parseFloat(order.plan_qty || '0'),
    unit: order.unit,
    status: order.status,
    priority: order.priority,
    plan_start_date: order.plan_start_date,
    plan_end_date: order.plan_end_date,
    actual_start_date: order.actual_start_date,
    actual_end_date: order.actual_end_date,
    workshop_id: order.workshop_id,
    workcenter_id: order.workcenter_id,
    remark: order.remark,
    create_time: order.create_time,
    update_time: order.update_time,
  }));

  let countSql = `SELECT COUNT(*) as total FROM prd_work_order wo WHERE wo.deleted = 0`;
  const countValues: any[] = [];
  if (keyword) {
    countSql += ` AND (wo.work_order_no LIKE ? OR EXISTS (SELECT 1 FROM bas_material m WHERE m.id = wo.material_id AND (m.name LIKE ? OR m.code LIKE ?)))`;
    countValues.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (status) {
    countSql += ` AND wo.status = ?`;
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
