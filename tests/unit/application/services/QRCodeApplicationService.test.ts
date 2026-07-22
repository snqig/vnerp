import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const mockConn = { execute: vi.fn() };
  const mockOutbox = { saveEvents: vi.fn().mockResolvedValue(undefined) };
  return {
    query: vi.fn(),
    transaction: vi.fn(async (cb: (conn: typeof mockConn) => Promise<unknown>) => cb(mockConn)),
    execute: vi.fn(),
    mockConn,
    mockOutbox,
    getDomainEventOutbox: vi.fn(() => mockOutbox),
  };
});

vi.mock('@/lib/db', () => ({
  query: mocks.query,
  execute: mocks.execute,
  transaction: mocks.transaction,
}));

vi.mock('@/infrastructure/event-bus/DomainEventOutboxFactory', () => ({
  getDomainEventOutbox: mocks.getDomainEventOutbox,
}));

import { QRCodeApplicationService } from '@/application/services/QRCodeApplicationService';
import { QRCode, QR_TYPE } from '@/domain/trace/QRCode';
import { NotFoundError, DomainError } from '@/domain/shared/DomainTypes';
import type { IQRCodeRepository } from '@/domain/trace/repositories/IQRCodeRepository';

function createMockRepo(): IQRCodeRepository {
  return {
    findByContent: vi.fn(),
    findById: vi.fn(),
    findByParentQrCode: vi.fn(),
    findByBatchNo: vi.fn(),
    create: vi.fn(),
    createBatch: vi.fn(),
    updateQuantity: vi.fn(),
    queryTraceTimeline: vi.fn(),
  };
}

function mockExecReturn(overrides: Record<string, unknown> = {}) {
  return [{ affectedRows: 1, insertId: 0, ...overrides }, []];
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.transaction.mockImplementation(async (cb) => cb(mocks.mockConn));
  mocks.mockOutbox.saveEvents.mockResolvedValue(undefined);
  mocks.mockConn.execute.mockReset();
});

