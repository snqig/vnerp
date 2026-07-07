import { describe, it, expect, beforeEach } from 'vitest';
import { TransferOrder, type TransferOrderProps } from '@/domain/warehouse/aggregates/TransferOrder';
import { type TransferItemProps } from '@/domain/warehouse/entities/TransferItem';
import { TransferStatusEnum } from '@/domain/warehouse/value-objects/TransferStatus';
import { DomainError } from '@/domain/shared/DomainTypes';

function makeItemProps(overrides: Partial<TransferItemProps> = {}): TransferItemProps {
  return {
    materialId: 1,
    materialCode: 'M001',
    materialName: '测试物料',
    batchNo: 'B001',
    quantity: 10,
    unit: '件',
    unitPrice: 100,
    ...overrides,
  };
}

function makeOrderProps(overrides: Partial<TransferOrderProps> = {}): TransferOrderProps {
  return {
    id: 1,
    transferNo: 'TR001',
    type: 2,
    fromWarehouseId: 1,
    toWarehouseId: 2,
    applicantName: '申请人',
    items: [makeItemProps()],
    ...overrides,
  };
}

describe('TransferOrder 聚合根', () => {
  describe('create() 工厂方法', () => {
    it('合法参数创建成功，状态为 DRAFT(0)', () => {
      const order = TransferOrder.create(makeOrderProps());
      expect(order.status.value).toBe(TransferStatusEnum.DRAFT);
      expect(order.transferNo).toBe('TR001');
      expect(order.fromWarehouseId).toBe(1);
      expect(order.toWarehouseId).toBe(2);
      expect(order.type).toBe(2);
    });

    it('有 id 时发布 TransferOrderCreatedEvent', () => {
      const order = TransferOrder.create(makeOrderProps({ id: 100 }));
      const events = order.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('transfer.created');
      expect(events[0].payload.transferId).toBe(100);
      expect(events[0].payload.transferNo).toBe('TR001');
      expect(events[0].payload.fromWarehouseId).toBe(1);
      expect(events[0].payload.toWarehouseId).toBe(2);
      expect(events[0].payload.transferType).toBe(2);
    });

    it('无 id 时不发布创建事件', () => {
      const order = TransferOrder.create(makeOrderProps({ id: undefined }));
      expect(order.getDomainEvents()).toHaveLength(0);
    });

    it('自动计算 totalQuantity（多 item 累加）', () => {
      const order = TransferOrder.create(
        makeOrderProps({
          items: [
            makeItemProps({ quantity: 10 }),
            makeItemProps({ quantity: 5 }),
          ],
        })
      );
      expect(order.totalQuantity).toBe(15);
    });

    it('自动计算 totalAmount（多 item 累加）', () => {
      const order = TransferOrder.create(
        makeOrderProps({
          items: [
            makeItemProps({ quantity: 10, unitPrice: 100 }),
            makeItemProps({ quantity: 5, unitPrice: 20 }),
          ],
        })
      );
      expect(order.totalAmount.amount).toBe(1100);
    });

    it('源仓库和目标仓库相同抛 DomainError', () => {
      expect(() => TransferOrder.create(makeOrderProps({ fromWarehouseId: 1, toWarehouseId: 1 }))).toThrow(DomainError);
      expect(() => TransferOrder.create(makeOrderProps({ fromWarehouseId: 1, toWarehouseId: 1 }))).toThrow(
        /源仓库和目标仓库不能相同/
      );
    });

    it('源仓库为 0 抛 DomainError', () => {
      expect(() => TransferOrder.create(makeOrderProps({ fromWarehouseId: 0 }))).toThrow(DomainError);
      expect(() => TransferOrder.create(makeOrderProps({ fromWarehouseId: 0 }))).toThrow(
        /源仓库和目标仓库不能为空/
      );
    });

    it('items 为空数组抛 DomainError', () => {
      expect(() => TransferOrder.create(makeOrderProps({ items: [] }))).toThrow(DomainError);
      expect(() => TransferOrder.create(makeOrderProps({ items: [] }))).toThrow(/调拨项不能为空/);
    });
  });

  describe('reconstitute() 重建方法', () => {
    it('从 DB 字段重建聚合，使用指定 totalAmount/totalQuantity', () => {
      const order = TransferOrder.reconstitute(
        makeOrderProps({
          status: TransferStatusEnum.RECEIVED,
          totalAmount: 999,
          totalQuantity: 88,
          approverId: 5,
          approverName: '审批人',
          outTime: '2026-07-06 10:00:00',
          inTime: '2026-07-06 14:00:00',
        })
      );
      expect(order.status.value).toBe(TransferStatusEnum.RECEIVED);
      expect(order.totalAmount.amount).toBe(999);
      expect(order.totalQuantity).toBe(88);
      expect(order.approverId).toBe(5);
      expect(order.approverName).toBe('审批人');
      expect(order.outTime).toBe('2026-07-06 10:00:00');
      expect(order.inTime).toBe('2026-07-06 14:00:00');
    });

    it('未指定 totalQuantity 时自动计算', () => {
      const order = TransferOrder.reconstitute(
        makeOrderProps({
          totalQuantity: undefined,
          items: [
            makeItemProps({ quantity: 3 }),
            makeItemProps({ quantity: 7 }),
          ],
        })
      );
      expect(order.totalQuantity).toBe(10);
    });

    it('未指定 totalAmount 时自动计算', () => {
      const order = TransferOrder.reconstitute(
        makeOrderProps({
          totalAmount: undefined,
          items: [makeItemProps({ quantity: 2, unitPrice: 50 })],
        })
      );
      expect(order.totalAmount.amount).toBe(100);
    });
  });

  describe('submit() 提交流程', () => {
    it('DRAFT → PENDING，发布 TransferOrderSubmittedEvent', () => {
      const order = TransferOrder.create(makeOrderProps({ id: 1 }));
      order.clearDomainEvents();

      order.submit();

      expect(order.status.value).toBe(TransferStatusEnum.PENDING);
      const events = order.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('transfer.submitted');
      expect(events[0].payload.totalQuantity).toBe(10);
    });

    it('非 DRAFT 状态提交抛错', () => {
      const order = TransferOrder.reconstitute(makeOrderProps({ status: TransferStatusEnum.PENDING }));
      expect(() => order.submit()).toThrow(DomainError);
    });
  });

  describe('approve() 审批流程', () => {
    it('PENDING → SHIPPED，设置审批人信息', () => {
      const order = TransferOrder.reconstitute(makeOrderProps({ id: 1, status: TransferStatusEnum.PENDING }));
      order.clearDomainEvents();

      order.approve(10, '审批人');

      expect(order.status.value).toBe(TransferStatusEnum.SHIPPED);
      expect(order.approverId).toBe(10);
      expect(order.approverName).toBe('审批人');
      const events = order.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('transfer.approved');
      expect(events[0].payload.approverId).toBe(10);
    });

    it('非 PENDING 状态审批抛错', () => {
      const order = TransferOrder.create(makeOrderProps({ id: 1 }));
      expect(() => order.approve()).toThrow(DomainError);
    });
  });

  describe('shipOut() 出库流程', () => {
    it('PENDING → SHIPPED，设置 outTime', () => {
      const order = TransferOrder.reconstitute(makeOrderProps({ id: 1, status: TransferStatusEnum.PENDING }));
      order.clearDomainEvents();

      order.shipOut(20, '操作员');

      expect(order.status.value).toBe(TransferStatusEnum.SHIPPED);
      expect(order.outTime).toBeTruthy();
      const events = order.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('transfer.shipped');
      expect(events[0].payload.items).toHaveLength(1);
      expect((events[0].payload as any).items[0].outQuantity).toBe(10);
    });

    it('已 SHIPPED 状态再次出库抛错', () => {
      const order = TransferOrder.reconstitute(makeOrderProps({ status: TransferStatusEnum.SHIPPED }));
      expect(() => order.shipOut()).toThrow(DomainError);
    });
  });

  describe('receiveIn() 入库流程', () => {
    it('SHIPPED → RECEIVED，设置 inTime', () => {
      const order = TransferOrder.reconstitute(makeOrderProps({ id: 1, status: TransferStatusEnum.SHIPPED }));
      order.clearDomainEvents();

      order.receiveIn(30, '收货员');

      expect(order.status.value).toBe(TransferStatusEnum.RECEIVED);
      expect(order.inTime).toBeTruthy();
      const events = order.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('transfer.received');
      expect(events[0].payload.items).toHaveLength(1);
    });

    it('非 SHIPPED 状态入库抛错', () => {
      const order = TransferOrder.reconstitute(makeOrderProps({ status: TransferStatusEnum.PENDING }));
      expect(() => order.receiveIn()).toThrow(DomainError);
    });
  });

  describe('cancel() 取消流程', () => {
    it('DRAFT → CANCELLED，发布取消事件', () => {
      const order = TransferOrder.create(makeOrderProps({ id: 1 }));
      order.clearDomainEvents();

      order.cancel('不需要');

      expect(order.status.value).toBe(TransferStatusEnum.CANCELLED);
      const events = order.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('transfer.cancelled');
      expect(events[0].payload.reason).toBe('不需要');
    });

    it('PENDING → CANCELLED', () => {
      const order = TransferOrder.reconstitute(makeOrderProps({ id: 1, status: TransferStatusEnum.PENDING }));
      order.cancel();
      expect(order.status.value).toBe(TransferStatusEnum.CANCELLED);
    });

    it('RECEIVED → CANCELLED 抛错（终态不可取消）', () => {
      const order = TransferOrder.reconstitute(makeOrderProps({ status: TransferStatusEnum.RECEIVED }));
      expect(() => order.cancel()).toThrow(DomainError);
    });
  });

  describe('权限委托', () => {
    it('canEdit/canDelete 委托给 TransferStatus', () => {
      const draft = TransferOrder.create(makeOrderProps());
      expect(draft.canEdit()).toBe(true);
      expect(draft.canDelete()).toBe(true);

      const received = TransferOrder.reconstitute(makeOrderProps({ status: TransferStatusEnum.RECEIVED }));
      expect(received.canEdit()).toBe(false);
      expect(received.canDelete()).toBe(false);
    });
  });

  describe('领域事件管理', () => {
    it('getDomainEvents 返回副本（不可变）', () => {
      const order = TransferOrder.create(makeOrderProps({ id: 1 }));
      const events1 = order.getDomainEvents();
      order.clearDomainEvents();
      expect(events1).toHaveLength(1);
    });

    it('clearDomainEvents 清空事件', () => {
      const order = TransferOrder.create(makeOrderProps({ id: 1 }));
      expect(order.getDomainEvents()).toHaveLength(1);
      order.clearDomainEvents();
      expect(order.getDomainEvents()).toHaveLength(0);
    });
  });

  describe('items 访问器返回副本', () => {
    it('外部修改 items 数组不影响内部状态', () => {
      const order = TransferOrder.create(makeOrderProps());
      const items = order.items;
      items.pop();
      expect(order.items).toHaveLength(1);
    });
  });
});
