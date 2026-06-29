/**
 * 1.7.2 OutboxPoller 生命周期与并发防重入测试
 *
 * 覆盖目标：
 * 1. 处理成功 → markAsProcessed，processed+1
 * 2. 处理失败且 retry_count<3 → markAsFailed，retried+1
 * 3. 并发 poll 防重入：polling 标志保护，第二次 poll 立即返回 0
 * 4. start/stop 生命周期：isRunning 状态正确切换
 * 5. start 重复调用幂等：多次 start 不创建多个 timer
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InMemoryEventBus, type EventHandler } from '@/infrastructure/event-bus/EventBus';

const {
  mockMarkAsProcessed,
  mockMarkAsFailed,
  mockMarkAsDeadLetter,
  mockFetchPendingEvents,
  mockRegisterEventHandlers,
} = vi.hoisted(() => ({
  mockMarkAsProcessed: vi.fn(),
  mockMarkAsFailed: vi.fn(),
  mockMarkAsDeadLetter: vi.fn(),
  mockFetchPendingEvents: vi.fn(),
  mockRegisterEventHandlers: vi.fn(),
}));

vi.mock('@/infrastructure/event-bus/DomainEventOutbox', () => ({
  DomainEventOutbox: {
    fetchPendingEvents: mockFetchPendingEvents,
    markAsProcessed: mockMarkAsProcessed,
    markAsFailed: mockMarkAsFailed,
    markAsDeadLetter: mockMarkAsDeadLetter,
  },
}));

vi.mock('@/infrastructure/config/EventRegistry', () => ({
  registerEventHandlers: mockRegisterEventHandlers,
}));

vi.mock('@/lib/logger', () => ({
  secureLog: vi.fn(),
}));

import { OutboxPoller } from '@/infrastructure/event-bus/OutboxPoller';

function makeEventBus(eventType: string, handler: EventHandler): InMemoryEventBus {
  const bus = new InMemoryEventBus();
  bus.subscribe(eventType, handler);
  return bus;
}

function makePendingRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1,
    event_type: 'test.lifecycle',
    aggregate_type: 'TestAggregate',
    aggregate_id: 1,
    payload: JSON.stringify({ data: 'test' }),
    created_at: new Date(),
    retry_count: 0,
    ...overrides,
  };
}

describe('1.7.2 OutboxPoller 生命周期与并发防重入', () => {
  beforeEach(() => {
    mockMarkAsProcessed.mockReset();
    mockMarkAsFailed.mockReset();
    mockMarkAsDeadLetter.mockReset();
    mockFetchPendingEvents.mockReset();
    mockRegisterEventHandlers.mockReset();

    mockMarkAsProcessed.mockResolvedValue(undefined);
    mockMarkAsFailed.mockResolvedValue(undefined);
    mockMarkAsDeadLetter.mockResolvedValue(undefined);
    mockFetchPendingEvents.mockResolvedValue([]);

    OutboxPoller.stop();
  });

  afterEach(() => {
    OutboxPoller.stop();
  });

  it('处理成功 → markAsProcessed，processed=1', async () => {
    const successHandler: EventHandler = { handle: vi.fn().mockResolvedValue(undefined) };
    mockRegisterEventHandlers.mockReturnValue(makeEventBus('test.lifecycle', successHandler));
    mockFetchPendingEvents.mockResolvedValueOnce([makePendingRow()]);

    const result = await OutboxPoller.poll();

    expect(result.processed).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.retried).toBe(0);
    expect(mockMarkAsProcessed).toHaveBeenCalledWith(1);
    expect(mockMarkAsFailed).not.toHaveBeenCalled();
    expect(mockMarkAsDeadLetter).not.toHaveBeenCalled();
  });

  it('处理失败且 retry_count<3 → markAsFailed，retried=1', async () => {
    const failingHandler: EventHandler = {
      handle: vi.fn().mockRejectedValue(new Error('Handler failed')),
    };
    mockRegisterEventHandlers.mockReturnValue(makeEventBus('test.lifecycle', failingHandler));
    mockFetchPendingEvents.mockResolvedValueOnce([makePendingRow({ retry_count: 1 })]);

    const result = await OutboxPoller.poll();

    expect(result.retried).toBe(1);
    expect(result.processed).toBe(0);
    expect(result.failed).toBe(0);
    expect(mockMarkAsFailed).toHaveBeenCalledWith(1, 'Handler failed');
    expect(mockMarkAsProcessed).not.toHaveBeenCalled();
    expect(mockMarkAsDeadLetter).not.toHaveBeenCalled();
  });

  it('并发 poll 防重入：第二次 poll 立即返回 0', async () => {
    // 通过 fetchPendingEvents 阻塞第一次 poll
    let resolveFirst: (v: unknown[]) => void = () => {};
    const firstPending = new Promise<unknown[]>((r) => {
      resolveFirst = r;
    });
    mockFetchPendingEvents.mockReturnValueOnce(firstPending);
    mockRegisterEventHandlers.mockReturnValue(makeEventBus('test.lifecycle', { handle: vi.fn() }));

    // 启动第一次 poll（不 await）
    const firstPollPromise = OutboxPoller.poll();

    // 启动第二次 poll（应立即返回 0）
    const secondResult = await OutboxPoller.poll();
    expect(secondResult).toEqual({ processed: 0, failed: 0, retried: 0 });

    // 释放第一次 poll
    resolveFirst([]);
    await firstPollPromise;
  });

  it('start 后 isRunning 为 true，stop 后为 false', () => {
    expect(OutboxPoller.isRunning()).toBe(false);
    OutboxPoller.start();
    expect(OutboxPoller.isRunning()).toBe(true);
    OutboxPoller.stop();
    expect(OutboxPoller.isRunning()).toBe(false);
  });

  it('start 重复调用幂等：不创建多个 timer', () => {
    OutboxPoller.start();
    OutboxPoller.start();
    OutboxPoller.start();
    expect(OutboxPoller.isRunning()).toBe(true);
    // stop 一次即可停止（内部 pollTimer 只有一个）
    OutboxPoller.stop();
    expect(OutboxPoller.isRunning()).toBe(false);
  });
});
