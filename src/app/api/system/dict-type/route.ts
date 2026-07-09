import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

export const GET = withPermission(
  async (request: NextRequest, _userInfo) => {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get('page') || 1);
    const pageSize = Number(searchParams.get('pageSize') || 20);
    const dictName = searchParams.get('dictName') || '';
    const dictType = searchParams.get('dictType') || '';
    const status = searchParams.get('status') || '';

    let where = 'WHERE 1=1';
    const params: any[] = [];
    if (dictName) {
      where += ' AND dict_name LIKE ?';
      params.push(`%${dictName}%`);
    }
    if (dictType) {
      where += ' AND dict_code LIKE ?';
      params.push(`%${dictType}%`);
    }
    if (status !== '') {
      where += ' AND status = ?';
      params.push(Number(status));
    }

    const totalRows: any = await query(
      `SELECT COUNT(*) as total FROM sys_dict_type ${where}`,
      params
    );
    const total = totalRows[0]?.total || 0;

    const rows: any = await query(
      `SELECT id, dict_name, dict_code as dict_type, status, description as remark, create_time, update_time FROM sys_dict_type ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize]
    );

    return successResponse({ list: rows, total, page, pageSize });
  },
  { logTitle: '获取字典类型', logType: 'system' }
);

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body = await request.json();
    const dict_name = body.dict_name;
    const dict_code = body.dict_type || body.dict_code;
    const status = body.status;
    const description = body.remark || body.description;

    const result: any = await execute(
      `INSERT INTO sys_dict_type (dict_name, dict_code, status, description) VALUES (?, ?, ?, ?)`,
      [dict_name, dict_code, status ?? 1, description || null]
    );

    return successResponse({ id: result.insertId }, '创建成功');
  },
  { logTitle: '创建字典类型', logType: 'system' }
);

export const PUT = withPermission(async (request: NextRequest, _userInfo) => {
  const body = await request.json();
  const id = body.id;
  const dict_name = body.dict_name;
  const dict_code = body.dict_type || body.dict_code;
  const status = body.status;
  const description = body.remark || body.description;

  await execute(
    `UPDATE sys_dict_type SET dict_name = ?, dict_code = ?, status = ?, description = ? WHERE id = ?`,
    [dict_name, dict_code, status ?? 1, description || null, id]
  );

  return successResponse(null, '更新成功');
});

export const DELETE = withPermission(
  async (request: NextRequest, _userInfo) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, message: '缺少id' }, { status: 400 });

    await query(`DELETE FROM sys_dict_type WHERE id = ?`, [Number(id)]);
    return successResponse(null, '删除成功');
  },
  { logTitle: '删除字典类型', logType: 'system' }
);
