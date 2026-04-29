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
    SELECT so.*, c.customer_name
    FROM sal_order so
    LEFT JOIN crm_customer c ON so.customer_id = c.id
    WHERE so.deleted = 0
  `;
  const values: any[] = [];

  if (keyword) {
    sql += ` AND (so.order_no LIKE ? OR c.customer_name LIKE ?)`;
    const likeKeyword = `%${keyword}%`;
    values.push(likeKeyword, likeKeyword);
  }

  if (status) {
    sql += ` AND so.status = ?`;
    values.push(parseInt(status));
  }

  sql += ` ORDER BY so.create_time DESC LIMIT ? OFFSET ?`;
  values.push(pageSize, (page - 1) * pageSize);

  const orders = await query(sql, values);

  const result = (orders as any[]).map((order: any) => ({
    id: order.id,
    order_no: order.order_no,
    order_date: order.order_date,
    customer_id: order.customer_id,
    customer_name: order.customer_name,
    contact_name: order.contact_name,
    contact_phone: order.contact_phone,
    delivery_address: order.delivery_address,
    salesman_id: order.salesman_id,
    total_amount: parseFloat(order.total_amount || '0'),
    tax_amount: parseFloat(order.tax_amount || '0'),
    total_with_tax: parseFloat(order.total_with_tax || '0'),
    discount_amount: parseFloat(order.discount_amount || '0'),
    currency: order.currency || 'CNY',
    payment_terms: order.payment_terms,
    delivery_date: order.delivery_date,
    contract_no: order.contract_no,
    status: order.status,
    remark: order.remark,
    create_time: order.create_time,
    update_time: order.update_time,
  }));

  let countSql = `SELECT COUNT(*) as total FROM sal_order so LEFT JOIN crm_customer c ON so.customer_id = c.id WHERE so.deleted = 0`;
  const countValues: any[] = [];
  if (keyword) {
    countSql += ` AND (so.order_no LIKE ? OR c.customer_name LIKE ?)`;
    countValues.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (status) {
    countSql += ` AND so.status = ?`;
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
