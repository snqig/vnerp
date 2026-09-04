import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { successResponse, errorResponse, validateRequestBody } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { SampleOrderApplicationService } from '@/application/services/SampleOrderApplicationService';
import { MysqlSampleOrderRepository } from '@/infrastructure/repositories/MysqlSampleOrderRepository';
import { MysqlSampleFeedbackRepository } from '@/infrastructure/repositories/MysqlSampleFeedbackRepository';
import type { DbRow } from '@/types/db';

const service = new SampleOrderApplicationService(
  new MysqlSampleOrderRepository(),
  new MysqlSampleFeedbackRepository()
);

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
  const { searchParams } = new URL(request.url);
  const sampleOrderId = searchParams.get('sampleOrderId');

  if (!sampleOrderId) {
    return errorResponse(ts('k_iph5p1'), 400, 400);
  }

  try {
    const list = await service.getFeedbacks(parseInt(sampleOrderId));
    return successResponse(list.map((f) => f.toProps()));
  } catch (err: DbRow) {
    return errorResponse(err.message || ts('k_qoguk0'), 400, 400);
  }
});

export const POST = withPermission(
  async (request: NextRequest, userInfo: DbRow) => {
  const ts = await getTranslations('Common');
    const body = await request.json();

    const validation = validateRequestBody(body, ['sampleOrderId', 'round']);
    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
    }

    try {
      const id = await service.addFeedback({
        sampleOrderId: body.sampleOrderId,
        round: body.round,
        feedbackContent: body.feedbackContent,
        modificationRequirements: body.modificationRequirements,
        confirmationStatus: 'pending',
        feedbackBy: userInfo.id,
        feedbackTime: new Date().toISOString(),
      });
      return successResponse({ id }, ts('k_csurqa'));
    } catch (err: DbRow) {
      return errorResponse(err.message || ts('k_1q9u8le'), 400, 400);
    }
  },
  { logTitle: '添加打样反馈' }
);

export const PUT = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const { id, action } = body;

    if (!id || !action) {
      return errorResponse(ts('k_67fjay'), 400, 400);
    }

    try {
      if (action === 'approve') {
        await service.approveFeedback(id);
      } else if (action === 'reject') {
        await service.rejectFeedback(id);
      } else {
        return errorResponse(`不支持的操作: ${action}`, 400, 400);
      }
      return successResponse({ id, action }, ts('k_d209xt'));
    } catch (err: DbRow) {
      return errorResponse(err.message || ts('k_ydow7a'), 400, 400);
    }
  },
  { logTitle: '处理打样反馈' }
);

export const DELETE = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return errorResponse(ts('k_18ag2xz'), 400, 400);
    }

    const repo = new MysqlSampleFeedbackRepository();
    await repo.delete(parseInt(id));
    return successResponse(null, ts('k_1hlqs'));
  },
  { logTitle: '删除打样反馈' }
);
