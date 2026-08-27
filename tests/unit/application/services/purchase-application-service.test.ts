import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/system-config', () => ({
  getSystemConfig: vi.fn(),
  getSystemConfigBoolean: vi.fn(),
  getSystemConfigNumber: vi.fn(),
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

import { PurchaseApplicationService } from '@/application/services/PurchaseApplicationService';
import { getSystemConfig, getSystemConfigBoolean, getSystemConfigNumber } from '@/lib/system-config';
import type { IPurchaseOrderRepository } from '@/domain/purchase/repositories/IPurchaseOrderRepository';
import { CurrencyApplicationService } from '@/application/services/CurrencyApplicationService';
import type { PurchaseOrderProps } from '@/domain/purchase/aggregates/PurchaseOrder';

function createMockOrderRepo(): IPurchaseOrderRepository {
  return {
    findById: vi.fn(),
    findByOrderNo: vi.fn(),
    findByStatus: vi.fn(),
    save: vi.fn().mockResolvedValue({ id: 1, orderNo: 'PO20260717001' }),
    updateStatus: vi.fn().mockResolvedValue(true),
    updateReceivedQty: vi.fn(),
    updateAuditInfo: vi.fn(),
    softDelete: vi.fn(),
  };
}

function defaultSystemConfigMocks(): void {
  vi.mocked(getSystemConfig).mockImplementation(async (key: string, defaultValue?: string) => {
    const map: Record<string, string> = {
      'finance.default_currency': 'CNY',
      'finance.base_currency': 'CNY',
    };
    return map[key] ?? defaultValue ?? '';
  });
  vi.mocked(getSystemConfigBoolean).mockResolvedValue(false);
  vi.mocked(getSystemConfigNumber).mockImplementation(async (_key: string, defaultValue?: number) => {
    return defaultValue ?? 0;
  });
}

