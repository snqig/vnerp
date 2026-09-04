import { t } from '@/lib/server-translate';
import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { successResponse, commonErrors } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { SPLIT_FLAG_LABEL, STOCKTAKING_ITEM_STATUS_LABEL } from '@/lib/status-labels';
import type { DbRow } from '@/types/db';

const SPLIT_FLAG_MAP = SPLIT_FLAG_LABEL;
const STATUS_MAP = STOCKTAKING_ITEM_STATUS_LABEL;

export const GET = withPermission(
  async (request: NextRequest, userInfo, { params }: { params: Promise<{ id: string }> }) => {
    const resolvedParams = await params;
    const checkId = parseInt(resolvedParams.id);

    const check = await queryOne(`SELECT * FROM inv_stocktaking WHERE id = ? AND deleted = 0`, [
      checkId,
    ]);

    if (!check) {
      return successResponse([]);
    }

    const items = await query(
      `SELECT ici.*,
            m.material_name,
            m.unit
     FROM inv_stocktaking_item ici
     LEFT JOIN inv_material m ON ici.material_id = m.id
     WHERE ici.taking_id = ?
     ORDER BY ici.id`,
      [checkId]
    );

    return successResponse(
      items.map((item: DbRow) => {
  const ts = t;
  return  ({
        ...item,
        split_flag_name: SPLIT_FLAG_MAP[item.split_flag] || ts('k_1lpnuh4'),
        status_name: STATUS_MAP[item.status] || ts('k_1lpnuh4'),
      });
})
    );
  }
);
