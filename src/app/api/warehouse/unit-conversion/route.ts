import { NextRequest } from 'next/server';
import { successResponse, errorResponse, validateRequestBody } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { UserInfo } from '@/lib/auth';
import { query, execute } from '@/lib/db';

/**
 * 多单位换算 API
 *
 * 支持物料的多单位管理，实现"箱→个"、"吨→公斤"等换算
 * 换算关系：1 大单位 = N 小单位
 */

// 获取单位换算列表
export const GET = withPermission(
  async (request: NextRequest, _userInfo: UserInfo) => {
    const { searchParams } = new URL(request.url);
    const materialId = searchParams.get('materialId');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    let where = 'WHERE 1=1';
    const params: any[] = [];

    if (materialId) {
      where += ' AND u.material_id = ?';
      params.push(Number(materialId));
    }

    const countRows: any = await query(
      `SELECT COUNT(*) as total FROM inv_unit_conversion u ${where}`,
      params
    );
    const total = countRows[0]?.total || 0;

    const rows: any = await query(
      `SELECT u.*, m.material_name, m.material_code, m.unit as base_unit
       FROM inv_unit_conversion u
       LEFT JOIN materials m ON u.material_id = m.id
       ${where}
       ORDER BY u.material_id, u.ratio DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize]
    );

    return successResponse({ list: rows, total, page, pageSize });
  },
  { errorMessage: '操作失败' }
);

// 创建/更新单位换算
export const POST = withPermission(
  async (request: NextRequest, _userInfo: UserInfo) => {
    const body = await request.json();
    const validation = validateRequestBody(body, ['material_id', 'from_unit', 'to_unit', 'ratio']);

    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
    }

    const { material_id, from_unit, to_unit, ratio, is_default } = body;

    if (ratio <= 0) {
      return errorResponse('换算比例必须大于0', 400, 400);
    }

    // 检查是否已存在相同换算
    const existing: any = await query(
      'SELECT id FROM inv_unit_conversion WHERE material_id = ? AND from_unit = ? AND to_unit = ?',
      [material_id, from_unit, to_unit]
    );

    if (existing.length > 0) {
      // 更新
      await execute(
        'UPDATE inv_unit_conversion SET ratio = ?, is_default = ?, update_time = NOW() WHERE id = ?',
        [ratio, is_default ? 1 : 0, existing[0].id]
      );
      return successResponse({ id: existing[0].id }, '换算关系已更新');
    }

    // 创建
    const result: any = await execute(
      `INSERT INTO inv_unit_conversion
       (material_id, from_unit, to_unit, ratio, is_default, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [material_id, from_unit, to_unit, ratio, is_default ? 1 : 0]
    );

    return successResponse({ id: result.insertId }, '换算关系创建成功');
  },
  { errorMessage: '操作失败' }
);

// 删除换算关系
export const DELETE = withPermission(
  async (request: NextRequest, _userInfo: UserInfo) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return errorResponse('缺少ID参数', 400, 400);
    }

    await execute('DELETE FROM inv_unit_conversion WHERE id = ?', [Number(id)]);
    return successResponse(null, '换算关系已删除');
  },
  { errorMessage: '操作失败' }
);

// 单位换算计算
export const PUT = withPermission(
  async (request: NextRequest, _userInfo: UserInfo) => {
    const body = await request.json();
    const { material_id, from_unit, to_unit, quantity } = body;

    if (!material_id || !from_unit || !to_unit || !quantity) {
      return errorResponse('物料ID、源单位、目标单位和数量不能为空', 400, 400);
    }

    // 查找换算关系
    const conversions: any = await query(
      'SELECT * FROM inv_unit_conversion WHERE material_id = ? AND ((from_unit = ? AND to_unit = ?) OR (from_unit = ? AND to_unit = ?))',
      [material_id, from_unit, to_unit, to_unit, from_unit]
    );

    if (conversions.length === 0) {
      return errorResponse('未找到对应的单位换算关系', 404, 404);
    }

    const conv = conversions[0];
    let resultQty: number;

    if (conv.from_unit === from_unit && conv.to_unit === to_unit) {
      // 正向换算：from_unit → to_unit
      resultQty = Number(quantity) * Number(conv.ratio);
    } else {
      // 反向换算：to_unit → from_unit
      resultQty = Number(quantity) / Number(conv.ratio);
    }

    return successResponse(
      {
        material_id,
        from_unit,
        to_unit,
        from_quantity: Number(quantity),
        to_quantity: resultQty,
        ratio: Number(conv.ratio),
      },
      '换算完成'
    );
  },
  { errorMessage: '操作失败' }
);
