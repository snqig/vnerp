import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { successResponse, errorResponse, commonErrors } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

export const GET = withPermission(
  async (request: NextRequest, userInfo, { params }: { params: Promise<{ id: string }> }) => {
  const ts = await getTranslations('Common');
    const resolvedParams = await params;
    const checkId = parseInt(resolvedParams.id);
    const { searchParams } = new URL(request.url);
    const parentQrCode = searchParams.get('parent_qr_code');

    if (!parentQrCode) {
      return errorResponse(ts('k_10yzxw7'), 400, 400);
    }

    const check = await queryOne(`SELECT * FROM inv_stocktaking WHERE id = ? AND deleted = 0`, [
      checkId,
    ]);

    if (!check) {
      return commonErrors.notFound(ts('k_rt4j0w'));
    }

    const parentItem = await query(
      `SELECT si.*,
            m.material_name,
            m.unit
     FROM inv_stocktaking_item si
     LEFT JOIN inv_material m ON si.material_id = m.id
     WHERE si.taking_id = ?
       AND si.qr_code = ?`,
      [checkId, parentQrCode]
    );

    if (parentItem.length === 0) {
      return errorResponse(ts('k_98nmso'), 404, 404);
    }

    const smallItems = await query(
      `SELECT si.*
     FROM inv_stocktaking_item si
     WHERE si.taking_id = ?
       AND si.parent_qr_code = ?
       AND si.split_flag = 1
     ORDER BY si.id`,
      [checkId, parentQrCode]
    );

    let totalSmallBookQty = 0;
    let totalSmallActualQty = 0;

    for (const item of smallItems) {
      totalSmallBookQty += item.system_qty || 0;
      totalSmallActualQty += item.actual_qty || 0;
    }

    return successResponse({
      parent_qr_code: parentQrCode,
      material_name: parentItem[0].material_name,
      batch_no: parentItem[0].batch_no,
      unit: parentItem[0].unit,
      whole_material_book_qty: parentItem[0].system_qty,
      whole_material_actual_qty: parentItem[0].actual_qty,
      split_small_qty: smallItems.length,
      total_small_book_qty: totalSmallBookQty,
      total_small_actual_qty: totalSmallActualQty,
      difference:
        (parentItem[0].actual_qty || 0) +
        totalSmallActualQty -
        (parentItem[0].system_qty || 0) -
        totalSmallBookQty,
      small_materials: smallItems.map((item) => ({
        qr_code: item.qr_code,
        batch_no: item.batch_no,
        book_quantity: item.system_qty,
        actual_quantity: item.actual_qty,
        difference: item.diff_qty,
        status: item.diff_status,
      })),
    });
  }
);
