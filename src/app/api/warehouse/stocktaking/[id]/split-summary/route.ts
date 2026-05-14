import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { withErrorHandler, successResponse, errorResponse, commonErrors } from '@/lib/api-response';

export const GET = withErrorHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const resolvedParams = await params;
    const checkId = parseInt(resolvedParams.id);
    const { searchParams } = new URL(request.url);
    const parentQrCode = searchParams.get('parent_qr_code');

    if (!parentQrCode) {
      return errorResponse('缺少父二维码参数', 400, 400);
    }

    const check: any = await queryOne(
      `SELECT * FROM inventory_checks WHERE id = ? AND deleted = 0`,
      [checkId]
    );

    if (!check) {
      return commonErrors.notFound('盘点单不存在');
    }

    const parentItem: any[] = await query(
      `SELECT ici.*,
            m.material_name,
            m.unit
     FROM inventory_check_items ici
     LEFT JOIN bas_material m ON ici.material_id = m.id
     WHERE ici.check_id = ?
       AND ici.qr_code = ?`,
      [checkId, parentQrCode]
    );

    if (parentItem.length === 0) {
      return errorResponse('未找到整料盘点记录', 404, 404);
    }

    const smallItems: any[] = await query(
      `SELECT ici.*
     FROM inventory_check_items ici
     WHERE ici.check_id = ?
       AND ici.parent_qr_code = ?
       AND ici.split_flag = 1
     ORDER BY ici.id`,
      [checkId, parentQrCode]
    );

    let totalSmallBookQty = 0;
    let totalSmallActualQty = 0;

    for (const item of smallItems) {
      totalSmallBookQty += item.book_quantity || 0;
      totalSmallActualQty += item.actual_quantity || 0;
    }

    return successResponse({
      parent_qr_code: parentQrCode,
      material_name: parentItem[0].material_name,
      batch_no: parentItem[0].batch_no,
      unit: parentItem[0].unit,
      whole_material_book_qty: parentItem[0].book_quantity,
      whole_material_actual_qty: parentItem[0].actual_quantity,
      split_small_qty: smallItems.length,
      total_small_book_qty: totalSmallBookQty,
      total_small_actual_qty: totalSmallActualQty,
      difference:
        (parentItem[0].actual_quantity || 0) +
        totalSmallActualQty -
        (parentItem[0].book_quantity || 0) -
        totalSmallBookQty,
      small_materials: smallItems.map((item) => ({
        qr_code: item.qr_code,
        batch_no: item.batch_no,
        book_quantity: item.book_quantity,
        actual_quantity: item.actual_quantity,
        difference: item.difference,
        status: item.status,
      })),
    });
  }
);
