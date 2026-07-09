import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { SampleProcessCardService } from '@/application/services/SampleProcessCardService';
import { sampleProcessCardSchema } from '@/lib/validators/sample-card.schema';

const service = new SampleProcessCardService();

export const GET = withPermission(
  async (
    _request: NextRequest,
    _userInfo: any,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params;
    const card = await service.getCardDetail(Number(id));
    if (!card) return errorResponse('工艺卡不存在', 404, 404);
    return successResponse(card);
  },
  { logTitle: '打样工艺卡详情' }
);

export const PUT = withPermission(
  async (request: NextRequest, userInfo: any, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const body = await request.json();
    const parsed = sampleProcessCardSchema.partial().safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
        400,
        400
      );
    }
    try {
      await service.updateCard(Number(id), parsed.data, userInfo.userId);
      return successResponse({ id }, '工艺卡更新成功');
    } catch (e: any) {
      return errorResponse(e.message, 400, 400);
    }
  },
  { logTitle: '更新打样工艺卡' }
);

export const DELETE = withPermission(
  async (
    _request: NextRequest,
    _userInfo: any,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params;
    try {
      await service.deleteCard(Number(id));
      return successResponse({ id }, '工艺卡已删除');
    } catch (e: any) {
      return errorResponse(e.message, 400, 400);
    }
  },
  { logTitle: '删除打样工艺卡' }
);
