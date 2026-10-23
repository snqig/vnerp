/**
 * SampleFeeDeductionHandler — 打样费抵扣核销单元测试
 *
 * 场景：打样单转大货（SampleOrderConverted）且 fee_deducted=1 时，
 * 生成负额应收（红字冲抵单）挂到销售订单上，使打样费抵扣在财务侧可见。
 *
 * Mock 策略（与 DeliveryReceivableHandler.test.ts 一致）：
 * - @/lib/db: transaction + query
 * - @/lib/logger: logger / secureLog
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const mockConn = { execute: vi.fn() };
  return {
    query: vi.fn(),
    transaction: vi.fn(async (cb: (conn: typeof mockConn) => Promise<unknown>) => cb(mockConn)),
    mockConn,
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      stepStart: vi.fn(),
      stepEnd: vi.fn(),
      branch: vi.fn(),
      db: vi.fn(),
      permission: vi.fn(),
    },
    secureLog: vi.fn(),
  };
});

vi.mock('@/lib/db', () => ({
  query: mocks.query,
  transaction: mocks.transaction,
}));

vi.mock('@/lib/logger', () => ({
  logger: mocks.logger,
  secureLog: mocks.secureLog,
}));

import { SampleFeeDeductionHandler } from '@/application/handlers/SampleFeeDeductionHandler';
import { SampleOrderConvertedEvent } from '@/domain/sample/events/SampleOrderEvents';

function makeEvent(overrides: Partial<{ sampleOrderId: number; orderNo: string; salesOrderId: number }> = {}) {
  return new SampleOrderConvertedEvent({
    sampleOrderId: 1,
    orderNo: 'SP2026071500001',
    salesOrderId: 888,
    userId: 5,
    ...overrides,
  } as ConstructorParameters<typeof SampleOrderConvertedEvent>[0]);
}

/** 打样单费用查询结果 */
function makeOrderRow(overrides: Record<string, unknown> = {}) {
  return {
    order_no: 'SP2026071500001',
    customer_id: 100,
    customer_name: '测试客户',
    sample_fee: 500,
    fee_deducted: 1,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SampleFeeDeductionHandler', () => {
  let handler: SampleFeeDeductionHandler;

  beforeEach(() => {
    handler = new SampleFeeDeductionHandler();
  });

  it('fee_deducted=1 时：生成负额应收（amount/balance = -sample_fee，挂 salesOrderId）', async () => {
    mocks.query.mockResolvedValue([makeOrderRow()]);
    // 幂等检查：无已有冲抵单
    mocks.mockConn.execute
      .mockResolvedValueOnce([[], []]) // SELECT existing
      .mockResolvedValueOnce([{ affectedRows: 1 }, []]); // INSERT

    await handler.handle(makeEvent());

    expect(mocks.query).toHaveBeenCalledTimes(1);
    expect(String(mocks.query.mock.calls[0][0])).toContain('sal_sample_order');
    expect(mocks.query.mock.calls[0][1]).toEqual([1]);

    // 事务内 2 次 execute：幂等 SELECT + INSERT
    expect(mocks.mockConn.execute).toHaveBeenCalledTimes(2);

    const [insertSql, params] = mocks.mockConn.execute.mock.calls[1];
    expect(String(insertSql)).toContain('INSERT INTO fin_receivable');
    expect(params).toContain(-500); // amount 与 balance 均为 -sample_fee
    expect(params.filter((p: unknown) => p === -500).length).toBe(2);
    expect(params).toContain('SP2026071500001'); // source_no = 打样单号
    expect(params).toContain(888); // order_id = 销售订单ID
    expect(params).toContain(100); // customer_id
  });

  it('幂等：已存在同 source_no 冲抵单时不重复插入', async () => {
    mocks.query.mockResolvedValue([makeOrderRow()]);
    mocks.mockConn.execute.mockResolvedValueOnce([[{ id: 66 }], []]); // 已有冲抵单

    await handler.handle(makeEvent());

    expect(mocks.mockConn.execute).toHaveBeenCalledTimes(1); // 只有幂等 SELECT，无 INSERT
  });

  it('fee_deducted=0（未收取或不可抵扣）时：跳过，不生成应收', async () => {
    mocks.query.mockResolvedValue([makeOrderRow({ fee_deducted: 0 })]);

    await handler.handle(makeEvent());

    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.mockConn.execute).not.toHaveBeenCalled();
  });

  it('sample_fee=0 时：跳过', async () => {
    mocks.query.mockResolvedValue([makeOrderRow({ sample_fee: 0 })]);

    await handler.handle(makeEvent());

    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('打样单不存在时：跳过且不抛错（事件容错）', async () => {
    mocks.query.mockResolvedValue([]);

    await expect(handler.handle(makeEvent())).resolves.not.toThrow();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('非 SampleOrderConverted 事件：直接忽略', async () => {
    await handler.handle({ eventId: 'x', eventType: 'SampleOrderConfirmed', occurredAt: new Date(), payload: {} } as never);

    expect(mocks.query).not.toHaveBeenCalled();
  });
});
