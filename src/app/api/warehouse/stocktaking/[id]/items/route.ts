import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { withErrorHandler, successResponse, errorResponse, commonErrors } from '@/lib/api-response';

const SPLIT_FLAG_MAP: Record<number, string> = {
  0: '整料',
  1: '小料',
  2: '余料'
};

const STATUS_MAP: Record<number, string> = {
  0: '未盘点',
  1: '已盘点',
  2: '已调整'
};

export const GET = withErrorHandler(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const resolvedParams = await params;
  const checkId = parseInt(resolvedParams.id);

  const check: any = await queryOne(
    `SELECT * FROM inventory_checks WHERE id = ? AND deleted = 0`,
    [checkId]
  );

  if (!check) {
    return commonErrors.notFound('盘点单不存在');
  }

  const items: any[] = await query(
    `SELECT ici.*,
            m.material_name,
            m.unit
     FROM inventory_check_items ici
     LEFT JOIN bas_material m ON ici.material_id = m.id
     WHERE ici.check_id = ?
     ORDER BY ici.id`,
    [checkId]
  );

  return successResponse(items.map((item: any) => ({
    ...item,
    split_flag_name: SPLIT_FLAG_MAP[item.split_flag] || '未知',
    status_name: STATUS_MAP[item.status] || '未知'
  })));
});