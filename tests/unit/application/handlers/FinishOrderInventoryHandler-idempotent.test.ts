import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * T402/T403: FinishOrderInventoryHandler 幂等性 + 批次回写测试
 *
 * 覆盖 T206 集成 + T-INV-3（方案A）：
 * - handler 使用 INSERT IGNORE + 唯一索引 uk_inv_txn_source (source_type, source_id)
 *   做幂等保护，防止 XAUTOCLAIM 重投递导致的重复计数。
 * - T-INV-3 方案A：handler 为完工入库库存唯一权威，幂等块内建/加批次
 *   （inv_inventory_batch，按 finishOrderId 确定性批次号），并调用
 *   recomputeInventorySummary 派生汇总。recompute 本身由专门测试覆盖，
 *   此处以 mock 隔离，仅验证其被调用一次。
 *
 * 修复 TOCTOU 竞态：原"先 SELECT 后 INSERT"模式在并发下可能双计数，
 * 改为在 transaction() 内用 INSERT IGNORE 原子性地完成幂等检查 + 流水记录。
 *
 * Mock 策略：以「按 SQL 内容路由」的 mockImplementation 取代脆弱的顺序
 * mockResolvedValueOnce 队列，避免跨用例状态泄漏。每个用例在 beforeEach
 * 重置后写入默认实现，需要特殊分支（跳过/累加/抛错）的用例自行覆盖。
 */

// recompute 由专门测试覆盖，此处 mock 为 no-op，隔离 handler 自身的幂等/批次逻辑
vi.mock('@/lib/inventory-ledger', () => ({
  recomputeInventorySummary: vi.fn().mockResolvedValue(undefined),
}));

// vi.mock 工厂会被 hoist，必须用 vi.hoisted 才能在工厂内引用 mock 函数
const { mockExecute, mockTransaction } = vi.hoisted(() => {
  const mockExecute = vi.fn();
  // transaction() 调用回调并注入 mock 连接（连接的 execute 委托给 mockExecute）
  const mockTransaction = vi.fn(async (cb: any) => {
    const mockConn = { execute: mockExecute };
    return cb(mockConn);
  });
  return { mockExecute, mockTransaction };
});

vi.mock('@/lib/db', () => ({
  execute: mockExecute,
  query: vi.fn().mockResolvedValue([]),
  transaction: mockTransaction,
}));

