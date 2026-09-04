import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { successResponse, commonErrors } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

export const GET = withPermission(
  async (request: NextRequest, userInfo, { params }: { params: Promise<{ id: string }> }) => {
  const ts = await getTranslations('Common');
    const resolvedParams = await params;
    const transferId = parseInt(resolvedParams.id);

    const transfer = await queryOne(
      `SELECT * FROM inv_transfer_order WHERE id = ? AND deleted = 0`,
      [transferId]
    );

    if (!transfer) {
      return commonErrors.notFound(ts('k_118ryb8'));
    }

    const items = await query(
      `SELECT ti.*,
            m.material_name as material_name
     FROM inv_transfer_item ti
     LEFT JOIN inv_material m ON ti.material_id = m.id
     WHERE ti.transfer_id = ? AND ti.deleted = 0
     ORDER BY ti.id`,
      [transferId]
    );

    return successResponse(items);
  }
);
