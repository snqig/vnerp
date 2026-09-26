import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

type StandardCardType = 'color' | 'process' | 'quality' | 'comprehensive';

interface StandardCard {
  id?: number;
  card_no: string;
  name: string;
  type: StandardCardType;
  version: string;
  material_id?: number;
  status: number;
  effective_date?: string;
  expiry_date?: string;
  create_user?: number;
  audit_user?: number;
  remark?: string;
  customer_name?: string;
  customer_code?: string;
  product_name?: string;
  create_time?: string;
  update_time?: string;
}

export const GET = withPermission(async (request: NextRequest, userInfo, context) => {
  const ts = await getTranslations('Common');
  const { work_order_id: workOrderIdStr } = await context.params;
  const workOrderId = parseInt(workOrderIdStr);

  if (isNaN(workOrderId)) {
    return errorResponse(ts('k_1amaan4'), 400, 400);
  }

  const cards = await query<StandardCard>(
    // 修复：prod_work_order 上没有 material_id 列（物料号在 legacy_material_id 上），
    // 原 JOIN 条件运行期必然报 Unknown column。同一物料的标准卡直接按 material_id 关联。
    `SELECT sc.* FROM prd_standard_card sc
     LEFT JOIN prod_work_order wo ON wo.legacy_material_id = sc.material_id
     WHERE wo.id = ? AND sc.status = 3 AND sc.deleted = 0
     ORDER BY sc.type, sc.version DESC`,
    [workOrderId]
  );

  if (!cards || cards.length === 0) {
    return errorResponse(ts('k_1qtyayv'), 404, 404);
  }

  return successResponse(cards);
});
