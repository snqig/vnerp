import { NextRequest } from 'next/server';
import { query, SqlValue } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

/**
 * 基础油墨列表（dcprint/ink-usage 等下拉场景）
 * GET /api/base-inks?keyword=xxx
 */
export const GET = withPermission(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';

    let where = 'WHERE deleted = 0';
    const params: SqlValue[] = [];
    if (keyword) {
      where += ' AND (ink_code LIKE ? OR ink_name LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    const rows = await query(
      `SELECT id, ink_code, ink_name, color_code, color_name, ink_type, unit, unit_price, stock_qty, status
       FROM base_ink ${where} ORDER BY ink_code`,
      params
    );
    return successResponse({ list: rows, total: rows.length });
  },
  { errorMessage: '获取基础油墨列表失败' }
);
