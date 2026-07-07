import { describe, it, expect, beforeEach } from 'vitest';
import { Payable, type PayableProps } from '@/domain/finance/aggregates/Payable';
import { PayableStatusEnum } from '@/domain/finance/value-objects/PayableStatus';
import { DomainError } from '@/domain/shared/DomainTypes';

function makeProps(overrides: Partial<PayableProps> = {}): PayableProps {
  return {
    id: 1,
    payableNo: 'PAY001',
    sourceType: 1,
    sourceId: 200,
    sourceNo: 'PO001',
    supplierId: 20,
    supplierName: '测试供应商',
    amount: 2000,
    dueDate: '2026-08-15',
    ...overrides,
  };
}

describe('Payable 聚合根', () => {
  describe('create() 工厂方法', () => {
    it('合法参数创建成功，状态为 UNPAID(1)', () => {
      const payable = Payable.create(makeProps());
      expect(payable.status.value).toBe(PayableStatusEnum.UNPAID);
      expect(payable.payableNo).toBe('PAY001');
      expect(payable.supplierId).toBe(20);
      expect(payable.amount.amount).toBe(2000);
      expect(payable.paidAmount.amount).toBe(0);
      expect(payable.balance.amount).toBe(2000);
    });

    it('有 id 时发布 PayableCreatedEvent', () => {
      const payable = Payable.create(makeProps({ id: 100 }));
      const events = payable.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('payable.created');
      expect(events[0].payload.payableId).toBe(100);
      expect(events[0].payload.supplierId).toBe(20);
      expect(events[0].payload.amount).toBe(2000);
    });

    it('无 id 时不发布创建事件', () => {
      const payable = Payable.create(makeProps({ id: undefined }));
      expect(payable.getDomainEvents()).toHaveLength(0);
    });

    it('supplierId 为 0 抛 DomainError', () => {
      expect(() => Payable.create(makeProps({ supplierId: 0 }))).toThrow(DomainError);
      expect(() => Payable.create(makeProps({ supplierId: 0 }))).toThrow(/供应商ID不能为空/);
    });

    it('amount 为 0 抛 DomainError', () => {
      expect(() => Payable.create(makeProps({ amount: 0 }))).toThrow(DomainError);
      expect(() => Payable.create(makeProps({ amount: 0 }))).toThrow(/应付金额必须大于0/);
    });
  });

  describe('reconstitute() 重建方法', () => {
    it('从 DB 字段重建聚合', () => {
      const payable = Payable.reconstitute(
        makeProps({
          status: PayableStatusEnum.PARTIAL,
          paidAmount: 500,
          balance: 1500,
        })
      );
      expect(payable.status.value).toBe(PayableStatusEnum.PARTIAL);
      expect(payable.paidAmount.amount).toBe(500);
      expect(payable.balance.amount).toBe(1500);
    });

    it('未指定 balance 时回退为 amount', () => {
      const payable = Payable.reconstitute(
        makeProps({ balance: undefined, paidAmount: 0 })
      );
      expect(payable.balance.amount).toBe(2000);
    });
  });

  describe('recordPayment() 付款流程', () => {
    it('部分付款 → PARTIAL 状态，发布 PartialPaidEvent', () => {
      const payable = Payable.create(makeProps({ id: 1 }));
      payable.clearDomainEvents();

      payable.recordPayment(500, 'PMT001');

      expect(payable.status.value).toBe(PayableStatusEnum.PARTIAL);
      expect(payable.paidAmount.amount).toBe(500);
      expect(payable.balance.amount).toBe(1500);
      const events = payable.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('payable.partial_paid');
      expect(events[0].payload.paidAmount).toBe(500);
      expect(events[0].payload.balance).toBe(1500);
    });

    it('全额付款 → SETTLED 状态，发布 SettledEvent', () => {
      const payable = Payable.create(makeProps({ id: 1, amount: 2000 }));
      payable.clearDomainEvents();

      payable.recordPayment(2000);

      expect(payable.status.value).toBe(PayableStatusEnum.SETTLED);
      expect(payable.paidAmount.amount).toBe(2000);
      expect(payable.balance.amount).toBe(0);
      const events = payable.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('payable.settled');
    });

    it('多次部分付款后结清', () => {
      const payable = Payable.create(makeProps({ id: 1, amount: 2000 }));
      payable.recordPayment(800);
      payable.clearDomainEvents();

      payable.recordPayment(1200);

      expect(payable.status.value).toBe(PayableStatusEnum.SETTLED);
      expect(payable.paidAmount.amount).toBe(2000);
    });

    it('付款金额超过余额抛 DomainError', () => {
      const payable = Payable.create(makeProps({ id: 1, amount: 2000 }));
      expect(() => payable.recordPayment(2001)).toThrow(DomainError);
      expect(() => payable.recordPayment(2001)).toThrow(/超过应付余额/);
    });

    it('付款金额为 0 抛 DomainError', () => {
      const payable = Payable.create(makeProps({ id: 1 }));
      expect(() => payable.recordPayment(0)).toThrow(DomainError);
    });

    it('已结清状态付款抛 DomainError', () => {
      const payable = Payable.reconstitute(
        makeProps({ status: PayableStatusEnum.SETTLED, paidAmount: 2000, balance: 0 })
      );
      expect(() => payable.recordPayment(100)).toThrow(DomainError);
      expect(() => payable.recordPayment(100)).toThrow(/已结清/);
    });
  });

  describe('isOverdue() 逾期判断', () => {
    it('到期日早于当前日期且未结清 → 逾期', () => {
      const payable = Payable.reconstitute(
        makeProps({ dueDate: '2020-01-01', status: PayableStatusEnum.UNPAID })
      );
      expect(payable.isOverdue('2026-07-06')).toBe(true);
    });

    it('已结清 → 未逾期', () => {
      const payable = Payable.reconstitute(
        makeProps({ dueDate: '2020-01-01', status: PayableStatusEnum.SETTLED })
      );
      expect(payable.isOverdue('2026-07-06')).toBe(false);
    });
  });

  describe('领域事件管理', () => {
    it('getDomainEvents 返回副本（不可变）', () => {
      const payable = Payable.create(makeProps({ id: 1 }));
      const events1 = payable.getDomainEvents();
      payable.clearDomainEvents();
      expect(events1).toHaveLength(1);
    });

    it('clearDomainEvents 清空事件', () => {
      const payable = Payable.create(makeProps({ id: 1 }));
      expect(payable.getDomainEvents()).toHaveLength(1);
      payable.clearDomainEvents();
      expect(payable.getDomainEvents()).toHaveLength(0);
    });
  });
});
