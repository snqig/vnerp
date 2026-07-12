import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReconciliationWriteOffHandler } from '@/application/handlers/ReconciliationWriteOffHandler';
import { ReconciliationWrittenOffEvent } from '@/domain/sales/events/ReconciliationEvents';

vi.mock('@/lib/db', () => ({
  transaction: vi.fn(async (fn: Function) => fn({ execute: vi.fn() })),
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
    vi.clearAllMocks();
    handler = new ReconciliationWriteOffHandler();
  });

  it('should handle reconciliation write-off event', async () => {
    const event: ReconciliationWrittenOffEvent = {
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
      },
    };

    await expect(handler.handle(event)).resolves.not.toThrow();
  });

  it('should skip if no writeOffRecords', async () => {
    const event: ReconciliationWrittenOffEvent = {
      eventType: 'reconciliation.written_off',
      occurredAt: new Date(),
      payload: {
        reconciliationId: 1,
        reconciliationNo: 'RC20260710001',
        customerId: 50,
        totalWriteOffAmount: 0,
        writeOffRecords: [],
      },
    };

    await expect(handler.handle(event)).resolves.not.toThrow();
  });

  it('should skip if writeOffRecords is undefined', async () => {
    const event: ReconciliationWrittenOffEvent = {
      eventType: 'reconciliation.written_off',
      occurredAt: new Date(),
      payload: {
        reconciliationId: 1,
        reconciliationNo: 'RC20260710001',
        customerId: 50,
        totalWriteOffAmount: 0,
        writeOffRecords: [],
      },
    };

    await expect(handler.handle(event)).resolves.not.toThrow();
  });
});
