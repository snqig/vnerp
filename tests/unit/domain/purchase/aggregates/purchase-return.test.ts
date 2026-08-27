import { describe, it, expect } from 'vitest';
import { PurchaseReturn, PurchaseReturnProps } from '@/domain/purchase/aggregates/PurchaseReturn';
import { PurchaseReturnStatus } from '@/domain/purchase/value-objects/PurchaseReturnStatus';
import { PurchaseReturnLineProps } from '@/domain/purchase/entities/PurchaseReturnLine';
import { DomainError } from '@/domain/shared/DomainTypes';

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

describe('PurchaseReturn 聚合根', () => {
  describe('create() 工厂方法', () => {
    it('合法参数创建成功，状态为待审核(1)', () => {
      const order = PurchaseReturn.create(makeOrderProps());
      expect(order.status.value).toBe(1);
      expect(order.status.label).toBe('待审核');
      expect(order.orderId).toBe(1);
      expect(order.supplierId).toBe(1);
      expect(order.warehouseId).toBe(1);
      expect(order.reason).toBe('质量问题');
      expect(order.returnDate).toBeTruthy();
      expect(order.totalAmount).toBe(1000);
      expect(order.lines).toHaveLength(1);
    });

    it('自动计算总金额（多行）', () => {
      const order = PurchaseReturn.create(
        makeOrderProps({
          lines: [
            makeLineProps({ quantity: 10, unitPrice: 100 }),
            makeLineProps({ lineNo: 2, quantity: 5, unitPrice: 200 }),
          ],
        })
      );
      expect(order.totalAmount).toBe(2000);
    });

    it('采购订单ID为空抛错', () => {
      expect(() => PurchaseReturn.create(makeOrderProps({ orderId: 0 }))).toThrow(DomainError);
    });

    it('供应商ID为空抛错', () => {
      expect(() => PurchaseReturn.create(makeOrderProps({ supplierId: 0 }))).toThrow(DomainError);
    });

    it('仓库ID为空抛错', () => {
      expect(() => PurchaseReturn.create(makeOrderProps({ warehouseId: 0 }))).toThrow(DomainError);
    });

    it('退货明细为空抛错', () => {
      expect(() => PurchaseReturn.create(makeOrderProps({ lines: [] }))).toThrow(DomainError);
    });

    it('退货原因为空抛错', () => {
      expect(() => PurchaseReturn.create(makeOrderProps({ reason: '' }))).toThrow(DomainError);
    });

    it('有 id 时发布 PurchaseReturnCreatedEvent', () => {
      const order = PurchaseReturn.create(makeOrderProps({ id: 1 }));
      const events = order.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('purchase_return.created');
    });

    it('无 id 时不发布创建事件', () => {
      const order = PurchaseReturn.create(makeOrderProps());
      expect(order.getDomainEvents()).toHaveLength(0);
    });
  });

  describe('reconstitute() 重建方法', () => {
    it('从 DB 字段重建聚合', () => {
      const order = PurchaseReturn.reconstitute(
        makeOrderProps({
          id: 1,
          returnNo: 'PR-001',
          status: 2,
          approveBy: 10,
          approveTime: '2026-07-06 10:00:00',
        })
      );
      expect(order.id).toBe(1);
      expect(order.returnNo).toBe('PR-001');
      expect(order.status.value).toBe(2);
      expect(order.approveBy).toBe(10);
    });

    it('未指定 status 时默认为 1', () => {
      const order = PurchaseReturn.reconstitute(makeOrderProps({ id: 1 }));
      expect(order.status.value).toBe(1);
    });
  });

  describe('approve() 审核流程', () => {
    it('待审核 → 已审核，设置审核人和审核时间', () => {
      const order = PurchaseReturn.create(makeOrderProps({ id: 1 }));
      order.clearDomainEvents();

      order.approve(10);

      expect(order.status.value).toBe(2);
      expect(order.approveBy).toBe(10);
      expect(order.approveTime).toBeTruthy();
    });

    it('发布 PurchaseReturnApprovedEvent', () => {
      const order = PurchaseReturn.create(makeOrderProps({ id: 1 }));
      order.clearDomainEvents();

      order.approve(10);

      const events = order.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('purchase_return.approved');
    });

    it('已审核状态再次审核抛错', () => {
      const order = PurchaseReturn.reconstitute(makeOrderProps({ id: 1, status: 2 }));
      expect(() => order.approve(10)).toThrow(DomainError);
    });

    it('审核人为空抛错', () => {
      const order = PurchaseReturn.create(makeOrderProps({ id: 1 }));
      expect(() => order.approve(0)).toThrow(DomainError);
    });
  });

  describe('complete() 完成流程', () => {
    it('已审核 → 已完成，创建出库单和红字应付单', () => {
      const order = PurchaseReturn.reconstitute(
        makeOrderProps({
          id: 1,
          returnNo: 'PR-001',
          status: 2,
        })
      );
      order.clearDomainEvents();

      order.complete(
        10,
        (items, warehouseId, returnId, returnNo) => ({
          outboundOrderId: 100,
          outboundOrderNo: 'OUT-001',
        }),
        (supplierId, refundAmount, returnId, returnNo) => ({
          payableId: 200,
          payableNo: 'PAY-001',
        })
      );

      expect(order.status.value).toBe(3);
      expect(order.completeBy).toBe(10);
      expect(order.completeTime).toBeTruthy();
      expect(order.outboundOrderId).toBe(100);
      expect(order.outboundOrderNo).toBe('OUT-001');
      expect(order.payableId).toBe(200);
      expect(order.payableNo).toBe('PAY-001');
    });

    it('发布 PurchaseReturnCompletedEvent 含明细', () => {
      const order = PurchaseReturn.reconstitute(
        makeOrderProps({
          id: 1,
          returnNo: 'PR-001',
          status: 2,
          totalAmount: 2000,
          lines: [
            makeLineProps({ quantity: 10, unitPrice: 100 }),
            makeLineProps({ lineNo: 2, quantity: 5, unitPrice: 200 }),
          ],
        })
      );
      order.clearDomainEvents();

      order.complete(
        10,
        () => ({ outboundOrderId: 100, outboundOrderNo: 'OUT-001' }),
        () => ({ payableId: 200, payableNo: 'PAY-001' })
      );

      const events = order.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('purchase_return.completed');
      expect((events[0].payload as any).items).toHaveLength(2);
      expect((events[0].payload as any).refundAmount).toBe(2000);
    });

    it('出库单创建失败抛错', () => {
      const order = PurchaseReturn.reconstitute(makeOrderProps({ id: 1, status: 2 }));
      expect(() =>
        order.complete(
          10,
          () => ({ outboundOrderId: 0, outboundOrderNo: '' }),
          () => ({ payableId: 200, payableNo: 'PAY-001' })
        )
      ).toThrow(DomainError);
    });

    it('红字应付单创建失败抛错', () => {
      const order = PurchaseReturn.reconstitute(makeOrderProps({ id: 1, status: 2 }));
      expect(() =>
        order.complete(
          10,
          () => ({ outboundOrderId: 100, outboundOrderNo: 'OUT-001' }),
          () => ({ payableId: 0, payableNo: '' })
        )
      ).toThrow(DomainError);
    });

    it('待审核状态完成抛错', () => {
      const order = PurchaseReturn.create(makeOrderProps({ id: 1 }));
      expect(() =>
        order.complete(10, () => ({ outboundOrderId: 1, outboundOrderNo: 'x' }), () => ({ payableId: 1, payableNo: 'x' }))
      ).toThrow(DomainError);
    });

    it('完成人为空抛错', () => {
      const order = PurchaseReturn.reconstitute(makeOrderProps({ id: 1, status: 2 }));
      expect(() =>
        order.complete(0, () => ({ outboundOrderId: 1, outboundOrderNo: 'x' }), () => ({ payableId: 1, payableNo: 'x' }))
      ).toThrow(DomainError);
    });
  });

  describe('cancel() 取消流程', () => {
    it('待审核 → 已取消', () => {
      const order = PurchaseReturn.create(makeOrderProps({ id: 1 }));
      order.clearDomainEvents();

      order.cancel('不需要了');

      expect(order.status.value).toBe(9);
      const events = order.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('purchase_return.cancelled');
    });

    it('已审核 → 已取消', () => {
      const order = PurchaseReturn.reconstitute(makeOrderProps({ id: 1, status: 2 }));
      order.cancel();
      expect(order.status.value).toBe(9);
    });

    it('已完成状态取消抛错', () => {
      const order = PurchaseReturn.reconstitute(makeOrderProps({ id: 1, status: 3 }));
      expect(() => order.cancel()).toThrow(DomainError);
    });

    it('已取消状态再次取消抛错', () => {
      const order = PurchaseReturn.reconstitute(makeOrderProps({ id: 1, status: 9 }));
      expect(() => order.cancel()).toThrow(DomainError);
    });
  });

  describe('canEdit / canDelete', () => {
    it('待审核状态可编辑可删除', () => {
      const order = PurchaseReturn.create(makeOrderProps());
      expect(order.canEdit()).toBe(true);
      expect(order.canDelete()).toBe(true);
    });

    it('已审核状态不可编辑不可删除', () => {
      const order = PurchaseReturn.reconstitute(makeOrderProps({ status: 2 }));
      expect(order.canEdit()).toBe(false);
      expect(order.canDelete()).toBe(false);
    });
  });

  describe('validateAgainstReceivedQuantities() 退货量校验（T104）', () => {
    it('退货数量 <= 已入库数量 - 已退数量 时通过', () => {
      const order = PurchaseReturn.create(makeOrderProps({ id: 1 }));
      // 已入库 20，已退 5 → 可退 15；本次退货 10 → 通过
      const received = new Map([[1, 20]]);
      const returned = new Map([[1, 5]]);
      expect(() => order.validateAgainstReceivedQuantities(received, returned)).not.toThrow();
    });

    it('退货数量超过可退数量时抛出 DomainError', () => {
      const order = PurchaseReturn.create(makeOrderProps({ id: 1 }));
      // 已入库 20，已退 5 → 可退 15；本次退货 10 + 已退 5 = 15 ✅；本次 16 → 16 > 15 ❌
      const order2 = PurchaseReturn.create(
        makeOrderProps({ id: 2, lines: [makeLineProps({ quantity: 16 })] })
      );
      const received = new Map([[1, 20]]);
      const returned = new Map([[1, 5]]);
      expect(() => order2.validateAgainstReceivedQuantities(received, returned)).toThrow(DomainError);
    });

    it('未提供已退数量 Map 时仅校验退货量 ≤ 已入库量', () => {
      const order = PurchaseReturn.create(makeOrderProps({ id: 1 }));
      // 已入库 20；本次退货 10 ≤ 20 → 通过
      const received = new Map([[1, 20]]);
      expect(() => order.validateAgainstReceivedQuantities(received)).not.toThrow();

      // 已入库 5；本次退货 10 > 5 → 抛错
      const order2 = PurchaseReturn.create(
        makeOrderProps({ id: 2, lines: [makeLineProps({ quantity: 10 })] })
      );
      const received2 = new Map([[1, 5]]);
      expect(() => order2.validateAgainstReceivedQuantities(received2)).toThrow(DomainError);
    });

    it('物料不在已入库 Map 中时视为 0，抛出 DomainError', () => {
      const order = PurchaseReturn.create(makeOrderProps({ id: 1 }));
      // 物料 1 不在 Map 中 → 视为已入库 0；本次退货 10 > 0 → 抛错
      const received = new Map<number, number>(); // 空 Map
      expect(() => order.validateAgainstReceivedQuantities(received)).toThrow(DomainError);
    });

    it('多物料行混合校验', () => {
      const order = PurchaseReturn.create(
        makeOrderProps({
          id: 1,
          lines: [
            makeLineProps({ lineNo: 1, materialId: 1, quantity: 5 }),
            makeLineProps({ lineNo: 2, materialId: 2, quantity: 3 }),
          ],
        })
      );
      // 物料 1: 已入库 10，已退 3 → 可退 7；本次 5 ≤ 7 ✅
      // 物料 2: 已入库 5，已退 0 → 可退 5；本次 3 ≤ 5 ✅
      const received = new Map([
        [1, 10],
        [2, 5],
      ]);
      const returned = new Map([
        [1, 3],
        [2, 0],
      ]);
      expect(() => order.validateAgainstReceivedQuantities(received, returned)).not.toThrow();
    });

    it('多物料行其中一行超量时抛错', () => {
      const order = PurchaseReturn.create(
        makeOrderProps({
          id: 1,
          lines: [
            makeLineProps({ lineNo: 1, materialId: 1, quantity: 5 }),
            makeLineProps({ lineNo: 2, materialId: 2, quantity: 8 }),
          ],
        })
      );
      // 物料 2: 已入库 5，已退 0 → 可退 5；本次 8 > 5 ❌
      const received = new Map([
        [1, 10],
        [2, 5],
      ]);
      const returned = new Map([
        [1, 3],
        [2, 0],
      ]);
      expect(() => order.validateAgainstReceivedQuantities(received, returned)).toThrow(DomainError);
    });
  });

  describe('领域事件管理', () => {
    it('getDomainEvents 返回副本（不可变）', () => {
      const order = PurchaseReturn.create(makeOrderProps({ id: 1 }));
      const events = order.getDomainEvents();
      events.pop();
      expect(order.getDomainEvents()).toHaveLength(1);
    });

    it('clearDomainEvents 清空事件', () => {
      const order = PurchaseReturn.create(makeOrderProps({ id: 1 }));
      order.clearDomainEvents();
      expect(order.getDomainEvents()).toHaveLength(0);
    });
  });

  describe('PurchaseReturnStatus 状态机', () => {
    it('状态流转: 1→2→3', () => {
      const s1 = PurchaseReturnStatus.pending();
      const s2 = s1.transitionTo(2);
      expect(s2.value).toBe(2);
      const s3 = s2.transitionTo(3);
      expect(s3.value).toBe(3);
    });

    it('非法流转 1→3 抛错', () => {
      const s1 = PurchaseReturnStatus.pending();
      expect(() => s1.transitionTo(3)).toThrow(DomainError);
    });

    it('非法流转 3→1 抛错（终态）', () => {
      const s3 = PurchaseReturnStatus.completed();
      expect(() => s3.transitionTo(1)).toThrow(DomainError);
    });

    it('equals 正确比较', () => {
      expect(PurchaseReturnStatus.pending().equals(PurchaseReturnStatus.pending())).toBe(true);
      expect(PurchaseReturnStatus.pending().equals(PurchaseReturnStatus.approved())).toBe(false);
    });
  });
});
