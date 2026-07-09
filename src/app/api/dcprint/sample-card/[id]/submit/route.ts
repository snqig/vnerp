import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { SampleProcessCardService } from '@/application/services/SampleProcessCardService';

const service = new SampleProcessCardService();

export const POST = withPermission(
  async (_request: NextRequest, userInfo: any, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    try {
      const result = await service.submitCard(Number(id), userInfo.userId);
      return successResponse(result, '工艺卡已提交，打样工单已生成');
    } catch (e: any) {
      return errorResponse(e.message, 400, 400);
    }
  },
  { logTitle: '提交打样工艺卡' }
);
