import { NextRequest } from 'next/server';
import {
  successResponse,
  errorResponse,
  commonErrors,
  validateRequestBody,
} from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { SampleOrderApplicationService } from '@/application/services/SampleOrderApplicationService';
import { MysqlSampleOrderRepository } from '@/infrastructure/repositories/MysqlSampleOrderRepository';
import { MysqlSampleFeedbackRepository } from '@/infrastructure/repositories/MysqlSampleFeedbackRepository';

const service = new SampleOrderApplicationService(
  new MysqlSampleOrderRepository(),
  new MysqlSampleFeedbackRepository()
);

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const sampleOrderId = searchParams.get('sampleOrderId');

  if (!sampleOrderId) {
    return errorResponse('打样单ID不能为空', 400, 400);
  }

  try {
    const list = await service.getFeedbacks(parseInt(sampleOrderId));
    return successResponse(list.map((f) => f.toProps()));
  } catch (err: Loose) {
    return errorResponse(err.message || '查询失败', 400, 400);
  }
});

export const POST = withPermission(
  async (request: NextRequest, userInfo: Loose) => {
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
      return successResponse({ id }, '反馈添加成功');
    } catch (err: Loose) {
      return errorResponse(err.message || '保存失败', 400, 400);
    }
  },
  { logTitle: '添加打样反馈' }
);

export const PUT = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body = await request.json();
    const { id, action } = body;

    if (!id || !action) {
      return errorResponse('缺少必填参数', 400, 400);
    }

    try {
      if (action === 'approve') {
        await service.approveFeedback(id);
      } else if (action === 'reject') {
        await service.rejectFeedback(id);
      } else {
        return errorResponse(`不支持的操作: ${action}`, 400, 400);
      }
      return successResponse({ id, action }, '操作成功');
    } catch (err: Loose) {
      return errorResponse(err.message || '操作失败', 400, 400);
    }
  },
  { logTitle: '处理打样反馈' }
);

export const DELETE = withPermission(
  async (request: NextRequest, _userInfo) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return errorResponse('反馈ID不能为空', 400, 400);
    }

    const repo = new MysqlSampleFeedbackRepository();
    await repo.delete(parseInt(id));
    return successResponse(null, '删除成功');
  },
  { logTitle: '删除打样反馈' }
);
