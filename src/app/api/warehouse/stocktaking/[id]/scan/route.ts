import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { execute, queryOne } from '@/lib/db';
import { successResponse, errorResponse, commonErrors } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { SPLIT_FLAG_LABEL, STOCKTAKING_STATUS_LABEL } from '@/lib/status-labels';

const SPLIT_FLAG_MAP = SPLIT_FLAG_LABEL;

export const POST = withPermission(
  async (request: NextRequest, userInfo, { params }: { params: Promise<{ id: string }> }) => {
  const ts = await getTranslations('Common');
    const resolvedParams = await params;
    const checkId = parseInt(resolvedParams.id);
    const body = await request.json();
    const { qr_code, actual_quantity } = body;

    if (!qr_code) {
      return errorResponse(ts('k_16h3mm3'), 400, 400);
    }

    if (actual_quantity === undefined || actual_quantity === null) {
      return errorResponse(ts('k_v8vb9i'), 400, 400);
    }

    const check = await queryOne(`SELECT * FROM inv_stocktaking WHERE id = ? AND deleted = 0`, [
      checkId,
    ]);

    if (!check) {
      return commonErrors.notFound(ts('k_rt4j0w'));
    }

    if (check.status !== 1) {
      return errorResponse(
        `当前状态为"${STOCKTAKING_STATUS_LABEL[check.status]}"，不能执行盘点操作`,
        400,
        400
      );
    }

    // 库存记录直接取自 qrcode_record（其本身携带 material_name/batch_no/location 等字段），
    // 盘点明细用真实表 inv_stocktaking_item（inventory_checks/inventory_check_items 为幽灵表）。
    const inventoryItem = await queryOne(
      `SELECT qr_code, material_name, batch_no, location AS warehouse_location
     FROM qrcode_record
     WHERE qr_code = ? AND deleted = 0`,
      [qr_code]
    );

    if (!inventoryItem) {
      return errorResponse(ts('k_dk1t1a'), 404, 404);
    }

    const checkItem = await queryOne(
      `SELECT * FROM inv_stocktaking_item
     WHERE taking_id = ? AND qr_code = ?`,
      [checkId, qr_code]
    );

    if (!checkItem) {
      return errorResponse(ts('k_1r7887z'), 400, 400);
    }

    const difference = actual_quantity - checkItem.system_qty;

    const split_flag = checkItem.split_flag || 0;
    const parent_qr_code = checkItem.parent_qr_code || null;

    // 扫码回填：写实盘数与差异（差异审批由 diff-process 负责，不在此调库存）
    await execute(
      `UPDATE inv_stocktaking_item
     SET actual_qty = ?,
         diff_qty = ?,
         update_time = NOW()
     WHERE id = ?`,
      [actual_quantity, difference, checkItem.id]
    );

    const stats = await queryOne(
      `SELECT
      COUNT(CASE WHEN actual_qty IS NOT NULL THEN 1 END) as checked_count,
      COUNT(*) as total_count
     FROM inv_stocktaking_item
     WHERE taking_id = ?`,
      [checkId]
    );

    return successResponse(
      {
        material_name: inventoryItem.material_name,
        batch_no: inventoryItem.batch_no,
        split_flag: SPLIT_FLAG_MAP[split_flag] || ts('k_14a2qfi'),
        parent_qr_code: parent_qr_code,
        warehouse_location: inventoryItem.warehouse_location,
        book_quantity: checkItem.system_qty,
        actual_quantity: actual_quantity,
        difference: difference,
        progress: stats.total_count > 0 ? Math.round((stats.checked_count / stats.total_count) * 100) : 0,
      },
      ts('k_p0ycon')
    );
  }
);
