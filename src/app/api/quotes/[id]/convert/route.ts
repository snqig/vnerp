import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { SampleProcessCardService } from '@/application/services/SampleProcessCardService';
import { UserInfo } from '@/lib/auth';

/**
 * 报价单转销售订单（POST /api/quotes/[id]/convert）
 * 打通 sal_quote → sal_order 断头路（docs/Read.md #7）
 */
const service = new SampleProcessCardService();

export const POST = withPermission(
  async (
    request: NextRequest,
    userInfo: UserInfo,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params;
    try {
      const result = await service.convertQuoteToOrder(Number(id), userInfo.userId);
      return successResponse(result, `报价单已转为销售订单 ${result.orderNo}`);
    } catch (e) {
      return errorResponse((e as Error).message, 400, 400);
    }
  },
  { logTitle: '报价单转销售订单' }
);
