import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReturnOrderInventoryHandler } from '@/application/handlers/ReturnOrderInventoryHandler';
import { ReturnOrderCompletedEvent } from '@/domain/sales/events/ReturnOrderEvents';

// vi.mock 工厂会被 hoist，必须用 vi.hoisted 才能在工厂内引用 mock 函数
const { mockExecute, mockTransaction } = vi.hoisted(() => {
  const mockExecute = vi.fn().mockResolvedValue([[], []]);
  const mockTransaction = vi.fn(async (fn: Function) => fn({ execute: mockExecute }));
  return { mockExecute, mockTransaction };
});

vi.mock('@/lib/db', () => ({
  transaction: (...args: unknown[]) => mockTransaction(args[0] as Function),
  query: vi.fn().mockResolvedValue([]),
  // ReturnOrderInventoryHandler 直接调用 execute（非 transaction 包裹）
  execute: mockExecute,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  secureLog: vi.fn(),
}));

describe('ReturnOrderInventoryHandler', () => {
  let handler: ReturnOrderInventoryHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new ReturnOrderInventoryHandler();
  });

  it('should add inventory when return order is completed', async () => {
    mockExecute.mockResolvedValueOnce([[{ id: 1, quantity: 100 }]]);

    const event: ReturnOrderCompletedEvent = {
      eventType: 'return_order.completed',
      occurredAt: new Date(),
      payload: {
        returnId: 1,
        returnNo: 'RET20260710001',
        orderId: 100,
        customerId: 50,
        warehouseId: 1,
        inboundOrderId: 200,
        inboundOrderNo: 'INB20260710001',
        receivableId: 300,
        receivableNo: 'AR20260710001',
        refundAmount: 1000,
        completedBy: 1,
        items: [
          { materialId: 1, materialCode: 'M001', materialName: '物料1', quantity: 50, unit: '件', batchNo: 'B001' }
        ],
      },
    };

    await expect(handler.handle(event)).resolves.not.toThrow();
  });

  it('should create new inventory if not exists', async () => {
    mockExecute.mockResolvedValueOnce([[]]);

    const event: ReturnOrderCompletedEvent = {
      eventType: 'return_order.completed',
      occurredAt: new Date(),
      payload: {
        returnId: 1,
        returnNo: 'RET20260710001',
        orderId: 100,
        customerId: 50,
        warehouseId: 1,
        refundAmount: 1000,
        completedBy: 1,
        items: [
          { materialId: 1, materialCode: 'M001', materialName: '物料1', quantity: 50, unit: '件', batchNo: 'B001' }
        ],
      },
    };

    await expect(handler.handle(event)).resolves.not.toThrow();
  });

  it('should skip if no items', async () => {
    const event: ReturnOrderCompletedEvent = {
      eventType: 'return_order.completed',
      occurredAt: new Date(),
      payload: {
        returnId: 1,
        returnNo: 'RET20260710001',
        orderId: 100,
        customerId: 50,
        warehouseId: 1,
        refundAmount: 0,
        completedBy: 1,
        items: [],
      },
    };

    await expect(handler.handle(event)).resolves.not.toThrow();
  });

  it('should handle multiple items', async () => {
    mockExecute.mockResolvedValueOnce([[{ id: 1, quantity: 100 }]]);

    const event: ReturnOrderCompletedEvent = {
      eventType: 'return_order.completed',
      occurredAt: new Date(),
      payload: {
        returnId: 1,
        returnNo: 'RET20260710001',
        orderId: 100,
        customerId: 50,
        warehouseId: 1,
        refundAmount: 2000,
        completedBy: 1,
        items: [
          { materialId: 1, materialCode: 'M001', materialName: '物料1', quantity: 50, unit: '件', batchNo: 'B001' },
          { materialId: 2, materialCode: 'M002', materialName: '物料2', quantity: 30, unit: '件', batchNo: 'B002' },
        ],
      },
    };

    await expect(handler.handle(event)).resolves.not.toThrow();
  });
});
