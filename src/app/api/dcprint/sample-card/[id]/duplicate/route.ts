import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { SampleProcessCardService } from '@/application/services/SampleProcessCardService';

const service = new SampleProcessCardService();

export const POST = withPermission(
  async (_request: NextRequest, userInfo: any, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    try {
      const newCardId = await service.duplicateVersion(Number(id), userInfo.userId);
      return successResponse({ id: newCardId }, '新版本已创建');
    } catch (e: any) {
      return errorResponse(e.message, 400, 400);
    }
  },
  { logTitle: '复制打样工艺卡版本' }
);
