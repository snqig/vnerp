import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import { withErrorHandler, successResponse, errorResponse } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const certNo = searchParams.get('certNo') || '';
  const materialName = searchParams.get('materialName') || '';
  const supplierName = searchParams.get('supplierName') || '';
  const certType = searchParams.get('certType') || '';
  const status = searchParams.get('status') || '';

  let where = 'WHERE c.deleted = 0';
  const params: any[] = [];
  if (certNo) {
    where += ' AND c.cert_no LIKE ?';
    params.push('%' + certNo + '%');
  }
  if (materialName) {
    where += ' AND c.material_name LIKE ?';
    params.push('%' + materialName + '%');
  }
  if (supplierName) {
    where += ' AND c.supplier_name LIKE ?';
    params.push('%' + supplierName + '%');
  }
  if (certType) {
    where += ' AND c.cert_type = ?';
    params.push(certType);
  }
  if (status !== '') {
    where += ' AND c.status = ?';
    params.push(Number(status));
  }

  const countSql = 'SELECT COUNT(*) as total FROM qms_sgs_cert c ' + where;
  const totalRows: any = await query(countSql, params);
  const total = totalRows[0]?.total || 0;

  const dataSql = `SELECT c.*, 
    (SELECT COUNT(*) FROM qms_sgs_cert_item WHERE cert_id = c.id) as item_count
    FROM qms_sgs_cert c ${where} ORDER BY c.create_time DESC LIMIT ? OFFSET ?`;
  const rows: any = await query(dataSql, [...params, pageSize, (page - 1) * pageSize]);

  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const {
    cert_no, material_id, material_code, material_name,
    supplier_id, supplier_name, cert_type, test_items,
    test_result, test_report_no, test_org,
    issue_date, expire_date, status, file_url, remark, items
  } = body;

  if (!cert_no) {
    return errorResponse('SGS证书编号不能为空', 400, 400);
  }

  const existing: any = await query(
    'SELECT id FROM qms_sgs_cert WHERE cert_no = ? AND deleted = 0',
    [cert_no]
  );
  if (existing.length > 0) {
    return errorResponse('证书编号已存在', 400, 400);
  }

  const result: any = await execute(
    `INSERT INTO qms_sgs_cert (cert_no, material_id, material_code, material_name, supplier_id, supplier_name, cert_type, test_items, test_result, test_report_no, test_org, issue_date, expire_date, status, file_url, remark)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      cert_no, material_id || null, material_code || null, material_name || '',
      supplier_id || null, supplier_name || '', cert_type || 'RoHS',
      test_items || null, test_result || 'PENDING', test_report_no || null,
      test_org || 'SGS', issue_date || null, expire_date || null,
      status ?? 2, file_url || null, remark || null
    ]
  );

  const certId = result.insertId;

  if (items && Array.isArray(items)) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await execute(
        `INSERT INTO qms_sgs_cert_item (cert_id, test_item_name, test_standard, limit_value, test_value, unit, result, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          certId, item.test_item_name || '', item.test_standard || '',
          item.limit_value || '', item.test_value || '', item.unit || '',
          item.result || 'N/A', i + 1
        ]
      );
    }
  }

  return successResponse({ id: certId, cert_no }, 'SGS认证记录创建成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, items, ...fields } = body;

  if (!id) {
    return errorResponse('ID不能为空', 400, 400);
  }

  const updateFields: string[] = [];
  const updateValues: any[] = [];

  const allowedFields = [
    'material_id', 'material_code', 'material_name', 'supplier_id',
    'supplier_name', 'cert_type', 'test_items', 'test_result',
    'test_report_no', 'test_org', 'issue_date', 'expire_date',
    'status', 'file_url', 'remark'
  ];

  for (const field of allowedFields) {
    if (fields[field] !== undefined) {
      updateFields.push(`${field} = ?`);
      updateValues.push(fields[field]);
    }
  }

  if (updateFields.length > 0) {
    await execute(
      `UPDATE qms_sgs_cert SET ${updateFields.join(', ')} WHERE id = ? AND deleted = 0`,
      [...updateValues, id]
    );
  }

  if (items && Array.isArray(items)) {
    await execute('DELETE FROM qms_sgs_cert_item WHERE cert_id = ?', [id]);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await execute(
        `INSERT INTO qms_sgs_cert_item (cert_id, test_item_name, test_standard, limit_value, test_value, unit, result, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, item.test_item_name || '', item.test_standard || '',
          item.limit_value || '', item.test_value || '', item.unit || '',
          item.result || 'N/A', i + 1
        ]
      );
    }
  }

  return successResponse(null, '更新成功');
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return errorResponse('ID不能为空', 400, 400);
  }

  await execute('UPDATE qms_sgs_cert SET deleted = 1 WHERE id = ?', [id]);

  return successResponse(null, '删除成功');
});
