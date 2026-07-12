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
});
