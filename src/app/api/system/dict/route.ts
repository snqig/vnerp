import { NextRequest } from 'next/server';
import {
  successResponse,
  errorResponse,
  validateRequestBody,
} from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { UserInfo } from '@/lib/auth';
import { query, execute } from '@/lib/db';

/**
 * 字典管理 API
 */

// 获取字典数据
export const GET = withPermission(
  async (request: NextRequest, userInfo: UserInfo) => {
    const { searchParams } = new URL(request.url);
    const dictType = searchParams.get('dictType') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '100');

    if (dictType) {
      // 获取指定类型的字典数据
      const rows: any = await query(
        `SELECT d.*, t.dict_name FROM sys_dict_data d
         LEFT JOIN sys_dict_type t ON d.dict_type = t.dict_type
         WHERE d.dict_type = ? AND d.status = 1
         ORDER BY d.sort_order`,
        [dictType]
      );
      return successResponse({ list: rows });
    }

    // 获取所有字典类型
    const countRows: any = await query('SELECT COUNT(*) as total FROM sys_dict_type');
    const total = countRows[0]?.total || 0;

    const types: any = await query(
      `SELECT * FROM sys_dict_type ORDER BY id LIMIT ? OFFSET ?`,
      [pageSize, (page - 1) * pageSize]
    );

    // 获取每个类型的数据
    const result = [];
    for (const type of types) {
      const data: any = await query(
        'SELECT * FROM sys_dict_data WHERE dict_type = ? ORDER BY sort_order',
        [type.dict_type]
      );
      result.push({ ...type, items: data });
    }

    return successResponse({ list: result, total, page, pageSize });
  },
  { errorMessage: '操作失败' }
);

// 创建字典类型或数据
export const POST = withPermission(
  async (request: NextRequest, userInfo: UserInfo) => {
    const body = await request.json();
    const { action } = body;

    if (action === 'create_type') {
      const validation = validateRequestBody(body, ['dict_name', 'dict_type']);
      if (!validation.valid) {
        return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
      }

      const existing: any = await query(
        'SELECT id FROM sys_dict_type WHERE dict_type = ?',
        [body.dict_type]
      );
      if (existing.length > 0) {
        return errorResponse('字典类型编码已存在', 400, 400);
      }

      const result: any = await execute(
        'INSERT INTO sys_dict_type (dict_name, dict_type, status, remark) VALUES (?, ?, ?, ?)',
        [body.dict_name, body.dict_type, body.status ?? 1, body.remark || null]
      );

      return successResponse({ id: result.insertId }, '字典类型创建成功');
    }

    if (action === 'create_data') {
      const validation = validateRequestBody(body, ['dict_type', 'dict_label', 'dict_value']);
      if (!validation.valid) {
        return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
      }

      const result: any = await execute(
        'INSERT INTO sys_dict_data (dict_type, dict_label, dict_value, sort_order, status, remark) VALUES (?, ?, ?, ?, ?, ?)',
        [body.dict_type, body.dict_label, body.dict_value, body.sort_order || 0, body.status ?? 1, body.remark || null]
      );

      return successResponse({ id: result.insertId }, '字典数据创建成功');
    }

    return errorResponse('无效的操作类型', 400, 400);
  },
  { errorMessage: '操作失败' }
);

// 更新字典
export const PUT = withPermission(
  async (request: NextRequest, userInfo: UserInfo) => {
    const body = await request.json();
    const { action } = body;

    if (action === 'update_type') {
      if (!body.id) return errorResponse('ID不能为空', 400, 400);
      const updates: string[] = [];
      const params: any[] = [];
      if (body.dict_name !== undefined) { updates.push('dict_name = ?'); params.push(body.dict_name); }
      if (body.status !== undefined) { updates.push('status = ?'); params.push(body.status); }
      if (body.remark !== undefined) { updates.push('remark = ?'); params.push(body.remark); }
      if (updates.length === 0) return errorResponse('没有需要更新的字段', 400, 400);
      updates.push('update_time = NOW()');
      params.push(body.id);
      await execute(`UPDATE sys_dict_type SET ${updates.join(', ')} WHERE id = ?`, params);
      return successResponse(null, '字典类型更新成功');
    }

    if (action === 'update_data') {
      if (!body.id) return errorResponse('ID不能为空', 400, 400);
      const updates: string[] = [];
      const params: any[] = [];
      if (body.dict_label !== undefined) { updates.push('dict_label = ?'); params.push(body.dict_label); }
      if (body.dict_value !== undefined) { updates.push('dict_value = ?'); params.push(body.dict_value); }
      if (body.sort_order !== undefined) { updates.push('sort_order = ?'); params.push(body.sort_order); }
      if (body.status !== undefined) { updates.push('status = ?'); params.push(body.status); }
      if (body.remark !== undefined) { updates.push('remark = ?'); params.push(body.remark); }
      if (updates.length === 0) return errorResponse('没有需要更新的字段', 400, 400);
      updates.push('update_time = NOW()');
      params.push(body.id);
      await execute(`UPDATE sys_dict_data SET ${updates.join(', ')} WHERE id = ?`, params);
      return successResponse(null, '字典数据更新成功');
    }

    return errorResponse('无效的操作类型', 400, 400);
  },
  { errorMessage: '操作失败' }
);

// 删除字典
export const DELETE = withPermission(
  async (request: NextRequest, userInfo: UserInfo) => {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const id = searchParams.get('id');

    if (!id) return errorResponse('ID不能为空', 400, 400);

    if (action === 'delete_type') {
      await execute('DELETE FROM sys_dict_data WHERE dict_type = (SELECT dict_type FROM sys_dict_type WHERE id = ?)', [Number(id)]);
      await execute('DELETE FROM sys_dict_type WHERE id = ?', [Number(id)]);
      return successResponse(null, '字典类型及数据已删除');
    }

    if (action === 'delete_data') {
      await execute('DELETE FROM sys_dict_data WHERE id = ?', [Number(id)]);
      return successResponse(null, '字典数据已删除');
    }

    return errorResponse('无效的操作类型', 400, 400);
  },
  { errorMessage: '操作失败' }
);
