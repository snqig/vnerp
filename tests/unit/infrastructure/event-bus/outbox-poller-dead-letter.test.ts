/**
 * 1.5 端到端验证：OutboxPoller 失败重试 + 死信标记全流程
 *
 * 测试目标：
 * 1. 验证 EventBus.publish 抛错后，OutboxPoller catch 分支被触发
 * 2. 验证 retry_count < 3 时调用 markAsFailed（1.4 指数退避）
 * 3. 验证 retry_count >= 3 时调用 markAsDeadLetter（1.5 死信标记）
 * 4. 验证完整错误栈（error.stack）传入 markAsDeadLetter
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InMemoryEventBus, type EventHandler } from '@/infrastructure/event-bus/EventBus';

// 使用 vi.hoisted 确保 mock 变量在 vi.mock 工厂执行时已初始化
const {
  mockMarkAsProcessed,
  mockMarkAsFailed,
  mockMarkAsDeadLetter,
  mockClaimPendingEvents,
  mockRegisterEventHandlers,
} = vi.hoisted(() => ({
  mockMarkAsProcessed: vi.fn(),
  mockMarkAsFailed: vi.fn(),
  mockMarkAsDeadLetter: vi.fn(),
  mockClaimPendingEvents: vi.fn(),
  mockRegisterEventHandlers: vi.fn(),
}));

vi.mock('@/infrastructure/event-bus/DomainEventOutboxFactory', () => ({
  getDomainEventOutbox: () => ({
    claimPendingEvents: mockClaimPendingEvents,
    markAsProcessed: mockMarkAsProcessed,
    markAsFailed: mockMarkAsFailed,
    markAsDeadLetter: mockMarkAsDeadLetter,
    reclaimStaleDispatching: vi.fn(async () => 0),
  }),
}));

vi.mock('@/application/EventRegistry', () => ({
  registerEventHandlers: mockRegisterEventHandlers,
}));

vi.mock('@/lib/logger', () => ({
  secureLog: vi.fn(),
}));

import { OutboxPoller } from '@/infrastructure/event-bus/OutboxPoller';

// 构造一个注册了指定 eventType+handler 的 EventBus
function makeEventBus(eventType: string, handler: EventHandler): InMemoryEventBus {
  const bus = new InMemoryEventBus();
  bus.subscribe(eventType, handler);
  return bus;
}

describe('1.5 端到端：OutboxPoller 失败重试 + 死信标记', () => {
  beforeEach(() => {
    mockMarkAsProcessed.mockReset();
    mockMarkAsFailed.mockReset();
    mockMarkAsDeadLetter.mockReset();
    mockClaimPendingEvents.mockReset();
    mockRegisterEventHandlers.mockReset();

    // 默认实现：返回空数组 + 异步 resolve
    mockMarkAsProcessed.mockResolvedValue(undefined);
    mockMarkAsFailed.mockResolvedValue(undefined);
    mockMarkAsDeadLetter.mockResolvedValue(undefined);
    mockClaimPendingEvents.mockResolvedValue([]);
  });

  it('retry_count 0→1→2→3 时依次触发 markAsFailed，retry_count=3 时触发 markAsDeadLetter', async () => {
    // 注册会失败的 handler
    const failingHandler: EventHandler = {
      handle: async () => {
        throw new Error('Handler execution failed: simulated database timeout');
      },
    };
    mockRegisterEventHandlers.mockReturnValue(makeEventBus('test.dead.letter', failingHandler));

    const eventBase = {
      id: 100,
      eventType: 'test.dead.letter',
      aggregateType: 'TestAggregate',
      aggregateId: 1,
      payload: JSON.stringify({ data: 'test' }),
      createdAt: new Date(),
    };

    mockClaimPendingEvents
      .mockResolvedValueOnce([{ ...eventBase, retryCount: 0 }])
      .mockResolvedValueOnce([{ ...eventBase, retryCount: 1 }])
      .mockResolvedValueOnce([{ ...eventBase, retryCount: 2 }])
      .mockResolvedValueOnce([{ ...eventBase, retryCount: 3 }]);

    // 第 1 次 poll：retry_count=0 → markAsFailed
    const r1 = await OutboxPoller.poll();
    expect(r1.retried).toBe(1);
    expect(r1.failed).toBe(0);
    expect(mockMarkAsFailed).toHaveBeenCalledTimes(1);
    expect(mockMarkAsFailed).toHaveBeenCalledWith(100, expect.any(String));
    expect(mockMarkAsDeadLetter).not.toHaveBeenCalled();

    // 第 2 次 poll：retry_count=1 → markAsFailed
    const r2 = await OutboxPoller.poll();
    expect(r2.retried).toBe(1);
    expect(mockMarkAsFailed).toHaveBeenCalledTimes(2);
    expect(mockMarkAsDeadLetter).not.toHaveBeenCalled();

    // 第 3 次 poll：retry_count=2 → markAsFailed
    const r3 = await OutboxPoller.poll();
    expect(r3.retried).toBe(1);
    expect(mockMarkAsFailed).toHaveBeenCalledTimes(3);
    expect(mockMarkAsDeadLetter).not.toHaveBeenCalled();

    // 第 4 次 poll：retry_count=3 → markAsDeadLetter（关键验证点）
    const r4 = await OutboxPoller.poll();
    expect(r4.failed).toBe(1);
    expect(r4.retried).toBe(0);
    expect(mockMarkAsDeadLetter).toHaveBeenCalledTimes(1);
    expect(mockMarkAsFailed).toHaveBeenCalledTimes(3); // 不再增加

    // 验证 markAsDeadLetter 收到完整错误栈（包含 'at '）
    const deadLetterCall = mockMarkAsDeadLetter.mock.calls[0];
    expect(deadLetterCall[0]).toBe(100); // eventId
    const errorStack: string = deadLetterCall[1];
    expect(typeof errorStack).toBe('string');
    expect(errorStack.length).toBeGreaterThan(0);
    expect(errorStack).toContain('Handler execution failed: simulated database timeout');
    // 完整错误栈应包含 'at '（Node.js Error.stack 特征）
    expect(errorStack).toContain('at ');

    // 验证 markAsProcessed 从未被调用（所有事件都失败了）
    expect(mockMarkAsProcessed).not.toHaveBeenCalled();
  });

  it('handler 成功时调用 markAsProcessed', async () => {
    const successHandler: EventHandler = {
      handle: async () => {
        // 成功，不抛错
      },
    };
    mockRegisterEventHandlers.mockReturnValue(makeEventBus('test.success', successHandler));

    mockClaimPendingEvents.mockResolvedValueOnce([
      {
        id: 200,
        eventType: 'test.success',
        aggregateType: 'TestAggregate',
        aggregateId: 2,
        payload: JSON.stringify({ data: 'ok' }),
        createdAt: new Date(),
        retryCount: 0,
      },
    ]);

    const r = await OutboxPoller.poll();
    expect(r.processed).toBe(1);
    expect(r.failed).toBe(0);
    expect(r.retried).toBe(0);
    expect(mockMarkAsProcessed).toHaveBeenCalledTimes(1);
    expect(mockMarkAsProcessed).toHaveBeenCalledWith(200);
    expect(mockMarkAsFailed).not.toHaveBeenCalled();
    expect(mockMarkAsDeadLetter).not.toHaveBeenCalled();
  });
});
