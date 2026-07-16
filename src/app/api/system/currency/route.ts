import { NextRequest } from 'next/server';
import { execute, queryOne, query } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  commonErrors,
  validateRequestBody,
} from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

// GET - 币种列表（含筛选）
export const GET = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const onlyActive = searchParams.get('active') === 'true';

  let sql = 'SELECT * FROM sys_currency WHERE deleted = 0';
  const values: Loose[] = [];

  if (onlyActive) {
    sql += ' AND status = 1';
  } else if (status !== undefined && status !== null && status !== '') {
    sql += ' AND status = ?';
    values.push(parseInt(status));
  }

  sql += ' ORDER BY sort ASC, id ASC';

  const rows = await query(sql, values);
  return successResponse(rows);
});

// POST - 新建币种
export const POST = withPermission(
  async (request: NextRequest) => {
    const body = await request.json();
    const validation = validateRequestBody(body, ['code', 'name']);
    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
    }

    // 检查 code 是否已存在
    const existing = await queryOne('SELECT id FROM sys_currency WHERE code = ?', [body.code]);
    if (existing) {
      return errorResponse('币种代码已存在', 409, 409);
    }

    const result = await execute(
      `INSERT INTO sys_currency (code, name, symbol, decimal_places, status, sort)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        body.code,
        body.name,
        body.symbol ?? null,
        body.decimal_places ?? 2,
        body.status ?? 1,
        body.sort ?? 0,
      ]
    );

    return successResponse({ id: result.insertId }, '币种创建成功');
  },
  { logTitle: '创建币种' }
);

// PUT - 更新币种
export const PUT = withPermission(
  async (request: NextRequest) => {
    const body = await request.json();
    const { id } = body;
    if (!id) {
      return commonErrors.badRequest('币种ID不能为空');
    }

    const existing = await queryOne('SELECT id FROM sys_currency WHERE id = ?', [id]);
    if (!existing) {
      return commonErrors.notFound('币种不存在');
    }

    await execute(
      `UPDATE sys_currency SET name = ?, symbol = ?, decimal_places = ?, status = ?, sort = ? WHERE id = ?`,
      [
        body.name,
        body.symbol ?? null,
        body.decimal_places ?? 2,
        body.status ?? 1,
        body.sort ?? 0,
        id,
      ]
    );

    return successResponse(null, '币种更新成功');
  },
  { logTitle: '更新币种' }
);

// DELETE - 删除币种（软删除）
export const DELETE = withPermission(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return commonErrors.badRequest('币种ID不能为空');
    }

    await execute('UPDATE sys_currency SET deleted = 1 WHERE id = ?', [parseInt(id)]);
    return successResponse(null, '币种删除成功');
  },
  { logTitle: '删除币种' }
);
