import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  withErrorHandler,
} from '@/lib/api-response';
import { StandardCard } from '../route';

// GET /api/standard-cards/by-work-order/[work_order_id] - 获取工单标准卡（设计文档 6.2 节）
export const GET = withErrorHandler(async (request: NextRequest, { params }: { params: Promise<{ work_order_id: string }> }) => {
  const resolvedParams = await params;
  const workOrderId = parseInt(resolvedParams.work_order_id);

  if (isNaN(workOrderId)) {
    return errorResponse('无效的工单ID', 400, 400);
  }

  // 查询工单关联的所有标准卡
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
}, '获取工单标准卡失败');
