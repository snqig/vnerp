import { describe, it, expect, beforeEach } from 'vitest';
import { InboundOrder, type InboundOrderProps } from '@/domain/warehouse/aggregates/InboundOrder';
import { InboundItem, type InboundItemProps } from '@/domain/warehouse/entities/InboundItem';
import { DomainError } from '@/domain/shared/DomainTypes';

/**
 * 8.2 InboundOrder 聚合根核心流程测试
 *
 * 覆盖目标：
 * 1. create() 工厂方法（含校验、金额/数量计算、领域事件）
 * 2. reconstitute() 重建方法（从 DB 恢复）
 * 3. submit() 提交流程（状态流转 + 事件）
 * 4. approve() 审核流程（状态流转 + 事件 + 财务标记）
 * 5. cancel() 取消流程
 * 6. unapprove() 反审流程
 * 7. canEdit/canDelete 权限委托
 * 8. 领域事件管理（getDomainEvents/clearDomainEvents）
 */
function makeItemProps(overrides: Partial<InboundItemProps> = {}): InboundItemProps {
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

function makeOrderProps(overrides: Partial<InboundOrderProps> = {}): InboundOrderProps {
  return {
    id: 1,
    orderNo: 'IN001',
    warehouseId: 1,
    warehouseName: '主仓库',
    supplierName: '测试供应商',
    orderType: 'purchase',
    inboundDate: '2026-06-29',
    items: [makeItemProps()],
    ...overrides,
  };
}

describe('8.2 InboundOrder 聚合根', () => {
  describe('create() 工厂方法', () => {
    it('合法参数创建成功，状态为 draft', () => {
      const order = InboundOrder.create(makeOrderProps());
      expect(order.status.value).toBe('draft');
      expect(order.orderNo).toBe('IN001');
      expect(order.warehouseName).toBe('主仓库');
      expect(order.supplierName).toBe('测试供应商');
      expect(order.orderType).toBe('purchase');
      expect(order.inboundDate).toBe('2026-06-29');
    });

    it('有 id 时发布 InboundOrderCreatedEvent', () => {
      const order = InboundOrder.create(makeOrderProps({ id: 100 }));
      const events = order.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('inbound.created');
      expect(events[0].payload.inboundId).toBe(100);
      expect(events[0].payload.inboundNo).toBe('IN001');
    });

    it('无 id 时不发布创建事件', () => {
      const order = InboundOrder.create(makeOrderProps({ id: undefined }));
      expect(order.getDomainEvents()).toHaveLength(0);
    });

    it('自动计算 totalAmount（多 item 累加）', () => {
      const order = InboundOrder.create(
        makeOrderProps({
          items: [
            makeItemProps({ quantity: 10, unitPrice: 100 }),
            makeItemProps({ quantity: 5, unitPrice: 20 }),
          ],
        })
      );
      // 10*100 + 5*20 = 1100
      expect(order.totalAmount.amount).toBe(1100);
    });

    it('自动计算 totalQuantity（多 item 累加）', () => {
      const order = InboundOrder.create(
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
      expect(() => InboundOrder.create(makeOrderProps({ warehouseId: 0 }))).toThrow(DomainError);
      expect(() => InboundOrder.create(makeOrderProps({ warehouseId: 0 }))).toThrow(
        /仓库ID不能为空/
      );
    });

    it('items 为空数组抛 DomainError', () => {
      expect(() => InboundOrder.create(makeOrderProps({ items: [] }))).toThrow(DomainError);
      expect(() => InboundOrder.create(makeOrderProps({ items: [] }))).toThrow(/入库项不能为空/);
    });

    it('默认值回退（orderType/inboundDate/remark 为空时使用默认）', () => {
      const order = InboundOrder.create(
        makeOrderProps({
          orderType: undefined,
          inboundDate: undefined,
          remark: undefined,
          warehouseName: undefined,
          supplierName: undefined,
        })
      );
      expect(order.orderType).toBe('purchase');
      expect(order.inboundDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(order.remark).toBe('');
      expect(order.warehouseName).toBe('');
      expect(order.supplierName).toBe('');
    });
  });

  describe('reconstitute() 重建方法', () => {
    it('从 DB 字段重建聚合，使用指定 totalAmount/totalQuantity', () => {
      const order = InboundOrder.reconstitute(
        makeOrderProps({
          status: 'completed',
          totalAmount: 999,
          totalQuantity: 88,
          inspectionStatus: 3,
          financePosted: true,
        })
      );
      expect(order.status.value).toBe('completed');
      expect(order.totalAmount.amount).toBe(999);
      expect(order.totalQuantity).toBe(88);
      expect(order.inspectionStatus).toBe(3);
      expect(order.financePosted).toBe(true);
    });

    it('未指定 totalAmount 时自动计算', () => {
      const order = InboundOrder.reconstitute(
        makeOrderProps({
          totalAmount: undefined,
          items: [makeItemProps({ quantity: 2, unitPrice: 50 })],
        })
      );
      expect(order.totalAmount.amount).toBe(100);
    });

    it('未指定 totalQuantity 时自动计算', () => {
      const order = InboundOrder.reconstitute(
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
      const order = InboundOrder.reconstitute(makeOrderProps({ status: 'approved' as any }));
      expect(order.status.value).toBe('completed');
    });
  });

  describe('submit() 提交流程', () => {
    it('draft → pending，发布 InboundOrderSubmittedEvent', () => {
      const order = InboundOrder.create(makeOrderProps({ id: 1 }));
      order.clearDomainEvents();

      order.submit();

      expect(order.status.value).toBe('pending');
      const events = order.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('inbound.submitted');
      expect(events[0].payload.totalAmount).toBe(1000);
    });

    it('非 draft 状态提交抛错', () => {
      const order = InboundOrder.reconstitute(makeOrderProps({ status: 'pending' }));
      expect(() => order.submit()).toThrow(DomainError);
    });
  });

  describe('approve() 审核流程', () => {
    it('pending → completed，设置 inspectionStatus=3 和 financePosted=true', () => {
      const order = InboundOrder.reconstitute(makeOrderProps({ id: 1, status: 'pending' }));
      order.clearDomainEvents();

      order.approve('主仓库');

      expect(order.status.value).toBe('completed');
      expect(order.inspectionStatus).toBe(3);
      expect(order.financePosted).toBe(true);
      const events = order.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('inbound.approved');
      expect(events[0].payload.warehouseName).toBe('主仓库');
      expect(events[0].payload.items).toHaveLength(1);
    });

    it('非 pending 状态审核抛错', () => {
      const order = InboundOrder.create(makeOrderProps({ id: 1 }));
      expect(() => order.approve('主仓库')).toThrow(DomainError);
    });
  });

  describe('cancel() 取消流程', () => {
    it('draft → cancelled，发布取消事件', () => {
      const order = InboundOrder.create(makeOrderProps({ id: 1 }));
      order.clearDomainEvents();

      order.cancel();

      expect(order.status.value).toBe('cancelled');
      expect(order.getDomainEvents()[0].eventType).toBe('inbound.cancelled');
    });

    it('pending → cancelled', () => {
      const order = InboundOrder.reconstitute(makeOrderProps({ id: 1, status: 'pending' }));
      order.cancel();
      expect(order.status.value).toBe('cancelled');
    });

    it('completed → cancelled 抛错（已完成不可取消）', () => {
      const order = InboundOrder.reconstitute(makeOrderProps({ status: 'completed' }));
      expect(() => order.cancel()).toThrow(DomainError);
    });
  });

  describe('unapprove() 反审流程', () => {
    it('completed → pending，重置 inspectionStatus 和 financePosted', () => {
      const order = InboundOrder.reconstitute(
        makeOrderProps({ id: 1, status: 'completed', inspectionStatus: 3, financePosted: true })
      );
      order.clearDomainEvents();

      order.unapprove();

      expect(order.status.value).toBe('pending');
      expect(order.inspectionStatus).toBe(0);
      expect(order.financePosted).toBe(false);
      expect(order.getDomainEvents()[0].eventType).toBe('inbound.unapproved');
    });

    it('cancelled 状态反审抛错（终态不可流转）', () => {
      const order = InboundOrder.reconstitute(makeOrderProps({ status: 'cancelled' }));
      expect(() => order.unapprove()).toThrow(DomainError);
    });
  });

  describe('权限委托', () => {
    it('canEdit/canDelete 委托给 OrderStatus', () => {
      const draft = InboundOrder.create(makeOrderProps());
      expect(draft.canEdit()).toBe(true);
      expect(draft.canDelete()).toBe(true);

      const pending = InboundOrder.reconstitute(makeOrderProps({ status: 'pending' }));
      expect(pending.canEdit()).toBe(false);
      expect(pending.canDelete()).toBe(false);
    });
  });

  describe('领域事件管理', () => {
    it('getDomainEvents 返回副本（不可变）', () => {
      const order = InboundOrder.create(makeOrderProps({ id: 1 }));
      const events1 = order.getDomainEvents();
      order.clearDomainEvents();
      expect(events1).toHaveLength(1); // 副本不受影响
    });

    it('clearDomainEvents 清空事件', () => {
      const order = InboundOrder.create(makeOrderProps({ id: 1 }));
      expect(order.getDomainEvents()).toHaveLength(1);
      order.clearDomainEvents();
      expect(order.getDomainEvents()).toHaveLength(0);
    });
  });

  describe('items 访问器返回副本', () => {
    it('外部修改 items 数组不影响内部状态', () => {
      const order = InboundOrder.create(makeOrderProps());
      const items = order.items;
      items.push(InboundItem.create(makeItemProps({ materialId: 999 })));
      expect(order.items).toHaveLength(1); // 内部不受影响
    });
  });
});
