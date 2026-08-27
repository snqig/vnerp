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

// 引用完整性守卫在此测试中是「已通过」的桩，避免 fromPO 容差用例被真实 DB 查询拖垮。
vi.mock('@/lib/reference-validation', () => ({
  assertWarehouseExists: vi.fn().mockResolvedValue({ warehouse_name: '测试仓库' }),
  assertAllMaterialsExist: vi.fn().mockResolvedValue(undefined),
  assertSupplierExists: vi.fn().mockResolvedValue({ supplier_name: '测试供应商' }),
  assertEntityExists: vi.fn().mockResolvedValue({ id: 1 }),
  assertMaterialExists: vi.fn().mockResolvedValue({ material_name: 'M' }),
}));

import { InboundApplicationService } from '@/application/services/InboundApplicationService';
import { CurrencyApplicationService } from '@/application/services/CurrencyApplicationService';
import { PurchaseOrder, PurchaseOrderProps } from '@/domain/purchase/aggregates/PurchaseOrder';
import { DomainError } from '@/domain/shared/DomainTypes';
import { getSystemConfig } from '@/lib/system-config';
import type { IInboundOrderRepository } from '@/domain/warehouse/repositories/IInboundOrderRepository';
import type { IPurchaseOrderRepository } from '@/domain/purchase/repositories/IPurchaseOrderRepository';

function createMockOrderRepo(): IInboundOrderRepository {
  return {
    findById: vi.fn(),
    findByStatus: vi.fn(),
    save: vi.fn().mockResolvedValue({ id: 1, orderNo: 'IN20260717001' }),
    updateStatus: vi.fn().mockResolvedValue(true),
    updateOrderContent: vi.fn().mockResolvedValue({ id: 1, orderNo: 'IN20260717001' }),
    updateInspectionAndFinance: vi.fn(),
    softDelete: vi.fn(),
  };
}

function createMockPurchaseRepo(): IPurchaseOrderRepository {
  return {
    findById: vi.fn(),
    findByOrderNo: vi.fn(),
    findByStatus: vi.fn(),
    save: vi.fn().mockResolvedValue({ id: 5, orderNo: 'PO20260717001' }),
    updateStatus: vi.fn().mockResolvedValue(true),
    updateReceivedQty: vi.fn(),
    updateAuditInfo: vi.fn(),
    softDelete: vi.fn(),
  };
}

/** 构造指定状态/容差/已收量的采购单聚合根（status 非法时 fromDbCode 兜底为 draft） */
function buildPurchaseOrder(
  status: string = 'approved',
  overReceiptTolerance: number = 10,
  receivedQty: number = 0
): PurchaseOrder {
  const props: PurchaseOrderProps = {
    id: 5,
    orderNo: 'PO20260717001',
    status: status as PurchaseOrderProps['status'],
    supplierId: 1,
    supplierName: '测试供应商',
    orderDate: '2026-07-17',
    currency: 'CNY',
    exchangeRate: 1,
    overReceiptTolerance,
    lines: [
      {
        id: 51,
        orderId: 5,
        lineNo: 1,
        materialId: 1001,
        materialCode: 'M-001',
        materialName: '测试物料',
        unit: '件',
        orderQty: 10,
        receivedQty,
        returnedQty: 0,
        unitPrice: 100,
        amount: 1000,
        taxRate: 13,
        taxAmount: 130,
        lineTotal: 1130,
      },
    ],
  };
  return PurchaseOrder.reconstitute(props);
}

const baseParams = {
  poId: 5,
  warehouseId: 10,
  items: [
    {
      lineNo: 1,
      materialId: 1001,
      materialCode: 'M-001',
      materialName: '测试物料',
      unit: '件',
      batchNo: 'B-001',
      quantity: 6,
      unitPrice: 100,
    },
  ],
};

describe('InboundApplicationService.createInboundFromPO', () => {
  let service: InboundApplicationService;
  let mockOrderRepo: IInboundOrderRepository;
  let mockPurchaseRepo: IPurchaseOrderRepository;
  let mockCurrencyService: CurrencyApplicationService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSystemConfig).mockImplementation(async (key: string, defaultValue?: string) => {
      return key === 'finance.base_currency' ? 'CNY' : (defaultValue ?? '');
    });
    mockOrderRepo = createMockOrderRepo();
    mockPurchaseRepo = createMockPurchaseRepo();
    mockCurrencyService = {
      getLatestRate: vi.fn().mockResolvedValue(1),
      convertToBaseCurrency: vi.fn(),
      clearCache: vi.fn(),
    } as unknown as CurrencyApplicationService;
    service = new InboundApplicationService(mockOrderRepo, mockCurrencyService, mockPurchaseRepo);
  });

  it('容差内通过：quantity <= maxAllowed - receivedQty 时创建成功', async () => {
    // orderQty=10, tolerance=10% → maxAllowed=11；已收 5 → 本次最多 6
    vi.mocked(mockPurchaseRepo.findById).mockResolvedValue(buildPurchaseOrder('approved', 10, 5));

    const result = await service.createInboundFromPO(baseParams);

    expect(result).toEqual({ id: 1, orderNo: 'IN20260717001' });
    expect(mockOrderRepo.save).toHaveBeenCalledTimes(1);
  });

  it('超容差拦截：quantity > maxAllowed - receivedQty 时抛 DomainError，不落库', async () => {
    vi.mocked(mockPurchaseRepo.findById).mockResolvedValue(buildPurchaseOrder('approved', 10, 5));

    await expect(
      service.createInboundFromPO({ ...baseParams, items: [{ ...baseParams.items[0], quantity: 7 }] })
    ).rejects.toThrow(DomainError);
    expect(mockOrderRepo.save).not.toHaveBeenCalled();
  });

  it('source 透传：sourceType/sourceOrderId/purchaseOrderItemId/purchaseOrderLineNo 写入聚合', async () => {
    vi.mocked(mockPurchaseRepo.findById).mockResolvedValue(buildPurchaseOrder('approved', 10, 0));

    await service.createInboundFromPO(baseParams);

    const savedOrder = vi.mocked(mockOrderRepo.save).mock.calls[0][0];
    expect(savedOrder.sourceType).toBe('purchase_order');
    expect(savedOrder.sourceOrderId).toBe(5);
    expect(savedOrder.poId).toBe(5);
    expect(savedOrder.poNo).toBe('PO20260717001');
    expect(savedOrder.supplierId).toBe(1);
    expect(savedOrder.items[0].purchaseOrderItemId).toBe(51);
    expect(savedOrder.items[0].purchaseOrderLineNo).toBe(1);
  });

  it('非法订单状态拦截：draft/completed 单拒绝创建', async () => {
    for (const status of ['draft', 'completed']) {
      vi.mocked(mockPurchaseRepo.findById).mockResolvedValue(
        buildPurchaseOrder(status, 10, 0)
      );
      await expect(service.createInboundFromPO(baseParams)).rejects.toThrow(
        /不允许创建入库单/
      );
      expect(mockOrderRepo.save).not.toHaveBeenCalled();
    }
  });

  it('采购单不存在时抛 NotFoundError', async () => {
    vi.mocked(mockPurchaseRepo.findById).mockResolvedValue(null);

    await expect(service.createInboundFromPO(baseParams)).rejects.toThrow(/采购单不存在/);
  });
});
