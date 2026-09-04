import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { successResponse, commonErrors } from '@/lib/api-response';
import { SagaLogRepository, SagaStatus } from '@/infrastructure/repositories/SagaLogRepository';
import { withPermission } from '@/lib/api-permissions';

const sagaLogRepository = new SagaLogRepository();

export const GET = withPermission(
  async (request: NextRequest) => {
  const ts = await getTranslations('Common');
    const { searchParams } = new URL(request.url);
    const sagaId = searchParams.get('sagaId');
    const sagaType = searchParams.get('sagaType');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    if (sagaId) {
      const saga = await sagaLogRepository.get(sagaId);
      if (!saga) {
        return commonErrors.notFound(ts('k_1zhkz7'));
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
  const ts = await getTranslations('Common');
    const body = await request.json();
    const { action, sagaId } = body;

    if (!action || !sagaId) {
      return commonErrors.badRequest(ts('k_fifqlw'));
    }

    if (action === 'retry') {
      const saga = await sagaLogRepository.get(sagaId);
      if (!saga) {
        return commonErrors.notFound(ts('k_1zhkz7'));
      }

      if (saga.status !== 'failed') {
        return commonErrors.badRequest(ts('k_k8ql74'));
      }

      await sagaLogRepository.updateStatus(sagaId, 'pending');
      return successResponse({ message: ts('k_t5ip7t') });
    }

    if (action === 'compensate') {
      const saga = await sagaLogRepository.get(sagaId);
      if (!saga) {
        return commonErrors.notFound(ts('k_1zhkz7'));
      }

      if (saga.status === 'compensating' || saga.status === 'compensated') {
        return commonErrors.badRequest(ts('k_1w4qig8'));
      }

      await sagaLogRepository.updateStatus(sagaId, 'compensating');
      return successResponse({ message: ts('k_929d3k') });
    }

    return commonErrors.badRequest(ts('k_12cy0bd'));
  },
  { errorMessage: 'Saga 操作失败' }
);