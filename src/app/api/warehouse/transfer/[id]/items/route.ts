import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { withErrorHandler, successResponse, errorResponse, commonErrors } from '@/lib/api-response';

export const GET = withErrorHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const resolvedParams = await params;
    const transferId = parseInt(resolvedParams.id);

    const transfer: any = await queryOne(`SELECT * FROM transfers WHERE id = ? AND deleted = 0`, [
      transferId,
    ]);

    if (!transfer) {
      return commonErrors.notFound('调拨单不存在');
    }

    const items: any[] = await query(
      `SELECT ti.*,
            m.name as material_name
     FROM transfer_items ti
     LEFT JOIN inv_material m ON ti.material_id = m.id
     WHERE ti.transfer_id = ?
     ORDER BY ti.id`,
      [transferId]
    );

    return successResponse(items);
  }
);
