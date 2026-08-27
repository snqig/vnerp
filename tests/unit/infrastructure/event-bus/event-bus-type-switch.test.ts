/**
 * 1.6 TDD 测试：EVENT_BUS_TYPE 切换 + OutboxPoller 自动启动
 *
 * 测试目标（实施前应全部 FAIL，实施后应全部 PASS）：
 * 1. EVENT_BUS_TYPE=memory 时 getDomainEventOutbox() 返回 MemoryDomainEventOutbox 实例
 * 2. EVENT_BUS_TYPE=db 时 getDomainEventOutbox() 返回 DbDomainEventOutbox 实例
 * 3. 默认值（未设置）为 memory 模式
 * 4. MemoryDomainEventOutbox.saveEvents 不写库（no-op）
 * 5. MemoryDomainEventOutbox.fetchPendingEvents 返回 []
 * 6. MemoryDomainEventOutbox.markAsProcessed/markAsFailed/markAsDeadLetter 均 no-op
 * 7. AppInitializer 在 db 模式下自动启动 OutboxPoller
 * 8. AppInitializer 在 memory 模式下不启动 OutboxPoller
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock OutboxPoller（跟踪 start/stop 调用）
const { mockOutboxPollerStart, mockOutboxPollerStop, mockOutboxPollerIsRunning } = vi.hoisted(() => ({
  mockOutboxPollerStart: vi.fn(),
  mockOutboxPollerStop: vi.fn(),
  mockOutboxPollerIsRunning: vi.fn().mockReturnValue(false),
}));

vi.mock('@/infrastructure/event-bus/OutboxPoller', () => ({
  OutboxPoller: {
    start: mockOutboxPollerStart,
    stop: mockOutboxPollerStop,
    isRunning: mockOutboxPollerIsRunning,
    poll: vi.fn().mockResolvedValue({ processed: 0, failed: 0, retried: 0 }),
  },
}));

// Mock EventRegistry（避免真实事件订阅耗时）
vi.mock('@/application/EventRegistry', () => ({
  EventRegistry: {
    initialize: vi.fn(),
  },
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  secureLog: vi.fn(),
}));

// Mock db 模块，避免触发实际 mysql2 连接池创建（drizzle 实例化需要环境变量）
vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  execute: vi.fn(),
  transaction: vi.fn(),
  getPool: vi.fn(() => ({})),
}));

import {
  getDomainEventOutbox,
  MemoryDomainEventOutbox,
  DbDomainEventOutbox,
  __resetOutboxFactoryForTest,
} from '@/infrastructure/event-bus/DomainEventOutboxFactory';
import type { IDomainEventOutboxRepository } from '@/infrastructure/event-bus/types/IDomainEventOutboxRepository';

describe('1.6 EVENT_BUS_TYPE 切换工厂', () => {
  const originalEnv = process.env.EVENT_BUS_TYPE;

  beforeEach(() => {
    __resetOutboxFactoryForTest();
  });

  afterEach(() => {
    __resetOutboxFactoryForTest();
    if (originalEnv === undefined) {
      delete process.env.EVENT_BUS_TYPE;
    } else {
      process.env.EVENT_BUS_TYPE = originalEnv;
    }
  });

  it('EVENT_BUS_TYPE=memory 时返回 MemoryDomainEventOutbox 实例', () => {
    process.env.EVENT_BUS_TYPE = 'memory';
    const outbox = getDomainEventOutbox();
    expect(outbox).toBeInstanceOf(MemoryDomainEventOutbox);
  });

  it('EVENT_BUS_TYPE=db 时返回 DbDomainEventOutbox 实例', () => {
    process.env.EVENT_BUS_TYPE = 'db';
    const outbox = getDomainEventOutbox();
    expect(outbox).toBeInstanceOf(DbDomainEventOutbox);
  });

  it('未设置 EVENT_BUS_TYPE 时默认为 memory 模式（向后兼容）', () => {
    delete process.env.EVENT_BUS_TYPE;
    const outbox = getDomainEventOutbox();
    expect(outbox).toBeInstanceOf(MemoryDomainEventOutbox);
  });

  it('EVENT_BUS_TYPE=invalid 时降级为 memory 模式', () => {
    process.env.EVENT_BUS_TYPE = 'invalid';
    const outbox = getDomainEventOutbox();
    expect(outbox).toBeInstanceOf(MemoryDomainEventOutbox);
  });
});

describe('1.6 MemoryDomainEventOutbox 行为（no-op）', () => {
  let outbox: IDomainEventOutboxRepository;

  beforeEach(() => {
    __resetOutboxFactoryForTest();
    process.env.EVENT_BUS_TYPE = 'memory';
    outbox = getDomainEventOutbox();
  });

  it('saveEvents 不抛错且不写库（no-op）', async () => {
    const fakeConn = { execute: vi.fn() };
    const fakeEvents = [{ eventType: 'test', aggregateType: 'Test', aggregateId: 1, occurredAt: new Date() }];
    await expect(outbox.saveEvents(fakeConn as any, 'TestAggregate', 1, fakeEvents as any)).resolves.toBeUndefined();
    expect(fakeConn.execute).not.toHaveBeenCalled();
  });

  it('fetchPendingEvents 返回空数组', async () => {
    const events = await outbox.fetchPendingEvents(50);
    expect(events).toEqual([]);
  });

  it('markAsProcessed 不抛错（no-op）', async () => {
    await expect(outbox.markAsProcessed(1)).resolves.toBeUndefined();
  });

  it('markAsFailed 不抛错（no-op）', async () => {
    await expect(outbox.markAsFailed(1, 'test error')).resolves.toBeUndefined();
  });

  it('markAsDeadLetter 不抛错（no-op）', async () => {
    await expect(outbox.markAsDeadLetter(1, 'test error stack')).resolves.toBeUndefined();
  });

  it('markForRetry 不抛错（no-op）', async () => {
    await expect(outbox.markForRetry(0)).resolves.toBeUndefined();
    await expect(outbox.markForRetry(1)).resolves.toBeUndefined();
  });

  it('reclaimStaleDispatching 返回 0（no-op）', async () => {
    await expect(outbox.reclaimStaleDispatching(10)).resolves.toBe(0);
  });
});

describe('1.6 OutboxPoller 自动启动（AppInitializer）', () => {
  const originalEnv = process.env.EVENT_BUS_TYPE;

  beforeEach(() => {
    // 重置模块缓存，使 AppInitializer 的 initialized 标志重新初始化
    vi.resetModules();
    mockOutboxPollerStart.mockClear();
    mockOutboxPollerStop.mockClear();
    mockOutboxPollerIsRunning.mockReturnValue(false);
  });

  afterEach(() => {
    vi.resetModules();
    if (originalEnv === undefined) {
      delete process.env.EVENT_BUS_TYPE;
    } else {
      process.env.EVENT_BUS_TYPE = originalEnv;
    }
  });

  it('EVENT_BUS_TYPE=db 时 AppInitializer 自动启动 OutboxPoller', async () => {
    process.env.EVENT_BUS_TYPE = 'db';
    mockOutboxPollerIsRunning.mockReturnValue(false);

    const { initializeApplication } = await import('@/application/AppInitializer');
    initializeApplication();

    expect(mockOutboxPollerStart).toHaveBeenCalledTimes(1);
  });

  it('EVENT_BUS_TYPE=memory 时 AppInitializer 不启动 OutboxPoller', async () => {
    process.env.EVENT_BUS_TYPE = 'memory';
    mockOutboxPollerStart.mockClear();

    const { initializeApplication } = await import('@/application/AppInitializer');
    initializeApplication();

    expect(mockOutboxPollerStart).not.toHaveBeenCalled();
  });
});
