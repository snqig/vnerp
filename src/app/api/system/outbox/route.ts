import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { OutboxPoller } from '@/infrastructure/event-bus/OutboxPoller';
import { getDomainEventOutbox, getEventBusType } from '@/infrastructure/event-bus/DomainEventOutboxFactory';
import type { EventOutboxRecord } from '@/infrastructure/event-bus/types/IDomainEventOutboxRepository';

export const GET = withPermission(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'status') {
      const eventBusType = getEventBusType();
      const pendingEvents = await getDomainEventOutbox().fetchPendingEvents(10);
      return successResponse({
        eventBusType,
        pollerRunning: OutboxPoller.isRunning(),
        pendingCount: pendingEvents.length,
        samplePending: pendingEvents.slice(0, 5).map((e: EventOutboxRecord) => ({
          id: e.id,
          eventType: e.eventType,
          aggregateType: e.aggregateType,
          aggregateId: e.aggregateId,
          status: e.status,
          retryCount: e.retryCount,
          createdAt: e.createdAt,
        })),
      });
    }

    return errorResponse('Unknown action. Use ?action=status', 400, 400);
  },
  { errorMessage: '操作失败' }
);

export const POST = withPermission(
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
  { errorMessage: '操作失败' }
);