describe('PurchaseApplicationService.createOrder', () => {
  let service: PurchaseApplicationService;
  let mockOrderRepo: IPurchaseOrderRepository;
  let mockCurrencyService: CurrencyApplicationService;

  beforeEach(() => {
    vi.clearAllMocks();
    defaultSystemConfigMocks();
    mockOrderRepo = createMockOrderRepo();
    mockCurrencyService = {
      getLatestRate: vi.fn().mockResolvedValue(1),
      convertToBaseCurrency: vi.fn(),
      clearCache: vi.fn(),
    } as unknown as CurrencyApplicationService;
    service = new PurchaseApplicationService(mockOrderRepo, mockCurrencyService);
  });

  const baseLineProps = {
    lineNo: 1,
    materialId: 1001,
    materialCode: 'M-001',
    materialName: '测试物料',
    unit: '件',
    orderQty: 10,
    receivedQty: 0,
    returnedQty: 0,
    unitPrice: 100,
    amount: 0,
    taxRate: 13,
    taxAmount: 0,
    lineTotal: 0,
  };

  it('使用默认 CNY 币种时，base 字段与原始金额一致（无需换算）', async () => {
    const props: PurchaseOrderProps = {
      supplierId: 1,
      supplierName: '测试供应商',
      orderDate: '2026-07-17',
      lines: [{ ...baseLineProps }],
    };

    const result = await service.createOrder(props);

    expect(result.id).toBe(1);
    expect(vi.mocked(getSystemConfig)).toHaveBeenCalledWith('finance.base_currency', 'CNY');
    expect(mockCurrencyService.getLatestRate).not.toHaveBeenCalled();

    const savedOrder = vi.mocked(mockOrderRepo.save).mock.calls[0][0];
    expect(savedOrder.baseCurrency).toBe('CNY');
    expect(savedOrder.exchangeRate).toBe(1);
    expect(savedOrder.baseTotalAmount).toBe(1000);
    expect(savedOrder.baseTaxAmount).toBe(130);
    expect(savedOrder.baseGrandTotal).toBe(1130);
    expect(savedOrder.lines[0].baseUnitPrice).toBe(100);
    expect(savedOrder.lines[0].baseAmount).toBe(1000);
    expect(savedOrder.lines[0].baseTaxAmount).toBe(130);
    expect(savedOrder.lines[0].baseLineTotal).toBe(1130);
  });

  it('使用非 CNY 币种时调用汇率服务换算本位币金额', async () => {
    vi.mocked(mockCurrencyService.getLatestRate).mockResolvedValue(7.25);

    const props: PurchaseOrderProps = {
      supplierId: 1,
      supplierName: '测试供应商',
      orderDate: '2026-07-17',
      currency: 'USD',
      lines: [{ ...baseLineProps }],
    };

    const result = await service.createOrder(props);

    expect(result.id).toBe(1);
    expect(mockCurrencyService.getLatestRate).toHaveBeenCalledWith('USD', 'CNY');
    expect(vi.mocked(getSystemConfig)).toHaveBeenCalledWith('finance.base_currency', 'CNY');

    const savedOrder = vi.mocked(mockOrderRepo.save).mock.calls[0][0];
    expect(savedOrder.baseCurrency).toBe('CNY');
    expect(savedOrder.exchangeRate).toBe(7.25);
    expect(savedOrder.lines[0].baseUnitPrice).toBe(725);
    expect(savedOrder.lines[0].baseAmount).toBe(7250);
    expect(savedOrder.lines[0].baseTaxAmount).toBe(942.5);
    expect(savedOrder.lines[0].baseLineTotal).toBe(8192.5);
    expect(savedOrder.baseTotalAmount).toBe(7250);
    expect(savedOrder.baseTaxAmount).toBe(942.5);
    expect(savedOrder.baseGrandTotal).toBe(8192.5);
  });

  it('显式传入币种时不查询系统默认币种配置', async () => {
    const props: PurchaseOrderProps = {
      supplierId: 1,
      supplierName: '测试供应商',
      orderDate: '2026-07-17',
      currency: 'EUR',
      lines: [{ ...baseLineProps }],
    };

    vi.mocked(mockCurrencyService.getLatestRate).mockResolvedValue(0.5);
    await service.createOrder(props);

    const calls = vi.mocked(getSystemConfig).mock.calls;
    const defaultCurrencyCalls = calls.filter(c => c[0] === 'finance.default_currency');
    expect(defaultCurrencyCalls.length).toBe(0);
    expect(mockCurrencyService.getLatestRate).toHaveBeenCalledWith('EUR', 'CNY');
  });

  it('各行 base 金额 = 原始金额 × 汇率', async () => {
    vi.mocked(mockCurrencyService.getLatestRate).mockResolvedValue(7.25);

    const props: PurchaseOrderProps = {
      supplierId: 1,
      supplierName: '测试供应商',
      orderDate: '2026-07-17',
      currency: 'USD',
      lines: [
        {
          ...baseLineProps,
          lineNo: 1,
          orderQty: 10,
          unitPrice: 100,
        },
        {
          ...baseLineProps,
          lineNo: 2,
          orderQty: 5,
          unitPrice: 200,
        },
      ],
    };

    await service.createOrder(props);

    const savedOrder = vi.mocked(mockOrderRepo.save).mock.calls[0][0];
    const lines = savedOrder.lines;

    // Line1: qty=10, price=100, amount=1000, tax=130, total=1130
    expect(lines[0].baseUnitPrice).toBe(725);
    expect(lines[0].baseAmount).toBe(7250);
    expect(lines[0].baseLineTotal).toBe(8192.5);

    // Line2: qty=5, price=200, amount=1000, tax=130, total=1130
    expect(lines[1].baseUnitPrice).toBe(1450);
    expect(lines[1].baseAmount).toBe(7250);
    expect(lines[1].baseLineTotal).toBe(8192.5);
  });

  it('表头 base 汇总金额 = 各行 base 金额之和', async () => {
    vi.mocked(mockCurrencyService.getLatestRate).mockResolvedValue(0.5);

    const props: PurchaseOrderProps = {
      supplierId: 1,
      supplierName: '测试供应商',
      orderDate: '2026-07-17',
      currency: 'JPY',
      lines: [
        {
          ...baseLineProps,
          lineNo: 1,
          orderQty: 10,
          unitPrice: 100,
        },
        {
          ...baseLineProps,
          lineNo: 2,
          orderQty: 20,
          unitPrice: 50,
        },
      ],
    };

    await service.createOrder(props);

    const savedOrder = vi.mocked(mockOrderRepo.save).mock.calls[0][0];
    const lines = savedOrder.lines;
    const baseTotalAmount = lines.reduce((s: number, l: any) => s + l.baseAmount, 0);
    const baseTaxAmount = lines.reduce((s: number, l: any) => s + l.baseTaxAmount, 0);
    const baseLineTotal = lines.reduce((s: number, l: any) => s + l.baseLineTotal, 0);

    expect(savedOrder.baseTotalAmount).toBe(baseTotalAmount);
    expect(savedOrder.baseTaxAmount).toBe(baseTaxAmount);
    expect(savedOrder.baseGrandTotal).toBe(baseLineTotal);
  });
});
