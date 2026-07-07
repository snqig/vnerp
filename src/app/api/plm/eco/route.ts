import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

export const GET = withPermission(async (request: NextRequest, userInfo) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const ecoNo = searchParams.get('ecoNo') || '';
  const ecoType = searchParams.get('ecoType') || '';
  const status = searchParams.get('status') || '';

  let where = 'WHERE deleted = 0';
  const params: any[] = [];
  if (ecoNo) {
    where += ' AND eco_no LIKE ?';
    params.push('%' + ecoNo + '%');
  }
  if (ecoType) {
    where += ' AND eco_type = ?';
    params.push(ecoType);
  }
  if (status !== '') {
    where += ' AND status = ?';
    params.push(Number(status));
  }

  const totalRows: any = await query('SELECT COUNT(*) as total FROM plm_eco ' + where, params);
  const total = totalRows[0]?.total || 0;
  const rows: any = await query(
    'SELECT * FROM plm_eco ' + where + ' ORDER BY create_time DESC LIMIT ? OFFSET ?',
    [...params, pageSize, (page - 1) * pageSize]
  );
  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withPermission(async (request: NextRequest, userInfo) => {
  const body = await request.json();
  const {
    eco_type,
    product_id,
    product_code,
    product_name,
    old_version,
    new_version,
    change_reason,
    change_content,
    impact_analysis,
    applicant,
    remark,
  } = body;

  if (!eco_type) return errorResponse('变更类型不能为空', 400, 400);

  const now = new Date();
  const ecoNo =
    'ECO' +
    now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(Math.floor(Math.random() * 10000)).padStart(4, '0');

  const result: any = await execute(
    `INSERT INTO plm_eco (eco_no, eco_type, product_id, product_code, product_name, old_version, new_version, change_reason, change_content, impact_analysis, applicant, apply_time, remark)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
    [
      ecoNo,
      eco_type,
      product_id || null,
      product_code || null,
      product_name || '',
      old_version || null,
      new_version || null,
      change_reason || null,
      change_content || null,
      impact_analysis || null,
      applicant || null,
      remark || null,
    ]
  );

  return successResponse({ id: result.insertId, eco_no: ecoNo }, '工程变更单创建成功');
}, { logTitle: '创建工程变更单', logType: 'business' });

export const PUT = withPermission(async (request: NextRequest, userInfo) => {
  const body = await request.json();
  const { id, ...fields } = body;
  if (!id) return errorResponse('ID不能为空', 400, 400);

  const updateFields: string[] = [];
  const updateValues: any[] = [];
  const allowedFields = [
    'eco_type',
    'old_version',
    'new_version',
    'change_reason',
    'change_content',
    'impact_analysis',
    'status',
    'approver',
    'approve_time',
    'remark',
  ];
  for (const field of allowedFields) {
    if (fields[field] !== undefined) {
      updateFields.push(`${field} = ?`);
      updateValues.push(fields[field]);
    }
  }
  if (updateFields.length > 0) {
    await execute(`UPDATE plm_eco SET ${updateFields.join(', ')} WHERE id = ? AND deleted = 0`, [
      ...updateValues,
      id,
    ]);
  }
  return successResponse(null, '更新成功');
}, { logTitle: '更新工程变更单', logType: 'business' });

export const DELETE = withPermission(async (request: NextRequest, userInfo) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return errorResponse('ID不能为空', 400, 400);
  await execute('UPDATE plm_eco SET deleted = 1 WHERE id = ?', [id]);
  return successResponse(null, '删除成功');
}, { logTitle: '删除工程变更单', logType: 'business' });
