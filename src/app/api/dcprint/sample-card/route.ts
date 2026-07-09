import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { SampleProcessCardService } from '@/application/services/SampleProcessCardService';
import { sampleProcessCardSchema } from '@/lib/validators/sample-card.schema';

const service = new SampleProcessCardService();

export const GET = withPermission(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || undefined;
    const status = searchParams.get('status') ? Number(searchParams.get('status')) : undefined;
    const customerId = searchParams.get('customerId')
      ? Number(searchParams.get('customerId'))
      : undefined;
    const page = Number(searchParams.get('page') || 1);
    const pageSize = Number(searchParams.get('pageSize') || 20);

    const result = await service.listCards({ keyword, status, customerId, page, pageSize });
    return successResponse(result);
  },
  { logTitle: '打样工艺卡列表' }
);

export const POST = withPermission(
  async (request: NextRequest, userInfo) => {
    const body = await request.json();
    const parsed = sampleProcessCardSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
        400,
        400
      );
    }
    try {
      const id = await service.createCard(parsed.data, userInfo.userId);
      return successResponse({ id }, '工艺卡创建成功');
    } catch (e) {
      return errorResponse((e as Error).message, 400, 400);
    }
  },
  { logTitle: '创建打样工艺卡' }
);
