// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DbConnection } from '@/types/db';

// 阻断 DB / 服务端依赖，纯单测业务编排
vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  execute: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('@/lib/inventory-ledger', () => ({
  appendInventoryTransaction: vi.fn().mockResolvedValue(undefined),
  recomputeInventorySummary: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/fifo-allocation', () => ({
  allocateFIFO: vi.fn(),
  executeFIFODeductionWithRetry: vi.fn(),
  executeSpecifiedBatchDeduction: vi.fn(),
}));

vi.mock('@/lib/fifo-width-slit', () => ({
  planWidthSlitAllocation: vi.fn(),
  executeWidthSlitDeduction: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/server-translate', () => ({
  t: (key: string) => key,
}));

import { confirmOutboundTx, cancelOutboundTx } from '@/lib/warehouse/outbound-confirm.service';
import {
  allocateFIFO,
  executeFIFODeductionWithRetry,
  executeSpecifiedBatchDeduction,
} from '@/lib/fifo-allocation';
import { planWidthSlitAllocation, executeWidthSlitDeduction } from '@/lib/fifo-width-slit';
import { appendInventoryTransaction, recomputeInventorySummary } from '@/lib/inventory-ledger';

const t = (key: string) => key;

/** 构造可控的 mock 连接：按 SQL 子串路由 SELECT 结果，其余 UPDATE/INSERT 返回 affectedRows:1 */
function makeConn(routes: Record<string, unknown>): DbConnection {
  return {
    execute: vi.fn(async (sql: string) => {
      for (const key of Object.keys(routes)) {
        if (sql.includes(key)) return [routes[key], undefined] as unknown as [unknown, unknown];
      }
      return [{ affectedRows: 1, insertId: 1 }, undefined] as unknown as [unknown, unknown];
    }),
    query: vi.fn(async () => [[], undefined]),
    beginTransaction: vi.fn(),
    commit: vi.fn(),
    rollback: vi.fn(),
    release: vi.fn(),
  } as unknown as DbConnection;
}

const BASE_ORDER = {
  id: 1,
  order_no: 'OUT-001',
  status: 'pending',
  warehouse_id: 10,
  warehouse_code: 'WH10',
  warehouse_name: '主仓',
  version: 1,
};