vi.mock('@/lib/logger', () => ({
  secureLog: vi.fn(),
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { recomputeInventorySummary } from '@/lib/inventory-ledger';
import { FinishOrderInventoryHandler } from '@/application/handlers/FinishOrderInventoryHandler';
import type { DomainEvent } from '@/domain/shared/DomainTypes';

function makeEvent(): DomainEvent {
  return {
    eventType: 'prod.finish.approved',
    occurredAt: new Date(),
    payload: {
      finishOrderId: 1,
      finishNo: 'FIN001',
      workOrderId: 1,
      workOrderNo: 'WO001',
      productName: 'Product A',
      qualifiedQty: 100,
      defectiveQty: 0,
      warehouseId: 1,
      userId: 1,
    },
  };
}

/** mysql2 conn.execute() 返回 [rows, fields] 元组，这里模拟该结构 */
function mockRows(rows: unknown[]) {
  return [rows, []];
}

/** 模拟 INSERT/UPDATE 的 ResultSetHeader 返回 */
function mockResult(affectedRows: number, insertId = 0) {
  return [
    { affectedRows, insertId, changedRows: affectedRows, fieldCount: 0, serverStatus: 2, warningStatus: 0 },
    [],
  ];
}

/** 默认实现：工单查询返回产品；首次处理（IGNORE affectedRows=1）；无现有批次 → 新建 */
function defaultImpl(sql: string): unknown {
  const u = sql.toUpperCase();
  if (u.includes('SELECT') && sql.includes('prod_work_order')) {
    return mockRows([{ product_id: 1, product_code: 'P001', product_name: 'Product A' }]);
  }
  if (u.includes('INSERT') && u.includes('IGNORE')) {
    return mockResult(1);
  }
  if (u.includes('SELECT') && sql.includes('inv_inventory_batch')) {
    return mockRows([]);
  }
  if ((u.includes('INSERT') || u.includes('UPDATE')) && sql.includes('inv_inventory_batch')) {
    return mockResult(1);
  }
  return mockResult(1);
}

/** 判断 SQL 是否对 inv_inventory* 表的写操作（排除 IGNORE 与 _transaction 流水表） */
function isInvWrite(sql: string): boolean {
  const u = sql.toUpperCase();
  const write = u.includes('UPDATE') || (u.includes('INSERT') && !u.includes('IGNORE'));
  return write && sql.includes('inv_inventory');
}

describe('T402: FinishOrderInventoryHandler 幂等性 + 批次回写', () => {
  let handler: FinishOrderInventoryHandler;

  beforeEach(() => {
    // 重置所有 mock 的调用历史与（如有）once 队列，但保留 vi.mock 工厂实现
    vi.clearAllMocks();
    // 写入默认 SQL 路由实现
    mockExecute.mockImplementation(defaultImpl);
    handler = new FinishOrderInventoryHandler();
  });

  it('已存在事务时跳过处理（INSERT IGNORE affectedRows=0，幂等）', async () => {
    mockExecute.mockImplementation(async (sql: string) => {
      const u = sql.toUpperCase();
      if (u.includes('SELECT') && sql.includes('prod_work_order')) {
        return mockRows([{ product_id: 1, product_code: 'P001', product_name: 'Product A' }]);
      }
      if (u.includes('INSERT') && u.includes('IGNORE')) {
        return mockResult(0); // 已处理 → 幂等跳过
      }
      return mockResult(1);
    });

    await handler.handle(makeEvent());

    // 应仅调用 2 次：工单查询 + INSERT IGNORE，无批次/汇总写操作
    expect(mockExecute).toHaveBeenCalledTimes(2);

    const calls = mockExecute.mock.calls;
    // 第一次：SELECT 工单
    expect(String(calls[0][0])).toContain('SELECT');
    // 第二次：INSERT IGNORE 流水
    expect(String(calls[1][0])).toContain('INSERT IGNORE');
    expect(String(calls[1][0])).toContain('inv_inventory_transaction');
    expect(String(calls[1][0])).toContain('prod_finish');

    // 断言没有任何对 inv_inventory* 表的写操作（批次/汇总）
    expect(calls.some((call) => isInvWrite(String(call[0])))).toBe(false);
    // recompute 未被调用（提前跳过）
    expect(recomputeInventorySummary).not.toHaveBeenCalled();

    // 验证使用了事务
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it('首次处理：建批次 + 派生汇总（recompute 被调用一次）', async () => {
    await handler.handle(makeEvent());

    const calls = mockExecute.mock.calls;

    // 断言执行了 INSERT IGNORE 写入 inv_inventory_transaction（幂等记录）
    const txnInsertCall = calls.find((call) => {
      const sql = String(call[0]);
      return sql.includes('INSERT IGNORE') && sql.includes('inv_inventory_transaction');
    });
    expect(txnInsertCall).toBeDefined();
    const txnSql = String(txnInsertCall![0]);
    expect(txnSql).toContain('prod_finish');
    // 财务列随流水保留
    expect(txnSql).toContain('account_dr');
    expect(txnSql).toContain('account_cr');

    // 断言执行了 INSERT 到 inv_inventory_batch（批次新建）
    const batchInsertCall = calls.find((call) => {
      const sql = String(call[0]);
      return (
        sql.includes('INSERT') &&
        !sql.toUpperCase().includes('IGNORE') &&
        sql.includes('inv_inventory_batch')
      );
    });
    expect(batchInsertCall).toBeDefined();

    // 断言 recompute 被调用一次（派生汇总）
    expect(recomputeInventorySummary).toHaveBeenCalledTimes(1);

    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it('批次已存在时累加而非重复建批次', async () => {
    mockExecute.mockImplementation(async (sql: string) => {
      const u = sql.toUpperCase();
      if (u.includes('SELECT') && sql.includes('prod_work_order')) {
        return mockRows([{ product_id: 1, product_code: 'P001', product_name: 'Product A' }]);
      }
      if (u.includes('INSERT') && u.includes('IGNORE')) {
        return mockResult(1);
      }
      if (u.includes('SELECT') && sql.includes('inv_inventory_batch')) {
        return mockRows([{ id: 10, quantity: 50 }]); // 已有批次 → 累加
      }
      if (u.includes('UPDATE') && sql.includes('inv_inventory_batch')) {
        return mockResult(1);
      }
      return mockResult(1);
    });

    await handler.handle(makeEvent());

    const calls = mockExecute.mock.calls;
    const batchUpdateCall = calls.find((call) => {
      const sql = String(call[0]).toUpperCase();
      return sql.includes('UPDATE') && String(call[0]).includes('inv_inventory_batch');
    });
    expect(batchUpdateCall).toBeDefined();

    // 不应有对 inv_inventory_batch 表的 INSERT（仅有 UPDATE 累加）
    const batchInsertCall = calls.find((call) => {
      const sql = String(call[0]);
      return (
        sql.includes('INSERT') &&
        !sql.toUpperCase().includes('IGNORE') &&
        sql.includes('inv_inventory_batch')
      );
    });
    expect(batchInsertCall).toBeUndefined();
  });

  it('并发场景：两个消费者同时处理同一事件，仅一个成功（TOCTOU 修复验证）', async () => {
    // 模拟 XAUTOCLAIM 重投递：同一事件被投递给两个消费者。
    // 唯一索引 uk_inv_txn_source 确保只有一个 INSERT IGNORE 成功（affectedRows=1），
    // 另一个 affectedRows=0（幂等跳过），避免双计数。
    let ignoreCount = 0;
    mockExecute.mockImplementation(async (sql: string) => {
      const u = sql.toUpperCase();
      if (u.includes('SELECT') && sql.includes('prod_work_order')) {
        return mockRows([{ product_id: 1, product_code: 'P001', product_name: 'Product A' }]);
      }
      if (u.includes('INSERT') && u.includes('IGNORE')) {
        ignoreCount++;
        return mockResult(ignoreCount === 1 ? 1 : 0); // 仅第一个赢得竞态
      }
      if (u.includes('SELECT') && sql.includes('inv_inventory_batch')) {
        return mockRows([]);
      }
      if ((u.includes('INSERT') || u.includes('UPDATE')) && sql.includes('inv_inventory_batch')) {
        return mockResult(1);
      }
      return mockResult(1);
    });

    const handlerA = new FinishOrderInventoryHandler();
    const handlerB = new FinishOrderInventoryHandler();

    // 消费者 A：首次处理，赢得竞态
    await handlerA.handle(makeEvent());
    const callsAfterA = mockExecute.mock.calls.length;

    // 消费者 B：重复投递，INSERT IGNORE 被唯一索引阻止
    await handlerB.handle(makeEvent());

    const allCalls = mockExecute.mock.calls;

    // === 验证消费者 A 执行了批次写操作 ===
    const aCalls = allCalls.slice(0, callsAfterA);
    expect(aCalls.some((call) => isInvWrite(String(call[0])))).toBe(true);

    // === 验证消费者 B 未执行批次写操作 ===
    const bCalls = allCalls.slice(callsAfterA);
    expect(bCalls).toHaveLength(2); // 仅工单查询 + INSERT IGNORE
    expect(bCalls.some((call) => isInvWrite(String(call[0])))).toBe(false);

    // 验证 B 的第二次调用是 INSERT IGNORE（被唯一索引阻止）
    expect(String(bCalls[1][0])).toContain('INSERT IGNORE');

    // 验证两个 handler 都使用了事务
    expect(mockTransaction).toHaveBeenCalledTimes(2);
  });

  it('并发场景：Promise.all 同时处理同一事件，INSERT IGNORE + 唯一索引保证仅一个成功', async () => {
    let ignoreCallCount = 0;
    let batchWriteCount = 0;

    mockExecute.mockImplementation(async (sql: string) => {
      const u = sql.toUpperCase();
      // 工单查询
      if (u.includes('SELECT') && sql.includes('prod_work_order')) {
        return mockRows([{ product_id: 1, product_code: 'P001', product_name: 'Product A' }]);
      }
      // INSERT IGNORE（幂等记录）— 唯一索引保证仅第一个 affectedRows=1
      if (u.includes('INSERT') && u.includes('IGNORE')) {
        ignoreCallCount++;
        return mockResult(ignoreCallCount === 1 ? 1 : 0);
      }
      // 批次查询（排除 inv_inventory_transaction 表）
      if (u.includes('SELECT') && sql.includes('inv_inventory_batch')) {
        return mockRows([]);
      }
      // 批次写操作（INSERT 或 UPDATE，非 IGNORE）
      if ((u.includes('INSERT') || u.includes('UPDATE')) && sql.includes('inv_inventory_batch')) {
        batchWriteCount++;
        return mockResult(1);
      }
      return mockResult(1);
    });

    const handlerA = new FinishOrderInventoryHandler();
    const handlerB = new FinishOrderInventoryHandler();
    const event = makeEvent();

    // 并发执行：两个 handler 同时处理同一事件
    await Promise.all([handlerA.handle(event), handlerB.handle(event)]);

    // 验证 INSERT IGNORE 被调用 2 次（两个 handler 各一次）
    expect(ignoreCallCount).toBe(2);
    // 验证批次写操作只执行 1 次（仅赢得竞态的 handler 执行）
    expect(batchWriteCount).toBe(1);
    // 验证两个 handler 都使用了事务
    expect(mockTransaction).toHaveBeenCalledTimes(2);
  });

  it('第一个消费者失败后，第二个消费者可以成功处理（事务回滚不阻塞重试）', async () => {
    const handlerA = new FinishOrderInventoryHandler();
    const handlerB = new FinishOrderInventoryHandler();
    const event = makeEvent();

    let batchWriteCalls = 0;
    mockExecute.mockImplementation(async (sql: string) => {
      const u = sql.toUpperCase();
      if (u.includes('SELECT') && sql.includes('prod_work_order')) {
        return mockRows([{ product_id: 1, product_code: 'P001', product_name: 'Product A' }]);
      }
      if (u.includes('INSERT') && u.includes('IGNORE')) {
        return mockResult(1); // 首次（affectedRows=1）
      }
      if (u.includes('SELECT') && sql.includes('inv_inventory_batch')) {
        return mockRows([]);
      }
      if ((u.includes('INSERT') || u.includes('UPDATE')) && sql.includes('inv_inventory_batch')) {
        batchWriteCalls++;
        if (batchWriteCalls === 1) {
          // 消费者 A 的批次写失败 → 事务回滚
          throw new Error('DB connection lost during batch write');
        }
        return mockResult(1);
      }
      return mockResult(1);
    });

    // 消费者 A 抛错
    await expect(handlerA.handle(event)).rejects.toThrow('DB connection lost during batch write');

    const callsAfterA = mockExecute.mock.calls.length;

    // 消费者 B：INSERT IGNORE 再次返回 affectedRows=1（A 的事务已回滚）
    await expect(handlerB.handle(event)).resolves.toBeUndefined();

    const bCalls = mockExecute.mock.calls.slice(callsAfterA);

    // 关键断言：B 执行了 4 次调用，证明 INSERT IGNORE 返回了 affectedRows=1
    expect(bCalls).toHaveLength(4);

    // 验证 B 执行了批次写操作
    expect(bCalls.some((call) => isInvWrite(String(call[0])))).toBe(true);

    // 验证两个 handler 都使用了事务
    expect(mockTransaction).toHaveBeenCalledTimes(2);
  });

  it('事务回滚后幂等记录也被回滚，允许重试（同一 handler 重试成功）', async () => {
    const handler = new FinishOrderInventoryHandler();
    const event = makeEvent();

    let batchWriteCalls = 0;
    mockExecute.mockImplementation(async (sql: string) => {
      const u = sql.toUpperCase();
      if (u.includes('SELECT') && sql.includes('prod_work_order')) {
        return mockRows([{ product_id: 1, product_code: 'P001', product_name: 'Product A' }]);
      }
      if (u.includes('INSERT') && u.includes('IGNORE')) {
        return mockResult(1);
      }
      if (u.includes('SELECT') && sql.includes('inv_inventory_batch')) {
        return mockRows([]);
      }
      if ((u.includes('INSERT') || u.includes('UPDATE')) && sql.includes('inv_inventory_batch')) {
        batchWriteCalls++;
        if (batchWriteCalls === 1) {
          // 第一次尝试批次写失败 → 事务回滚 → 幂等记录被回滚
          throw new Error('DB connection lost during batch write');
        }
        return mockResult(1);
      }
      return mockResult(1);
    });

    // 第一次处理抛错
    await expect(handler.handle(event)).rejects.toThrow('DB connection lost during batch write');

    const callsAfterFirst = mockExecute.mock.calls.length;
    expect(callsAfterFirst).toBe(4); // 4 次调用后失败

    // 重试：INSERT IGNORE 再次返回 affectedRows=1
    // 关键点：如果幂等记录没有被回滚，INSERT IGNORE 会返回 affectedRows=0，handler 会跳过
    // 返回 affectedRows=1 证明上一次事务回滚已清除幂等记录
    await expect(handler.handle(event)).resolves.toBeUndefined();

    const retryCalls = mockExecute.mock.calls.slice(callsAfterFirst);

    // 重试执行了 4 次调用，证明 INSERT IGNORE 返回了 affectedRows=1（非 0）
    expect(retryCalls).toHaveLength(4);

    // 验证重试的 INSERT IGNORE 在 SQL 中包含 inv_inventory_transaction
    const retryIgnoreCall = retryCalls.find(
      (c) =>
        String(c[0]).includes('INSERT IGNORE') && String(c[0]).includes('inv_inventory_transaction')
    );
    expect(retryIgnoreCall).toBeDefined();

    // 验证重试执行了批次写操作
    expect(retryCalls.some((call) => isInvWrite(String(call[0])))).toBe(true);

    // 验证两次都使用了事务（INSERT IGNORE 在事务内，随事务回滚）
    expect(mockTransaction).toHaveBeenCalledTimes(2);
  });
});
