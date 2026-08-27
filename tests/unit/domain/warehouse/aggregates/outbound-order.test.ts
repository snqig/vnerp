import { describe, it, expect, beforeEach } from 'vitest';
import { OutboundOrder, type OutboundOrderProps } from '@/domain/warehouse/aggregates/OutboundOrder';
import { type OutboundItemProps } from '@/domain/warehouse/entities/OutboundItem';
import { DomainError } from '@/domain/shared/DomainTypes';

function makeItemProps(overrides: Partial<OutboundItemProps> = {}): OutboundItemProps {
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

function makeOrderProps(overrides: Partial<OutboundOrderProps> = {}): OutboundOrderProps {
  return {
    id: 1,
    orderNo: 'CK001',
    warehouseId: 1,
    warehouseName: '主仓库',
    outboundType: 'production',
    orderDate: '2026-07-06',
    items: [makeItemProps()],
    ...overrides,
  };
}

describe('OutboundOrder 聚合根', () => {
  describe('create() 工厂方法', () => {
    it('合法参数创建成功，状态为 draft', () => {
      const order = OutboundOrder.create(makeOrderProps());
      expect(order.status.value).toBe('draft');
      expect(order.orderNo).toBe('CK001');
      expect(order.warehouseName).toBe('主仓库');
      expect(order.outboundType).toBe('production');
      expect(order.orderDate).toBe('2026-07-06');
    });

    it('有 id 时发布 OutboundOrderCreatedEvent', () => {
      const order = OutboundOrder.create(makeOrderProps({ id: 100 }));
      const events = order.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('outbound.created');
      expect(events[0].payload.outboundId).toBe(100);
      expect(events[0].payload.outboundNo).toBe('CK001');
      expect(events[0].payload.outboundType).toBe('production');
    });

    it('无 id 时不发布创建事件', () => {
      const order = OutboundOrder.create(makeOrderProps({ id: undefined }));
      expect(order.getDomainEvents()).toHaveLength(0);
    });

    it('自动计算 totalAmount（多 item 累加）', () => {
      const order = OutboundOrder.create(
        makeOrderProps({
          items: [
            makeItemProps({ quantity: 10, unitPrice: 100 }),
            makeItemProps({ quantity: 5, unitPrice: 20 }),
          ],
        })
      );
      expect(order.totalAmount.amount).toBe(1100);
    });

    it('自动计算 totalQuantity（多 item 累加）', () => {
      const order = OutboundOrder.create(
        makeOrderProps({
          items: [
            makeItemProps({ quantity: 10 }),
            makeItemProps({ quantity: 5 }),
          ],
        })
      );
      expect(order.totalQuantity).toBe(15);
    });

    it('warehouseId 为 0 抛 DomainError', () => {
      expect(() => OutboundOrder.create(makeOrderProps({ warehouseId: 0 }))).toThrow(DomainError);
      expect(() => OutboundOrder.create(makeOrderProps({ warehouseId: 0 }))).toThrow(
        /仓库ID不能为空/
      );
    });

    it('items 为空数组抛 DomainError', () => {
      expect(() => OutboundOrder.create(makeOrderProps({ items: [] }))).toThrow(DomainError);
      expect(() => OutboundOrder.create(makeOrderProps({ items: [] }))).toThrow(/出库项不能为空/);
    });

    it('默认值回退（outboundType/orderDate/remark 为空时使用默认）', () => {
      const order = OutboundOrder.create(
        makeOrderProps({
          outboundType: undefined,
          orderDate: undefined,
          remark: undefined,
          warehouseName: undefined,
        })
      );
      expect(order.outboundType).toBe('production');
      expect(order.orderDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(order.remark).toBe('');
      expect(order.warehouseName).toBe('');
    });
  });

  describe('reconstitute() 重建方法', () => {
    it('从 DB 字段重建聚合，使用指定 totalAmount/totalQuantity', () => {
      const order = OutboundOrder.reconstitute(
        makeOrderProps({
          status: 'completed',
          totalAmount: 999,
          totalQuantity: 88,
          financePosted: true,
          auditStatus: 1,
          auditorId: 5,
          auditorName: '审批人',
        })
      );
      expect(order.status.value).toBe('completed');
      expect(order.totalAmount.amount).toBe(999);
      expect(order.totalQuantity).toBe(88);
      expect(order.financePosted).toBe(true);
      expect(order.auditStatus).toBe(1);
      expect(order.auditorId).toBe(5);
      expect(order.auditorName).toBe('审批人');
    });

    it('未指定 totalAmount 时自动计算', () => {
      const order = OutboundOrder.reconstitute(
        makeOrderProps({
          totalAmount: undefined,
          items: [makeItemProps({ quantity: 2, unitPrice: 50 })],
        })
      );
      expect(order.totalAmount.amount).toBe(100);
    });

    it('未指定 totalQuantity 时自动计算', () => {
      const order = OutboundOrder.reconstitute(
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

    it('DB status approved 映射为 completed', () => {
      const order = OutboundOrder.reconstitute(makeOrderProps({ status: 'approved' }));
      expect(order.status.value).toBe('completed');
    });
  });

  describe('submit() 提交流程', () => {
    it('draft → pending，发布 OutboundOrderSubmittedEvent', () => {
      const order = OutboundOrder.create(makeOrderProps({ id: 1 }));
      order.clearDomainEvents();

      order.submit();

      expect(order.status.value).toBe('pending');
      const events = order.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('outbound.submitted');
      expect(events[0].payload.totalAmount).toBe(1000);
      expect(events[0].payload.totalQuantity).toBe(10);
    });

    it('非 draft 状态提交抛错', () => {
      const order = OutboundOrder.reconstitute(makeOrderProps({ status: 'pending' }));
      expect(() => order.submit()).toThrow(DomainError);
    });
  });

  describe('approve() 审核流程', () => {
    it('pending → completed，设置 auditStatus=1 和 financePosted=true', () => {
      const order = OutboundOrder.reconstitute(makeOrderProps({ id: 1, status: 'pending' }));
      order.clearDomainEvents();

      order.approve('主仓库', 10, '审核员');

      expect(order.status.value).toBe('completed');
      expect(order.auditStatus).toBe(1);
      expect(order.financePosted).toBe(true);
      expect(order.auditorId).toBe(10);
      expect(order.auditorName).toBe('审核员');
      expect(order.auditTime).toBeTruthy();
      const events = order.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('outbound.approved');
      expect(events[0].payload.warehouseName).toBe('主仓库');
      expect(events[0].payload.items).toHaveLength(1);
      expect(events[0].payload.totalAmount).toBe(1000);
    });

    it('非 pending 状态审核抛错', () => {
      const order = OutboundOrder.create(makeOrderProps({ id: 1 }));
      expect(() => order.approve('主仓库')).toThrow(DomainError);
    });
  });

  describe('cancel() 取消流程', () => {
    it('draft → cancelled，发布取消事件', () => {
      const order = OutboundOrder.create(makeOrderProps({ id: 1 }));
      order.clearDomainEvents();

      order.cancel('不需要');

      expect(order.status.value).toBe('cancelled');
      const events = order.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('outbound.cancelled');
      expect(events[0].payload.reason).toBe('不需要');
    });

    it('pending → cancelled', () => {
      const order = OutboundOrder.reconstitute(makeOrderProps({ id: 1, status: 'pending' }));
      order.cancel();
      expect(order.status.value).toBe('cancelled');
    });

    it('completed → cancelled 抛错（已完成不可取消）', () => {
      const order = OutboundOrder.reconstitute(makeOrderProps({ status: 'completed' }));
      expect(() => order.cancel()).toThrow(DomainError);
    });
  });

  describe('权限委托', () => {
    it('canEdit/canDelete 委托给 OrderStatus', () => {
      const draft = OutboundOrder.create(makeOrderProps());
      expect(draft.canEdit()).toBe(true);
      expect(draft.canDelete()).toBe(true);

      const pending = OutboundOrder.reconstitute(makeOrderProps({ status: 'pending' }));
      expect(pending.canEdit()).toBe(false);
      expect(pending.canDelete()).toBe(false);
    });
  });

  describe('领域事件管理', () => {
    it('getDomainEvents 返回副本（不可变）', () => {
      const order = OutboundOrder.create(makeOrderProps({ id: 1 }));
      const events1 = order.getDomainEvents();
      order.clearDomainEvents();
      expect(events1).toHaveLength(1);
    });

    it('clearDomainEvents 清空事件', () => {
      const order = OutboundOrder.create(makeOrderProps({ id: 1 }));
      expect(order.getDomainEvents()).toHaveLength(1);
      order.clearDomainEvents();
      expect(order.getDomainEvents()).toHaveLength(0);
    });
  });

  describe('items 访问器返回副本', () => {
    it('外部修改 items 数组不影响内部状态', () => {
      const order = OutboundOrder.create(makeOrderProps());
      const items = order.items;
      items.pop();
      expect(order.items).toHaveLength(1);
    });
  });
});
