/**
 * 1.7.3 Outbox 重启恢复场景测试
 *
 * 验证目标：进程重启后，遗留的 pending 事件能被首次 poll 正确消费
 *
 * 场景描述：
 * 1. 进程崩溃前有 3 个 pending 事件（含 1 个 retry_count=2 的失败重试事件）
 * 2. 进程重启后 OutboxPoller.poll() 首次执行
 * 3. fetchPendingEvents 返回所有 pending 事件（包括 next_execute_at 已到期的重试事件）
 * 4. 全部事件被处理：2 个成功 + 1 个失败重试
 *
 * 关键点：
 * - 重启后 polling 标志应为 false（进程级内存丢失）
 * - fetchPendingEvents 通过 next_execute_at 过滤已到期的重试事件
 * - 不需要 markForRetry(0) 批量重置（1.4 已移除，依赖自然到期）
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InMemoryEventBus, type EventHandler } from '@/infrastructure/event-bus/EventBus';

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

describe('1.7.3 Outbox 重启恢复场景', () => {
  beforeEach(() => {
    mockMarkAsProcessed.mockReset();
    mockMarkAsFailed.mockReset();
    mockMarkAsDeadLetter.mockReset();
    mockClaimPendingEvents.mockReset();
    mockRegisterEventHandlers.mockReset();

    mockMarkAsProcessed.mockResolvedValue(undefined);
    mockMarkAsFailed.mockResolvedValue(undefined);
    mockMarkAsDeadLetter.mockResolvedValue(undefined);

    OutboxPoller.stop();
  });

  it('进程重启后首次 poll 消费所有遗留 pending 事件（2 成功 + 1 重试失败）', async () => {
    // 构造 EventBus：'restart.success' 成功，'restart.retry' 失败
    const bus = new InMemoryEventBus();
    bus.subscribe('restart.success', { handle: vi.fn().mockResolvedValue(undefined) });
    bus.subscribe('restart.retry', {
      handle: vi.fn().mockRejectedValue(new Error('Still failing after restart')),
    });
    mockRegisterEventHandlers.mockReturnValue(bus);

    // 模拟进程崩溃前遗留的 3 个 pending 事件
    // - 2 个新事件（retry_count=0，next_execute_at=NULL）
    // - 1 个失败重试事件（retry_count=2，next_execute_at 已到期）
    const pendingRows = [
      {
        id: 1001,
        eventType: 'restart.success',
        aggregateType: 'SalesOrder',
        aggregateId: 10,
        payload: JSON.stringify({ eventType: 'restart.success' }),
        createdAt: new Date('2026-06-29T10:00:00Z'),
        retryCount: 0,
      },
      {
        id: 1002,
        eventType: 'restart.success',
        aggregateType: 'SalesOrder',
        aggregateId: 11,
        payload: JSON.stringify({ eventType: 'restart.success' }),
        createdAt: new Date('2026-06-29T10:00:01Z'),
        retryCount: 0,
      },
      {
        id: 1003,
        eventType: 'restart.retry',
        aggregateType: 'SalesOrder',
        aggregateId: 12,
        payload: JSON.stringify({ eventType: 'restart.retry' }),
        createdAt: new Date('2026-06-29T09:50:00Z'),
        retryCount: 2, // 已重试 2 次，本次失败后应触发 markAsFailed（retry_count=3，下次 poll 触发死信）
      },
    ];

    mockClaimPendingEvents.mockResolvedValueOnce(pendingRows);

    // 模拟进程重启后首次 poll
    const result = await OutboxPoller.poll();

    // 验证：2 个成功 + 1 个重试失败
    expect(result.processed).toBe(2);
    expect(result.retried).toBe(1);
    expect(result.failed).toBe(0);

    // 2 个成功事件调用 markAsProcessed
    expect(mockMarkAsProcessed).toHaveBeenCalledTimes(2);
    expect(mockMarkAsProcessed).toHaveBeenCalledWith(1001);
    expect(mockMarkAsProcessed).toHaveBeenCalledWith(1002);

    // 1 个失败事件调用 markAsFailed（retry_count=2 < 3，未触发死信）
    expect(mockMarkAsFailed).toHaveBeenCalledTimes(1);
    expect(mockMarkAsFailed).toHaveBeenCalledWith(1003, 'Still failing after restart');

    // 未触发死信
    expect(mockMarkAsDeadLetter).not.toHaveBeenCalled();
  });

  it('重启后遗留 retry_count=3 的失败事件 → 首次 poll 触发死信', async () => {
    const bus = new InMemoryEventBus();
    bus.subscribe('restart.dead', {
      handle: vi.fn().mockRejectedValue(new Error('Permanent failure')),
    });
    mockRegisterEventHandlers.mockReturnValue(bus);

    mockClaimPendingEvents.mockResolvedValueOnce([
      {
        id: 2001,
        eventType: 'restart.dead',
        aggregateType: 'SalesOrder',
        aggregateId: 20,
        payload: JSON.stringify({ eventType: 'restart.dead' }),
        createdAt: new Date('2026-06-29T09:00:00Z'),
        retryCount: 3, // 已达上限，本次失败应直接死信
      },
    ]);

    const result = await OutboxPoller.poll();

    expect(result.failed).toBe(1);
    expect(result.processed).toBe(0);
    expect(result.retried).toBe(0);
    expect(mockMarkAsDeadLetter).toHaveBeenCalledTimes(1);
    expect(mockMarkAsDeadLetter).toHaveBeenCalledWith(2001, expect.stringContaining('Permanent failure'));
    expect(mockMarkAsFailed).not.toHaveBeenCalled();
    expect(mockMarkAsProcessed).not.toHaveBeenCalled();
  });

  it('重启后无遗留事件 → poll 返回空结果', async () => {
    mockRegisterEventHandlers.mockReturnValue(new InMemoryEventBus());
    mockClaimPendingEvents.mockResolvedValueOnce([]);

    const result = await OutboxPoller.poll();

    expect(result).toEqual({ processed: 0, failed: 0, retried: 0 });
    expect(mockMarkAsProcessed).not.toHaveBeenCalled();
    expect(mockMarkAsFailed).not.toHaveBeenCalled();
    expect(mockMarkAsDeadLetter).not.toHaveBeenCalled();
  });
});
