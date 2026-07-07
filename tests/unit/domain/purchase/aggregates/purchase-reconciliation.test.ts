import { describe, it, expect } from 'vitest';
import {
  PurchaseReconciliation,
  PurchaseReconciliationProps,
} from '@/domain/purchase/aggregates/PurchaseReconciliation';
import {
  PurchaseReconciliationStatus,
  PurchaseReconciliationStatusEnum,
} from '@/domain/purchase/value-objects/PurchaseReconciliationStatus';
import { DomainError } from '@/domain/shared/DomainTypes';

function makeProps(overrides: Partial<PurchaseReconciliationProps> = {}): PurchaseReconciliationProps {
  return {
    supplierId: 1,
    supplierName: '测试供应商',
    periodStart: '2026-01-01',
    periodEnd: '2026-01-31',
    receiptAmount: 10000,
    returnAmount: 1000,
    ...overrides,
  };
}

describe('PurchaseReconciliation 聚合根', () => {
  describe('create() 工厂方法', () => {
    it('合法参数创建成功，状态为草稿(1)', () => {
      const recon = PurchaseReconciliation.create(makeProps());
      expect(recon.status.value).toBe(1);
      expect(recon.supplierId).toBe(1);
      expect(recon.supplierName).toBe('测试供应商');
      expect(recon.receiptAmount).toBe(10000);
      expect(recon.returnAmount).toBe(1000);
      expect(recon.netAmount).toBe(9000);
      expect(recon.discountAmount).toBe(0);
      expect(recon.balanceAmount).toBe(9000);
      expect(recon.paidAmount).toBe(0);
    });

    it('含折扣金额时正确计算余额', () => {
      const recon = PurchaseReconciliation.create(
        makeProps({ discountAmount: 500 })
      );
      expect(recon.netAmount).toBe(9000);
      expect(recon.discountAmount).toBe(500);
      expect(recon.balanceAmount).toBe(8500);
    });

    it('供应商ID为空抛错', () => {
      expect(() => PurchaseReconciliation.create(makeProps({ supplierId: 0 }))).toThrow(DomainError);
    });

    it('对账时段为空抛错', () => {
      expect(() => PurchaseReconciliation.create(makeProps({ periodStart: '', periodEnd: '' }))).toThrow(DomainError);
    });

    it('开始日期晚于结束日期抛错', () => {
      expect(() =>
        PurchaseReconciliation.create(makeProps({ periodStart: '2026-02-01', periodEnd: '2026-01-01' }))
      ).toThrow(DomainError);
    });

    it('退货金额超过收货金额抛错', () => {
      expect(() =>
        PurchaseReconciliation.create(makeProps({ receiptAmount: 500, returnAmount: 1000 }))
      ).toThrow(DomainError);
    });

    it('有 id 时发布 CreatedEvent', () => {
      const recon = PurchaseReconciliation.create(makeProps({ id: 1 }));
      const events = recon.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('purchase_reconciliation.created');
    });
  });

  describe('reconstitute() 重建方法', () => {
    it('从 DB 字段重建聚合', () => {
      const recon = PurchaseReconciliation.reconstitute(
        makeProps({
          id: 1,
          reconciliationNo: 'PRC-001',
          status: 3,
          paidAmount: 3000,
          balanceAmount: 6000,
        })
      );
      expect(recon.id).toBe(1);
      expect(recon.reconciliationNo).toBe('PRC-001');
      expect(recon.status.value).toBe(3);
      expect(recon.paidAmount).toBe(3000);
      expect(recon.balanceAmount).toBe(6000);
    });

    it('未指定 balanceAmount 时自动计算', () => {
      const recon = PurchaseReconciliation.reconstitute(
        makeProps({ id: 1, paidAmount: 3000 })
      );
      expect(recon.balanceAmount).toBe(6000);
    });
  });

  describe('confirm() 确认流程', () => {
    it('草稿 → 已确认，设置确认人', () => {
      const recon = PurchaseReconciliation.create(makeProps({ id: 1 }));
      recon.clearDomainEvents();

      recon.confirm(10);

      expect(recon.status.value).toBe(2);
      expect(recon.confirmBy).toBe(10);
      expect(recon.confirmTime).toBeTruthy();
    });

    it('发布 ConfirmedEvent', () => {
      const recon = PurchaseReconciliation.create(makeProps({ id: 1 }));
      recon.clearDomainEvents();

      recon.confirm(10);

      const events = recon.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('purchase_reconciliation.confirmed');
    });

    it('已确认状态再次确认抛错', () => {
      const recon = PurchaseReconciliation.reconstitute(makeProps({ id: 1, status: 2 }));
      expect(() => recon.confirm(10)).toThrow(DomainError);
    });

    it('确认人为空抛错', () => {
      const recon = PurchaseReconciliation.create(makeProps({ id: 1 }));
      expect(() => recon.confirm(0)).toThrow(DomainError);
    });
  });

  describe('writeOff() 核销流程', () => {
    it('已确认 → 部分核销', () => {
      const recon = PurchaseReconciliation.reconstitute(
        makeProps({ id: 1, status: 2, balanceAmount: 9000 })
      );
      recon.clearDomainEvents();

      recon.writeOff(1, 3000);

      expect(recon.status.value).toBe(3);
      expect(recon.paidAmount).toBe(3000);
      expect(recon.balanceAmount).toBe(6000);
    });

    it('发布 PartialWrittenOffEvent', () => {
      const recon = PurchaseReconciliation.reconstitute(
        makeProps({ id: 1, status: 2, balanceAmount: 9000 })
      );
      recon.clearDomainEvents();

      recon.writeOff(1, 3000);

      const events = recon.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('purchase_reconciliation.partial_written_off');
    });

    it('全额核销 → 已核销完成(4)', () => {
      const recon = PurchaseReconciliation.reconstitute(
        makeProps({ id: 1, status: 2, balanceAmount: 9000 })
      );
      recon.clearDomainEvents();

      recon.writeOff(1, 9000);

      expect(recon.status.value).toBe(4);
      expect(recon.balanceAmount).toBe(0);
      const events = recon.getDomainEvents();
      expect(events[0].eventType).toBe('purchase_reconciliation.written_off');
    });

    it('多次部分核销', () => {
      const recon = PurchaseReconciliation.reconstitute(
        makeProps({ id: 1, status: 2, balanceAmount: 9000 })
      );

      recon.writeOff(1, 3000);
      expect(recon.status.value).toBe(3);
      expect(recon.balanceAmount).toBe(6000);

      recon.writeOff(2, 3000);
      expect(recon.status.value).toBe(3);
      expect(recon.balanceAmount).toBe(3000);

      recon.writeOff(3, 3000);
      expect(recon.status.value).toBe(4);
      expect(recon.balanceAmount).toBe(0);
    });

    it('核销金额超过余额抛错', () => {
      const recon = PurchaseReconciliation.reconstitute(
        makeProps({ id: 1, status: 2, balanceAmount: 5000 })
      );
      expect(() => recon.writeOff(1, 6000)).toThrow(DomainError);
    });

    it('核销金额为0抛错', () => {
      const recon = PurchaseReconciliation.reconstitute(
        makeProps({ id: 1, status: 2, balanceAmount: 9000 })
      );
      expect(() => recon.writeOff(1, 0)).toThrow(DomainError);
    });

    it('应付单ID为空抛错', () => {
      const recon = PurchaseReconciliation.reconstitute(
        makeProps({ id: 1, status: 2, balanceAmount: 9000 })
      );
      expect(() => recon.writeOff(0, 1000)).toThrow(DomainError);
    });

    it('草稿状态核销抛错', () => {
      const recon = PurchaseReconciliation.create(makeProps({ id: 1 }));
      expect(() => recon.writeOff(1, 1000)).toThrow(DomainError);
    });

    it('getWriteOffSummary 返回按应付单汇总', () => {
      const recon = PurchaseReconciliation.reconstitute(
        makeProps({ id: 1, status: 2, balanceAmount: 9000 })
      );

      recon.writeOff(1, 3000);
      recon.writeOff(1, 2000);
      recon.writeOff(2, 1000);

      const summary = recon.getWriteOffSummary();
      expect(summary).toHaveLength(2);
      const pay1 = summary.find((s) => s.payableId === 1);
      expect(pay1?.totalAmount).toBe(5000);
      expect(pay1?.count).toBe(2);
      const pay2 = summary.find((s) => s.payableId === 2);
      expect(pay2?.totalAmount).toBe(1000);
      expect(pay2?.count).toBe(1);
    });
  });

  describe('close() 关闭流程', () => {
    it('已核销完成 → 已关闭', () => {
      const recon = PurchaseReconciliation.reconstitute(
        makeProps({ id: 1, status: 4, balanceAmount: 0 })
      );
      recon.clearDomainEvents();

      recon.close(10);

      expect(recon.status.value).toBe(9);
      expect(recon.closeBy).toBe(10);
      expect(recon.closeTime).toBeTruthy();
    });

    it('发布 ClosedEvent', () => {
      const recon = PurchaseReconciliation.reconstitute(
        makeProps({ id: 1, status: 4, balanceAmount: 0 })
      );
      recon.clearDomainEvents();

      recon.close(10);

      const events = recon.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('purchase_reconciliation.closed');
    });

    it('部分核销且有余额时关闭抛错', () => {
      const recon = PurchaseReconciliation.reconstitute(
        makeProps({ id: 1, status: 3, balanceAmount: 5000 })
      );
      expect(() => recon.close(10)).toThrow(DomainError);
    });

    it('部分核销但余额为0时关闭自动转为已核销', () => {
      const recon = PurchaseReconciliation.reconstitute(
        makeProps({ id: 1, status: 3, balanceAmount: 0 })
      );
      recon.close(10);
      expect(recon.status.value).toBe(9);
    });

    it('草稿状态关闭抛错', () => {
      const recon = PurchaseReconciliation.create(makeProps({ id: 1 }));
      expect(() => recon.close(10)).toThrow(DomainError);
    });

    it('关闭人为空抛错', () => {
      const recon = PurchaseReconciliation.reconstitute(
        makeProps({ id: 1, status: 4, balanceAmount: 0 })
      );
      expect(() => recon.close(0)).toThrow(DomainError);
    });
  });

  describe('canEdit / canDelete', () => {
    it('草稿状态可编辑可删除', () => {
      const recon = PurchaseReconciliation.create(makeProps());
      expect(recon.canEdit()).toBe(true);
      expect(recon.canDelete()).toBe(true);
    });

    it('已确认状态不可编辑不可删除', () => {
      const recon = PurchaseReconciliation.reconstitute(makeProps({ status: 2 }));
      expect(recon.canEdit()).toBe(false);
      expect(recon.canDelete()).toBe(false);
    });
  });

  describe('领域事件管理', () => {
    it('getDomainEvents 返回副本（不可变）', () => {
      const recon = PurchaseReconciliation.create(makeProps({ id: 1 }));
      const events = recon.getDomainEvents();
      events.pop();
      expect(recon.getDomainEvents()).toHaveLength(1);
    });

    it('clearDomainEvents 清空事件', () => {
      const recon = PurchaseReconciliation.create(makeProps({ id: 1 }));
      recon.clearDomainEvents();
      expect(recon.getDomainEvents()).toHaveLength(0);
    });
  });

  describe('PurchaseReconciliationStatus 状态机', () => {
    it('状态流转: 1→2→3→4→9', () => {
      const s1 = PurchaseReconciliationStatus.draft();
      const s2 = s1.transitionTo(2);
      const s3 = s2.transitionTo(3);
      const s4 = s3.transitionTo(4);
      const s9 = s4.transitionTo(9);
      expect(s9.value).toBe(9);
    });

    it('非法流转 1→3 抛错', () => {
      const s1 = PurchaseReconciliationStatus.draft();
      expect(() => s1.transitionTo(3)).toThrow(DomainError);
    });

    it('非法流转 1→4 抛错', () => {
      const s1 = PurchaseReconciliationStatus.draft();
      expect(() => s1.transitionTo(4)).toThrow(DomainError);
    });

    it('canWriteOff: 已确认和部分核销可核销', () => {
      expect(PurchaseReconciliationStatus.confirmed().canWriteOff()).toBe(true);
      expect(PurchaseReconciliationStatus.partialWrittenOff().canWriteOff()).toBe(true);
      expect(PurchaseReconciliationStatus.draft().canWriteOff()).toBe(false);
    });

    it('canClose: 仅已核销完成可关闭', () => {
      expect(PurchaseReconciliationStatus.writtenOff().canClose()).toBe(true);
      expect(PurchaseReconciliationStatus.confirmed().canClose()).toBe(false);
    });

    it('equals 正确比较', () => {
      expect(PurchaseReconciliationStatus.draft().equals(PurchaseReconciliationStatus.draft())).toBe(true);
      expect(PurchaseReconciliationStatus.draft().equals(PurchaseReconciliationStatus.confirmed())).toBe(false);
    });
  });
});
