import { NextRequest } from 'next/server';
import { successResponse, commonErrors } from '@/lib/api-response';
import { SagaLogRepository, SagaStatus } from '@/infrastructure/repositories/SagaLogRepository';
import { withPermission } from '@/lib/api-permissions';

const sagaLogRepository = new SagaLogRepository();

export const GET = withPermission(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const sagaId = searchParams.get('sagaId');
    const sagaType = searchParams.get('sagaType');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    if (sagaId) {
      const saga = await sagaLogRepository.get(sagaId);
      if (!saga) {
        return commonErrors.notFound('Saga 记录不存在');
      }
      return successResponse(saga);
    }

    const results = await sagaLogRepository.findAll(sagaType || undefined, status as SagaStatus | undefined);

    const total = results.length;
    const paginatedResults = results.slice(
      (page - 1) * pageSize,
      page * pageSize
    );

    return successResponse({
      list: paginatedResults,
      total,
      page,
      pageSize,
    });
  },
  { errorMessage: '获取 Saga 日志失败' }
);

export const POST = withPermission(
  async (request: NextRequest) => {
    const body = await request.json();
    const { action, sagaId } = body;

    if (!action || !sagaId) {
      return commonErrors.badRequest('缺少必要参数');
    }

    if (action === 'retry') {
      const saga = await sagaLogRepository.get(sagaId);
      if (!saga) {
        return commonErrors.notFound('Saga 记录不存在');
      }

      if (saga.status !== 'failed') {
        return commonErrors.badRequest('只能重试失败的 Saga');
      }

      await sagaLogRepository.updateStatus(sagaId, 'pending');
      return successResponse({ message: 'Saga 已重置为待处理状态，将在下一次调度时重试' });
    }

    if (action === 'compensate') {
      const saga = await sagaLogRepository.get(sagaId);
      if (!saga) {
        return commonErrors.notFound('Saga 记录不存在');
      }

      if (saga.status === 'compensating' || saga.status === 'compensated') {
        return commonErrors.badRequest('Saga 已在补偿中或已补偿完成');
      }

      await sagaLogRepository.updateStatus(sagaId, 'compensating');
      return successResponse({ message: '补偿流程已触发' });
    }

    return commonErrors.badRequest('不支持的操作');
  },
  { errorMessage: 'Saga 操作失败' }
);