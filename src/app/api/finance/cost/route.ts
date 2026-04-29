import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, withErrorHandler } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const keyword = searchParams.get('keyword') || '';
  const costType = searchParams.get('cost_type') || '';

  let where = 'WHERE deleted = 0';
  const params: any[] = [];

  if (keyword) {
    where += ' AND (cost_no LIKE ? OR source_no LIKE ? OR description LIKE ?)';
    const like = `%${keyword}%`;
    params.push(like, like, like);
  }
  if (costType) {
    where += ' AND cost_type = ?';
    params.push(costType);
  }

  const totalRows: any = await query(`SELECT COUNT(*) as total FROM fin_cost_record ${where}`, params);
  const total = totalRows[0]?.total || 0;

  const rows: any = await query(
    `SELECT * FROM fin_cost_record ${where} ORDER BY cost_date DESC, id DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  const costSummary: any = await query(`
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