const BASE_INPUT = {
  id: 1,
  remark: '测试',
  operatorId: 1,
  operatorName: 'tester',
  t,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('confirmOutboundTx', () => {
  it('指定批次扣减：调用 executeSpecifiedBatchDeduction 并逐明细写流水+重算', async () => {
    const conn = makeConn({
      'FOR UPDATE': [BASE_ORDER],
      'FROM inv_outbound_item WHERE order_id': [
        { id: 2, material_id: 5, material_name: '物料A', batch_no: 'B1', quantity: 10, unit: '个' },
      ],
      'customer_id, customer_name, total_amount, sales_order_id, sales_order_no, outbound_type': [
        { customer_id: null, sales_order_no: null, outbound_type: 'sales' },
      ],
    });
    vi.mocked(executeSpecifiedBatchDeduction).mockResolvedValue({
      deductionDetail: { batch_no: 'B1', deducted_qty: 10, mode: 'specified_batch' },
      totalCost: 0,
    });

    const res = await confirmOutboundTx(conn, BASE_INPUT);

    expect(executeSpecifiedBatchDeduction).toHaveBeenCalledTimes(1);
    expect(executeSpecifiedBatchDeduction).toHaveBeenCalledWith(
      conn,
      expect.objectContaining({ batchNo: 'B1', materialId: 5, requiredQty: 10, sourceId: 1 })
    );
    expect(res.deductionDetails).toHaveLength(1);
    expect(appendInventoryTransaction).toHaveBeenCalledTimes(1);
    expect(recomputeInventorySummary).toHaveBeenCalledTimes(1);
    expect(recomputeInventorySummary).toHaveBeenCalledWith(conn, 5, 10);
  });

  it('FIFO 扣减：allocateFIFO 无缺料时调用 executeFIFODeductionWithRetry 并回写 item 批次', async () => {
    const conn = makeConn({
      'FOR UPDATE': [BASE_ORDER],
      'FROM inv_outbound_item WHERE order_id': [
        { id: 3, material_id: 6, material_name: '物料B', batch_no: null, quantity: 5, unit: '个' },
      ],
      'FROM inv_material WHERE id': [], // 无宽度 → FIFO 分支
      'customer_id, customer_name, total_amount, sales_order_id, sales_order_no, outbound_type': [
        { customer_id: null, sales_order_no: null, outbound_type: 'transfer' },
      ],
    });
    vi.mocked(allocateFIFO).mockResolvedValue({
      material_id: 6,
      material_code: '',
      material_name: '物料B',
      required_qty: 5,
      total_available: 5,
      allocated_qty: 5,
      shortage: 0,
      shortage_percentage: 0,
      allocations: [{ batch_id: 2, batch_no: 'B2', allocated_qty: 5, inbound_date: '2026-01-01' } as any],
    });
    vi.mocked(executeFIFODeductionWithRetry).mockResolvedValue({
      deductionDetails: [{ batch_no: 'B2', deducted_qty: 5 }],
      totalCost: 0,
      attempts: 1,
    });

    const res = await confirmOutboundTx(conn, BASE_INPUT);

    expect(allocateFIFO).toHaveBeenCalledWith(conn, 6, 10, 5);
    expect(executeFIFODeductionWithRetry).toHaveBeenCalledTimes(1);
    expect(res.deductionDetails).toHaveLength(1);
    // 回写 inv_outbound_item.batch_no
    const itemUpdate = vi.mocked(conn.execute).mock.calls.find((c) => String(c[0]).includes('UPDATE inv_outbound_item SET batch_no'));
    expect(itemUpdate).toBeTruthy();
    expect(appendInventoryTransaction).toHaveBeenCalledTimes(1);
    expect(recomputeInventorySummary).toHaveBeenCalledTimes(1);
  });

  it('FIFO 缺料：抛出包含「库存不足」的错误', async () => {
    const conn = makeConn({
      'FOR UPDATE': [BASE_ORDER],
      'FROM inv_outbound_item WHERE order_id': [
        { id: 4, material_id: 6, material_name: '物料C', batch_no: null, quantity: 5, unit: '个' },
      ],
      'FROM inv_material WHERE id': [[]],
    });
    vi.mocked(allocateFIFO).mockResolvedValue({
      material_id: 6,
      material_code: 'M006',
      material_name: '物料C',
      required_qty: 5,
      total_available: 2,
      allocated_qty: 2,
      shortage: 3,
      shortage_percentage: 60,
      allocations: [],
    });

    await expect(confirmOutboundTx(conn, BASE_INPUT)).rejects.toThrow('库存不足');
    expect(executeFIFODeductionWithRetry).not.toHaveBeenCalled();
  });

  it('宽度横切：materialWidth>0 时调用 planWidthSlitAllocation + executeWidthSlitDeduction', async () => {
    const conn = makeConn({
      'FOR UPDATE': [BASE_ORDER],
      'FROM inv_outbound_item WHERE order_id': [
        { id: 5, material_id: 7, material_name: '物料D', batch_no: null, quantity: 4, unit: '米' },
      ],
      'FROM inv_material WHERE id': [{ width: 100 }],
      'customer_id, customer_name, total_amount, sales_order_id, sales_order_no, outbound_type': [
        { customer_id: null, sales_order_no: null, outbound_type: 'transfer' },
      ],
    });
    vi.mocked(planWidthSlitAllocation).mockResolvedValue({
      material_id: 7,
      required_qty: 4,
      required_width: 100,
      is_dimensional: true,
      total_available: 4,
      allocated_qty: 4,
      shortage: 0,
      allocations: [{ batch_id: 9, batch_no: 'PB', allocated_qty: 4 } as any],
    });
    vi.mocked(executeWidthSlitDeduction).mockResolvedValue({
      deductionDetails: [{ batch_no: 'PB', deducted_qty: 4, mode: 'slit' }],
      totalCost: 0,
    });

    const res = await confirmOutboundTx(conn, BASE_INPUT);

    expect(planWidthSlitAllocation).toHaveBeenCalledWith(conn, 7, 10, 4, 100);
    expect(executeWidthSlitDeduction).toHaveBeenCalledTimes(1);
    expect(res.deductionDetails).toHaveLength(1);
    expect(appendInventoryTransaction).toHaveBeenCalledTimes(1);
    expect(recomputeInventorySummary).toHaveBeenCalledTimes(1);
  });

  it('关联客户：自动生成应收单（fin_receivable INSERT）', async () => {
    const conn = makeConn({
      'FOR UPDATE': [BASE_ORDER],
      'FROM inv_outbound_item WHERE order_id': [
        { id: 6, material_id: 5, material_name: '物料E', batch_no: 'B1', quantity: 10, unit: '个' },
      ],
      'customer_id, customer_name, total_amount, sales_order_id, sales_order_no, outbound_type': [
        {
          customer_id: 99,
          customer_name: '客户99',
          total_amount: 500,
          sales_order_id: null,
          sales_order_no: null,
          outbound_type: 'sales',
        },
      ],
    });
    vi.mocked(executeSpecifiedBatchDeduction).mockResolvedValue({
      deductionDetail: { batch_no: 'B1', deducted_qty: 10 },
      totalCost: 0,
    });

    await confirmOutboundTx(conn, BASE_INPUT);

    const arInsert = vi.mocked(conn.execute).mock.calls.find((c) => String(c[0]).includes('INSERT INTO fin_receivable'));
    expect(arInsert).toBeTruthy();
  });

  it('销售出库：回写 sal_order 发货进度（UPDATE sal_order）', async () => {
    const conn = makeConn({
      'FOR UPDATE': [BASE_ORDER],
      'FROM inv_outbound_item WHERE order_id': [
        { id: 7, material_id: 5, material_name: '物料F', batch_no: 'B1', quantity: 10, unit: '个' },
      ],
      'customer_id, customer_name, total_amount, sales_order_id, sales_order_no, outbound_type': [
        {
          customer_id: null,
          customer_name: null,
          total_amount: 0,
          sales_order_id: null,
          sales_order_no: 'SO-1',
          outbound_type: 'sales',
        },
      ],
      'FROM sal_order WHERE order_no': [{ id: 5, status: 2 }],
      'FROM inv_outbound_order io': [{ shipped_qty: 0 }],
      'FROM sal_order_item': [{ total_qty: 100 }],
    });
    vi.mocked(executeSpecifiedBatchDeduction).mockResolvedValue({
      deductionDetail: { batch_no: 'B1', deducted_qty: 10 },
      totalCost: 0,
    });

    await confirmOutboundTx(conn, BASE_INPUT);

    const salUpdate = vi.mocked(conn.execute).mock.calls.find((c) => String(c[0]).includes('UPDATE sal_order'));
    expect(salUpdate).toBeTruthy();
  });

  it('订单不存在：抛出 k_uhw8cc（透传，无 NOT_FOUND 前缀）', async () => {
    const conn = makeConn({ 'FOR UPDATE': [] });
    await expect(confirmOutboundTx(conn, BASE_INPUT)).rejects.toThrow('k_uhw8cc');
  });

  it('明细为空：抛出 k_xb93o0', async () => {
    const conn = makeConn({
      'FOR UPDATE': [BASE_ORDER],
      'FROM inv_outbound_item WHERE order_id': [],
    });
    await expect(confirmOutboundTx(conn, BASE_INPUT)).rejects.toThrow('k_xb93o0');
  });

  it('状态不可确认（completed）：抛出 BAD_REQUEST', async () => {
    const conn = makeConn({
      'FOR UPDATE': [{ ...BASE_ORDER, status: 'completed' }],
    });
    await expect(confirmOutboundTx(conn, BASE_INPUT)).rejects.toThrow(/^BAD_REQUEST:/);
  });
});

describe('cancelOutboundTx', () => {
  const CANCEL_ORDER = { id: 1, order_no: 'OUT-001', status: 'completed', warehouse_id: 10, version: 2 };

  it('存在分配明细：按明细精确回滚并删除分配记录', async () => {
    const conn = makeConn({
      'FOR UPDATE': [CANCEL_ORDER],
      'FROM inv_outbound_item WHERE order_id': [
        { material_id: 6, batch_no: 'B1', quantity: 10 },
      ],
      'FROM inv_outbound_batch_allocation': [{ batch_no: 'B1', allocated_qty: 10 }],
    });

    const res = await cancelOutboundTx(conn, BASE_INPUT);

    expect(res.orderNo).toBe('OUT-001');
    const restoreCalls = vi
      .mocked(conn.execute)
      .mock.calls.filter((c) => String(c[0]).includes('UPDATE inv_inventory_batch SET'));
    expect(restoreCalls).toHaveLength(1);
    expect(restoreCalls[0][1]).toEqual([10, 10, 'B1', 6, 10]);
    const allocDelete = vi
      .mocked(conn.execute)
      .mock.calls.find((c) => String(c[0]).includes('DELETE FROM inv_outbound_batch_allocation'));
    expect(allocDelete).toBeTruthy();
    expect(appendInventoryTransaction).toHaveBeenCalledTimes(1);
    expect(recomputeInventorySummary).toHaveBeenCalledTimes(1);
  });

  it('无分配明细且单批次：按 item.quantity 回滚', async () => {
    const conn = makeConn({
      'FOR UPDATE': [CANCEL_ORDER],
      'FROM inv_outbound_item WHERE order_id': [
        { material_id: 6, batch_no: 'B1', quantity: 10 },
      ],
      'FROM inv_outbound_batch_allocation': [],
    });

    await cancelOutboundTx(conn, BASE_INPUT);

    const restoreCalls = vi
      .mocked(conn.execute)
      .mock.calls.filter((c) => String(c[0]).includes('UPDATE inv_inventory_batch SET'));
    expect(restoreCalls).toHaveLength(1);
    expect(restoreCalls[0][1]).toEqual([10, 10, 'B1', 6, 10]);
  });

  it('无分配明细且多批次：按数量均分回滚', async () => {
    const conn = makeConn({
      'FOR UPDATE': [CANCEL_ORDER],
      'FROM inv_outbound_item WHERE order_id': [
        { material_id: 6, batch_no: 'B1,B2', quantity: 10 },
      ],
      'FROM inv_outbound_batch_allocation': [],
    });

    await cancelOutboundTx(conn, BASE_INPUT);

    const restoreCalls = vi
      .mocked(conn.execute)
      .mock.calls.filter((c) => String(c[0]).includes('UPDATE inv_inventory_batch SET'));
    expect(restoreCalls).toHaveLength(2);
    for (const call of restoreCalls) {
      expect(call[1]).toEqual([5, 5, expect.any(String), 6, 10]);
    }
  });

  it('状态不可撤销（cancelled）：抛出 BAD_REQUEST', async () => {
    const conn = makeConn({
      'FOR UPDATE': [{ ...CANCEL_ORDER, status: 'cancelled' }],
    });
    await expect(cancelOutboundTx(conn, BASE_INPUT)).rejects.toThrow(/^BAD_REQUEST:/);
  });
});
