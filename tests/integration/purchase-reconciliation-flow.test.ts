/**
 * 采购对账模块集成测试
 * 验证创建、确认、核销、关闭、删除流程的端到端数据一致性
 *
 * 测试策略：
 * - Mock @/lib/db（query/execute/transaction）与 @/lib/logger
 * - Mock DomainEventOutboxFactory（避免事件总线依赖）
 * - 使用真实 PurchaseReconciliationApplicationService + Mock 仓储
 * - 使用真实 PurchaseReconciliation 聚合（reconstitute）构造测试数据
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockConn = {
  execute: vi.fn(),
};

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  execute: vi.fn(),
  transaction: vi.fn((fn: any) => fn(mockConn)),
}));

vi.mock('@/lib/logger', () => ({
  secureLog: vi.fn(),
}));

vi.mock('@/infrastructure/event-bus/DomainEventOutboxFactory', () => ({
  getDomainEventOutbox: () => ({
    saveEvents: vi.fn().mockResolvedValue(undefined),
  }),
}));

import { PurchaseReconciliationApplicationService } from '@/application/services/PurchaseReconciliationApplicationService';
import { PurchaseReconciliation } from '@/domain/purchase/aggregates/PurchaseReconciliation';
import {
  DomainError,
  NotFoundError,
  VersionConflictError,
} from '@/domain/shared/DomainTypes';
import { transaction } from '@/lib/db';

// 构造一个已确认状态（status=2）的对账单聚合
function makeConfirmedRecon(balance = 1000): PurchaseReconciliation {
  return PurchaseReconciliation.reconstitute({
    id: 1,
    reconciliationNo: 'PRC20260101001',
    status: 2,
    supplierId: 10,
    supplierName: '测试供应商',
    periodStart: '2026-01-01',
    periodEnd: '2026-01-31',
    receiptAmount: 1200,
    returnAmount: 200,
    netAmount: 1000,
    discountAmount: 0,
    paidAmount: 0,
    balanceAmount: balance,
    lines: [],
    writeOffRecords: [],
    remark: '',
    createBy: 1,
    confirmBy: 1,
    confirmTime: '2026-01-15 10:00:00',
  });
}

// 构造一个草稿状态（status=1）的对账单
function makeDraftRecon(): PurchaseReconciliation {
  return PurchaseReconciliation.reconstitute({
    id: 2,
    reconciliationNo: 'PRC20260101002',
    status: 1,
    supplierId: 10,
    supplierName: '测试供应商',
    periodStart: '2026-02-01',
    periodEnd: '2026-02-28',
    receiptAmount: 500,
    returnAmount: 0,
    netAmount: 500,
    discountAmount: 0,
    paidAmount: 0,
    balanceAmount: 500,
    lines: [],
    writeOffRecords: [],
    remark: '',
    createBy: 1,
  });
}

// 构造一个已核销完成状态（status=4）的对账单（可关闭）
function makeWrittenOffRecon(): PurchaseReconciliation {
  return PurchaseReconciliation.reconstitute({
    id: 3,
    reconciliationNo: 'PRC20260101003',
    status: 4,
    supplierId: 10,
    supplierName: '测试供应商',
    periodStart: '2026-01-01',
    periodEnd: '2026-01-31',
    receiptAmount: 1000,
    returnAmount: 0,
    netAmount: 1000,
    discountAmount: 0,
    paidAmount: 1000,
    balanceAmount: 0,
    lines: [],
    writeOffRecords: [],
    remark: '',
    createBy: 1,
    confirmBy: 1,
    confirmTime: '2026-01-15 10:00:00',
  });
}

// Mock 应付单（满足 IPayableRepository.findById 返回的结构）
function makeMockPayable(balance = 1000) {
  return {
    id: 100,
    payableNo: 'PAY20260101001',
    supplierId: 10,
    balance: { amount: balance },
    paidAmount: { amount: 0 },
    amount: { amount: balance },
    status: { value: 1 },
  } as any;
}

function makeService(recon: PurchaseReconciliation | null, payable: any | null) {
  const reconRepo = {
    findById: vi.fn().mockResolvedValue(recon),
    findByReconciliationNo: vi.fn(),
    findBySupplierId: vi.fn(),
    findByStatus: vi.fn(),
    save: vi.fn(),
    updateStatus: vi.fn(),
    updateConfirmInfo: vi.fn(),
    updateCloseInfo: vi.fn(),
    addWriteOffRecord: vi.fn(),
    softDelete: vi.fn(),
  };
  const payableRepo = {
    findById: vi.fn().mockResolvedValue(payable),
  };
  const service = new PurchaseReconciliationApplicationService(
    reconRepo as any,
    payableRepo as any
  );
  return { service, reconRepo, payableRepo };
}

describe('采购对账模块集成测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConn.execute.mockReset();
    vi.mocked(transaction).mockImplementation((fn: any) => fn(mockConn));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('确认对账单', () => {
    it('草稿状态对账单应成功确认（status 1→2）', async () => {
      const draft = makeDraftRecon();
      const { service, reconRepo } = makeService(draft, null);

      const result = await service.confirmReconciliation(2, 5);

      expect(result.status).toBe(2);
      expect(reconRepo.updateConfirmInfo).toHaveBeenCalledWith(
        2,
        5,
        expect.any(String)
      );
    });

    it('已确认状态再次确认应抛出 DomainError', async () => {
      const confirmed = makeConfirmedRecon();
      const { service } = makeService(confirmed, null);

      await expect(service.confirmReconciliation(1, 5)).rejects.toThrow(
        DomainError
      );
    });
  });

  describe('核销对账单', () => {
    it('部分核销应更新余额并保持部分核销状态（status 2→3）', async () => {
      const recon = makeConfirmedRecon(1000);
      const payable = makeMockPayable(1000);
      const { service } = makeService(recon, payable);

      // mockConn.execute 调用顺序：
      // 1. INSERT writeoff record → { insertId: 1 }（不解构，对象格式即可）
      // 2. UPDATE reconciliation（乐观锁）→ [{ affectedRows: 1 }]（service 中使用数组解构）
      mockConn.execute
        .mockResolvedValueOnce({ insertId: 1 } as any)
        .mockResolvedValueOnce([{ affectedRows: 1 }] as any);

      const result = await service.writeOff({
        reconciliationId: 1,
        payableId: 100,
        amount: 300,
      });

      expect(result.status).toBe(3); // 部分核销
      expect(result.paidAmount).toBe(300);
      expect(result.balanceAmount).toBe(700);

      // 验证 INSERT writeoff 记录
      expect(mockConn.execute).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('INSERT INTO pur_purchase_reconciliation_writeoff'),
        expect.arrayContaining([1, 100, 300])
      );

      // 验证 UPDATE 对账单（含乐观锁 WHERE balance_amount = 1000）
      expect(mockConn.execute).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('UPDATE pur_purchase_reconciliation'),
        expect.arrayContaining([300, 700, 3, 1, 1000])
      );
    });

    it('全额核销应将对账单状态转为已核销完成（status→4）', async () => {
      const recon = makeConfirmedRecon(1000);
      const payable = makeMockPayable(1000);
      const { service } = makeService(recon, payable);

      mockConn.execute
        .mockResolvedValueOnce({ insertId: 1 } as any)
        .mockResolvedValueOnce([{ affectedRows: 1 }] as any);

      const result = await service.writeOff({
        reconciliationId: 1,
        payableId: 100,
        amount: 1000,
      });

      expect(result.status).toBe(4); // 已核销完成
      expect(result.paidAmount).toBe(1000);
      expect(result.balanceAmount).toBe(0);
    });

    it('核销金额超过对账单余额应抛出 DomainError', async () => {
      const recon = makeConfirmedRecon(500);
      const payable = makeMockPayable(1000);
      const { service } = makeService(recon, payable);

      await expect(
        service.writeOff({
          reconciliationId: 1,
          payableId: 100,
          amount: 600,
        })
      ).rejects.toThrow(DomainError);
    });

    it('核销金额超过应付单余额应抛出 DomainError', async () => {
      const recon = makeConfirmedRecon(1000);
      const payable = makeMockPayable(300);
      const { service } = makeService(recon, payable);

      await expect(
        service.writeOff({
          reconciliationId: 1,
          payableId: 100,
          amount: 500,
        })
      ).rejects.toThrow(DomainError);
    });

    it('并发核销（余额已被其他事务修改）应抛出 VersionConflictError', async () => {
      const recon = makeConfirmedRecon(1000);
      const payable = makeMockPayable(1000);
      const { service } = makeService(recon, payable);

      // 模拟乐观锁冲突：UPDATE affectedRows = 0（数组格式，service 使用解构）
      mockConn.execute
        .mockResolvedValueOnce({ insertId: 1 } as any)
        .mockResolvedValueOnce([{ affectedRows: 0 }] as any);

      await expect(
        service.writeOff({
          reconciliationId: 1,
          payableId: 100,
          amount: 300,
        })
      ).rejects.toThrow(VersionConflictError);
    });

    it('应付单不存在应抛出 NotFoundError', async () => {
      const recon = makeConfirmedRecon(1000);
      const { service } = makeService(recon, null);

      await expect(
        service.writeOff({
          reconciliationId: 1,
          payableId: 999,
          amount: 300,
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('关闭对账单', () => {
    it('已核销完成状态对账单应成功关闭（status 4→9）', async () => {
      const recon = makeWrittenOffRecon();
      const { service, reconRepo } = makeService(recon, null);

      const result = await service.closeReconciliation(3, 5);

      expect(result.status).toBe(9);
      expect(reconRepo.updateCloseInfo).toHaveBeenCalledWith(
        3,
        5,
        expect.any(String)
      );
    });

    it('未核销完成状态对账单关闭应抛出 DomainError', async () => {
      const recon = makeConfirmedRecon(1000);
      const { service } = makeService(recon, null);

      await expect(service.closeReconciliation(1, 5)).rejects.toThrow(
        DomainError
      );
    });
  });

  describe('删除对账单', () => {
    it('草稿状态对账单应成功删除', async () => {
      const draft = makeDraftRecon();
      const { service, reconRepo } = makeService(draft, null);

      await service.deleteReconciliation(2);

      expect(reconRepo.softDelete).toHaveBeenCalledWith(2);
    });

    it('已确认状态对账单删除应抛出 DomainError', async () => {
      const confirmed = makeConfirmedRecon();
      const { service } = makeService(confirmed, null);

      await expect(service.deleteReconciliation(1)).rejects.toThrow(DomainError);
    });
  });

  describe('创建对账单', () => {
    it('应创建草稿状态对账单并持久化事件', async () => {
      const { service, reconRepo } = makeService(null, null);
      reconRepo.save.mockResolvedValue({ id: 5, reconciliationNo: 'PRC20260301001' });

      const result = await service.createReconciliation({
        reconciliationNo: '',
        supplierId: 10,
        supplierName: '新供应商',
        periodStart: '2026-03-01',
        periodEnd: '2026-03-31',
        receiptAmount: 800,
        returnAmount: 100,
        remark: '月度对账',
        createBy: 1,
      });

      expect(result.id).toBe(5);
      expect(result.reconciliationNo).toBe('PRC20260301001');
      expect(reconRepo.save).toHaveBeenCalledTimes(1);

      // 验证传入 save 的聚合状态为草稿（1）
      const savedRecon = reconRepo.save.mock.calls[0][0];
      expect(savedRecon.status.value).toBe(1);
      expect(savedRecon.netAmount).toBe(700); // 800 - 100
      expect(savedRecon.balanceAmount).toBe(700); // net - discount(0) - paid(0)
    });

    it('退货金额超过收货金额应抛出 DomainError', async () => {
      const { service } = makeService(null, null);

      await expect(
        service.createReconciliation({
          supplierId: 10,
          periodStart: '2026-03-01',
          periodEnd: '2026-03-31',
          receiptAmount: 500,
          returnAmount: 600,
        } as any)
      ).rejects.toThrow(DomainError);
    });
  });
});
