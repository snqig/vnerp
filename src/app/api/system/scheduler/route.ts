import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuthAndErrorHandler } from '@/lib/api-auth';
import { BatchExpiryScheduler } from '@/infrastructure/schedulers/BatchExpiryScheduler';
import { OutboxPoller } from '@/infrastructure/event-bus/OutboxPoller';

export const GET = withAuthAndErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const task = searchParams.get('task');

  if (task === 'batch-expiry') {
    const result = await BatchExpiryScheduler.markExpiredBatches();
    return successResponse(result, `批次过期检查完成: ${result.expiredBatches}个库存批次已标记过期, ${result.expiredInkOpenings}个油墨开罐已标记过期`);
  }

  if (task === 'outbox-poll') {
    const result = await OutboxPoller.poll();
    return successResponse(result, `Outbox轮询完成: 处理${result.processed}条`);
  }

  if (task === 'status') {
    return successResponse({
      outboxPollerRunning: OutboxPoller.isRunning(),
      tasks: ['batch-expiry', 'outbox-poll'],
    });
  }

  return errorResponse('Unknown task. Use task=batch-expiry, outbox-poll, or status', 400, 400);
}, { permission: 'system:scheduler:view' });

export const POST = withAuthAndErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const action = body.action;

  if (action === 'start-outbox-poller') {
    OutboxPoller.start();
    return successResponse({ running: true }, 'Outbox轮询服务已启动');
  }

  if (action === 'stop-outbox-poller') {
    OutboxPoller.stop();
    return successResponse({ running: false }, 'Outbox轮询服务已停止');
  }

  return errorResponse('Unknown action. Use start-outbox-poller or stop-outbox-poller', 400, 400);
}, { permission: 'system:scheduler:manage' });
