import { describe, it, expect, beforeEach } from 'vitest';
import { InboundOrder } from '@/domain/warehouse/aggregates/InboundOrder';
import { OrderStatus } from '@/domain/warehouse/value-objects/OrderStatus';

describe('InboundOrder 并发冲突测试', () => {
  let order: InboundOrder;

  beforeEach(() => {
    order = InboundOrder.create({
      warehouseId: 1,
      supplierName: '测试供应商',
      orderType: 'purchase',
      remark: '',
      operatorId: 1,
      items: [
        {
          materialId: 1,
          materialName: '测试物料',
          batchNo: 'B001',
          quantity: 100,
          unit: '件',
          unitPrice: 10,
        },
      ],
    });
  });

  it('应正确从 draft 提交到 pending', () => {
    order.submit();
    expect(order.status.value).toBe('pending');
  });

  it('应正确从 pending 审核到 completed', () => {
    order.submit();
    order.approve('测试仓库');
    expect(order.status.value).toBe('completed');
  });

  it('应正确从 completed 反审核到 pending', () => {
    order.submit();
    order.approve('测试仓库');
    order.unapprove();
    expect(order.status.value).toBe('pending');
  });

  it('draft 状态不能审核', () => {
    expect(() => order.approve('测试仓库')).toThrow();
  });

  it('pending 状态不能反审核', () => {
    order.submit();
    expect(() => order.unapprove()).toThrow();
  });

  it('completed 状态不能再次审核', () => {
    order.submit();
    order.approve('测试仓库');
    expect(() => order.approve('测试仓库')).toThrow();
  });

  it('cancelled 状态不能审核', () => {
    order.submit();
    order.cancel();
    expect(() => order.approve('测试仓库')).toThrow();
  });

  it('cancelled 状态不能反审核', () => {
    order.submit();
    order.cancel();
    expect(() => order.unapprove()).toThrow();
  });

  it('审核后应产生领域事件', () => {
    order.submit();
    order.approve('测试仓库');
    const events = order.getDomainEvents();
    expect(events.length).toBeGreaterThan(0);
    expect(events.some((e) => e.eventType === 'inbound.approved')).toBe(true);
  });

  it('反审核后应产生领域事件', () => {
    order.submit();
    order.approve('测试仓库');
    order.clearDomainEvents();
    order.unapprove();
    const events = order.getDomainEvents();
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].eventType).toBe('inbound.unapproved');
  });

  it('清除领域事件后应为空', () => {
    order.submit();
    order.approve('测试仓库');
    order.clearDomainEvents();
    expect(order.getDomainEvents().length).toBe(0);
  });
});

describe('OrderStatus 状态机测试', () => {
  it('draft 可以转到 pending', () => {
    const status = OrderStatus.draft();
    expect(status.canTransitionTo('pending')).toBe(true);
  });

  it('pending 可以转到 completed', () => {
    const status = OrderStatus.pending();
    expect(status.canTransitionTo('completed')).toBe(true);
  });

  it('pending 可以转到 cancelled', () => {
    const status = OrderStatus.pending();
    expect(status.canTransitionTo('cancelled')).toBe(true);
  });

  it('completed 可以转到 pending (反审核)', () => {
    const status = OrderStatus.completed();
    expect(status.canTransitionTo('pending')).toBe(true);
  });

  it('completed 不能转到 draft', () => {
    const status = OrderStatus.completed();
    expect(status.canTransitionTo('draft')).toBe(false);
  });

  it('cancelled 不能转到任何状态', () => {
    const status = OrderStatus.cancelled();
    expect(status.canTransitionTo('pending')).toBe(false);
    expect(status.canTransitionTo('completed')).toBe(false);
    expect(status.canTransitionTo('draft')).toBe(false);
  });
});
