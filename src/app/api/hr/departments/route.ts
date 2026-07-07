import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse } from '@/lib/api-response';

import { withPermission } from '@/lib/api-permissions';
export const GET = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  const countResult = await query(
    `SELECT COUNT(*) as total FROM sys_department WHERE status = 1 AND deleted = 0`
  );
  const total = (countResult as any[])[0]?.total || 0;

  const departments = await query(
    `SELECT id, dept_name, dept_code, parent_id FROM sys_department WHERE status = 1 AND deleted = 0 ORDER BY sort_order LIMIT ? OFFSET ?`,
    [pageSize, (page - 1) * pageSize]
  );

  return successResponse({
    list: departments,
    total,
    page,
    pageSize,
  });
}, { errorMessage: '获取部门列表失败' });
