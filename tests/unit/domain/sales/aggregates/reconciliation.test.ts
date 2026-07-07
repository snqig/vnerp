/**
 * Reconciliation 聚合根单元测试
 * 覆盖 create/reconstitute/confirm/writeOff/close 全流程
 * 重点：部分核销、多次核销、一对多核销、浮点精度边界
 */

import { describe, it, expect } from 'vitest';
import { Reconciliation } from '@/domain/sales/aggregates/Reconciliation';
import type { ReconciliationProps } from '@/domain/sales/aggregates/Reconciliation';

function createConfirmedReconciliation(overrides?: Partial<ReconciliationProps>): Reconciliation {
  const recon = Reconciliation.create({
    id: 1,
    reconciliationNo: 'RC20260706001',
    customerId: 1,
    customerName: '客户A',
    periodStart: '2026-07-01',
    periodEnd: '2026-07-31',
    deliveryAmount: 9000,
    returnAmount: 0,
    ...overrides,
  });
  recon.confirm(1);
  recon.clearDomainEvents();
  return recon;
}

function createWrittenOffReconciliation(): Reconciliation {
  const recon = createConfirmedReconciliation();
  recon.writeOff(1, 9000);
  recon.clearDomainEvents();
  return recon;
}

function createClosedReconciliation(): Reconciliation {
  const recon = createWrittenOffReconciliation();
  recon.close(1);
  recon.clearDomainEvents();
  return recon;
}

