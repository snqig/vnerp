/**
 * 1.7.1 EventBus.publish 全场景单元测试
 *
 * 覆盖目标：
 * 1. 单 handler 成功发布：publish 不抛错，handler 被调用
 * 2. 多 handler 部分失败：allSettled 全执行，抛第一个 Error 实例（保留 stack）
 * 3. 无 handler 时不抛错：空处理器静默返回
 * 4. 多 handler 全部失败：抛第一个错误（顺序保证）
 * 5. subscribe 后 handler 列表可查询（getHandlerCount）
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InMemoryEventBus, type EventHandler } from '@/infrastructure/event-bus/EventBus';
import type { DomainEvent } from '@/domain/shared/DomainTypes';

vi.mock('@/lib/logger', () => ({
  secureLog: vi.fn(),
}));

function makeEvent(eventType: string = 'test.event'): DomainEvent {
  return {
    eventType,
    aggregateType: 'TestAggregate',
    aggregateId: 1,
    occurredAt: new Date(),
  };
}

describe('1.7.1 EventBus.publish 全场景', () => {
  let bus: InMemoryEventBus;

  beforeEach(() => {
    bus = new InMemoryEventBus();
  });

  it('单 handler 成功时 publish 不抛错且 handler 被调用', async () => {
    const handler: EventHandler = { handle: vi.fn().mockResolvedValue(undefined) };
    bus.subscribe('test.success', handler);

    const event = makeEvent('test.success');
    await expect(bus.publish(event)).resolves.toBeUndefined();
    expect(handler.handle).toHaveBeenCalledTimes(1);
    expect(handler.handle).toHaveBeenCalledWith(event);
  });

  it('无 handler 时不抛错（静默返回）', async () => {
    const event = makeEvent('test.no.handler');
    await expect(bus.publish(event)).resolves.toBeUndefined();
  });

  it('多 handler 部分失败时 allSettled 全执行，抛第一个 Error 实例（保留 stack）', async () => {
    const successHandler: EventHandler = { handle: vi.fn().mockResolvedValue(undefined) };
    const error1 = new Error('First handler failed');
    const failingHandler1: EventHandler = { handle: vi.fn().mockRejectedValue(error1) };
    const error2 = new Error('Second handler failed');
    const failingHandler2: EventHandler = { handle: vi.fn().mockRejectedValue(error2) };

    bus.subscribe('test.partial', successHandler);
    bus.subscribe('test.partial', failingHandler1);
    bus.subscribe('test.partial', failingHandler2);

    const event = makeEvent('test.partial');
    await expect(bus.publish(event)).rejects.toThrow('First handler failed');

    // 关键：所有 handler 都被调用（allSettled 容错）
    expect(successHandler.handle).toHaveBeenCalledTimes(1);
    expect(failingHandler1.handle).toHaveBeenCalledTimes(1);
    expect(failingHandler2.handle).toHaveBeenCalledTimes(1);

    // 关键：抛出的是 Error 实例（保留 stack）
    try {
      await bus.publish(event);
    } catch (e) {
      expect(e).toBe(error1);
      expect(e).toBeInstanceOf(Error);
      expect((e as Error).message).toBe('First handler failed');
    }
  });

  it('多 handler 全部失败时抛第一个错误（按订阅顺序）', async () => {
    const error1 = new Error('First failure');
    const error2 = new Error('Second failure');
    const failingHandler1: EventHandler = { handle: vi.fn().mockRejectedValue(error1) };
    const failingHandler2: EventHandler = { handle: vi.fn().mockRejectedValue(error2) };

    bus.subscribe('test.all.fail', failingHandler1);
    bus.subscribe('test.all.fail', failingHandler2);

    await expect(bus.publish(makeEvent('test.all.fail'))).rejects.toBe(error1);
    expect(failingHandler1.handle).toHaveBeenCalledTimes(1);
    expect(failingHandler2.handle).toHaveBeenCalledTimes(1);
  });

  it('非 Error 类型的拒绝原因被包装为 Error', async () => {
    const stringReason = 'string reason for rejection';
    const failingHandler: EventHandler = { handle: vi.fn().mockRejectedValue(stringReason) };
    bus.subscribe('test.string.reason', failingHandler);

    await expect(bus.publish(makeEvent('test.string.reason'))).rejects.toThrow(
      /string reason for rejection/
    );
  });

  it('getHandlerCount 返回订阅的 handler 数量', () => {
    expect(bus.getHandlerCount('test.count')).toBe(0);

    bus.subscribe('test.count', { handle: vi.fn() });
    expect(bus.getHandlerCount('test.count')).toBe(1);

    bus.subscribe('test.count', { handle: vi.fn() });
    expect(bus.getHandlerCount('test.count')).toBe(2);
  });
});
