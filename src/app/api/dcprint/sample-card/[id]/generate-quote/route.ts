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
      const result = await service.generateQuote(
        Number(id),
        {
          markupRate: body.markupRate,
          quantity: body.quantity,
          validUntil: body.validUntil,
          remark: body.remark,
        },
        userInfo.userId
      );
      return successResponse(result, '报价单已生成');
    } catch (e) {
      return errorResponse((e as Error).message, 400, 400);
    }
  },
  { logTitle: '生成报价单' }
);
