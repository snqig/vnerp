import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { execute, queryOne, query, SqlValue } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  commonErrors,
  validateRequestBody,
} from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { UserInfo } from '@/lib/auth';

// GET - 币种列表（含筛选）
export const GET = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const onlyActive = searchParams.get('active') === 'true';

  let sql = 'SELECT * FROM sys_currency WHERE deleted = 0';
  const values: SqlValue[] = [];

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
  async (request: NextRequest, userInfo: UserInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const validation = validateRequestBody(body, ['code', 'name']);
    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
    }

    // 检查 code 是否已存在
    const existing = await queryOne('SELECT id FROM sys_currency WHERE code = ?', [body.code]);
    if (existing) {
      return errorResponse(ts('k_1xc9bqj'), 409, 409);
    }

    const result = await execute(
      `INSERT INTO sys_currency (code, name, symbol, decimal_places, status, sort, create_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        body.code,
        body.name,
        body.symbol ?? null,
        body.decimal_places ?? 2,
        body.status ?? 1,
        body.sort ?? 0,
        userInfo.userId,
      ]
    );

    return successResponse({ id: result.insertId }, ts('k_nep0qv'));
  },
  { logTitle: '创建币种' }
);

// PUT - 更新币种
export const PUT = withPermission(
  async (request: NextRequest, userInfo: UserInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const { id } = body;
    if (!id) {
      return commonErrors.badRequest(ts('k_1h6brvc'));
    }

    const existing = await queryOne('SELECT id FROM sys_currency WHERE id = ? AND deleted = 0', [
      id,
    ]);
    if (!existing) {
      return commonErrors.notFound(ts('k_1pzvbsa'));
    }

    if (!body.name) {
      return errorResponse(ts('k_1tvmfg8'), 400, 400);
    }

    await execute(
      `UPDATE sys_currency SET name = ?, symbol = ?, decimal_places = ?, status = ?, sort = ?, update_by = ? WHERE id = ?`,
      [
        body.name,
        body.symbol ?? null,
        body.decimal_places ?? 2,
        body.status ?? 1,
        body.sort ?? 0,
        userInfo.userId,
        id,
      ]
    );

    return successResponse(null, ts('k_vnrxee'));
  },
  { logTitle: '更新币种' }
);

// DELETE - 删除币种（软删除）
export const DELETE = withPermission(
  async (request: NextRequest, userInfo: UserInfo) => {
  const ts = await getTranslations('Common');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return commonErrors.badRequest(ts('k_1h6brvc'));
    }

    // 先获取币种 code
    const currency = await queryOne('SELECT code FROM sys_currency WHERE id = ? AND deleted = 0', [
      parseInt(id),
    ]);
    if (!currency) {
      return commonErrors.notFound(ts('k_1pzvbsa'));
    }
    // 检查引用：汇率记录或公司本位币
    const inUse = await queryOne(
      `SELECT 1 AS v FROM sys_exchange_rate WHERE from_currency = ? OR to_currency = ? LIMIT 1
       UNION
       SELECT 1 AS v FROM sys_company WHERE base_currency = ? LIMIT 1`,
      [currency.code, currency.code, currency.code]
    );
    if (inUse) {
      return errorResponse(ts('k_2jwrjc'), 409, 409);
    }

    await execute('UPDATE sys_currency SET deleted = 1, update_by = ? WHERE id = ?', [
      userInfo.userId,
      parseInt(id),
    ]);
    return successResponse(null, ts('k_13d4a26'));
  },
  { logTitle: '删除币种' }
);
