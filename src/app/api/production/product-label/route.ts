import { getTranslations } from 'next-intl/server';

;
import { NextRequest, NextResponse } from 'next/server';
import { query, execute, SqlValue } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const labelNo = searchParams.get('labelNo') || '';
  const status = searchParams.get('status') || '';

  let where = 'WHERE deleted = 0';
  const params: SqlValue[] = [];
  if (labelNo) {
    where += ' AND label_no LIKE ?';
    params.push('%' + labelNo + '%');
  }
  if (status) {
    where += ' AND qc_result = ?';
    params.push(status);
  }

  const totalRows = await query('SELECT COUNT(*) as total FROM prd_product_label ' + where, params);
  const total = totalRows[0]?.total || 0;
  const rows = await query(
    'SELECT * FROM prd_product_label ' + where + ' ORDER BY create_time DESC LIMIT ? OFFSET ?',
    [...params, pageSize, (page - 1) * pageSize]
  );
  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const {
      work_order_id,
      work_order_no,
      material_id,
      material_code,
      material_name,
      quantity,
      unit,
      batch_no,
      qc_result,
      remark,
    } = body;
    const now = new Date();
    const labelNo =
      'LB' +
      now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(Math.floor(Math.random() * 10000)).padStart(4, '0');

    const result = await execute(
      'INSERT INTO prd_product_label (label_no, work_order_id, work_order_no, material_id, material_code, material_name, quantity, unit, batch_no, qc_result, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        labelNo,
        work_order_id || null,
        work_order_no || null,
        material_id || null,
        material_code || null,
        material_name || null,
        quantity,
        unit || null,
        batch_no || null,
        qc_result || null,
        remark || null,
      ]
    );
    return successResponse({ id: result.insertId, label_no: labelNo }, ts('k_17nu3m7'));
  },
  { logTitle: '创建成品标签', logType: 'business' }
);

export const PUT = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const { id, qc_result, remark } = body;
    if (qc_result !== undefined)
      await execute('UPDATE prd_product_label SET qc_result = ? WHERE id = ? AND deleted = 0', [
        qc_result,
        id,
      ]);
    if (remark !== undefined)
      await execute('UPDATE prd_product_label SET remark = ? WHERE id = ? AND deleted = 0', [
        remark,
        id,
      ]);
    return successResponse(null, ts('k_1795bzg'));
  },
  { logTitle: '更新成品标签', logType: 'business' }
);

export const DELETE = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, message: ts('k_js4lo9') }, { status: 400 });
    await execute('UPDATE prd_product_label SET deleted = 1 WHERE id = ?', [Number(id)]);
    return successResponse(null, ts('k_1hlqs'));
  },
  { logTitle: '删除成品标签', logType: 'business' }
);
