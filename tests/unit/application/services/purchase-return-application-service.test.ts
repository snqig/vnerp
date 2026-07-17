import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/system-config', () => ({
  getSystemConfig: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  getPool: vi.fn(),
  getConnection: vi.fn(),
  query: vi.fn(),
  execute: vi.fn(),
  queryOne: vi.fn(),
  transaction: vi.fn((cb: any) => cb({ execute: vi.fn(), query: vi.fn() })),
  transactionWithRetry: vi.fn(),
  queryPaginated: vi.fn(),
  getDrizzleDb: vi.fn(),
  db: {} as any,
  dbConfig: {} as any,
}));

import { PurchaseReturnApplicationService } from '@/application/services/PurchaseReturnApplicationService';
import type { IPurchaseReturnRepository } from '@/domain/purchase/repositories/IPurchaseReturnRepository';
import type { IPurchaseOrderRepository } from '@/domain/purchase/repositories/IPurchaseOrderRepository';
import { CurrencyApplicationService } from '@/application/services/CurrencyApplicationService';
import { PurchaseReturn } from '@/domain/purchase/aggregates/PurchaseReturn';
import type { PurchaseReturnProps } from '@/domain/purchase/aggregates/PurchaseReturn';
import type { PurchaseReturnLineProps } from '@/domain/purchase/entities/PurchaseReturnLine';

function createMockReturnRepo(): IPurchaseReturnRepository {
  return {
    findById: vi.fn(),
    findByReturnNo: vi.fn(),
    findByOrderId: vi.fn(),
    findByStatus: vi.fn(),
    save: vi.fn().mockImplementation(async (ret: PurchaseReturn) => ({
      id: 1,
      returnNo: ret.returnNo || 'PR20260717001',
    })),
    updateStatus: vi.fn(),
    updateApproveInfo: vi.fn(),
    updateCompleteInfo: vi.fn(),
    softDelete: vi.fn(),
  };
}

function createMockOrderRepo(): IPurchaseOrderRepository {
  return {
    findById: vi.fn(),
    findByOrderNo: vi.fn(),
    findByStatus: vi.fn(),
    save: vi.fn(),
    updateStatus: vi.fn(),
    updateReceivedQty: vi.fn(),
    updateAuditInfo: vi.fn(),
    softDelete: vi.fn(),
  };
}

function makeLineProps(overrides: Partial<PurchaseReturnLineProps> = {}): PurchaseReturnLineProps {
  return {
    lineNo: 1,
    materialId: 1,
    materialCode: 'MAT-001',
    materialName: '测试物料',
    unit: '个',
    quantity: 10,
    unitPrice: 100,
    ...overrides,
  };
}

function makeOrderProps(overrides: Partial<PurchaseReturnProps> = {}): PurchaseReturnProps {
  return {
    orderId: 1,
    orderNo: 'PO-001',
    supplierId: 1,
    supplierName: '测试供应商',
    warehouseId: 1,
    reason: '质量问题',
    lines: [makeLineProps()],
    ...overrides,
  };
}

