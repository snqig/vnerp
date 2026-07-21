import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { successResponse, commonErrors } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { SPLIT_FLAG_LABEL, STOCKTAKING_ITEM_STATUS_LABEL } from '@/lib/status-labels';

const SPLIT_FLAG_MAP = SPLIT_FLAG_LABEL;
const STATUS_MAP = STOCKTAKING_ITEM_STATUS_LABEL;

export const GET = withPermission(
  async (request: NextRequest, userInfo, { params }: { params: Promise<{ id: string }> }) => {
    const resolvedParams = await params;
    const checkId = parseInt(resolvedParams.id);

    const check: Loose = await queryOne(
      `SELECT * FROM inventory_checks WHERE id = ? AND deleted = 0`,
      [checkId]
    );

    if (!check) {
      return commonErrors.notFound('盘点单不存在');
    }

    const items: Loose[] = await query(
      `SELECT ici.*,
            m.material_name,
            m.unit
     FROM inventory_check_items ici
     LEFT JOIN bas_material m ON ici.material_id = m.id
     WHERE ici.check_id = ?
     ORDER BY ici.id`,
      [checkId]
    );

    return successResponse(
      items.map((item: Loose) => ({
        ...item,
        split_flag_name: SPLIT_FLAG_MAP[item.split_flag] || '未知',
        status_name: STATUS_MAP[item.status] || '未知',
      }))
    );
  }
);
