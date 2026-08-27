/**
 * P2-① 死信重放补偿闭环 —— 仓库层 SQL 守卫测试
 *
 * 直接实例化 MysqlDomainEventOutboxRepository，mock @/lib/db 的 execute/query，
 * 断言 replay 系列方法生成的 SQL 带 `status = 'dead_letter'` 兜底条件：
 * 这是死信重放"只动死信、不动其它状态"的安全核心——若 WHERE 漏掉该条件，
 * 可能把 pending/processed 事件误重置，造成重复消费或状态错乱。
 *
 * 不连真实库，纯 SQL 字符串断言。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const dbMocks = vi.hoisted(() => ({
  query: vi.fn(),
  execute: vi.fn(),
  getPool: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  query: dbMocks.query,
  execute: dbMocks.execute,
  getPool: dbMocks.getPool,
}));

vi.mock('@/lib/logger', () => ({ secureLog: vi.fn() }));

import { MysqlDomainEventOutboxRepository } from '@/infrastructure/repositories/MysqlDomainEventOutboxRepository';

describe('MysqlDomainEventOutboxRepository 死信重放 SQL 守卫', () => {
  const repo = new MysqlDomainEventOutboxRepository();

  beforeEach(() => {
    dbMocks.query.mockReset();
    dbMocks.execute.mockReset();
    dbMocks.getPool.mockReset();
  });

  it('replayDeadLetter 的 UPDATE 同时带 id 与 status=dead_letter 双条件，并清零重试与错误', async () => {
    dbMocks.execute.mockResolvedValue({ affectedRows: 1 });

    const n = await repo.replayDeadLetter(42);

    expect(n).toBe(1);
    const [sql, params] = dbMocks.execute.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('UPDATE domain_event_outbox');
    expect(sql).toContain('status = \'pending\'');
    expect(sql).toContain('retry_count = 0');
    expect(sql).toContain('error_message = NULL');
    expect(sql).toContain('next_execute_at = NOW()');
    // 关键：WHERE 必须同时限定 id 与 dead_letter，避免误重置其它状态
    expect(sql).toContain('WHERE id = ? AND status = \'dead_letter\'');
    expect(params).toEqual([42]);
    // SQL 中 dead_letter 仅出现 1 次（在 WHERE 条件里），不在别处泄露
    expect((sql.match(/dead_letter/g) || []).length).toBe(1);
  });

  it('replayDeadLetter 当 id 不存在或非死信时返回 0（affectedRows=0）', async () => {
    dbMocks.execute.mockResolvedValue({ affectedRows: 0 });

    const n = await repo.replayDeadLetter(999);

    expect(n).toBe(0);
    const [sql] = dbMocks.execute.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('WHERE id = ? AND status = \'dead_letter\'');
  });

  it('replayAllDeadLetters 全量更新且仅限 dead_letter 状态', async () => {
    dbMocks.execute.mockResolvedValue({ affectedRows: 5 });

    const n = await repo.replayAllDeadLetters();

    expect(n).toBe(5);
    const [sql] = dbMocks.execute.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('UPDATE domain_event_outbox');
    expect(sql).toContain('WHERE status = \'dead_letter\'');
    expect(sql).not.toContain('WHERE id');
  });

  it('fetchDeadLetterEvents 仅 SELECT status=dead_letter 行', async () => {
    dbMocks.query.mockResolvedValue([
      {
        id: 1,
        event_type: 'e',
        aggregate_type: 'A',
        aggregate_id: 1,
        payload: '{}',
        status: 'dead_letter',
        retry_count: 3,
        error_message: null,
        next_execute_at: null,
        create_time: new Date(),
        processed_at: null,
      },
    ]);

    const rows = await repo.fetchDeadLetterEvents(50);

    expect(rows.length).toBe(1);
    expect(rows[0].status).toBe('dead_letter');
    const [sql, params] = dbMocks.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('WHERE status = \'dead_letter\'');
    expect(sql).toContain('ORDER BY create_time DESC');
    expect(params).toEqual([50]);
  });
});
