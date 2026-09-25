import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse } from '@/lib/api-response';

import { withPermission } from '@/lib/api-permissions';
import type { DbRow } from '@/types/db';
export const GET = withPermission(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    // 与 /api/organization/department 同理：部门是树形主数据，默认必须覆盖全量，
    // 否则部门数超过 20 后调用方会静默漏掉尾部部门。
    const pageSize = Math.min(Math.max(parseInt(searchParams.get('pageSize') || '500') || 500, 1), 2000);

    const countResult = await query(
      `SELECT COUNT(*) as total FROM sys_department WHERE status = 1 AND deleted = 0`
    );
    const total = (countResult as DbRow[])[0]?.total || 0;

    const departments = await query(
      `SELECT id, dept_name, dept_code, parent_id FROM sys_department WHERE status = 1 AND deleted = 0 ORDER BY (parent_id IS NULL) DESC, parent_id ASC, sort_order ASC, id ASC LIMIT ? OFFSET ?`,
      [pageSize, (page - 1) * pageSize]
    );

    return successResponse({
      list: departments,
      total,
      page,
      pageSize,
    });
  },
  { errorMessage: '获取部门列表失败' }
);
