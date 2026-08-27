import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkOrderCompletedEvent } from '@/domain/production/events/WorkOrderEvents';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  execute: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ query: mocks.query, execute: mocks.execute }));
vi.mock('@/lib/logger', () => ({
  secureLog: vi.fn(),
}));

import { ToolCostHandler } from '@/application/handlers/ToolCostHandler';

function makeEvent(overrides: Partial<WorkOrderCompletedEvent['payload']> = {}) {
  return new WorkOrderCompletedEvent({
    workOrderId: 100,
    workOrderNo: 'WO-001',
    productId: 50,
    productName: '测试产品',
    completedQty: 1000,
    warehouseId: 1,
    ...overrides,
  });
}

describe('ToolCostHandler', () => {
  let handler: ToolCostHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new ToolCostHandler();
  });

  it('汇总 amortized_cost 并累加到 work_order_costs', async () => {
    mocks.query.mockResolvedValueOnce([{ total_tool_cost: '1250.50' }]);
    mocks.execute.mockResolvedValue(undefined);

    await handler.handle(makeEvent());

    // recordToolCost: INSERT INTO inv_inventory_transaction
    expect(mocks.execute).toHaveBeenCalledTimes(2);
    const transCall = mocks.execute.mock.calls[0];
    const transSql = transCall[0] as string;
    const transParams = transCall[1] as unknown[];
    expect(transSql).toContain('inv_inventory_transaction');
    expect(transParams[3]).toBe('6403'); // account_dr
    expect(transParams[4]).toBe('1801'); // account_cr
    expect(transParams[0]).toContain('TOOL-COST-100-');
    expect(transParams[1]).toBe(100); // workOrderId (source_id)
    expect(transParams[2]).toBe(1250.5); // totalAmount
    expect(transParams[5]).toContain('WO-001'); // remark with workOrderNo

    // updateWorkOrderCost: INSERT INTO work_order_costs ... ON DUPLICATE KEY UPDATE
    const costCall = mocks.execute.mock.calls[1];
    const costSql = costCall[0] as string;
    const costParams = costCall[1] as unknown[];
    expect(costSql).toContain('work_order_costs');
    expect(costSql).toContain('ON DUPLICATE KEY UPDATE');
    expect(costSql).toContain('manufacturing_cost = manufacturing_cost + VALUES(manufacturing_cost)');
    expect(costParams[0]).toBe(100); // workOrderId
    expect(costParams[1]).toBe(1250.5); // manufacturing_cost
    expect(costParams[2]).toBe(1250.5); // total_cost
  });

  it('总成本为 0 时跳过写入', async () => {
    mocks.query.mockResolvedValueOnce([{ total_tool_cost: 0 }]);

    await handler.handle(makeEvent());

    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it('总成本为 null 时安全处理（跳过）', async () => {
    mocks.query.mockResolvedValueOnce([{ total_tool_cost: null }]);

    await handler.handle(makeEvent());

    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it('查询结果为空时安全处理（跳过）', async () => {
    mocks.query.mockResolvedValueOnce([]);

    await handler.handle(makeEvent());

    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it('查询异常被吞掉（不抛出）', async () => {
    mocks.query.mockRejectedValueOnce(new Error('DB connection lost'));

    await expect(handler.handle(makeEvent())).resolves.not.toThrow();
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it('recordToolCost 执行异常被吞掉（不抛出）', async () => {
    mocks.query.mockResolvedValueOnce([{ total_tool_cost: '500.00' }]);
    mocks.execute.mockRejectedValueOnce(new Error('INSERT failed'));

    await expect(handler.handle(makeEvent())).resolves.not.toThrow();
  });

  it('workOrderNo 出现在 remark 中', async () => {
    mocks.query.mockResolvedValueOnce([{ total_tool_cost: '300.00' }]);
    mocks.execute.mockResolvedValue(undefined);

    await handler.handle(makeEvent({ workOrderNo: 'WO-CUSTOM-999' }));

    const transParams = mocks.execute.mock.calls[0][1] as unknown[];
    expect(transParams[5]).toContain('WO-CUSTOM-999');
  });

  it('小数精度保持正确', async () => {
    mocks.query.mockResolvedValueOnce([{ total_tool_cost: '0.01' }]);
    mocks.execute.mockResolvedValue(undefined);

    await handler.handle(makeEvent());

    const costParams = mocks.execute.mock.calls[1][1] as unknown[];
    expect(costParams[1]).toBe(0.01);
    expect(costParams[2]).toBe(0.01);
  });

  it('字符串类型 total_tool_cost 正确解析', async () => {
    mocks.query.mockResolvedValueOnce([{ total_tool_cost: '9999.99' }]);
    mocks.execute.mockResolvedValue(undefined);

    await handler.handle(makeEvent());

    const costParams = mocks.execute.mock.calls[1][1] as unknown[];
    expect(costParams[1]).toBeCloseTo(9999.99, 2);
  });

  it('数字类型 total_tool_cost 正确解析', async () => {
    mocks.query.mockResolvedValueOnce([{ total_tool_cost: 888.88 }]);
    mocks.execute.mockResolvedValue(undefined);

    await handler.handle(makeEvent());

    const costParams = mocks.execute.mock.calls[1][1] as unknown[];
    expect(costParams[1]).toBeCloseTo(888.88, 2);
  });
});
