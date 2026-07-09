import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { SampleProcessCardService } from '@/application/services/SampleProcessCardService';

const service = new SampleProcessCardService();

export const POST = withPermission(
  async (
    request: NextRequest,
    userInfo: Loose,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params;
    try {
      const body = await request.json().catch(() => ({}));
      const result = await service.convertToFormalWorkOrder(
        Number(id),
        {
          planQty: body.planQty,
          planStartDate: body.planStartDate,
          planEndDate: body.planEndDate,
          priority: body.priority,
        },
        userInfo.userId
      );
      return successResponse(result, '正式生产工单已生成');
    } catch (e) {
      return errorResponse((e as Error).message, 400, 400);
    }
  },
  { logTitle: '转正式生产工单' }
);
