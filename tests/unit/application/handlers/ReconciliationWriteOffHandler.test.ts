import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReconciliationWriteOffHandler } from '@/application/handlers/ReconciliationWriteOffHandler';
import { ReconciliationWrittenOffEvent } from '@/domain/sales/events/ReconciliationEvents';

// vi.mock 工厂会被 hoist，必须用 vi.hoisted 才能在工厂内引用 mock 函数
const { mockExecute, mockTransaction } = vi.hoisted(() => {
  const mockExecute = vi.fn().mockResolvedValue([[], []]);
  const mockTransaction = vi.fn(async (fn: Function) => fn({ execute: mockExecute }));
  return { mockExecute, mockTransaction };
});

vi.mock('@/lib/db', () => ({
  transaction: (...args: unknown[]) => mockTransaction(args[0] as Function),
  query: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  secureLog: vi.fn(),
}));

describe('ReconciliationWriteOffHandler', () => {
  let handler: ReconciliationWriteOffHandler;

  beforeEach(() => {
    // mockReset 清除 mockResolvedValueOnce 队列 + 调用记录，防止跨测试泄漏
    mockExecute.mockReset();
    mockExecute.mockResolvedValue([[], []]);
    mockTransaction.mockClear();
    handler = new ReconciliationWriteOffHandler();
  });

  function makeEvent(
    overrides?: Partial<ReconciliationWrittenOffEvent['payload']>
  ): ReconciliationWrittenOffEvent {
    return {
      eventType: 'reconciliation.written_off',
      occurredAt: new Date(),
      payload: {
        reconciliationId: 1,
        reconciliationNo: 'RC20260710001',
        customerId: 50,
        totalWriteOffAmount: 1000,
        writeOffRecords: [
          { receivableId: 10, amount: 500, writeOffDate: '2026-07-10' },
          { receivableId: 11, amount: 500, writeOffDate: '2026-07-10' },
        ],
        ...overrides,
      },
    };
  }

  it('should update receivable received_amount/balance/status for each write-off record (T306)', async () => {
    // 模拟 SELECT FOR UPDATE 返回两张应收单
    mockExecute
      .mockResolvedValueOnce([
        [
          {
            id: 10,
            receivable_no: 'AR001',
            amount: 500,
            received_amount: 0,
            balance: 500,
            status: 1,
          },
        ],
      ]) // receivableId=10 的 SELECT
      .mockResolvedValueOnce([[]]) // receivableId=10 的 UPDATE
      .mockResolvedValueOnce([
        [
          {
            id: 11,
            receivable_no: 'AR002',
            amount: 500,
            received_amount: 0,
            balance: 500,
            status: 1,
          },
        ],
      ]) // receivableId=11 的 SELECT
      .mockResolvedValueOnce([[]]); // receivableId=11 的 UPDATE

    await handler.handle(makeEvent());

    // SELECT FOR UPDATE 调用 2 次，UPDATE 调用 2 次 = 共 4 次
    expect(mockExecute).toHaveBeenCalledTimes(4);
  });

  it('全额核销后状态变为 3（已结清）', async () => {
    mockExecute
      .mockResolvedValueOnce([
        [
          {
            id: 10,
            receivable_no: 'AR001',
            amount: 500,
            received_amount: 0,
            balance: 500,
            status: 1,
          },
        ],
      ])
      .mockResolvedValueOnce([[]]);

    await handler.handle(
      makeEvent({
        writeOffRecords: [{ receivableId: 10, amount: 500, writeOffDate: '2026-07-10' }],
      })
    );

    // 验证 UPDATE SQL 中的 status 参数为 3（已结清）
    const updateCalls = mockExecute.mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].includes('UPDATE fin_receivable')
    );
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0][1]).toEqual([500, 0, 3, 10]); // [newReceived, newBalance, status, id]
  });

  it('部分核销后状态变为 2（部分收款）', async () => {
    mockExecute
      .mockResolvedValueOnce([
        [
          {
            id: 10,
            receivable_no: 'AR001',
            amount: 1000,
            received_amount: 0,
            balance: 1000,
            status: 1,
          },
        ],
      ])
      .mockResolvedValueOnce([[]]);

    await handler.handle(
      makeEvent({
        writeOffRecords: [{ receivableId: 10, amount: 300, writeOffDate: '2026-07-10' }],
      })
    );

    const updateCalls = mockExecute.mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].includes('UPDATE fin_receivable')
    );
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0][1]).toEqual([300, 700, 2, 10]);
  });

  it('应收单不存在时跳过（不抛错）', async () => {
    mockExecute.mockResolvedValue([[]]); // 所有 SELECT 返回空

    await expect(handler.handle(makeEvent())).resolves.not.toThrow();
  });

  it('余额为 0 时跳过核销', async () => {
    mockExecute
      .mockResolvedValueOnce([
        [
          {
            id: 10,
            receivable_no: 'AR001',
            amount: 500,
            received_amount: 500,
            balance: 0,
            status: 3,
          },
        ],
      ])
      .mockResolvedValueOnce([[]]);

    await expect(
      handler.handle(
        makeEvent({
          writeOffRecords: [{ receivableId: 10, amount: 500, writeOffDate: '2026-07-10' }],
        })
      )
    ).resolves.not.toThrow();
  });

  it('核销金额超过余额时截断为余额', async () => {
    mockExecute
      .mockResolvedValueOnce([
        [
          {
            id: 10,
            receivable_no: 'AR001',
            amount: 1000,
            received_amount: 0,
            balance: 300,
            status: 1,
          },
        ],
      ])
      .mockResolvedValueOnce([[]]);

    await handler.handle(
      makeEvent({
        writeOffRecords: [{ receivableId: 10, amount: 500, writeOffDate: '2026-07-10' }],
      })
    );

    // 截断为 300：newReceived = 0+300 = 300, newBalance = 300-300 = 0, status = 3
    const updateCalls = mockExecute.mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].includes('UPDATE fin_receivable')
    );
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0][1]).toEqual([300, 0, 3, 10]);
  });

  it('writeOffRecords 为空时跳过', async () => {
    await handler.handle(
      makeEvent({ writeOffRecords: [], totalWriteOffAmount: 0 })
    );
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('writeOffRecords 为 undefined 时跳过', async () => {
    await handler.handle(
      makeEvent({ writeOffRecords: undefined as unknown as never[], totalWriteOffAmount: 0 })
    );
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('多记录顺序处理', async () => {
    mockExecute
      .mockResolvedValueOnce([
        [{ id: 10, receivable_no: 'AR001', amount: 500, received_amount: 0, balance: 500, status: 1 }],
      ])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([
        [{ id: 11, receivable_no: 'AR002', amount: 500, received_amount: 0, balance: 500, status: 1 }],
      ])
      .mockResolvedValueOnce([[]]);

    await handler.handle(makeEvent());

    expect(mockExecute).toHaveBeenCalledTimes(4);
    // 第 1 次 SELECT receivableId=10, 第 3 次 SELECT receivableId=11
    expect(mockExecute.mock.calls[0][1]).toEqual([10]);
    expect(mockExecute.mock.calls[2][1]).toEqual([11]);
  });
});
