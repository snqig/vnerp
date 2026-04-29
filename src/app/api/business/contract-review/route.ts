import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import { withErrorHandler, successResponse, errorResponse } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const reviewNo = searchParams.get('reviewNo') || '';
  const customerName = searchParams.get('customerName') || '';
  const productName = searchParams.get('productName') || '';
  const status = searchParams.get('status') || '';

  let where = 'WHERE deleted = 0';
  const params: any[] = [];
  if (reviewNo) { where += ' AND review_no LIKE ?'; params.push('%' + reviewNo + '%'); }
  if (customerName) { where += ' AND customer_name LIKE ?'; params.push('%' + customerName + '%'); }
  if (productName) { where += ' AND product_name LIKE ?'; params.push('%' + productName + '%'); }
  if (status !== '') { where += ' AND status = ?'; params.push(Number(status)); }

  const totalRows: any = await query('SELECT COUNT(*) as total FROM biz_contract_review ' + where, params);
  const total = totalRows[0]?.total || 0;
  const rows: any = await query('SELECT * FROM biz_contract_review ' + where + ' ORDER BY create_time DESC LIMIT ? OFFSET ?', [...params, pageSize, (page - 1) * pageSize]);
  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { order_id, order_no, customer_id, customer_name, product_id, product_code, product_name, quantity, amount, delivery_date, sample_status, quality_requirement, production_capacity, material_availability, engineering_feasibility, biz_opinion, eng_opinion, quality_opinion, prod_opinion, purchase_opinion, review_date, remark } = body;

  if (!customer_name) return errorResponse('客户名称不能为空', 400, 400);
  if (!product_name) return errorResponse('产品名称不能为空', 400, 400);

  const now = new Date();
  const reviewNo = 'CR' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + String(Math.floor(Math.random() * 10000)).padStart(4, '0');

  const result: any = await execute(
    `INSERT INTO biz_contract_review (review_no, order_id, order_no, customer_id, customer_name, product_id, product_code, product_name, quantity, amount, delivery_date, sample_status, quality_requirement, production_capacity, material_availability, engineering_feasibility, biz_opinion, eng_opinion, quality_opinion, prod_opinion, purchase_opinion, review_date, remark)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [reviewNo, order_id || null, order_no || null, customer_id || null, customer_name, product_id || null, product_code || null, product_name, quantity || 0, amount || 0, delivery_date || null, sample_status || 'pending', quality_requirement || null, production_capacity || null, material_availability || null, engineering_feasibility || null, biz_opinion || null, eng_opinion || null, quality_opinion || null, prod_opinion || null, purchase_opinion || null, review_date || null, remark || null]
  );

  return successResponse({ id: result.insertId, review_no: reviewNo }, '合同评审记录创建成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, order_id, order_no, customer_id, customer_name, product_id, product_code, product_name, quantity, amount, delivery_date, sample_status, quality_requirement, production_capacity, material_availability, engineering_feasibility, biz_opinion, eng_opinion, quality_opinion, prod_opinion, purchase_opinion, review_date, status, remark } = body;

  if (!id) return errorResponse('ID不能为空', 400, 400);

  const fields: string[] = [];
  const values: any[] = [];

  if (order_id !== undefined) { fields.push('order_id = ?'); values.push(order_id); }
  if (order_no !== undefined) { fields.push('order_no = ?'); values.push(order_no); }
  if (customer_id !== undefined) { fields.push('customer_id = ?'); values.push(customer_id); }
  if (customer_name !== undefined) { fields.push('customer_name = ?'); values.push(customer_name); }
  if (product_id !== undefined) { fields.push('product_id = ?'); values.push(product_id); }
  if (product_code !== undefined) { fields.push('product_code = ?'); values.push(product_code); }
  if (product_name !== undefined) { fields.push('product_name = ?'); values.push(product_name); }
  if (quantity !== undefined) { fields.push('quantity = ?'); values.push(quantity); }
  if (amount !== undefined) { fields.push('amount = ?'); values.push(amount); }
  if (delivery_date !== undefined) { fields.push('delivery_date = ?'); values.push(delivery_date); }
  if (sample_status !== undefined) { fields.push('sample_status = ?'); values.push(sample_status); }
  if (quality_requirement !== undefined) { fields.push('quality_requirement = ?'); values.push(quality_requirement); }
  if (production_capacity !== undefined) { fields.push('production_capacity = ?'); values.push(production_capacity); }
  if (material_availability !== undefined) { fields.push('material_availability = ?'); values.push(material_availability); }
  if (engineering_feasibility !== undefined) { fields.push('engineering_feasibility = ?'); values.push(engineering_feasibility); }
  if (biz_opinion !== undefined) { fields.push('biz_opinion = ?'); values.push(biz_opinion); }
  if (eng_opinion !== undefined) { fields.push('eng_opinion = ?'); values.push(eng_opinion); }
  if (quality_opinion !== undefined) { fields.push('quality_opinion = ?'); values.push(quality_opinion); }
  if (prod_opinion !== undefined) { fields.push('prod_opinion = ?'); values.push(prod_opinion); }
  if (purchase_opinion !== undefined) { fields.push('purchase_opinion = ?'); values.push(purchase_opinion); }
  if (review_date !== undefined) { fields.push('review_date = ?'); values.push(review_date); }
  if (status !== undefined) { fields.push('status = ?'); values.push(status); }
  if (remark !== undefined) { fields.push('remark = ?'); values.push(remark); }

  if (fields.length === 0) return errorResponse('没有需要更新的字段', 400, 400);

  values.push(id);
  await execute('UPDATE biz_contract_review SET ' + fields.join(', ') + ' WHERE id = ?', values);
  return successResponse(null, '合同评审记录更新成功');
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return errorResponse('ID不能为空', 400, 400);

  await execute('UPDATE biz_contract_review SET deleted = 1 WHERE id = ?', [id]);
  return successResponse(null, '合同评审记录删除成功');
});
