import { getTranslations } from 'next-intl/server';

;
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

    if (action === 'dead-letters') {
      const deadLetters = await getDomainEventOutbox().fetchDeadLetterEvents(100);
      return successResponse({
        count: deadLetters.length,
        items: deadLetters.map((e: EventOutboxRecord) => ({
          id: e.id,
          eventType: e.eventType,
          aggregateType: e.aggregateType,
          aggregateId: e.aggregateId,
          retryCount: e.retryCount,
          errorMessage: e.errorMessage,
          createdAt: e.createdAt,
        })),
      });
    }

    return errorResponse('Unknown action. Use ?action=status or ?action=dead-letters', 400, 400);
  },
  { errorMessage: '操作失败' }
);

export const POST = withPermission(
  async (request: NextRequest) => {
  const ts = await getTranslations('Common');
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
      return successResponse({ running: true }, ts('k_1fcvaaf'));
    }

    if (action === 'stop') {
      OutboxPoller.stop();
      return successResponse({ running: false }, ts('k_1bu47ru'));
    }

    if (action === 'replay-dead-letter') {
      const id = Number(body.id);
      if (!Number.isInteger(id) || id <= 0) {
        return errorResponse('Invalid id for replay-dead-letter', 400, 400);
      }
      const replayed = await getDomainEventOutbox().replayDeadLetter(id);
      return successResponse(
        { replayed },
        replayed > 0 ? `死信事件 ${id} 已重放` : `事件 ${id} 不存在或非死信状态`
      );
    }

    if (action === 'replay-dead-letters') {
      const replayed = await getDomainEventOutbox().replayAllDeadLetters();
      return successResponse({ replayed }, `已重放 ${replayed} 条死信事件`);
    }

    return errorResponse('Unknown action. Use poll, start, stop, replay-dead-letter, or replay-dead-letters', 400, 400);
  },
  { errorMessage: '操作失败' }
);
