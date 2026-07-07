import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
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

export const GET = withPermission(
  async (request: NextRequest, userInfo, context) => {
    const { work_order_id: workOrderIdStr } = await context.params;
    const workOrderId = parseInt(workOrderIdStr);

    if (isNaN(workOrderId)) {
      return errorResponse('无效的工单ID', 400, 400);
    }

    const cards = await query<StandardCard>(
      `SELECT sc.* FROM prd_standard_card sc
     LEFT JOIN prd_work_order wo ON wo.material_id = sc.material_id
     WHERE wo.id = ? AND sc.status = 3 AND sc.deleted = 0
     ORDER BY sc.type, sc.version DESC`,
      [workOrderId]
    );

    if (!cards || cards.length === 0) {
      return errorResponse('未找到该工单关联的标准卡', 404, 404);
    }

    return successResponse(cards);
  }
);
