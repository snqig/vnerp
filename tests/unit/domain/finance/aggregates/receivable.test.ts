import { describe, it, expect, beforeEach } from 'vitest';
import { Receivable, type ReceivableProps } from '@/domain/finance/aggregates/Receivable';
import { ReceivableStatusEnum } from '@/domain/finance/value-objects/ReceivableStatus';
import { DomainError } from '@/domain/shared/DomainTypes';

function makeProps(overrides: Partial<ReceivableProps> = {}): ReceivableProps {
  return {
    id: 1,
    receivableNo: 'REC001',
    sourceType: 1,
    sourceId: 100,
    sourceNo: 'SO001',
    customerId: 10,
    customerName: '测试客户',
    amount: 1000,
    dueDate: '2026-08-01',
    ...overrides,
  };
}

describe('Receivable 聚合根', () => {
  describe('create() 工厂方法', () => {
    it('合法参数创建成功，状态为 UNPAID(1)', () => {
      const receivable = Receivable.create(makeProps());
      expect(receivable.status.value).toBe(ReceivableStatusEnum.UNPAID);
      expect(receivable.receivableNo).toBe('REC001');
      expect(receivable.customerId).toBe(10);
      expect(receivable.amount.amount).toBe(1000);
      expect(receivable.receivedAmount.amount).toBe(0);
      expect(receivable.balance.amount).toBe(1000);
    });

    it('有 id 时发布 ReceivableCreatedEvent', () => {
      const receivable = Receivable.create(makeProps({ id: 100 }));
      const events = receivable.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('receivable.created');
      expect(events[0].payload.receivableId).toBe(100);
      expect(events[0].payload.customerId).toBe(10);
      expect(events[0].payload.amount).toBe(1000);
    });

    it('无 id 时不发布创建事件', () => {
      const receivable = Receivable.create(makeProps({ id: undefined }));
      expect(receivable.getDomainEvents()).toHaveLength(0);
    });

    it('customerId 为 0 抛 DomainError', () => {
      expect(() => Receivable.create(makeProps({ customerId: 0 }))).toThrow(DomainError);
      expect(() => Receivable.create(makeProps({ customerId: 0 }))).toThrow(/客户ID不能为空/);
    });

    it('amount 为 0 抛 DomainError', () => {
      expect(() => Receivable.create(makeProps({ amount: 0 }))).toThrow(DomainError);
      expect(() => Receivable.create(makeProps({ amount: 0 }))).toThrow(/应收金额必须大于0/);
    });
  });

  describe('reconstitute() 重建方法', () => {
    it('从 DB 字段重建聚合', () => {
      const receivable = Receivable.reconstitute(
        makeProps({
          status: ReceivableStatusEnum.PARTIAL,
          receivedAmount: 300,
          balance: 700,
        })
      );
      expect(receivable.status.value).toBe(ReceivableStatusEnum.PARTIAL);
      expect(receivable.receivedAmount.amount).toBe(300);
      expect(receivable.balance.amount).toBe(700);
    });

    it('未指定 balance 时回退为 amount', () => {
      const receivable = Receivable.reconstitute(
        makeProps({ balance: undefined, receivedAmount: 0 })
      );
      expect(receivable.balance.amount).toBe(1000);
    });
  });

  describe('recordReceipt() 收款流程', () => {
    it('部分收款 → PARTIAL 状态，发布 PartialReceivedEvent', () => {
      const receivable = Receivable.create(makeProps({ id: 1 }));
      receivable.clearDomainEvents();

      receivable.recordReceipt(300, 'R001');

      expect(receivable.status.value).toBe(ReceivableStatusEnum.PARTIAL);
      expect(receivable.receivedAmount.amount).toBe(300);
      expect(receivable.balance.amount).toBe(700);
      const events = receivable.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('receivable.partial_received');
      expect(events[0].payload.receivedAmount).toBe(300);
      expect(events[0].payload.balance).toBe(700);
    });

    it('全额收款 → SETTLED 状态，发布 SettledEvent', () => {
      const receivable = Receivable.create(makeProps({ id: 1, amount: 1000 }));
      receivable.clearDomainEvents();

      receivable.recordReceipt(1000);

      expect(receivable.status.value).toBe(ReceivableStatusEnum.SETTLED);
      expect(receivable.receivedAmount.amount).toBe(1000);
      expect(receivable.balance.amount).toBe(0);
      const events = receivable.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('receivable.settled');
    });

    it('多次部分收款后结清', () => {
      const receivable = Receivable.create(makeProps({ id: 1, amount: 1000 }));
      receivable.recordReceipt(300);
      receivable.clearDomainEvents();

      receivable.recordReceipt(700);

      expect(receivable.status.value).toBe(ReceivableStatusEnum.SETTLED);
      expect(receivable.receivedAmount.amount).toBe(1000);
    });

    it('收款金额超过余额抛 DomainError', () => {
      const receivable = Receivable.create(makeProps({ id: 1, amount: 1000 }));
      expect(() => receivable.recordReceipt(1001)).toThrow(DomainError);
      expect(() => receivable.recordReceipt(1001)).toThrow(/超过应收余额/);
    });

    it('收款金额为 0 抛 DomainError', () => {
      const receivable = Receivable.create(makeProps({ id: 1 }));
      expect(() => receivable.recordReceipt(0)).toThrow(DomainError);
    });

    it('已结清状态收款抛 DomainError', () => {
      const receivable = Receivable.reconstitute(
        makeProps({ status: ReceivableStatusEnum.SETTLED, receivedAmount: 1000, balance: 0 })
      );
      expect(() => receivable.recordReceipt(100)).toThrow(DomainError);
      expect(() => receivable.recordReceipt(100)).toThrow(/已结清或已坏账/);
    });
  });

  describe('writeOff() 坏账处理', () => {
    it('UNPAID → BAD_DEBT，发布 WrittenOffEvent', () => {
      const receivable = Receivable.create(makeProps({ id: 1, amount: 1000 }));
      receivable.clearDomainEvents();

      receivable.writeOff('客户破产');

      expect(receivable.status.value).toBe(ReceivableStatusEnum.BAD_DEBT);
      const events = receivable.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('receivable.written_off');
      expect(events[0].payload.writtenOffAmount).toBe(1000);
      expect(events[0].payload.reason).toBe('客户破产');
    });

    it('已结清状态坏账处理抛 DomainError', () => {
      const receivable = Receivable.reconstitute(
        makeProps({ status: ReceivableStatusEnum.SETTLED })
      );
      expect(() => receivable.writeOff()).toThrow(DomainError);
    });
  });

  describe('isOverdue() 逾期判断', () => {
    it('到期日早于当前日期且未结清 → 逾期', () => {
      const receivable = Receivable.reconstitute(
        makeProps({ dueDate: '2020-01-01', status: ReceivableStatusEnum.UNPAID })
      );
      expect(receivable.isOverdue('2026-07-06')).toBe(true);
    });

    it('到期日晚于当前日期 → 未逾期', () => {
      const receivable = Receivable.create(makeProps({ dueDate: '2026-12-31' }));
      expect(receivable.isOverdue('2026-07-06')).toBe(false);
    });

    it('已结清 → 未逾期', () => {
      const receivable = Receivable.reconstitute(
        makeProps({ dueDate: '2020-01-01', status: ReceivableStatusEnum.SETTLED })
      );
      expect(receivable.isOverdue('2026-07-06')).toBe(false);
    });

    it('无到期日 → 未逾期', () => {
      const receivable = Receivable.create(makeProps({ dueDate: '' }));
      expect(receivable.isOverdue()).toBe(false);
    });
  });

  describe('领域事件管理', () => {
    it('getDomainEvents 返回副本（不可变）', () => {
      const receivable = Receivable.create(makeProps({ id: 1 }));
      const events1 = receivable.getDomainEvents();
      receivable.clearDomainEvents();
      expect(events1).toHaveLength(1);
    });

    it('clearDomainEvents 清空事件', () => {
      const receivable = Receivable.create(makeProps({ id: 1 }));
      expect(receivable.getDomainEvents()).toHaveLength(1);
      receivable.clearDomainEvents();
      expect(receivable.getDomainEvents()).toHaveLength(0);
    });
  });
});
