import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import { withErrorHandler, successResponse, errorResponse } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const testNo = searchParams.get('testNo') || '';
  const productName = searchParams.get('productName') || '';
  const testType = searchParams.get('testType') || '';
  const status = searchParams.get('status') || '';

  let where = 'WHERE deleted = 0';
  const params: any[] = [];
  if (testNo) { where += ' AND test_no LIKE ?'; params.push('%' + testNo + '%'); }
  if (productName) { where += ' AND product_name LIKE ?'; params.push('%' + productName + '%'); }
  if (testType) { where += ' AND test_type = ?'; params.push(testType); }
  if (status !== '') { where += ' AND status = ?'; params.push(Number(status)); }

  const totalRows: any = await query('SELECT COUNT(*) as total FROM qms_lab_test ' + where, params);
  const total = totalRows[0]?.total || 0;
  const rows: any = await query('SELECT * FROM qms_lab_test ' + where + ' ORDER BY create_time DESC LIMIT ? OFFSET ?', [...params, pageSize, (page - 1) * pageSize]);
  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { product_id, product_code, product_name, batch_no, test_type, test_items, test_standard, test_equipment, tester, test_date, result_summary, detail_data, conclusion, remark } = body;

  if (!product_name) return errorResponse('产品名称不能为空', 400, 400);

  const now = new Date();
  const testNo = 'LT' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + String(Math.floor(Math.random() * 10000)).padStart(4, '0');

  const result: any = await execute(
    `INSERT INTO qms_lab_test (test_no, product_id, product_code, product_name, batch_no, test_type, test_items, test_standard, test_equipment, tester, test_date, result_summary, detail_data, conclusion, remark)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [testNo, product_id || null, product_code || null, product_name, batch_no || null, test_type || 'color', test_items || null, test_standard || null, test_equipment || null, tester || null, test_date || null, result_summary || null, detail_data || null, conclusion || 'pending', remark || null]
  );

  return successResponse({ id: result.insertId, test_no: testNo }, '实验室测试记录创建成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, product_id, product_code, product_name, batch_no, test_type, test_items, test_standard, test_equipment, tester, test_date, result_summary, detail_data, conclusion, status, remark } = body;

  if (!id) return errorResponse('ID不能为空', 400, 400);

  const fields: string[] = [];
  const values: any[] = [];

  if (product_id !== undefined) { fields.push('product_id = ?'); values.push(product_id); }
  if (product_code !== undefined) { fields.push('product_code = ?'); values.push(product_code); }
  if (product_name !== undefined) { fields.push('product_name = ?'); values.push(product_name); }
  if (batch_no !== undefined) { fields.push('batch_no = ?'); values.push(batch_no); }
  if (test_type !== undefined) { fields.push('test_type = ?'); values.push(test_type); }
  if (test_items !== undefined) { fields.push('test_items = ?'); values.push(test_items); }
  if (test_standard !== undefined) { fields.push('test_standard = ?'); values.push(test_standard); }
  if (test_equipment !== undefined) { fields.push('test_equipment = ?'); values.push(test_equipment); }
  if (tester !== undefined) { fields.push('tester = ?'); values.push(tester); }
  if (test_date !== undefined) { fields.push('test_date = ?'); values.push(test_date); }
  if (result_summary !== undefined) { fields.push('result_summary = ?'); values.push(result_summary); }
  if (detail_data !== undefined) { fields.push('detail_data = ?'); values.push(detail_data); }
  if (conclusion !== undefined) { fields.push('conclusion = ?'); values.push(conclusion); }
  if (status !== undefined) { fields.push('status = ?'); values.push(status); }
  if (remark !== undefined) { fields.push('remark = ?'); values.push(remark); }

  if (fields.length === 0) return errorResponse('没有需要更新的字段', 400, 400);

  values.push(id);
  await execute('UPDATE qms_lab_test SET ' + fields.join(', ') + ' WHERE id = ?', values);
  return successResponse(null, '实验室测试记录更新成功');
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return errorResponse('ID不能为空', 400, 400);

  await execute('UPDATE qms_lab_test SET deleted = 1 WHERE id = ?', [id]);
  return successResponse(null, '实验室测试记录删除成功');
});
