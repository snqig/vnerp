import { NextRequest } from 'next/server';
import { query, SqlValue } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

/**
 * 工序卡详情（dcprint/burdening 配墨配料页选中卡片时调用）
 * GET /api/dcprint/process-cards/detail?cardNo=GX2024xxxx
 * 返回卡片信息 + 该卡对应工单的产品标签（配料物料清单）
 */
export const GET = withPermission(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const cardNo = searchParams.get('cardNo');
    if (!cardNo) return errorResponse('缺少参数 cardNo', 400, 400);

    const cards = await query(
      `SELECT id, card_no, work_order_id, work_order_no, product_code, product_name,
              plan_qty, burdening_status, lock_status
       FROM prd_process_card
       WHERE card_no = ? AND deleted = 0
       LIMIT 1`,
      [cardNo] as SqlValue[]
    );
    const card = cards[0];
    if (!card) return errorResponse('工序卡不存在', 404, 404);

    const labels = await query(
      `SELECT label_no, material_code, material_name, quantity, unit, batch_no, status
       FROM prd_product_label
       WHERE work_order_id = ? AND deleted = 0
       ORDER BY id`,
      [card.work_order_id] as SqlValue[]
    );

    return successResponse({
      card: {
        id: card.id,
        cardNo: card.card_no,
        workOrderNo: card.work_order_no,
        productCode: card.product_code,
        productName: card.product_name,
        planQty: Number(card.plan_qty) || 0,
        burdeningStatus: card.burdening_status,
        lockStatus: card.lock_status,
      },
      materials: (labels as { label_no: string; material_name: string }[]).map((l) => ({
        labelNo: l.label_no,
        materialName: l.material_name,
      })),
    });
  },
  { errorMessage: '获取工序卡详情失败' }
);
