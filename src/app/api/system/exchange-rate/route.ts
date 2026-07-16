import { NextRequest } from 'next/server';
import { execute, queryOne, query, queryPaginated } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  commonErrors,
  validateRequestBody,
  paginatedResponse,
} from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { clearExchangeRateCache } from '@/application/services/CurrencyApplicationService';

// GET - 汇率列表或最新汇率查询
export const GET = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const date = searchParams.get('date');
  const latest = searchParams.get('latest') === 'true';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  // 查询最新汇率: /api/system/exchange-rate?from=USD&to=CNY&latest=true
  if (latest && from && to) {
    const rate = await queryOne(
      'SELECT * FROM sys_exchange_rate WHERE from_currency = ? AND to_currency = ? ORDER BY rate_date DESC LIMIT 1',
      [from, to]
    );
    if (!rate) {
      return successResponse(null, '未找到汇率记录');
    }
    return successResponse(rate);
  }

  // 查询指定日期汇率
  if (date && from && to) {
    const rate = await queryOne(
      'SELECT * FROM sys_exchange_rate WHERE from_currency = ? AND to_currency = ? AND rate_date = ? ORDER BY id DESC LIMIT 1',
      [from, to, date]
    );
    return successResponse(rate);
  }

  // 分页列表
  let sql = 'SELECT * FROM sys_exchange_rate WHERE 1=1';
  let countSql = 'SELECT COUNT(*) as total FROM sys_exchange_rate WHERE 1=1';
  const values: Loose[] = [];

  if (from) {
    sql += ' AND from_currency = ?';
    countSql += ' AND from_currency = ?';
    values.push(from);
  }
  if (to) {
    sql += ' AND to_currency = ?';
    countSql += ' AND to_currency = ?';
    values.push(to);
  }

  sql += ' ORDER BY rate_date DESC, id DESC';

  const result = await queryPaginated(sql, countSql, values, { page, pageSize });
  return paginatedResponse(result.data, result.pagination);
});

// POST - 录入汇率
export const POST = withPermission(
  async (request: NextRequest) => {
    const body = await request.json();
    const validation = validateRequestBody(body, [
      'from_currency',
      'to_currency',
      'rate',
      'rate_date',
    ]);
    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
    }

    if (body.from_currency === body.to_currency) {
      return errorResponse('源币种和目标币种不能相同', 400, 400);
    }

    const rate = Number(body.rate);
    if (!Number.isFinite(rate) || rate <= 0) {
      return errorResponse('汇率必须大于 0', 400, 400);
    }

    const result = await execute(
      `INSERT INTO sys_exchange_rate (from_currency, to_currency, rate, rate_date, source, remark)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        body.from_currency,
        body.to_currency,
        rate,
        body.rate_date,
        body.source ?? 'manual',
        body.remark ?? null,
      ]
    );

    clearExchangeRateCache();
    return successResponse({ id: result.insertId }, '汇率录入成功');
  },
  { logTitle: '录入汇率' }
);

// DELETE - 删除汇率记录
export const DELETE = withPermission(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return commonErrors.badRequest('汇率记录ID不能为空');
    }

    await execute('DELETE FROM sys_exchange_rate WHERE id = ?', [parseInt(id)]);
    clearExchangeRateCache();
    return successResponse(null, '汇率记录删除成功');
  },
  { logTitle: '删除汇率' }
);
