/**
 * XAUTOCLAIM 重投递幂等性集成模拟
 *
 * 使用真实 MySQL 数据库 + 真实 IdempotentHandler / IdempotencyGuard 代码，
 * 模拟 StreamConsumer XAUTOCLAIM 重投递场景，验证 mark-before-execute + delete-on-failure 修复。
 *
 * 三个场景：
 * A. handler 首次成功 → mark 保留 → 重投递被拦截（正常幂等）
 * B. handler 首次失败 → deleteMark 删除 → 重投递再次执行（修复后正确行为）
 * C. 模拟旧逻辑（无 deleteMark）→ handler 失败 → 重投递被错误拦截（BUG 复现）
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { IdempotencyGuard } from '@/infrastructure/event-bus/IdempotencyGuard';
import { IdempotentHandler } from '@/infrastructure/event-bus/IdempotentHandler';
import { execute, query } from '@/lib/db';
import type { DomainEvent } from '@/domain/shared/DomainTypes';
import type { EventHandler } from '@/infrastructure/event-bus/EventBus';

const TEST_HANDLER_NAME = 'TestXautoclaimHandler';
const TEST_EVENT_TYPE = 'TestSimulationEvent';

function createTestEvent(eventId: number): DomainEvent & { id: number } {
  return {
    id: eventId,
    eventType: TEST_EVENT_TYPE,
    occurredAt: new Date(),
    payload: { simulated: true, timestamp: Date.now() },
  };
}

async function cleanupMark(eventId: number, handlerName: string = TEST_HANDLER_NAME): Promise<void> {
  await execute(
    `DELETE FROM sys_event_processed WHERE event_id = ? AND handler_name = ?`,
    [eventId, handlerName]
  );
}

async function markExists(eventId: number, handlerName: string = TEST_HANDLER_NAME): Promise<boolean> {
  const rows = await query<{ count: number }>(
    `SELECT COUNT(*) as count FROM sys_event_processed WHERE event_id = ? AND handler_name = ?`,
    [eventId, handlerName]
  );
  return (rows[0]?.count ?? 0) > 0;
}

class SuccessHandler implements EventHandler {
  readonly name = 'SuccessHandler';
  callCount = 0;
  async handle(_event: DomainEvent): Promise<void> {
    this.callCount++;
  }
}

class FailOnceThenSucceedHandler implements EventHandler {
  readonly name = 'FailOnceThenSucceedHandler';
  callCount = 0;
  async handle(_event: DomainEvent): Promise<void> {
    this.callCount++;
    if (this.callCount === 1) {
      throw new Error('Simulated handler failure (first attempt)');
    }
  }
}

class AlwaysFailHandler implements EventHandler {
  readonly name = 'AlwaysFailHandler';
  callCount = 0;
  async handle(_event: DomainEvent): Promise<void> {
    this.callCount++;
    throw new Error(`Simulated handler failure (attempt ${this.callCount})`);
  }
}

describe('XAUTOCLAIM 重投递幂等性集成模拟', () => {
  beforeAll(async () => {
    const rows = await query<{ count: number }>(
      `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'sys_event_processed'`
    );
    if ((rows[0]?.count ?? 0) === 0) {
      throw new Error('sys_event_processed 表不存在，请先执行 003_create_event_processed.sql 迁移');
    }
  });

  afterAll(async () => {
    await cleanupMark(9001001);
    await cleanupMark(9001002);
    await cleanupMark(9001003);
    await cleanupMark(9001004);
    await cleanupMark(9001005);
    await cleanupMark(9001006);
    await cleanupMark(9001007);
    await cleanupMark(9001008);
    await cleanupMark(9001009);
    await cleanupMark(9001010);
    await cleanupMark(9001011);
    await cleanupMark(9001012);
    await cleanupMark(9001013);
  });

  describe('场景 A: handler 首次成功 → mark 保留 → 重投递被拦截', () => {
    it('成功执行后，重投递应被幂等拦截（callCount=1）', async () => {
      const eventId = 9001001;
      await cleanupMark(eventId);

      const inner = new SuccessHandler();
      const handler = new IdempotentHandler(inner, TEST_HANDLER_NAME);

      // 第一次投递（模拟 StreamConsumer 正常消费）
      await handler.handle(createTestEvent(eventId));
      expect(inner.callCount).toBe(1);
      expect(await markExists(eventId)).toBe(true);

      // 模拟 XAUTOCLAIM 重投递（消费者崩溃后消息重新分配）
      await handler.handle(createTestEvent(eventId));
      expect(inner.callCount).toBe(1);
      expect(await markExists(eventId)).toBe(true);
    });
  });

  describe('场景 B: handler 首次失败 → deleteMark → 重投递再次执行（修复后行为）', () => {
    it('handler 失败后 deleteMark 删除预占位，XAUTOCLAIM 重投递应再次执行（callCount=2）', async () => {
      const eventId = 9001002;
      await cleanupMark(eventId);

      const inner = new FailOnceThenSucceedHandler();
      const handler = new IdempotentHandler(inner, TEST_HANDLER_NAME);

      // 第一次投递：handler 失败
      await expect(handler.handle(createTestEvent(eventId))).rejects.toThrow('Simulated handler failure');
      expect(inner.callCount).toBe(1);
      // 关键验证：deleteMark 应已删除预占位
      expect(await markExists(eventId)).toBe(false);

      // 模拟 XAUTOCLAIM 重投递（idle > 30s 后消息被重新分配）
      // 由于 deleteMark 已删除记录，checkAndMark 应返回 true，handler 再次执行
      await handler.handle(createTestEvent(eventId));
      expect(inner.callCount).toBe(2);
      expect(await markExists(eventId)).toBe(true);

      // 再次重投递：应被拦截（handler 已成功，mark 保留）
      await handler.handle(createTestEvent(eventId));
      expect(inner.callCount).toBe(2);
      expect(await markExists(eventId)).toBe(true);
    });
  });

  describe('场景 C: 模拟旧逻辑（无 deleteMark）→ handler 失败 → 重投递被错误拦截（BUG）', () => {
    it('无 deleteMark 时，handler 失败后重投递被错误拦截（callCount=1，消息丢失）', async () => {
      const eventId = 9001003;
      const oldLogicHandlerName = 'OldLogicHandler_NoDeleteMark';
      await cleanupMark(eventId, oldLogicHandlerName);

      // 模拟旧逻辑：手动调用 checkAndMark，但不调用 deleteMark
      const inner = new AlwaysFailHandler();

      // 第一次投递：checkAndMark → true → handler 失败 → 无 deleteMark（旧逻辑）
      const shouldExecute1 = await IdempotencyGuard.checkAndMark(eventId, oldLogicHandlerName);
      expect(shouldExecute1).toBe(true);
      try {
        await inner.handle(createTestEvent(eventId));
      } catch {
        // 旧逻辑不调用 deleteMark
      }
      expect(inner.callCount).toBe(1);
      expect(await markExists(eventId, oldLogicHandlerName)).toBe(true); // mark 仍存在

      // 模拟 XAUTOCLAIM 重投递
      const shouldExecute2 = await IdempotencyGuard.checkAndMark(eventId, oldLogicHandlerName);
      expect(shouldExecute2).toBe(false); // BUG: 被错误拦截
      if (!shouldExecute2) {
        // handler 不执行 → 消息永久丢失
      }
      expect(inner.callCount).toBe(1); // 仍为 1，handler 未重试

      await cleanupMark(eventId, oldLogicHandlerName);
    });
  });

  describe('场景 D: 并发 claim 竞争（两个消费者同时拉取同一事件）', () => {
    it('两个消费者同时 checkAndMark，仅一个返回 true', async () => {
      const eventId = 9001004;
      await cleanupMark(eventId);

      const [result1, result2] = await Promise.all([
        IdempotencyGuard.checkAndMark(eventId, TEST_HANDLER_NAME),
        IdempotencyGuard.checkAndMark(eventId, TEST_HANDLER_NAME),
      ]);

      const trueCount = [result1, result2].filter(Boolean).length;
      expect(trueCount).toBe(1); // 仅一个消费者获得执行权
    });
  });

  describe('场景 E: handler 持续失败 → 多次重投递 → 每次都允许执行', () => {
    it('持续失败时 deleteMark 确保每次重投递都能重试', async () => {
      const eventId = 9001005;
      await cleanupMark(eventId);

      const inner = new AlwaysFailHandler();
      const handler = new IdempotentHandler(inner, TEST_HANDLER_NAME);

      // 模拟 3 次投递（首次 + 2 次 XAUTOCLAIM 重投递），每次都失败
      for (let attempt = 1; attempt <= 3; attempt++) {
        await expect(handler.handle(createTestEvent(eventId))).rejects.toThrow();
        expect(inner.callCount).toBe(attempt); // 每次都执行了
        expect(await markExists(eventId)).toBe(false); // 每次失败后 mark 都被删除
      }
    });
  });

  describe('场景 F: 无 eventId 的事件（非 outbox 来源）', () => {
    it('无 eventId 时 IdempotentHandler 透传执行，不做幂等保护', async () => {
      const eventId = 9001006;
      await cleanupMark(eventId);

      const inner = new SuccessHandler();
      const handler = new IdempotentHandler(inner, TEST_HANDLER_NAME);

      const eventWithoutId: DomainEvent = {
        eventType: TEST_EVENT_TYPE,
        occurredAt: new Date(),
        payload: { noId: true },
      };

      await handler.handle(eventWithoutId);
      expect(inner.callCount).toBe(1);

      await handler.handle(eventWithoutId);
      expect(inner.callCount).toBe(2); // 无幂等保护，每次都执行

      expect(await markExists(eventId)).toBe(false); // 无记录
    });
  });

  describe('场景 G: 进程在 checkAndMark 与 handle 之间崩溃（已知限制）', () => {
    it('mark 已存在但 handler 未执行 → 重投递被错误拦截（mark-before-execute 固有窗口）', async () => {
      const eventId = 9001007;
      await cleanupMark(eventId);

      // 模拟崩溃：手动 INSERT 预占位（相当于 checkAndMark 已执行）
      await IdempotencyGuard.checkAndMark(eventId, TEST_HANDLER_NAME);
      expect(await markExists(eventId)).toBe(true);

      // 进程在此处"崩溃"——handler 未执行，消息未 ACK
      // XAUTOCLAIM 重投递 → checkAndMark → affectedRows=0 → 返回 false → handler 被跳过
      const shouldExecute = await IdempotencyGuard.checkAndMark(eventId, TEST_HANDLER_NAME);
      expect(shouldExecute).toBe(false); // 被错误拦截！

      // 已知限制：mark-before-execute 模式在 mark 与 handle 之间存在崩溃窗口
      // 优化建议：引入 status='processing' 状态 + 超时回收机制（见优化建议文档）
    });
  });

  describe('场景 H: DB 故障时 checkAndMark 降级 → 无持久化 → 重投递重复执行', () => {
    it('真实 DB 故障（表不存在）→ checkAndMark 降级返回 true → handler 执行 → 无 mark → 恢复后重投递再次执行', async () => {
      const eventId = 9001008;
      await cleanupMark(eventId);

      // 模拟 DB 故障：临时隐藏 sys_event_processed 表
      await execute(`RENAME TABLE sys_event_processed TO sys_event_processed_bak`);

      try {
        // checkAndMark 应捕获异常并降级返回 true
        const shouldExecute = await IdempotencyGuard.checkAndMark(eventId, TEST_HANDLER_NAME);
        expect(shouldExecute).toBe(true); // 降级：允许执行

        // handler 执行（降级模式下无幂等保护）
        const inner = new SuccessHandler();
        await inner.handle(createTestEvent(eventId));
        expect(inner.callCount).toBe(1);
      } finally {
        // 恢复表
        await execute(`RENAME TABLE sys_event_processed_bak TO sys_event_processed`);
      }

      // DB 恢复后：无 mark 持久化 → checkAndMark 返回 true → handler 再次执行
      const shouldExecuteAfterRecovery = await IdempotencyGuard.checkAndMark(eventId, TEST_HANDLER_NAME);
      expect(shouldExecuteAfterRecovery).toBe(true);

      const inner2 = new SuccessHandler();
      await inner2.handle(createTestEvent(eventId));
      expect(inner2.callCount).toBe(1); // 恢复后首次执行

      // 验证 at-least-once 语义：handler 被执行了两次（降级 + 恢复后）
      // 这是可接受的：业务 handler 必须容忍重复
    });
  });

  describe('场景 I: 两阶段标记 — markAsProcessed 状态流转验证', () => {
    it('checkAndMark 插入 processing → handler 成功 → markAsProcessed 更新为 processed → 重投递被拦截', async () => {
      const eventId = 9001009;
      await cleanupMark(eventId);

      const inner = new SuccessHandler();
      const handler = new IdempotentHandler(inner, TEST_HANDLER_NAME);

      // Step 1: checkAndMark → INSERT status='processing'
      await handler.handle(createTestEvent(eventId));
      expect(inner.callCount).toBe(1);

      // 验证记录状态为 'processed'（handler 成功后 markAsProcessed 已更新）
      const rows = await query<{ status: string }>(
        `SELECT status FROM sys_event_processed WHERE event_id = ? AND handler_name = ?`,
        [eventId, TEST_HANDLER_NAME]
      );
      expect(rows[0].status).toBe('processed');

      // Step 2: 重投递 → checkAndMark → affectedRows=0 → 跳过
      await handler.handle(createTestEvent(eventId));
      expect(inner.callCount).toBe(1); // 未再次执行
    });
  });

  describe('场景 J: 崩溃恢复 — 过期 processing 记录被回收后允许重试', () => {
    it('模拟崩溃残留 processing 记录 → 5 分钟后 checkAndMark 自动清理并允许重试', async () => {
      const eventId = 9001010;
      await cleanupMark(eventId);

      // 模拟崩溃：手动插入 status='processing' 记录，时间设为 10 分钟前
      await execute(
        `INSERT INTO sys_event_processed (event_id, handler_name, status, processed_at)
         VALUES (?, ?, 'processing', DATE_SUB(NOW(), INTERVAL 10 MINUTE))`,
        [eventId, TEST_HANDLER_NAME]
      );

      // 验证记录存在且为 processing
      const beforeRows = await query<{ status: string }>(
        `SELECT status FROM sys_event_processed WHERE event_id = ? AND handler_name = ?`,
        [eventId, TEST_HANDLER_NAME]
      );
      expect(beforeRows[0].status).toBe('processing');

      // checkAndMark 应清理过期记录并重新插入
      const shouldExecute = await IdempotencyGuard.checkAndMark(eventId, TEST_HANDLER_NAME);
      expect(shouldExecute).toBe(true); // 过期记录被清理，允许执行

      // 验证记录被重新插入（新的 processed_at）
      const afterRows = await query<{ status: string; age_seconds: number }>(
        `SELECT status, TIMESTAMPDIFF(SECOND, processed_at, NOW()) as age_seconds
         FROM sys_event_processed WHERE event_id = ? AND handler_name = ?`,
        [eventId, TEST_HANDLER_NAME]
      );
      expect(afterRows[0].status).toBe('processing'); // 新的 processing 记录
      expect(afterRows[0].age_seconds).toBeLessThan(10); // 刚插入，很新
    });
  });

  describe('场景 K: reclaimStaleProcessing 批量回收', () => {
    it('批量清理多个过期 processing 记录，返回清理数量', async () => {
      const eventIds = [9001011, 9001012, 9001013];
      for (const eid of eventIds) {
        await cleanupMark(eid);
        await execute(
          `INSERT INTO sys_event_processed (event_id, handler_name, status, processed_at)
           VALUES (?, ?, 'processing', DATE_SUB(NOW(), INTERVAL 10 MINUTE))`,
          [eid, TEST_HANDLER_NAME]
        );
      }

      const reclaimed = await IdempotencyGuard.reclaimStaleProcessing();
      expect(reclaimed).toBeGreaterThanOrEqual(3);

      // 验证记录已被删除
      for (const eid of eventIds) {
        expect(await markExists(eid)).toBe(false);
      }
    });
  });
});
