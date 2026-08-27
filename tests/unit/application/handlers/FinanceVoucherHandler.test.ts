import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FinanceVoucherHandler } from '@/application/handlers/FinanceVoucherHandler';
import type { InboundOrderApprovedEvent } from '@/domain/warehouse/events/InboundOrderEvents';
import type { WorkOrderCompletedEvent } from '@/domain/production/events/WorkOrderEvents';

const { mockExecute, mockTransaction } = vi.hoisted(() => {
  const mockExecute = vi.fn().mockResolvedValue([[], []]);
  const mockTransaction = vi.fn(async (fn: Function) => fn({ execute: mockExecute }));
  return { mockExecute, mockTransaction };
});

vi.mock('@/lib/db', () => ({
  transaction: (...args: unknown[]) => mockTransaction(args[0] as Function),
}));

vi.mock('@/lib/logger', () => ({
  secureLog: vi.fn(),
}));

describe('FinanceVoucherHandler', () => {
  let handler: FinanceVoucherHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExecute.mockResolvedValue([[], []]);
    handler = new FinanceVoucherHandler();
  });

  function makeInboundEvent(
    overrides?: Partial<InboundOrderApprovedEvent['payload']>
  ): InboundOrderApprovedEvent {
    return {
      eventType: 'inbound.approved',
      occurredAt: new Date(),
      payload: {
        inboundId: 1,
        inboundNo: 'INB20260710001',
        warehouseId: 1,
        warehouseName: '主仓库',
        supplierId: 100,
        supplierName: '供应商A',
        totalAmount: 5000,
        items: [],
        ...overrides,
      },
    };
  }

  function makeWorkOrderEvent(
    overrides?: Partial<WorkOrderCompletedEvent['payload']>
  ): WorkOrderCompletedEvent {
    return {
      eventType: 'workorder.completed',
      occurredAt: new Date(),
      payload: {
        workOrderId: 1,
        workOrderNo: 'WO20260710001',
        ...overrides,
      } as WorkOrderCompletedEvent['payload'],
    };
  }

  it('inbound.approved 无重复应付单时创建新应付单（T301）', async () => {
    // SELECT 返回空 → 不存在重复 → 执行 INSERT
    mockExecute
      .mockResolvedValueOnce([[]]) // SELECT source_no 查重 → 空
      .mockResolvedValueOnce([[]]); // INSERT fin_payable

    await handler.handle(makeInboundEvent());

    // 第 1 次 SELECT, 第 2 次 INSERT
    expect(mockExecute).toHaveBeenCalledTimes(2);
    const selectCall = mockExecute.mock.calls[0];
    expect(selectCall[0]).toContain('SELECT id FROM fin_payable');
    expect(selectCall[0]).toContain('source_no');
    expect(selectCall[1]).toEqual(['INB20260710001']);

    const insertCall = mockExecute.mock.calls[1];
    expect(insertCall[0]).toContain('INSERT INTO fin_payable');
  });

  it('inbound.approved 已存在相同 source_no 的应付单时跳过（T301 幂等）', async () => {
    // SELECT 返回已有记录 → 跳过 INSERT
    mockExecute.mockResolvedValueOnce([[{ id: 999 }]]); // 已存在

    await handler.handle(makeInboundEvent());

    // 仅 1 次 SELECT，无 INSERT
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockExecute.mock.calls[0][0]).toContain('SELECT id FROM fin_payable');
  });

  it('inbound.approved totalAmount 为 0 时跳过', async () => {
    await handler.handle(makeInboundEvent({ totalAmount: 0 }));

    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('inbound.approved 无 inboundNo 时跳过', async () => {
    await handler.handle(makeInboundEvent({ inboundNo: '' }));

    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('inbound.approved totalAmount 为负数时跳过', async () => {
    await handler.handle(makeInboundEvent({ totalAmount: -100 }));

    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('workorder.completed totalAmount 为 0 时跳过', async () => {
    await handler.handle(makeWorkOrderEvent());

    // WorkOrderCompletedEvent 的 totalAmount 默认为 0（handler 中设置为 0）
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('多次处理同一 inbound 事件不会重复创建应付单（幂等验证）', async () => {
    // 第一次：无重复 → 创建
    mockExecute
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]]);

    await handler.handle(makeInboundEvent());
    expect(mockExecute).toHaveBeenCalledTimes(2);

    // 第二次：已有记录 → 跳过
    vi.clearAllMocks();
    mockExecute.mockResolvedValueOnce([[{ id: 999 }]]);

    await handler.handle(makeInboundEvent());
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });
});
