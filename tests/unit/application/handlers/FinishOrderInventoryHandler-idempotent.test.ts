import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * T402/T403: FinishOrderInventoryHandler 幂等性测试
 *
 * 覆盖 T206 集成：handler 在处理前检查 inv_inventory_transaction 是否已存在
 * source_type='prod_finish' AND source_id=finishOrderId，存在则跳过
 */

// vi.mock 工厂会被 hoist，必须用 vi.hoisted 才能在工厂内引用 mock 函数
const { mockExecute } = vi.hoisted(() => {
  const mockExecute = vi.fn();
  return { mockExecute };
});

vi.mock('@/lib/db', () => ({
  execute: mockExecute,
  query: vi.fn().mockResolvedValue([]),
  transaction: vi.fn(),
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

describe('T402: FinishOrderInventoryHandler 幂等性', () => {
  let handler: FinishOrderInventoryHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new FinishOrderInventoryHandler();
  });

  it('已存在事务时跳过处理（幂等）', async () => {
    // 幂等检查返回已有事务
    mockExecute.mockResolvedValueOnce([{ id: 1 }]);

    await handler.handle(makeEvent());

    // 仅调用一次（幂等检查 SELECT），不应有 INSERT/UPDATE
    expect(mockExecute).toHaveBeenCalledTimes(1);
    const calls = mockExecute.mock.calls;
    const sqlArg = String(calls[0][0]);
    expect(sqlArg).toContain('SELECT');
    // 断言没有任何 INSERT/UPDATE 调用
    const hasWrite = calls.some((call) => {
      const sql = String(call[0]).toUpperCase();
      return sql.includes('INSERT') || sql.includes('UPDATE');
    });
    expect(hasWrite).toBe(false);
  });

  it('不存在事务时正常处理库存', async () => {
    mockExecute
      .mockResolvedValueOnce([]) // 幂等检查：无事务
      .mockResolvedValueOnce([
        { product_id: 1, product_code: 'P001', product_name: 'Product A' },
      ]) // 工单查询
      .mockResolvedValueOnce([]) // 库存查询：无现有库存 → INSERT
      .mockResolvedValue([]); // 后续 INSERT 库存 + INSERT 事务

    await handler.handle(makeEvent());

    // 断言执行了写操作（INSERT/UPDATE）
    const calls = mockExecute.mock.calls;
    const writeCalls = calls.filter((call) => {
      const sql = String(call[0]).toUpperCase();
      return sql.includes('INSERT') || sql.includes('UPDATE');
    });
    expect(writeCalls.length).toBeGreaterThanOrEqual(1);

    // 断言写入了 inv_inventory_transaction（幂等记录）
    const txnInsertCall = calls.find((call) => {
      const sql = String(call[0]);
      return sql.includes('INSERT') && sql.includes('inv_inventory_transaction');
    });
    expect(txnInsertCall).toBeDefined();
    // source_type='prod_finish' 硬编码在 SQL 中
    const txnSql = String(txnInsertCall![0]);
    expect(txnSql).toContain('prod_finish');
    // params: [transNo, finishOrderId, productId, warehouseId, qualifiedQty]
    const txnParams = txnInsertCall![1] as unknown[];
    expect(txnParams[1]).toBe(1); // finishOrderId
  });

  it('已有库存时执行 UPDATE 而非 INSERT', async () => {
    mockExecute
      .mockResolvedValueOnce([]) // 幂等检查：无事务
      .mockResolvedValueOnce([
        { product_id: 1, product_code: 'P001', product_name: 'Product A' },
      ]) // 工单查询
      .mockResolvedValueOnce([{ id: 10 }]) // 库存查询：已有库存 → UPDATE
      .mockResolvedValue([]); // 后续 UPDATE + INSERT 事务

    await handler.handle(makeEvent());

    const calls = mockExecute.mock.calls;
    const updateCall = calls.find((call) => {
      const sql = String(call[0]).toUpperCase();
      return sql.includes('UPDATE') && String(call[0]).includes('inv_inventory');
    });
    expect(updateCall).toBeDefined();
  });
});
