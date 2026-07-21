import { NextRequest } from 'next/server';
import { successResponse, errorResponse, validateRequestBody } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { UserInfo } from '@/lib/auth';
import { query, execute } from '@/lib/db';

/**
 * 字典管理 API
 *
 * 数据模型（与权威库结构 `database/vnerpdacahng_schema.sql` 一致，规范化模型）：
 * - sys_dict_type: id, dict_code(编码/唯一), dict_name, description, status, deleted
 * - sys_dict_data: id, dict_type_id(FK→sys_dict_type.id), dict_label, dict_value,
 *                  sort_order, status, remark, deleted
 *
 * 说明：前端以 `dict_type` 作为“字典类型编码”的逻辑字段名，本 API 负责在 `dict_type`(编码)
 * 与真实列 `dict_code` / `dict_type_id` 之间做映射，保持对前端契约不变。
 */

// 获取字典数据
export const GET = withPermission(
  async (request: NextRequest, _userInfo: UserInfo) => {
    const { searchParams } = new URL(request.url);
    const dictType = searchParams.get('dictType') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '100');

    if (dictType) {
      // 获取指定类型（编码）的字典数据
      const rows: Loose = await query(
        `SELECT d.id, d.dict_type_id, d.dict_label, d.dict_value, d.sort_order, d.status, d.remark,
                t.dict_code AS dict_type, t.dict_name
           FROM sys_dict_data d
           JOIN sys_dict_type t ON d.dict_type_id = t.id
          WHERE t.dict_code = ? AND d.status = 1 AND d.deleted = 0 AND t.deleted = 0
          ORDER BY d.sort_order`,
        [dictType]
      );
      return successResponse({ list: rows });
    }

    // 获取所有字典类型
    const countRows: Loose = await query(
      'SELECT COUNT(*) as total FROM sys_dict_type WHERE deleted = 0'
    );
    const total = countRows[0]?.total || 0;

    const types: Loose = await query(
      `SELECT id, dict_code AS dict_type, dict_name, description AS remark, status
         FROM sys_dict_type
        WHERE deleted = 0
        ORDER BY id
        LIMIT ? OFFSET ?`,
      [pageSize, (page - 1) * pageSize]
    );

    // 获取每个类型的数据项
    const result = [];
    for (const type of types) {
      const items: Loose = await query(
        `SELECT id, dict_type_id, dict_label, dict_value, sort_order, status, remark
           FROM sys_dict_data
          WHERE dict_type_id = ? AND deleted = 0
          ORDER BY sort_order`,
        [type.id]
      );
      // 为每个数据项补充 dict_type 编码字段，保持前端契约
      const itemsWithType = items.map((it: Loose) => ({ ...it, dict_type: type.dict_type }));
      result.push({ ...type, items: itemsWithType });
    }

    return successResponse({ list: result, total, page, pageSize });
  },
  { errorMessage: '操作失败' }
);

// 创建字典类型或数据
export const POST = withPermission(
  async (request: NextRequest, _userInfo: UserInfo) => {
    const body = await request.json();
    const { action } = body;

    if (action === 'create_type') {
      const validation = validateRequestBody(body, ['dict_name', 'dict_type']);
      if (!validation.valid) {
        return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
      }

      const existing: Loose = await query(
        'SELECT id FROM sys_dict_type WHERE dict_code = ? AND deleted = 0',
        [body.dict_type]
      );
      if (existing.length > 0) {
        return errorResponse('字典类型编码已存在', 400, 400);
      }

      const result: Loose = await execute(
        'INSERT INTO sys_dict_type (dict_name, dict_code, status, description) VALUES (?, ?, ?, ?)',
        [body.dict_name, body.dict_type, body.status ?? 1, body.remark || null]
      );

      return successResponse({ id: result.insertId }, '字典类型创建成功');
    }

    if (action === 'create_data') {
      const validation = validateRequestBody(body, ['dict_type', 'dict_label', 'dict_value']);
      if (!validation.valid) {
        return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
      }

      // 将字典类型编码解析为 dict_type_id
      const typeRows: Loose = await query(
        'SELECT id FROM sys_dict_type WHERE dict_code = ? AND deleted = 0',
        [body.dict_type]
      );
      if (typeRows.length === 0) {
        return errorResponse('字典类型不存在', 400, 400);
      }
      const dictTypeId = typeRows[0].id;

      const result: Loose = await execute(
        'INSERT INTO sys_dict_data (dict_type_id, dict_label, dict_value, sort_order, status, remark) VALUES (?, ?, ?, ?, ?, ?)',
        [
          dictTypeId,
          body.dict_label,
          body.dict_value,
          body.sort_order || 0,
          body.status ?? 1,
          body.remark || null,
        ]
      );

      return successResponse({ id: result.insertId }, '字典数据创建成功');
    }

    return errorResponse('无效的操作类型', 400, 400);
  },
  { errorMessage: '操作失败' }
);

