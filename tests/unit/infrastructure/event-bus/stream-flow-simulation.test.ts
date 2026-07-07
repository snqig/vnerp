/**
 * 模拟消息场景测试：验证 OutboxPoller + StreamConsumer + IdempotentHandler 的日志输出与行为
 *
 * 测试场景：
 * 1. StreamPublisher XADD 成功/失败日志
 * 2. IdempotentHandler mark-before-execute 设计缺陷验证
 * 3. XAUTOCLAIM 重投递后 IdempotentHandler 未拦截的原因分析
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted 确保 mock 变量在 vi.mock 工厂中可用（vi.mock 会被提升到文件顶部）
const mocks = vi.hoisted(() => {
  const logCalls: Array<{ level: string; message: string; meta?: unknown }> = [];
  const redisMock = {
    xadd: vi.fn(),
    xreadgroup: vi.fn(),
    xack: vi.fn(),
    xgroup: vi.fn(),
    xautoclaim: vi.fn(),
    ping: vi.fn(async () => 'PONG'),
  };
  const mockCheckAndMark = vi.fn(async (): Promise<boolean> => true);
  const mockMarkAsProcessed = vi.fn(async (): Promise<void> => undefined);
  const mockDeleteMark = vi.fn(async (): Promise<void> => undefined);
  const mockExecute = vi.fn(async () => ({ affectedRows: 1, insertId: 1 }));
  return { logCalls, redisMock, mockCheckAndMark, mockMarkAsProcessed, mockDeleteMark, mockExecute };
});

vi.mock('@/lib/logger', () => ({
  secureLog: vi.fn((level: string, message: string, meta?: unknown) => {
    mocks.logCalls.push({ level, message, meta });
  }),
}));

vi.mock('@/lib/db', () => ({
  execute: mocks.mockExecute,
  query: vi.fn(async () => [{ count: 0 }]),
  queryOne: vi.fn(async () => null),
}));

vi.mock('@/infrastructure/cache/CacheManager', () => ({
  getCacheManager: () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    deletePattern: vi.fn(),
  }),
  getRedisClientIfAvailable: () => mocks.redisMock,
}));

vi.mock('@/infrastructure/event-bus/IdempotencyGuard', () => ({
  IdempotencyGuard: {
    checkAndMark: mocks.mockCheckAndMark,
    markAsProcessed: mocks.mockMarkAsProcessed,
    deleteMark: mocks.mockDeleteMark,
    reclaimStaleProcessing: vi.fn(async () => 0),
    cleanupOlderThan: vi.fn(async () => 0),
  },
}));

import { StreamPublisher } from '@/infrastructure/event-bus/StreamPublisher';
import { IdempotentHandler } from '@/infrastructure/event-bus/IdempotentHandler';
import type { EventHandler } from '@/infrastructure/event-bus/EventBus';

const { logCalls, redisMock, mockCheckAndMark, mockMarkAsProcessed, mockDeleteMark, mockExecute } = mocks;

function getLogs(pattern: string) {
  return logCalls.filter((l) => l.message.includes(pattern));
}

function clearLogs() {
  logCalls.length = 0;
}

describe('Stream 流程模拟测试', () => {
  beforeEach(() => {
    clearLogs();
    vi.clearAllMocks();
    redisMock.xadd.mockResolvedValue('1-0');
    redisMock.xack.mockResolvedValue(1);
    redisMock.xgroup.mockResolvedValue('OK');
    redisMock.xreadgroup.mockResolvedValue(null);
    redisMock.xautoclaim.mockResolvedValue(['0', []]);
    mockExecute.mockResolvedValue({ affectedRows: 1, insertId: 1 });
    mockCheckAndMark.mockResolvedValue(true);
    mockMarkAsProcessed.mockResolvedValue(undefined);
    mockDeleteMark.mockResolvedValue(undefined);
  });

  describe('场景 1：StreamPublisher XADD 日志', () => {
    it('XADD 成功：输出 debug 日志，含 eventId 和 streamMessageId', async () => {
      const publisher = new StreamPublisher(redisMock as any);

      const messageId = await publisher.publish({
        id: 42,
        eventType: 'sales.approved',
        aggregateType: 'SalesOrder',
        aggregateId: 100,
        occurredAt: new Date('2026-07-02T10:00:00Z'),
        payload: JSON.stringify({ orderNo: 'SO-001' }),
      });

      expect(messageId).toBe('1-0');
      expect(redisMock.xadd).toHaveBeenCalledTimes(1);

      const xaddLogs = getLogs('XADD success');
      expect(xaddLogs).toHaveLength(1);
      expect(xaddLogs[0].level).toBe('debug');
      expect(xaddLogs[0].meta).toMatchObject({
        eventId: 42,
        streamMessageId: '1-0',
        eventType: 'sales.approved',
      });
    });

    it('XADD 失败：输出 error 日志并抛出异常', async () => {
      redisMock.xadd.mockRejectedValue(new Error('Redis connection lost'));
      const publisher = new StreamPublisher(redisMock as any);

      await expect(
        publisher.publish({
          id: 99,
          eventType: 'purchase.received',
          occurredAt: new Date(),
          payload: '{}',
        })
      ).rejects.toThrow('Redis connection lost');

      const failLogs = getLogs('XADD failed');
      expect(failLogs).toHaveLength(1);
      expect(failLogs[0].level).toBe('error');
      expect(failLogs[0].meta).toMatchObject({ eventId: 99 });
    });
  });

  describe('场景 2：IdempotentHandler mark-before-execute + delete-on-failure 修复验证', () => {
    it('修复验证：handler 首次失败 → deleteMark 删除记录 → 重试时 handler 再次执行', async () => {
      let attemptCount = 0;
      const flakyHandler: EventHandler = {
        handle: vi.fn(async () => {
          attemptCount++;
          if (attemptCount === 1) throw new Error('DB timeout');
          // 第二次成功
        }),
      };

      const wrapped = new IdempotentHandler(flakyHandler, 'FlakyHandler');

      // 第一次：handler 失败
      await expect(wrapped.handle({ id: 77, eventType: 'test' } as any)).rejects.toThrow(
        'DB timeout'
      );
      expect(flakyHandler.handle).toHaveBeenCalledTimes(1);
      expect(mockCheckAndMark).toHaveBeenCalledWith(77, 'FlakyHandler');
      // deleteMark 应被调用（删除预占位，允许重试）
      expect(mockDeleteMark).toHaveBeenCalledWith(77, 'FlakyHandler');

      // 模拟重试：deleteMark 已删除记录 → checkAndMark 再次返回 true
      mockCheckAndMark.mockResolvedValue(true);

      // 第二次执行（XAUTOCLAIM 重投递）：handler 再次执行并成功
      await wrapped.handle({ id: 77, eventType: 'test' } as any);

      expect(flakyHandler.handle).toHaveBeenCalledTimes(2);
      expect(mockCheckAndMark).toHaveBeenCalledTimes(2);
      expect(mockDeleteMark).toHaveBeenCalledTimes(1); // 只在第一次失败时调用

      // 验证日志：失败时输出 warn，成功时输出 debug
      const failLogs = getLogs('deleting mark for retry');
      expect(failLogs).toHaveLength(1);
      const skipLogs = getLogs('skipping duplicate event');
      expect(skipLogs).toHaveLength(0); // 不应有跳过 — 重试成功了
    });

    it('重复事件跳过：handler 成功后，重投递时 IdempotentHandler 正确跳过', async () => {
      const handler: EventHandler = { handle: vi.fn().mockResolvedValue(undefined) };
      const wrapped = new IdempotentHandler(handler, 'SuccessHandler');

      // 第一次：成功
      await wrapped.handle({ id: 88, eventType: 'test' } as any);
      expect(handler.handle).toHaveBeenCalledTimes(1);
      expect(mockDeleteMark).not.toHaveBeenCalled(); // 成功不删除

      // 模拟重投递：checkAndMark 返回 false（已成功处理过）
      mockCheckAndMark.mockResolvedValue(false);

      // 第二次（XAUTOCLAIM 重投递）：handler 被跳过
      await wrapped.handle({ id: 88, eventType: 'test' } as any);
      expect(handler.handle).toHaveBeenCalledTimes(1); // 没有再次执行
      expect(mockDeleteMark).not.toHaveBeenCalled();

      // 验证跳过日志
      const skipLogs = getLogs('skipping duplicate event');
      expect(skipLogs).toHaveLength(1);
      expect(skipLogs[0].meta).toMatchObject({ eventId: 88, handlerName: 'SuccessHandler' });
    });
  });

  describe('场景 3：XAUTOCLAIM 重投递后 IdempotentHandler 未拦截的原因', () => {
    it('原因 A：sys_event_processed 表不存在 → checkAndMark 抛异常 → 降级返回 true → 重复执行', async () => {
      // 模拟真实 checkAndMark：execute 抛异常 → catch → 返回 true（降级）
      mockCheckAndMark.mockImplementation(async () => {
        try {
          await mockExecute();
          return true;
        } catch {
          return true; // 降级
        }
      });
      mockExecute.mockRejectedValue(new Error("Table 'sys_event_processed' doesn't exist"));

      const handler: EventHandler = { handle: vi.fn().mockResolvedValue(undefined) };
      const wrapped = new IdempotentHandler(handler, 'TestHandler');

      await wrapped.handle({ id: 100, eventType: 'test' } as any);
      await wrapped.handle({ id: 100, eventType: 'test' } as any);

      // handler 被执行了两次 — 幂等保护失效
      expect(handler.handle).toHaveBeenCalledTimes(2);
    });

    it('原因 B：event.id 缺失 → IdempotentHandler 旁路检查 → 直接执行', async () => {
      const handler: EventHandler = { handle: vi.fn().mockResolvedValue(undefined) };
      const wrapped = new IdempotentHandler(handler, 'TestHandler');

      // event 没有 id 字段 → 旁路幂等检查
      await wrapped.handle({ eventType: 'test' } as any);
      await wrapped.handle({ eventType: 'test' } as any);

      expect(handler.handle).toHaveBeenCalledTimes(2);
      expect(mockCheckAndMark).not.toHaveBeenCalled();
    });

    it('原因 C：首次 DB 故障降级 → 记录未持久化 → 重投递时再次执行', async () => {
      let callCount = 0;
      // 模拟真实 checkAndMark 行为：DB 故障时内部 catch → 返回 true（降级）
      // 真实代码中 checkAndMark 不会 throw，而是 catch 后返回 true
      mockCheckAndMark.mockImplementation(async () => {
        callCount++;
        // 两次都返回 true：
        // 第一次：DB 故障 → catch → 降级返回 true（无持久化）
        // 第二次：DB 恢复 → 首次无记录 → INSERT 成功 → affectedRows=1 → 返回 true
        return true;
      });

      const handler: EventHandler = { handle: vi.fn().mockResolvedValue(undefined) };
      const wrapped = new IdempotentHandler(handler, 'TestHandler');

      await wrapped.handle({ id: 200, eventType: 'test' } as any);
      await wrapped.handle({ id: 200, eventType: 'test' } as any);

      // handler 被执行两次：首次降级未持久化 → 重投递时再次视为首次
      expect(handler.handle).toHaveBeenCalledTimes(2);
      expect(mockCheckAndMark).toHaveBeenCalledTimes(2);
    });
  });
});