describe('PurchaseReturnApplicationService.createReturn', () => {
  let service: PurchaseReturnApplicationService;
  let mockReturnRepo: IPurchaseReturnRepository;
  let mockOrderRepo: IPurchaseOrderRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReturnRepo = createMockReturnRepo();
    mockOrderRepo = createMockOrderRepo();
    const mockCurrencyService = {
      getLatestRate: vi.fn().mockResolvedValue(1),
      convertToBaseCurrency: vi.fn(),
      clearCache: vi.fn(),
    } as unknown as CurrencyApplicationService;
    service = new PurchaseReturnApplicationService(mockReturnRepo, mockOrderRepo, mockCurrencyService);
  });

  it('从原采购单继承币种信息（默认 CNY）', async () => {
    vi.mocked(mockOrderRepo.findById).mockResolvedValue({
      id: 1,
      orderNo: 'PO-001',
      currency: 'CNY',
      exchangeRate: 1,
      baseCurrency: 'CNY',
    } as any);

    const props = makeOrderProps();
    await service.createReturn(props);

    const saved = vi.mocked(mockReturnRepo.save).mock.calls[0][0] as PurchaseReturn;
    expect(saved.currency).toBe('CNY');
    expect(saved.exchangeRate).toBe(1);
    expect(saved.baseCurrency).toBe('CNY');
  });

  it('从原采购单继承非 CNY 币种', async () => {
    vi.mocked(mockOrderRepo.findById).mockResolvedValue({
      id: 1,
      orderNo: 'PO-001',
      currency: 'USD',
      exchangeRate: 7.25,
      baseCurrency: 'CNY',
    } as any);

    const props = makeOrderProps({ lines: [makeLineProps({ quantity: 10, unitPrice: 100 })] });
    await service.createReturn(props);

    const saved = vi.mocked(mockReturnRepo.save).mock.calls[0][0] as PurchaseReturn;
    expect(saved.currency).toBe('USD');
    expect(saved.exchangeRate).toBe(7.25);
    expect(saved.baseCurrency).toBe('CNY');
    expect(saved.baseTotalAmount).toBe(7250);
  });

  it('正确计算明细行 baseUnitPrice', async () => {
    vi.mocked(mockOrderRepo.findById).mockResolvedValue({
      id: 1,
      orderNo: 'PO-001',
      currency: 'USD',
      exchangeRate: 7.25,
      baseCurrency: 'CNY',
    } as any);

    const props = makeOrderProps({
      lines: [
        makeLineProps({ lineNo: 1, quantity: 10, unitPrice: 100 }),
        makeLineProps({ lineNo: 2, quantity: 5, unitPrice: 200 }),
      ],
    });
    await service.createReturn(props);

    const saved = vi.mocked(mockReturnRepo.save).mock.calls[0][0] as PurchaseReturn;
    const lines = saved.lines;
    expect(lines[0].baseUnitPrice).toBe(725);
    expect(lines[1].baseUnitPrice).toBe(1450);
  });

  it('正确计算明细行 baseAmount', async () => {
    vi.mocked(mockOrderRepo.findById).mockResolvedValue({
      id: 1,
      orderNo: 'PO-001',
      currency: 'USD',
      exchangeRate: 7.25,
      baseCurrency: 'CNY',
    } as any);

    const props = makeOrderProps({
      lines: [
        makeLineProps({ lineNo: 1, quantity: 10, unitPrice: 100 }),
        makeLineProps({ lineNo: 2, quantity: 5, unitPrice: 200 }),
      ],
    });
    await service.createReturn(props);

    const saved = vi.mocked(mockReturnRepo.save).mock.calls[0][0] as PurchaseReturn;
    const lines = saved.lines;
    expect(lines[0].baseAmount).toBe(7250);
    expect(lines[1].baseAmount).toBe(7250);
  });

  it('汇率 1:1 时 base 金额与原币金额一致', async () => {
    vi.mocked(mockOrderRepo.findById).mockResolvedValue({
      id: 1,
      orderNo: 'PO-001',
      currency: 'CNY',
      exchangeRate: 1,
      baseCurrency: 'CNY',
    } as any);

    const props = makeOrderProps({ lines: [makeLineProps({ quantity: 10, unitPrice: 100 })] });
    await service.createReturn(props);

    const saved = vi.mocked(mockReturnRepo.save).mock.calls[0][0] as PurchaseReturn;
    expect(saved.baseTotalAmount).toBe(1000);
    expect(saved.lines[0].baseUnitPrice).toBe(100);
    expect(saved.lines[0].baseAmount).toBe(1000);
  });

  it('原采购单不存在时抛出 NotFoundError', async () => {
    vi.mocked(mockOrderRepo.findById).mockResolvedValue(null);

    const props = makeOrderProps();
    await expect(service.createReturn(props)).rejects.toThrow('原采购订单不存在');
  });
});