// 更新字典
export const PUT = withPermission(
  async (request: NextRequest, _userInfo: UserInfo) => {
    const body = await request.json();
    const { action } = body;

    if (action === 'update_type') {
      if (!body.id) return errorResponse('ID不能为空', 400, 400);
      const updates: string[] = [];
      const params: Loose[] = [];
      if (body.dict_name !== undefined) {
        updates.push('dict_name = ?');
        params.push(body.dict_name);
      }
      // 前端以 dict_type 表示编码，映射到真实列 dict_code
      if (body.dict_type !== undefined) {
        updates.push('dict_code = ?');
        params.push(body.dict_type);
      }
      if (body.status !== undefined) {
        updates.push('status = ?');
        params.push(body.status);
      }
      // 前端以 remark 表示描述，映射到真实列 description
      if (body.remark !== undefined) {
        updates.push('description = ?');
        params.push(body.remark);
      }
      if (updates.length === 0) return errorResponse('没有需要更新的字段', 400, 400);
      updates.push('update_time = NOW()');
      params.push(body.id);
      await execute(
        `UPDATE sys_dict_type SET ${updates.join(', ')} WHERE id = ? AND deleted = 0`,
        params
      );
      return successResponse(null, '字典类型更新成功');
    }

    if (action === 'update_data') {
      if (!body.id) return errorResponse('ID不能为空', 400, 400);
      const updates: string[] = [];
      const params: Loose[] = [];
      if (body.dict_label !== undefined) {
        updates.push('dict_label = ?');
        params.push(body.dict_label);
      }
      if (body.dict_value !== undefined) {
        updates.push('dict_value = ?');
        params.push(body.dict_value);
      }
      if (body.sort_order !== undefined) {
        updates.push('sort_order = ?');
        params.push(body.sort_order);
      }
      if (body.status !== undefined) {
        updates.push('status = ?');
        params.push(body.status);
      }
      if (body.remark !== undefined) {
        updates.push('remark = ?');
        params.push(body.remark);
      }
      if (updates.length === 0) return errorResponse('没有需要更新的字段', 400, 400);
      updates.push('update_time = NOW()');
      params.push(body.id);
      await execute(
        `UPDATE sys_dict_data SET ${updates.join(', ')} WHERE id = ? AND deleted = 0`,
        params
      );
      return successResponse(null, '字典数据更新成功');
    }

    return errorResponse('无效的操作类型', 400, 400);
  },
  { errorMessage: '操作失败' }
);

// 删除字典（软删除）
export const DELETE = withPermission(
  async (request: NextRequest, _userInfo: UserInfo) => {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const id = searchParams.get('id');

    if (!id) return errorResponse('ID不能为空', 400, 400);

    if (action === 'delete_type') {
      // 先软删除该类型下的所有数据项，再软删除类型本身
      await execute(
        'UPDATE sys_dict_data SET deleted = 1, update_time = NOW() WHERE dict_type_id = ?',
        [Number(id)]
      );
      await execute('UPDATE sys_dict_type SET deleted = 1, update_time = NOW() WHERE id = ?', [
        Number(id),
      ]);
      return successResponse(null, '字典类型及数据已删除');
    }

    if (action === 'delete_data') {
      await execute('UPDATE sys_dict_data SET deleted = 1, update_time = NOW() WHERE id = ?', [
        Number(id),
      ]);
      return successResponse(null, '字典数据已删除');
    }

    return errorResponse('无效的操作类型', 400, 400);
  },
  { errorMessage: '操作失败' }
);
