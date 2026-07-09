import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

export const GET = withPermission(
  async (request: NextRequest, _userInfo) => {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get('page') || 1);
    const pageSize = Number(searchParams.get('pageSize') || 20);
    const configName = searchParams.get('configName') || '';
    const configKey = searchParams.get('configKey') || '';

    let where = 'WHERE 1=1';
    const params: Loose[] = [];
    if (configName) {
      where += ' AND config_name LIKE ?';
      params.push(`%${configName}%`);
    }
    if (configKey) {
      where += ' AND config_key LIKE ?';
      params.push(`%${configKey}%`);
    }

    const totalRows: Loose = await query(
      `SELECT COUNT(*) as total FROM sys_config ${where}`,
      params
    );
    const total = totalRows[0]?.total || 0;

    const rows: Loose = await query(
      `SELECT * FROM sys_config ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize]
    );

    return successResponse({ list: rows, total, page, pageSize });
  },
  { logTitle: '获取系统配置', logType: 'system' }
);

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body = await request.json();
    const { config_name, config_key, config_value, config_type, description } = body;

    const result: Loose = await execute(
      `INSERT INTO sys_config (config_name, config_key, config_value, config_type, description) VALUES (?, ?, ?, ?, ?)`,
      [config_name, config_key, config_value, config_type ?? 1, description || null]
    );

    return successResponse({ id: result.insertId }, '创建成功');
  },
  { logTitle: '创建系统配置', logType: 'system' }
);

export const PUT = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body = await request.json();
    const { id, config_name, config_key, config_value, config_type, description } = body;

    await execute(
      `UPDATE sys_config SET config_name = ?, config_key = ?, config_value = ?, config_type = ?, description = ? WHERE id = ?`,
      [config_name, config_key, config_value, config_type ?? 1, description || null, id]
    );

    return successResponse(null, '更新成功');
  },
  { logTitle: '更新系统配置', logType: 'system' }
);

export const DELETE = withPermission(
  async (request: NextRequest, _userInfo) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, message: '缺少id' }, { status: 400 });

    await execute(`DELETE FROM sys_config WHERE id = ?`, [Number(id)]);
    return successResponse(null, '删除成功');
  },
  { logTitle: '删除系统配置', logType: 'system' }
);
