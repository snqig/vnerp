import { NextRequest } from 'next/server';
import { successResponse, errorResponse, withErrorHandler } from '@/lib/api-response';
import { withAuthAndErrorHandler } from '@/lib/api-auth';
import { OutboxPoller } from '@/infrastructure/event-bus/OutboxPoller';
import { DomainEventOutbox } from '@/infrastructure/event-bus/DomainEventOutbox';

export const GET = withAuthAndErrorHandler(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'status') {
      const pendingEvents = await DomainEventOutbox.fetchPendingEvents(10);
      return successResponse({
        pollerRunning: OutboxPoller.isRunning(),
        pendingCount: pendingEvents.length,
        samplePending: pendingEvents.slice(0, 5).map((e: any) => ({
          id: e.id,
          eventType: e.event_type,
          aggregateType: e.aggregate_type,
          aggregateId: e.aggregate_id,
          status: e.status,
          retryCount: e.retry_count,
          createdAt: e.created_at,
        })),
      });
    }

    return errorResponse('Unknown action. Use ?action=status', 400, 400);
  },
  { permission: 'system:outbox:view' }
);

export const POST = withAuthAndErrorHandler(
  async (request: NextRequest) => {
    const body = await request.json();
    const action = body.action;

    if (action === 'poll') {
      const result = await OutboxPoller.poll();
      return successResponse(
        result,
        `轮询完成: 处理${result.processed}条, 失败${result.failed}条, 待重试${result.retried}条`
      );
    }

    if (action === 'start') {
      OutboxPoller.start();
      return successResponse({ running: true }, 'Outbox轮询服务已启动');
    }

    if (action === 'stop') {
      OutboxPoller.stop();
      return successResponse({ running: false }, 'Outbox轮询服务已停止');
    }

    return errorResponse('Unknown action. Use poll, start, or stop', 400, 400);
  },
  { permission: 'system:outbox:manage' }
);
