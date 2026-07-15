import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * T402/T403: FinishOrderInventoryHandler 幂等性测试
 *
 * 覆盖 T206 集成：handler 使用 INSERT IGNORE + 唯一索引 uk_inv_txn_source
 * (source_type, source_id) 做幂等保护，防止 XAUTOCLAIM 重投递导致的重复计数。
 *
 * 修复 TOCTOU 竞态：原"先 SELECT 后 INSERT"模式在并发下可能双计数，
 * 改为在 transaction() 内用 INSERT IGNORE 原子性地完成幂等检查 + 流水记录。
 */

// vi.mock 工厂会被 hoist，必须用 vi.hoisted 才能在工厂内引用 mock 函数
const { mockExecute, mockTransaction } = vi.hoisted(() => {
  const mockExecute = vi.fn();
  // transaction() 调用回调并注入 mock 连接（连接的 execute 委托给 mockExecute）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  return [{ affectedRows, insertId, changedRows: affectedRows, fieldCount: 0, serverStatus: 2, warningStatus: 0 }, []];
}

describe('T402: FinishOrderInventoryHandler 幂等性', () => {
  let handler: FinishOrderInventoryHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new FinishOrderInventoryHandler();
  });

  it('已存在事务时跳过处理（INSERT IGNORE affectedRows=0，幂等）', async () => {
    mockExecute
      .mockResolvedValueOnce(
        mockRows([{ product_id: 1, product_code: 'P001', product_name: 'Product A' }])
      ) // 工单查询
      .mockResolvedValueOnce(mockResult(0)); // INSERT IGNORE → affectedRows=0（已处理）

    await handler.handle(makeEvent());

    // 应仅调用 2 次：工单查询 + INSERT IGNORE，无库存写操作
    expect(mockExecute).toHaveBeenCalledTimes(2);

    const calls = mockExecute.mock.calls;
    // 第一次：SELECT 工单
    expect(String(calls[0][0])).toContain('SELECT');
    // 第二次：INSERT IGNORE 流水
    expect(String(calls[1][0])).toContain('INSERT IGNORE');
    expect(String(calls[1][0])).toContain('inv_inventory_transaction');
    expect(String(calls[1][0])).toContain('prod_finish');

    // 断言没有任何对 inv_inventory 表的写操作（UPDATE 或非 IGNORE 的 INSERT）
    const hasInvWrite = calls.some((call) => {
      const sql = String(call[0]);
      const sqlUpper = sql.toUpperCase();
      const isWrite =
        sqlUpper.includes('UPDATE') ||
        (sqlUpper.includes('INSERT') && !sqlUpper.includes('IGNORE'));
      // 排除 inv_inventory_transaction 表（只检查 inv_inventory 表本身）
      return isWrite && sql.includes('inv_inventory') && !sql.includes('inv_inventory_transaction');
    });
    expect(hasInvWrite).toBe(false);

    // 验证使用了事务
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it('不存在事务时正常处理库存（INSERT 新库存）', async () => {
    mockExecute
      .mockResolvedValueOnce(
        mockRows([{ product_id: 1, product_code: 'P001', product_name: 'Product A' }])
      ) // 工单查询
      .mockResolvedValueOnce(mockResult(1)) // INSERT IGNORE → affectedRows=1（首次处理）
      .mockResolvedValueOnce(mockRows([])) // 库存查询：无现有库存 → INSERT
      .mockResolvedValueOnce(mockResult(1)); // INSERT inv_inventory

    await handler.handle(makeEvent());

    const calls = mockExecute.mock.calls;

    // 断言执行了 INSERT IGNORE 写入 inv_inventory_transaction（幂等记录）
    const txnInsertCall = calls.find((call) => {
      const sql = String(call[0]);
      return sql.includes('INSERT IGNORE') && sql.includes('inv_inventory_transaction');
    });
    expect(txnInsertCall).toBeDefined();
    // source_type='prod_finish' 硬编码在 SQL 中
    const txnSql = String(txnInsertCall![0]);
    expect(txnSql).toContain('prod_finish');
    // params: [transNo, finishOrderId, productId, warehouseId, qualifiedQty]
    const txnParams = txnInsertCall![1] as unknown[];
    expect(txnParams[1]).toBe(1); // finishOrderId

    // 断言执行了 INSERT 到 inv_inventory（库存增加）
    const invInsertCall = calls.find((call) => {
      const sql = String(call[0]);
      return sql.includes('INSERT') && !sql.includes('IGNORE') && sql.includes('inv_inventory') && !sql.includes('inv_inventory_transaction');
    });
    expect(invInsertCall).toBeDefined();

    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it('已有库存时执行 UPDATE 而非 INSERT', async () => {
    mockExecute
      .mockResolvedValueOnce(
        mockRows([{ product_id: 1, product_code: 'P001', product_name: 'Product A' }])
      ) // 工单查询
      .mockResolvedValueOnce(mockResult(1)) // INSERT IGNORE → affectedRows=1（首次处理）
      .mockResolvedValueOnce(mockRows([{ id: 10 }])) // 库存查询：已有库存 → UPDATE
      .mockResolvedValueOnce(mockResult(1)); // UPDATE inv_inventory

    await handler.handle(makeEvent());

    const calls = mockExecute.mock.calls;
    const updateCall = calls.find((call) => {
      const sql = String(call[0]).toUpperCase();
      return sql.includes('UPDATE') && String(call[0]).includes('inv_inventory');
    });
    expect(updateCall).toBeDefined();

    // 不应有对 inv_inventory 表的 INSERT（仅有 INSERT IGNORE 到 transaction 表）
    const invInsertCall = calls.find((call) => {
      const sql = String(call[0]);
      return sql.includes('INSERT') && !sql.includes('IGNORE') && sql.includes('inv_inventory') && !sql.includes('inv_inventory_transaction');
    });
    expect(invInsertCall).toBeUndefined();
  });

  it('并发场景：两个消费者同时处理同一事件，仅一个成功（TOCTOU 修复验证）', async () => {
    // 模拟 XAUTOCLAIM 重投递：同一事件被投递给两个消费者。
    // 唯一索引 uk_inv_txn_source 确保只有一个 INSERT IGNORE 成功（affectedRows=1），
    // 另一个 affectedRows=0（幂等跳过），避免双计数。
    const handlerA = new FinishOrderInventoryHandler();
    const handlerB = new FinishOrderInventoryHandler();

    // 消费者 A：首次处理，赢得竞态
    mockExecute
      .mockResolvedValueOnce(
        mockRows([{ product_id: 1, product_code: 'P001', product_name: 'Product A' }])
      ) // A: 工单查询
      .mockResolvedValueOnce(mockResult(1)) // A: INSERT IGNORE → affectedRows=1（赢得竞态）
      .mockResolvedValueOnce(mockRows([])) // A: 库存查询
      .mockResolvedValueOnce(mockResult(1)); // A: INSERT 库存

    await handlerA.handle(makeEvent());

    const callsAfterA = mockExecute.mock.calls.length;

    // 消费者 B：重复投递，INSERT IGNORE 被唯一索引阻止
    mockExecute
      .mockResolvedValueOnce(
        mockRows([{ product_id: 1, product_code: 'P001', product_name: 'Product A' }])
      ) // B: 工单查询
      .mockResolvedValueOnce(mockResult(0)); // B: INSERT IGNORE → affectedRows=0（输掉竞态，幂等跳过）

    await handlerB.handle(makeEvent());

    const allCalls = mockExecute.mock.calls;

    // === 验证消费者 A 执行了库存写操作 ===
    const aCalls = allCalls.slice(0, callsAfterA);
    const aInvWrite = aCalls.some((call) => {
      const sql = String(call[0]);
      const sqlUpper = sql.toUpperCase();
      const isWrite =
        sqlUpper.includes('UPDATE') ||
        (sqlUpper.includes('INSERT') && !sqlUpper.includes('IGNORE'));
      return isWrite && sql.includes('inv_inventory') && !sql.includes('inv_inventory_transaction');
    });
    expect(aInvWrite).toBe(true);

    // === 验证消费者 B 未执行库存写操作 ===
    const bCalls = allCalls.slice(callsAfterA);
    expect(bCalls).toHaveLength(2); // 仅工单查询 + INSERT IGNORE

    const bInvWrite = bCalls.some((call) => {
      const sql = String(call[0]);
      const sqlUpper = sql.toUpperCase();
      const isWrite =
        sqlUpper.includes('UPDATE') ||
        (sqlUpper.includes('INSERT') && !sqlUpper.includes('IGNORE'));
      return isWrite && sql.includes('inv_inventory') && !sql.includes('inv_inventory_transaction');
    });
    expect(bInvWrite).toBe(false);

    // 验证 B 的第二次调用是 INSERT IGNORE（被唯一索引阻止）
    expect(String(bCalls[1][0])).toContain('INSERT IGNORE');

    // 验证两个 handler 都使用了事务
    expect(mockTransaction).toHaveBeenCalledTimes(2);
  });

  // ===== P1-7 补充并发幂等测试 =====

  it('并发场景：Promise.all 同时处理同一事件，INSERT IGNORE + 唯一索引保证仅一个成功', async () => {
    // 使用 mockImplementation 按需路由，模拟两个 handler 并发调用同一 mockExecute
    let ignoreCallCount = 0;
    let inventoryWriteCount = 0;

    mockExecute.mockImplementation(async (sql: string) => {
      const sqlUpper = sql.toUpperCase();
      // 工单查询
      if (sqlUpper.includes('SELECT') && sql.includes('prod_work_order')) {
        return mockRows([{ product_id: 1, product_code: 'P001', product_name: 'Product A' }]);
      }
      // INSERT IGNORE（幂等记录）— 唯一索引保证仅第一个 affectedRows=1
      if (sqlUpper.includes('INSERT') && sqlUpper.includes('IGNORE')) {
        ignoreCallCount++;
        return mockResult(ignoreCallCount === 1 ? 1 : 0);
      }
      // 库存查询（排除 inv_inventory_transaction 表）
      if (
        sqlUpper.includes('SELECT') &&
        sql.includes('inv_inventory') &&
        !sql.includes('inv_inventory_transaction')
      ) {
        return mockRows([]);
      }
      // 库存写操作（INSERT 或 UPDATE，非 IGNORE，非 transaction 表）
      if (
        (sqlUpper.includes('INSERT') || sqlUpper.includes('UPDATE')) &&
        !sqlUpper.includes('IGNORE') &&
        sql.includes('inv_inventory') &&
        !sql.includes('inv_inventory_transaction')
      ) {
        inventoryWriteCount++;
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
    // 验证库存写操作只执行 1 次（仅赢得竞态的 handler 执行）
    expect(inventoryWriteCount).toBe(1);
    // 验证两个 handler 都使用了事务
    expect(mockTransaction).toHaveBeenCalledTimes(2);

    // 清理 mockImplementation，避免影响后续测试
    mockExecute.mockReset();
  });

  it('第一个消费者失败后，第二个消费者可以成功处理（事务回滚不阻塞重试）', async () => {
    const handlerA = new FinishOrderInventoryHandler();
    const handlerB = new FinishOrderInventoryHandler();
    const event = makeEvent();

    // 消费者 A：INSERT IGNORE 成功，但库存写失败 → 事务回滚
    mockExecute
      .mockResolvedValueOnce(
        mockRows([{ product_id: 1, product_code: 'P001', product_name: 'Product A' }])
      ) // A: 工单查询
      .mockResolvedValueOnce(mockResult(1)) // A: INSERT IGNORE → 首次（affectedRows=1）
      .mockResolvedValueOnce(mockRows([])) // A: 库存查询
      .mockRejectedValueOnce(new Error('DB connection lost during inventory write')); // A: INSERT 库存失败

    // 消费者 A 抛错
    await expect(handlerA.handle(event)).rejects.toThrow(
      'DB connection lost during inventory write'
    );

    const callsAfterA = mockExecute.mock.calls.length;

    // 消费者 B：INSERT IGNORE 再次返回 affectedRows=1（A 的事务已回滚，幂等记录被清除）
    mockExecute
      .mockResolvedValueOnce(
        mockRows([{ product_id: 1, product_code: 'P001', product_name: 'Product A' }])
      ) // B: 工单查询
      .mockResolvedValueOnce(mockResult(1)) // B: INSERT IGNORE → affectedRows=1（A 回滚后可再次处理）
      .mockResolvedValueOnce(mockRows([])) // B: 库存查询
      .mockResolvedValueOnce(mockResult(1)); // B: INSERT 库存 → 成功

    // 消费者 B 成功
    await expect(handlerB.handle(event)).resolves.toBeUndefined();

    const bCalls = mockExecute.mock.calls.slice(callsAfterA);

    // 关键断言：B 执行了 4 次调用（非 2 次），证明 INSERT IGNORE 返回了 affectedRows=1
    // 若 A 的幂等记录未回滚，B 的 INSERT IGNORE 会返回 0，B 仅执行 2 次后跳过
    expect(bCalls).toHaveLength(4);

    // 验证 B 执行了库存写操作
    const bInvWrite = bCalls.some((call) => {
      const sql = String(call[0]);
      const sqlUpper = sql.toUpperCase();
      const isWrite =
        sqlUpper.includes('UPDATE') ||
        (sqlUpper.includes('INSERT') && !sqlUpper.includes('IGNORE'));
      return isWrite && sql.includes('inv_inventory') && !sql.includes('inv_inventory_transaction');
    });
    expect(bInvWrite).toBe(true);

    // 验证两个 handler 都使用了事务
    expect(mockTransaction).toHaveBeenCalledTimes(2);
  });

  it('事务回滚后幂等记录也被回滚，允许重试（同一 handler 重试成功）', async () => {
    const handler = new FinishOrderInventoryHandler();
    const event = makeEvent();

    // 第一次尝试：INSERT IGNORE 成功，但库存写失败 → 事务回滚 → 幂等记录被回滚
    mockExecute
      .mockResolvedValueOnce(
        mockRows([{ product_id: 1, product_code: 'P001', product_name: 'Product A' }])
      ) // 第 1 次：工单查询
      .mockResolvedValueOnce(mockResult(1)) // 第 2 次：INSERT IGNORE → affectedRows=1
      .mockResolvedValueOnce(mockRows([])) // 第 3 次：库存查询
      .mockRejectedValueOnce(new Error('Inventory INSERT failed')); // 第 4 次：INSERT 库存失败

    // 第一次处理抛错
    await expect(handler.handle(event)).rejects.toThrow('Inventory INSERT failed');

    const callsAfterFirst = mockExecute.mock.calls.length;
    expect(callsAfterFirst).toBe(4); // 4 次调用后失败

    // 重试：INSERT IGNORE 再次返回 affectedRows=1
    // 关键点：如果幂等记录没有被回滚，INSERT IGNORE 会返回 affectedRows=0，handler 会跳过
    // 返回 affectedRows=1 证明上一次事务回滚已清除幂等记录
    mockExecute
      .mockResolvedValueOnce(
        mockRows([{ product_id: 1, product_code: 'P001', product_name: 'Product A' }])
      ) // 重试第 1 次：工单查询
      .mockResolvedValueOnce(mockResult(1)) // 重试第 2 次：INSERT IGNORE → affectedRows=1（幂等记录已回滚）
      .mockResolvedValueOnce(mockRows([])) // 重试第 3 次：库存查询
      .mockResolvedValueOnce(mockResult(1)); // 重试第 4 次：INSERT 库存 → 成功

    // 重试成功
    await expect(handler.handle(event)).resolves.toBeUndefined();

    const retryCalls = mockExecute.mock.calls.slice(callsAfterFirst);

    // 重试执行了 4 次调用，证明 INSERT IGNORE 返回了 affectedRows=1（非 0）
    // 若幂等记录未回滚，INSERT IGNORE 返回 0，handler 仅执行 2 次后跳过
    expect(retryCalls).toHaveLength(4);

    // 验证重试的 INSERT IGNORE 在 SQL 中包含 inv_inventory_transaction
    const retryIgnoreCall = retryCalls.find(
      (c) => String(c[0]).includes('INSERT IGNORE') && String(c[0]).includes('inv_inventory_transaction')
    );
    expect(retryIgnoreCall).toBeDefined();

    // 验证重试执行了库存写操作
    const retryInvWrite = retryCalls.some((call) => {
      const sql = String(call[0]);
      const sqlUpper = sql.toUpperCase();
      const isWrite =
        sqlUpper.includes('UPDATE') ||
        (sqlUpper.includes('INSERT') && !sqlUpper.includes('IGNORE'));
      return isWrite && sql.includes('inv_inventory') && !sql.includes('inv_inventory_transaction');
    });
    expect(retryInvWrite).toBe(true);

    // 验证两次都使用了事务（INSERT IGNORE 在事务内，随事务回滚）
    expect(mockTransaction).toHaveBeenCalledTimes(2);
  });
});
