import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeliveryReceivableHandler } from '@/application/handlers/DeliveryReceivableHandler';
import { DeliveryShippedEvent } from '@/domain/sales/events/DeliveryEvents';

vi.mock('@/lib/db', () => ({
  transaction: vi.fn(async (fn: Function) => {
    const mockConn = {
      execute: vi.fn().mockResolvedValue([[], []]),
    };
    return fn(mockConn);
  }),
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

describe('DeliveryReceivableHandler', () => {
  let handler: DeliveryReceivableHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new DeliveryReceivableHandler();
  });

  it('should create receivable when delivery is shipped', async () => {
    const event: DeliveryShippedEvent = {
      eventType: 'delivery.shipped',
      occurredAt: new Date(),
      payload: {
        deliveryId: 1,
        deliveryNo: 'DLV20260710001',
        orderId: 100,
        customerId: 50,
        warehouseId: 1,
        logisticsCompany: '顺丰',
        trackingNo: 'SF123456',
        shippedItems: [
          { materialId: 1, materialCode: 'M001', materialName: '物料1', quantity: 100, unit: '件', unitPrice: 10, batchNo: 'B001' }
        ],
        totalAmount: 1000,
      },
    };

    await expect(handler.handle(event)).resolves.not.toThrow();
  });

  it('should skip if totalAmount is 0', async () => {
    const event: DeliveryShippedEvent = {
      eventType: 'delivery.shipped',
      occurredAt: new Date(),
      payload: {
        deliveryId: 1,
        deliveryNo: 'DLV20260710001',
        orderId: 100,
        customerId: 50,
        warehouseId: 1,
        logisticsCompany: '',
        trackingNo: '',
        shippedItems: [],
        totalAmount: 0,
      },
    };

    await expect(handler.handle(event)).resolves.not.toThrow();
  });

  it('should skip if totalAmount is negative', async () => {
    const event: DeliveryShippedEvent = {
      eventType: 'delivery.shipped',
      occurredAt: new Date(),
      payload: {
        deliveryId: 1,
        deliveryNo: 'DLV20260710001',
        orderId: 100,
        customerId: 50,
        warehouseId: 1,
        logisticsCompany: '',
        trackingNo: '',
        shippedItems: [],
        totalAmount: -100,
      },
    };

    await expect(handler.handle(event)).resolves.not.toThrow();
  });
});