describe('QRCodeApplicationService.generateBatchQr', () => {
  let service: QRCodeApplicationService;
  let mockRepo: IQRCodeRepository;

  beforeEach(() => {
    mockRepo = createMockRepo();
    service = new QRCodeApplicationService(mockRepo);
  });

  it('generates batch QR codes and persists events', async () => {
    (mockRepo.createBatch as ReturnType<typeof vi.fn>).mockResolvedValue([1, 2]);

    mocks.mockConn.execute.mockResolvedValue(mockExecReturn());

    const result = await service.generateBatchQr({
      qrType: QR_TYPE.MATERIAL,
      batchNo: 'B001',
      quantity: 100,
      count: 2,
      materialId: 1,
      materialName: 'Test',
    });

    expect(result.ids).toEqual([1, 2]);
    expect(result.qrCodes).toHaveLength(2);
    expect(mockRepo.createBatch).toHaveBeenCalledTimes(1);
    const createdCodes = (mockRepo.createBatch as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(createdCodes).toHaveLength(2);
    expect(createdCodes[0]).toBeInstanceOf(QRCode);
    expect(createdCodes[0].qrType).toBe(QR_TYPE.MATERIAL);
    expect(createdCodes[0].batchNo).toBe('B001');

    expect(mocks.getDomainEventOutbox).toHaveBeenCalled();
    expect(mocks.mockOutbox.saveEvents).toHaveBeenCalledTimes(2);
  });

  it('throws if count <= 0', async () => {
    await expect(service.generateBatchQr({ quantity: 100, count: 0 })).rejects.toThrow(DomainError);
  });

  it('throws if quantity <= 0', async () => {
    await expect(service.generateBatchQr({ quantity: 0, count: 1 })).rejects.toThrow(DomainError);
  });
});

describe('QRCodeApplicationService.splitParentQr', () => {
  let service: QRCodeApplicationService;
  let mockRepo: IQRCodeRepository;

  beforeEach(() => {
    mockRepo = createMockRepo();
    service = new QRCodeApplicationService(mockRepo);
  });

  it('splits parent QR into children', async () => {
    const parent = QRCode.reconstitute({
      id: 1,
      qrCode: 'P001',
      qrType: QR_TYPE.MATERIAL,
      quantity: 100,
      status: 1,
    });
    (mockRepo.findByContent as ReturnType<typeof vi.fn>).mockResolvedValue(parent);

    mocks.mockConn.execute
      .mockResolvedValueOnce([{ insertId: 10 }, []])
      .mockResolvedValueOnce([{ insertId: 11 }, []])
      .mockResolvedValueOnce(mockExecReturn());

    const result = await service.splitParentQr('P001', [{ quantity: 30 }, { quantity: 30 }]);

    expect(result.childIds).toEqual([10, 11]);
    expect(result.childCodes).toHaveLength(2);
    expect(result.childCodes[0]).toBe('P001-S1');
    expect(result.childCodes[1]).toBe('P001-S2');

    expect(mocks.mockConn.execute).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE qrcode_record SET quantity'),
      [40, 1]
    );
    expect(mocks.mockOutbox.saveEvents).toHaveBeenCalled();
  });

  it('throws if parent not found', async () => {
    (mockRepo.findByContent as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(service.splitParentQr('INVALID', [{ quantity: 10 }])).rejects.toThrow(NotFoundError);
  });

  it('throws if total split quantity exceeds parent', async () => {
    const parent = QRCode.reconstitute({ id: 1, qrCode: 'P001', qrType: QR_TYPE.MATERIAL, quantity: 50, status: 1 });
    (mockRepo.findByContent as ReturnType<typeof vi.fn>).mockResolvedValue(parent);
    await expect(service.splitParentQr('P001', [{ quantity: 30 }, { quantity: 30 }])).rejects.toThrow(DomainError);
  });
});

describe('QRCodeApplicationService.recordScan', () => {
  let service: QRCodeApplicationService;
  let mockRepo: IQRCodeRepository;

  beforeEach(() => {
    mockRepo = createMockRepo();
    service = new QRCodeApplicationService(mockRepo);
  });

  it('records scan and updates scan count', async () => {
    const qr = QRCode.reconstitute({ id: 1, qrCode: 'QR-001', qrType: QR_TYPE.MATERIAL });
    (mockRepo.findByContent as ReturnType<typeof vi.fn>).mockResolvedValue(qr);
    mocks.mockConn.execute.mockResolvedValue(mockExecReturn());

    await service.recordScan('QR-001', '张三', '仓库A');

    expect(mocks.mockConn.execute).toHaveBeenCalledTimes(2);
    const insertCall = (mocks.mockConn.execute as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(insertCall[1][0]).toBe('QR-001');
    expect(insertCall[1][3]).toBe('张三');
    expect(mocks.mockOutbox.saveEvents).toHaveBeenCalled();
  });

  it('throws if QR not found', async () => {
    (mockRepo.findByContent as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(service.recordScan('INVALID', '张三', '仓库A')).rejects.toThrow(NotFoundError);
  });
});

describe('QRCodeApplicationService.getTraceTimeline', () => {
  let service: QRCodeApplicationService;
  let mockRepo: IQRCodeRepository;

  beforeEach(() => {
    mockRepo = createMockRepo();
    service = new QRCodeApplicationService(mockRepo);
  });

  it('returns timeline for existing QR', async () => {
    const qr = QRCode.reconstitute({ id: 1, qrCode: 'QR-001', qrType: QR_TYPE.MATERIAL });
    (mockRepo.findByContent as ReturnType<typeof vi.fn>).mockResolvedValue(qr);
    const mockTimeline = [
      { time: '2026-07-22 10:00', eventType: 'inbound', eventName: '入库', operator: '张三',
        docNo: 'IN001', quantity: '100', process: '', batchNo: 'B001', materialName: 'Test' },
    ];
    (mockRepo.queryTraceTimeline as ReturnType<typeof vi.fn>).mockResolvedValue(mockTimeline);

    const result = await service.getTraceTimeline('QR-001');
    expect(result).toEqual(mockTimeline);
    expect(mockRepo.queryTraceTimeline).toHaveBeenCalledWith('QR-001');
  });

  it('throws if QR not found', async () => {
    (mockRepo.findByContent as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(service.getTraceTimeline('INVALID')).rejects.toThrow(NotFoundError);
  });
});

describe('QRCodeApplicationService.recordPrint', () => {
  let service: QRCodeApplicationService;
  let mockRepo: IQRCodeRepository;

  beforeEach(() => {
    mockRepo = createMockRepo();
    service = new QRCodeApplicationService(mockRepo);
  });

  it('records print log and updates print count', async () => {
    const qr = QRCode.reconstitute({ id: 1, qrCode: 'QR-001', qrType: QR_TYPE.MATERIAL });
    (mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(qr);
    mocks.execute.mockResolvedValue([{ affectedRows: 1 }, []]);

    await service.recordPrint(1, 5, '张三', 'thermal', 2);

    expect(mocks.execute).toHaveBeenCalledTimes(2);
    const insertCall = (mocks.execute as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(insertCall[1]).toContain(1);
    expect(insertCall[1]).toContain(5);
    expect(insertCall[1]).toContain('张三');
    const updateCall = (mocks.execute as ReturnType<typeof vi.fn>).mock.calls[1];
    expect(updateCall[1]).toContain(2);
  });

  it('throws if QR not found', async () => {
    (mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(service.recordPrint(999, null, '张三', 'thermal')).rejects.toThrow(NotFoundError);
  });
});