describe('Reconciliation 聚合根', () => {
  describe('create() 工厂方法', () => {
    it('合法参数创建成功（用例1）', () => {
      const recon = Reconciliation.create({
        id: 1,
        reconciliationNo: 'RC001',
        customerId: 1,
        customerName: '客户A',
        periodStart: '2026-07-01',
        periodEnd: '2026-07-31',
        deliveryAmount: 10000,
        returnAmount: 1000,
      });

      expect(recon.id).toBe(1);
      expect(recon.status.value).toBe(1); // draft
      expect(recon.netAmount).toBe(9000);
      expect(recon.balanceAmount).toBe(9000);
      expect(recon.receivedAmount).toBe(0);
      expect(recon.writeOffRecords).toHaveLength(0);
    });

    it('退货金额为0正常创建（用例2）', () => {
      const recon = Reconciliation.create({
        id: 1,
        reconciliationNo: 'RC001',
        customerId: 1,
        customerName: '客户A',
        periodStart: '2026-07-01',
        periodEnd: '2026-07-31',
        deliveryAmount: 5000,
        returnAmount: 0,
      });

      expect(recon.netAmount).toBe(5000);
      expect(recon.balanceAmount).toBe(5000);
    });

    it('退货大于发货抛错（用例3）', () => {
      expect(() =>
        Reconciliation.create({
          id: 1,
          reconciliationNo: 'RC001',
          customerId: 1,
          customerName: '客户A',
          periodStart: '2026-07-01',
          periodEnd: '2026-07-31',
          deliveryAmount: 1000,
          returnAmount: 2000,
        })
      ).toThrow('退货金额不能超过发货金额');
    });

    it('customerId为0抛错（用例4）', () => {
      expect(() =>
        Reconciliation.create({
          customerId: 0,
          customerName: '客户A',
          periodStart: '2026-07-01',
          periodEnd: '2026-07-31',
          deliveryAmount: 1000,
          returnAmount: 0,
        })
      ).toThrow('客户ID不能为空');
    });

    it('时段无效抛错（用例5）', () => {
      expect(() =>
        Reconciliation.create({
          customerId: 1,
          customerName: '客户A',
          periodStart: '2026-07-31',
          periodEnd: '2026-07-01',
          deliveryAmount: 1000,
          returnAmount: 0,
        })
      ).toThrow('开始日期不能晚于结束日期');
    });

    it('有id发布CreatedEvent，无id不发布（用例6）', () => {
      const withId = Reconciliation.create({
        id: 1,
        reconciliationNo: 'RC001',
        customerId: 1,
        customerName: '客户A',
        periodStart: '2026-07-01',
        periodEnd: '2026-07-31',
        deliveryAmount: 1000,
        returnAmount: 0,
      });
      expect(
        withId.getDomainEvents().some((e) => e.eventType === 'reconciliation.created')
      ).toBe(true);

      const withoutId = Reconciliation.create({
        customerId: 1,
        customerName: '客户A',
        periodStart: '2026-07-01',
        periodEnd: '2026-07-31',
        deliveryAmount: 1000,
        returnAmount: 0,
      });
      expect(withoutId.getDomainEvents()).toHaveLength(0);
    });
  });

  describe('reconstitute() 重建方法', () => {
    it('从DB字段完整重建（用例7）', () => {
      const recon = Reconciliation.reconstitute({
        id: 10,
        reconciliationNo: 'RC010',
        status: 3,
        customerId: 2,
        customerName: '客户B',
        periodStart: '2026-06-01',
        periodEnd: '2026-06-30',
        deliveryAmount: 8000,
        returnAmount: 500,
        netAmount: 7500,
        discountAmount: 200,
        receivedAmount: 3000,
        balanceAmount: 4300,
        writeOffRecords: [
          { receivableId: 1, amount: 2000, writeOffDate: '2026-06-10' },
          { receivableId: 2, amount: 1000, writeOffDate: '2026-06-15' },
        ],
        remark: '测试对账单',
        confirmBy: 5,
        confirmTime: '2026-06-05 10:00:00',
      });

      expect(recon.id).toBe(10);
      expect(recon.status.value).toBe(3);
      expect(recon.netAmount).toBe(7500);
      expect(recon.receivedAmount).toBe(3000);
      expect(recon.balanceAmount).toBe(4300);
      expect(recon.writeOffRecords).toHaveLength(2);
      expect(recon.writeOffRecords[0].receivableId).toBe(1);
      expect(recon.writeOffRecords[1].amount).toBe(1000);
    });

    it('无writeOffRecords默认空数组（用例8）', () => {
      const recon = Reconciliation.reconstitute({
        id: 1,
        reconciliationNo: 'RC001',
        status: 2,
        customerId: 1,
        customerName: '客户A',
        periodStart: '2026-07-01',
        periodEnd: '2026-07-31',
        deliveryAmount: 5000,
        returnAmount: 0,
        netAmount: 5000,
      });

      expect(recon.writeOffRecords).toHaveLength(0);
      expect(recon.receivedAmount).toBe(0);
    });

    it('未指定balance自动计算（用例9）', () => {
      const recon = Reconciliation.reconstitute({
        id: 1,
        reconciliationNo: 'RC001',
        status: 3,
        customerId: 1,
        customerName: '客户A',
        periodStart: '2026-07-01',
        periodEnd: '2026-07-31',
        deliveryAmount: 10000,
        returnAmount: 1000,
        netAmount: 9000,
        discountAmount: 500,
        receivedAmount: 3000,
      });

      // balance = netAmount - discountAmount - receivedAmount = 9000 - 500 - 3000 = 5500
      expect(recon.balanceAmount).toBe(5500);
    });
  });

  describe('confirm() 确认流程', () => {
    it('draft→confirmed正常确认（用例10）', () => {
      const recon = Reconciliation.create({
        id: 1,
        reconciliationNo: 'RC001',
        customerId: 1,
        customerName: '客户A',
        periodStart: '2026-07-01',
        periodEnd: '2026-07-31',
        deliveryAmount: 5000,
        returnAmount: 0,
      });

      recon.confirm(5);

      expect(recon.status.value).toBe(2); // confirmed
      expect(recon.confirmBy).toBe(5);
      expect(recon.confirmTime).toBeDefined();
      expect(
        recon.getDomainEvents().some((e) => e.eventType === 'reconciliation.confirmed')
      ).toBe(true);
    });

    it('非draft状态确认抛错（用例11）', () => {
      const recon = createConfirmedReconciliation();

      expect(() => recon.confirm(2)).toThrow();
    });

    it('draft可编辑可删除（用例12）', () => {
      const recon = Reconciliation.create({
        id: 1,
        reconciliationNo: 'RC001',
        customerId: 1,
        customerName: '客户A',
        periodStart: '2026-07-01',
        periodEnd: '2026-07-31',
        deliveryAmount: 5000,
        returnAmount: 0,
      });

      expect(recon.canEdit()).toBe(true);
      expect(recon.canDelete()).toBe(true);
    });

    it('confirmed不可编辑不可删除（用例13）', () => {
      const recon = createConfirmedReconciliation();

      expect(recon.canEdit()).toBe(false);
      expect(recon.canDelete()).toBe(false);
    });
  });

  describe('writeOff() 部分核销场景', () => {
    it('首次部分核销30%（用例14）', () => {
      const recon = createConfirmedReconciliation(); // balance=9000

      recon.writeOff(1, 2700);

      expect(recon.status.value).toBe(3); // partial_written_off
      expect(recon.receivedAmount).toBe(2700);
      expect(recon.balanceAmount).toBe(6300);
      expect(recon.writeOffRecords).toHaveLength(1);
      expect(recon.writeOffRecords[0].receivableId).toBe(1);
      expect(recon.writeOffRecords[0].amount).toBe(2700);
    });

    it('首次部分核销极小值1元（用例15）', () => {
      const recon = createConfirmedReconciliation();

      recon.writeOff(1, 1);

      expect(recon.status.value).toBe(3);
      expect(recon.balanceAmount).toBe(8999);
    });

    it('首次部分核销99%（用例16）', () => {
      const recon = createConfirmedReconciliation();

      recon.writeOff(1, 8910);

      expect(recon.status.value).toBe(3);
      expect(recon.balanceAmount).toBe(90);
    });

    it('首次核销恰好等于余额→全额核销（用例17）', () => {
      const recon = createConfirmedReconciliation();

      recon.writeOff(1, 9000);

      expect(recon.status.value).toBe(4); // written_off
      expect(recon.balanceAmount).toBe(0);
      expect(
        recon.getDomainEvents().some((e) => e.eventType === 'reconciliation.written_off')
      ).toBe(true);
    });

    it('部分核销后继续核销剩余→完成（用例18）', () => {
      const recon = createConfirmedReconciliation();

      recon.writeOff(1, 2700);
      expect(recon.status.value).toBe(3);

      recon.writeOff(1, 6300);
      expect(recon.status.value).toBe(4); // written_off
      expect(recon.receivedAmount).toBe(9000);
      expect(recon.balanceAmount).toBe(0);
    });

    it('核销金额为0抛错（用例19）', () => {
      const recon = createConfirmedReconciliation();

      expect(() => recon.writeOff(1, 0)).toThrow('核销金额必须大于0');
      expect(recon.receivedAmount).toBe(0);
      expect(recon.balanceAmount).toBe(9000);
    });

    it('核销金额为负抛错（用例20）', () => {
      const recon = createConfirmedReconciliation();

      expect(() => recon.writeOff(1, -100)).toThrow('核销金额必须大于0');
    });

    it('核销金额超过余额抛错（用例21）', () => {
      const recon = createConfirmedReconciliation(); // balance=9000

      expect(() => recon.writeOff(1, 9001)).toThrow();

      expect(recon.receivedAmount).toBe(0);
      expect(recon.balanceAmount).toBe(9000);
      expect(recon.writeOffRecords).toHaveLength(0);
      expect(recon.status.value).toBe(2); // still confirmed
    });

    it('浮点金额核销精度处理（用例22）', () => {
      const recon = Reconciliation.create({
        id: 1,
        reconciliationNo: 'RC001',
        customerId: 1,
        customerName: '客户A',
        periodStart: '2026-07-01',
        periodEnd: '2026-07-31',
        deliveryAmount: 10000.55,
        returnAmount: 0,
      });
      recon.confirm(1);
      recon.clearDomainEvents();

      expect(recon.balanceAmount).toBe(10000.55);

      recon.writeOff(1, 3333.33);

      expect(recon.receivedAmount).toBe(3333.33);
      expect(recon.balanceAmount).toBe(6667.22);
      expect(recon.status.value).toBe(3);
    });
  });

  describe('writeOff() 多次核销场景', () => {
    it('2次核销凑满（用例23）', () => {
      const recon = createConfirmedReconciliation();

      recon.writeOff(1, 3000);
      expect(recon.status.value).toBe(3);
      expect(recon.receivedAmount).toBe(3000);

      recon.writeOff(2, 6000);
      expect(recon.status.value).toBe(4);
      expect(recon.receivedAmount).toBe(9000);
      expect(recon.balanceAmount).toBe(0);
      expect(recon.writeOffRecords).toHaveLength(2);
    });

    it('3次核销凑满（用例24）', () => {
      const recon = createConfirmedReconciliation();

      recon.writeOff(1, 1000);
      recon.writeOff(2, 3000);
      expect(recon.status.value).toBe(3);

      recon.writeOff(3, 5000);
      expect(recon.status.value).toBe(4);
      expect(recon.receivedAmount).toBe(9000);
      expect(recon.writeOffRecords).toHaveLength(3);
    });

    it('多次核销后第4次超余额抛错（用例25）', () => {
      const recon = createConfirmedReconciliation();

      recon.writeOff(1, 3000);
      recon.writeOff(2, 5000);
      expect(recon.balanceAmount).toBe(1000);

      expect(() => recon.writeOff(3, 1001)).toThrow();

      expect(recon.status.value).toBe(3);
      expect(recon.receivedAmount).toBe(8000);
      expect(recon.balanceAmount).toBe(1000);
      expect(recon.writeOffRecords).toHaveLength(2);
    });

    it('同一应收单分3次核销凑满（用例26）', () => {
      const recon = createConfirmedReconciliation();

      recon.writeOff(5, 3000);
      recon.writeOff(5, 3000);
      recon.writeOff(5, 3000);

      expect(recon.status.value).toBe(4);
      expect(recon.writeOffRecords).toHaveLength(3);
      expect(recon.writeOffRecords.every((r) => r.receivableId === 5)).toBe(true);
      expect(recon.receivedAmount).toBe(9000);
    });

    it('多次核销后恰好凑满-边界（用例27）', () => {
      const recon = createConfirmedReconciliation();

      recon.writeOff(1, 3000);
      recon.writeOff(2, 3000);
      recon.writeOff(3, 3000);

      expect(recon.status.value).toBe(4);
      expect(recon.balanceAmount).toBe(0);
    });

    it('多次核销中间状态事件发布（用例28）', () => {
      const recon = createConfirmedReconciliation();
      recon.clearDomainEvents();

      recon.writeOff(1, 3000);
      let events = recon.getDomainEvents();
      expect(events.some((e) => e.eventType === 'reconciliation.partial_written_off')).toBe(true);
      expect(events.some((e) => e.eventType === 'reconciliation.written_off')).toBe(false);

      recon.clearDomainEvents();
      recon.writeOff(2, 6000);
      events = recon.getDomainEvents();
      expect(events.some((e) => e.eventType === 'reconciliation.written_off')).toBe(true);
    });

    it('5次小额核销累计完成（用例29）', () => {
      const recon = createConfirmedReconciliation({ deliveryAmount: 5000, returnAmount: 0 });

      for (let i = 0; i < 4; i++) {
        recon.writeOff(i + 1, 1000);
        expect(recon.status.value).toBe(3);
      }

      recon.writeOff(5, 1000);
      expect(recon.status.value).toBe(4);
      expect(recon.writeOffRecords).toHaveLength(5);
      expect(recon.receivedAmount).toBe(5000);
    });

    it('失败操作不影响已成功核销（用例30）', () => {
      const recon = createConfirmedReconciliation();

      recon.writeOff(1, 3000);
      expect(recon.receivedAmount).toBe(3000);

      expect(() => recon.writeOff(2, 7000)).toThrow();

      expect(recon.receivedAmount).toBe(3000);
      expect(recon.balanceAmount).toBe(6000);
      expect(recon.writeOffRecords).toHaveLength(1);
      expect(recon.status.value).toBe(3);
    });

    it('多次核销后查询累计已核销应收单列表（用例31）', () => {
      const recon = createConfirmedReconciliation();

      recon.writeOff(1, 3000);
      recon.writeOff(2, 2000);
      recon.writeOff(1, 1000);

      const summary = recon.getWriteOffSummary();
      expect(summary).toHaveLength(2);

      const rec1 = summary.find((s) => s.receivableId === 1);
      expect(rec1).toBeDefined();
      expect(rec1!.totalAmount).toBe(4000);
      expect(rec1!.count).toBe(2);

      const rec2 = summary.find((s) => s.receivableId === 2);
      expect(rec2).toBeDefined();
      expect(rec2!.totalAmount).toBe(2000);
      expect(rec2!.count).toBe(1);
    });
  });

  describe('writeOff() 一对多核销场景', () => {
    it('一张对账单核销3张不同应收单（用例32）', () => {
      const recon = createConfirmedReconciliation();

      recon.writeOff(101, 3000);
      recon.writeOff(102, 3000);
      recon.writeOff(103, 3000);

      expect(recon.status.value).toBe(4);
      const ids = recon.writeOffRecords.map((r) => r.receivableId);
      expect(ids).toEqual([101, 102, 103]);
    });

    it('一张对账单核销2张-1部分+1全额（用例33）', () => {
      const recon = createConfirmedReconciliation();

      recon.writeOff(201, 2000);
      recon.writeOff(202, 7000);

      expect(recon.status.value).toBe(4);
      expect(recon.writeOffRecords).toHaveLength(2);
    });

    it('一张对账单对同一应收单多次部分核销（用例34）', () => {
      const recon = createConfirmedReconciliation();

      recon.writeOff(301, 1000);
      recon.writeOff(301, 2000);
      recon.writeOff(301, 6000);

      expect(recon.status.value).toBe(4);
      expect(recon.writeOffRecords).toHaveLength(3);
      expect(recon.writeOffRecords.every((r) => r.receivableId === 301)).toBe(true);
    });

    it('一张对账单核销5张应收单每张1800（用例35）', () => {
      const recon = createConfirmedReconciliation();

      for (let i = 1; i <= 5; i++) {
        recon.writeOff(i * 10, 1800);
      }

      expect(recon.status.value).toBe(4);
      expect(recon.writeOffRecords).toHaveLength(5);
      const uniqueIds = new Set(recon.writeOffRecords.map((r) => r.receivableId));
      expect(uniqueIds.size).toBe(5);
    });

    it('一对多核销中某张失败不影响其他（用例36）', () => {
      const recon = createConfirmedReconciliation();

      recon.writeOff(401, 3000);
      expect(recon.receivedAmount).toBe(3000);

      expect(() => recon.writeOff(402, 7000)).toThrow();

      expect(recon.receivedAmount).toBe(3000);
      expect(recon.balanceAmount).toBe(6000);

      recon.writeOff(403, 6000);
      expect(recon.status.value).toBe(4);
      expect(recon.writeOffRecords).toHaveLength(2);
    });
  });

  describe('writeOff() 状态边界与异常', () => {
    it('draft状态核销抛错（用例37）', () => {
      const recon = Reconciliation.create({
        id: 1,
        reconciliationNo: 'RC001',
        customerId: 1,
        customerName: '客户A',
        periodStart: '2026-07-01',
        periodEnd: '2026-07-31',
        deliveryAmount: 5000,
        returnAmount: 0,
      });

      expect(() => recon.writeOff(1, 1000)).toThrow();
    });

    it('written_off状态核销抛错（用例38）', () => {
      const recon = createWrittenOffReconciliation();

      expect(() => recon.writeOff(1, 1000)).toThrow();
    });

    it('closed状态核销抛错（用例39）', () => {
      const recon = createClosedReconciliation();

      expect(() => recon.writeOff(1, 1000)).toThrow();
    });

    it('receivableId为0抛错（用例40）', () => {
      const recon = createConfirmedReconciliation();

      expect(() => recon.writeOff(0, 1000)).toThrow('应收单ID不能为空');
    });

    it('自定义核销日期（用例41）', () => {
      const recon = createConfirmedReconciliation();

      recon.writeOff(1, 3000, '2026-06-15');

      expect(recon.writeOffRecords[0].writeOffDate).toBe('2026-06-15');
    });
  });

  describe('close() 关闭流程', () => {
    it('written_off→closed正常关闭（用例42）', () => {
      const recon = createWrittenOffReconciliation();

      recon.close(1);

      expect(recon.status.value).toBe(9);
      expect(recon.closeBy).toBe(1);
      expect(recon.closeTime).toBeDefined();
      expect(
        recon.getDomainEvents().some((e) => e.eventType === 'reconciliation.closed')
      ).toBe(true);
    });

    it('未完成核销时关闭抛错（用例43）', () => {
      const recon = createConfirmedReconciliation();
      recon.writeOff(1, 3000); // partial, balance=6000

      expect(() => recon.close(1)).toThrow();
      expect(recon.status.value).toBe(3);
    });

    it('余额为0的partial状态允许关闭-浮点容差（用例44）', () => {
      const recon = Reconciliation.reconstitute({
        id: 1,
        reconciliationNo: 'RC001',
        status: 3,
        customerId: 1,
        customerName: '客户A',
        periodStart: '2026-07-01',
        periodEnd: '2026-07-31',
        deliveryAmount: 10000.55,
        returnAmount: 0,
        netAmount: 10000.55,
        receivedAmount: 10000.546,
        balanceAmount: 0.004,
      });

      expect(() => recon.close(1)).not.toThrow();
      expect(recon.status.value).toBe(9);
    });

    it('已关闭再次关闭抛错（用例45）', () => {
      const recon = createClosedReconciliation();

      expect(() => recon.close(2)).toThrow();
    });
  });

  describe('领域事件', () => {
    it('完整核销发布WrittenOffEvent含全部记录（用例46）', () => {
      const recon = createConfirmedReconciliation();
      recon.clearDomainEvents();

      recon.writeOff(1, 3000);
      recon.clearDomainEvents();
      recon.writeOff(2, 6000);

      const events = recon.getDomainEvents();
      const writtenOffEvent = events.find((e) => e.eventType === 'reconciliation.written_off');
      expect(writtenOffEvent).toBeDefined();
      expect(writtenOffEvent!.payload.totalWriteOffAmount).toBe(9000);
      expect(writtenOffEvent!.payload.writeOffRecords).toHaveLength(2);
    });

    it('部分核销发布PartialWrittenOffEvent含本次详情（用例47）', () => {
      const recon = createConfirmedReconciliation();
      recon.clearDomainEvents();

      recon.writeOff(1, 2700);

      const events = recon.getDomainEvents();
      const partialEvent = events.find(
        (e) => e.eventType === 'reconciliation.partial_written_off'
      );
      expect(partialEvent).toBeDefined();
      expect(partialEvent!.payload.receivableId).toBe(1);
      expect(partialEvent!.payload.writeOffAmount).toBe(2700);
      expect(partialEvent!.payload.receivedAmount).toBe(2700);
      expect(partialEvent!.payload.balance).toBe(6300);
    });

    it('getDomainEvents返回副本不可变（用例48）', () => {
      const recon = createConfirmedReconciliation();
      recon.writeOff(1, 1000);

      const events1 = recon.getDomainEvents();
      const originalLength = events1.length;
      events1.push({ eventType: 'fake', occurredAt: new Date(), payload: {} });

      const events2 = recon.getDomainEvents();
      expect(events2.length).toBe(originalLength);

      recon.clearDomainEvents();
      expect(recon.getDomainEvents()).toHaveLength(0);
    });
  });
});
