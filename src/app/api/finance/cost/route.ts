import { NextRequest, NextResponse } from 'next/server';
import { getTranslations } from 'next-intl/server';
import { query, execute, SqlValue } from '@/lib/db';
import { successResponse } from '@/lib/api-response';

import { withPermission } from '@/lib/api-permissions';
export const GET = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const keyword = searchParams.get('keyword') || '';
  const costType = searchParams.get('cost_type') || '';

  let where = 'WHERE deleted = 0';
  const params: SqlValue[] = [];

  if (keyword) {
    where += ' AND (cost_no LIKE ? OR order_no LIKE ? OR description LIKE ?)';
    const like = `%${keyword}%`;
    params.push(like, like, like);
  }
  if (costType) {
    where += ' AND cost_type = ?';
    params.push(costType);
  }

  const totalRows = await query(`SELECT COUNT(*) as total FROM fin_cost_record ${where}`, params);
  const total = totalRows[0]?.total || 0;

  const rows = await query(
    `SELECT * FROM fin_cost_record ${where} ORDER BY cost_date DESC, id DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  const costSummary = await query(`
    SELECT
      COALESCE(SUM(CASE WHEN cost_type = 'material' THEN amount ELSE 0 END), 0) as material,
      COALESCE(SUM(CASE WHEN cost_type = 'labor' THEN amount ELSE 0 END), 0) as labor,
      COALESCE(SUM(CASE WHEN cost_type = 'overhead' THEN amount ELSE 0 END), 0) as overhead,
      COALESCE(SUM(CASE WHEN cost_type = 'outsource' THEN amount ELSE 0 END), 0) as outsource,
      COALESCE(SUM(amount), 0) as total
    FROM fin_cost_record WHERE deleted = 0
  `);

  return successResponse({
    list: rows,
    total,
    page,
    pageSize,
    cost_summary: costSummary[0] || { material: 0, labor: 0, overhead: 0, outsource: 0, total: 0 },
  });
});

export const DELETE = withPermission(async (request: NextRequest) => {
  const ts = await getTranslations('Common');
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, message: ts('k_js4lo9') }, { status: 400 });
  await execute('UPDATE fin_cost_record SET deleted = 1 WHERE id = ?', [Number(id)]);
  return successResponse(null, ts('k_1hlqs'));
});
