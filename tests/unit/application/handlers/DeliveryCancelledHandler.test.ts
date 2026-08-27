import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeliveryCancelledHandler } from '@/application/handlers/DeliveryCancelledHandler';
import { DeliveryCancelledEvent } from '@/domain/sales/events/DeliveryEvents';

const mockExecute = vi.fn().mockResolvedValue([[], []]);
const mockTransaction = vi.fn(async (fn: Function) => fn({ execute: mockExecute }));

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

describe('DeliveryCancelledHandler', () => {
  let handler: DeliveryCancelledHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new DeliveryCancelledHandler();
  });

  it('should rollback delivered_qty when delivery is cancelled', async () => {
    mockExecute
      .mockResolvedValueOnce([[{ id: 1, order_detail_id: 10, quantity: 50, material_id: 1 }]])
      .mockResolvedValueOnce([[], []])
      .mockResolvedValueOnce([[{ id: 100, status: 3 }]]);

    const event: DeliveryCancelledEvent = {
      eventType: 'delivery.cancelled',
      occurredAt: new Date(),
      payload: {
        deliveryId: 1,
        deliveryNo: 'DLV20260710001',
        orderId: 100,
        reason: '客户取消',
      },
    };

    await expect(handler.handle(event)).resolves.not.toThrow();
  });

  it('should skip if no delivery details found', async () => {
    mockExecute.mockResolvedValueOnce([[]]);

    const event: DeliveryCancelledEvent = {
      eventType: 'delivery.cancelled',
      occurredAt: new Date(),
      payload: {
        deliveryId: 1,
        deliveryNo: 'DLV20260710001',
        orderId: 100,
      },
    };

    await expect(handler.handle(event)).resolves.not.toThrow();
  });

  it('should handle delivery without orderId', async () => {
    mockExecute.mockResolvedValueOnce([[{ id: 1, order_detail_id: null, quantity: 50, material_id: 1 }]]);

    const event: DeliveryCancelledEvent = {
      eventType: 'delivery.cancelled',
      occurredAt: new Date(),
      payload: {
        deliveryId: 1,
        deliveryNo: 'DLV20260710001',
        orderId: 0,
      },
    };

    await expect(handler.handle(event)).resolves.not.toThrow();
  });

  it('should soft-delete corresponding receivable when delivery is cancelled (T403)', async () => {
    // 模拟：发货明细存在 + 订单存在 + 应收单存在
    mockExecute
      .mockResolvedValueOnce([
        [{ id: 1, order_detail_id: 10, quantity: 50, material_id: 1 }],
      ])
      .mockResolvedValueOnce([[]]) // UPDATE delivered_qty
      .mockResolvedValueOnce([[{ id: 100, status: 2 }]]) // SELECT order status (no rollback needed since status=2)
      .mockResolvedValueOnce([
        [{ id: 200, receivable_no: 'AR001' }], // SELECT fin_receivable
      ])
      .mockResolvedValueOnce([[]]); // UPDATE fin_receivable SET deleted=1

    const event: DeliveryCancelledEvent = {
      eventType: 'delivery.cancelled',
      occurredAt: new Date(),
      payload: {
        deliveryId: 1,
        deliveryNo: 'DLV20260710001',
        orderId: 100,
        reason: 'T403 测试',
      },
    };

    await handler.handle(event);

    // 验证 UPDATE fin_receivable 调用了一次
    const receivableUpdateCalls = mockExecute.mock.calls.filter(
      (call) =>
        typeof call[0] === 'string' &&
        (call[0] as string).includes('UPDATE fin_receivable') &&
        (call[0] as string).includes('deleted = 1')
    );
    expect(receivableUpdateCalls).toHaveLength(1);
    expect(receivableUpdateCalls[0][1]).toEqual(['DLV20260710001']);
  });

  it('should not call UPDATE fin_receivable when no receivable found (T403)', async () => {
    mockExecute
      .mockResolvedValueOnce([
        [{ id: 1, order_detail_id: 10, quantity: 50, material_id: 1 }],
      ])
      .mockResolvedValueOnce([[]]) // UPDATE delivered_qty
      .mockResolvedValueOnce([[{ id: 100, status: 2 }]]) // SELECT order status (status=2, no rollback)
      .mockResolvedValueOnce([[]]); // SELECT fin_receivable → 空

    const event: DeliveryCancelledEvent = {
      eventType: 'delivery.cancelled',
      occurredAt: new Date(),
      payload: {
        deliveryId: 1,
        deliveryNo: 'DLV20260710001',
        orderId: 100,
      },
    };

    await handler.handle(event);

    const receivableUpdateCalls = mockExecute.mock.calls.filter(
      (call) =>
        typeof call[0] === 'string' &&
        (call[0] as string).includes('UPDATE fin_receivable')
    );
    expect(receivableUpdateCalls).toHaveLength(0);
  });
});
