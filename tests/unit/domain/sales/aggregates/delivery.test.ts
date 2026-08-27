/**
 * Delivery 聚合根单元测试
 * 覆盖 create/reconstitute/ship/sign/cancel 全流程
 * 重点：库存校验回调、状态机流转、事件发布
 */

import { describe, it, expect, vi } from 'vitest';
import { Delivery } from '@/domain/sales/aggregates/Delivery';
import type { DeliveryProps } from '@/domain/sales/aggregates/Delivery';
import type { DeliveryLineProps } from '@/domain/sales/entities/DeliveryLine';

function createLines(overrides?: Partial<DeliveryLineProps>[]): DeliveryLineProps[] {
  return [
    {
      lineNo: 1,
      orderDetailId: 101,
      materialId: 1,
      materialCode: 'M001',
      materialName: '物料A',
      materialSpec: '规格A',
      unit: '件',
      quantity: 10,
      unitPrice: 100,
      batchNo: 'B20260701',
      ...(overrides?.[0] || {}),
    },
    {
      lineNo: 2,
      orderDetailId: 102,
      materialId: 2,
      materialCode: 'M002',
      materialName: '物料B',
      materialSpec: '规格B',
      unit: '个',
      quantity: 5,
      unitPrice: 200,
      batchNo: 'B20260702',
      ...(overrides?.[1] || {}),
    },
  ];
}

function createPendingDelivery(overrides?: Partial<DeliveryProps>): Delivery {
  return Delivery.create({
    id: 1,
    deliveryNo: 'DL20260706001',
    orderId: 100,
    orderNo: 'SO20260701001',
    customerId: 1,
    customerName: '客户A',
    warehouseId: 1,
    lines: createLines(),
    createBy: 1,
    ...overrides,
  });
}

function createShippedDelivery(overrides?: Partial<DeliveryProps>): Delivery {
  const delivery = createPendingDelivery(overrides);
  delivery.ship(1, '顺丰速运', 'SF1234567890');
  delivery.clearDomainEvents();
  return delivery;
}

function createSignedDelivery(overrides?: Partial<DeliveryProps>): Delivery {
  const delivery = createShippedDelivery(overrides);
  delivery.sign(2);
  delivery.clearDomainEvents();
  return delivery;
}

describe('Delivery 聚合根', () => {
  describe('create() 工厂方法', () => {
    it('合法参数创建成功', () => {
      const delivery = createPendingDelivery();

      expect(delivery.id).toBe(1);
      expect(delivery.deliveryNo).toBe('DL20260706001');
      expect(delivery.status.value).toBe(1);
      expect(delivery.orderId).toBe(100);
      expect(delivery.customerId).toBe(1);
      expect(delivery.warehouseId).toBe(1);
      expect(delivery.lines).toHaveLength(2);
      expect(delivery.createBy).toBe(1);
    });

    it('自动计算 totalAmount 等于明细金额之和', () => {
      const delivery = createPendingDelivery();
      expect(delivery.totalAmount).toBe(2000);
    });

    it('orderId 缺失抛错', () => {
      expect(() =>
        Delivery.create({
          orderId: 0,
          customerId: 1,
          warehouseId: 1,
          lines: createLines(),
        } as DeliveryProps)
      ).toThrow('销售订单ID不能为空');
    });

    it('customerId 缺失抛错', () => {
      expect(() =>
        Delivery.create({
          orderId: 100,
          customerId: 0,
          warehouseId: 1,
          lines: createLines(),
        } as DeliveryProps)
      ).toThrow('客户ID不能为空');
    });

    it('warehouseId 缺失抛错', () => {
      expect(() =>
        Delivery.create({
          orderId: 100,
          customerId: 1,
          warehouseId: 0,
          lines: createLines(),
        } as DeliveryProps)
      ).toThrow('仓库ID不能为空');
    });

    it('lines 为空抛错', () => {
      expect(() =>
        Delivery.create({
          orderId: 100,
          customerId: 1,
          warehouseId: 1,
          lines: [],
        } as DeliveryProps)
      ).toThrow('发货明细不能为空');
    });
  });

  describe('reconstitute() 工厂方法', () => {
    it('从 DB 重建 pending 状态', () => {
      const delivery = Delivery.reconstitute({
        id: 5,
        deliveryNo: 'DL001',
        status: 1,
        orderId: 100,
        orderNo: 'SO001',
        customerId: 1,
        customerName: '客户A',
        warehouseId: 1,
        deliveryDate: '2026-07-01',
        logisticsCompany: '顺丰',
        trackingNo: 'SF001',
        totalAmount: 2000,
        lines: createLines(),
        createBy: 1,
        createTime: '2026-07-01 10:00:00',
      });

      expect(delivery.id).toBe(5);
      expect(delivery.status.value).toBe(1);
      expect(delivery.totalAmount).toBe(2000);
      expect(delivery.lines).toHaveLength(2);
    });

    it('从 DB 重建 shipped 状态', () => {
      const delivery = Delivery.reconstitute({
        id: 5,
        deliveryNo: 'DL001',
        status: 2,
        orderId: 100,
        customerId: 1,
        warehouseId: 1,
        totalAmount: 2000,
        lines: createLines(),
        shipBy: 3,
        shipTime: '2026-07-02 14:00:00',
      });

      expect(delivery.status.value).toBe(2);
      expect(delivery.shipBy).toBe(3);
      expect(delivery.shipTime).toBe('2026-07-02 14:00:00');
    });
  });

  describe('ship() 方法', () => {
    it('pending → shipped 成功', () => {
      const delivery = createPendingDelivery();
      delivery.ship(1, '顺丰速运', 'SF1234567890');

      expect(delivery.status.value).toBe(2);
      expect(delivery.shipBy).toBe(1);
      expect(delivery.shipTime).toBeTruthy();
      expect(delivery.logisticsCompany).toBe('顺丰速运');
      expect(delivery.trackingNo).toBe('SF1234567890');
    });

    it('ship 不传物流信息时保留空字符串', () => {
      const delivery = createPendingDelivery();
      delivery.ship(1);

      expect(delivery.status.value).toBe(2);
      expect(delivery.logisticsCompany).toBe('');
      expect(delivery.trackingNo).toBe('');
    });

    it('ship 时 inventoryCheck 全部通过则发货成功', () => {
      const delivery = createPendingDelivery();
      const checkFn = vi.fn(() => true);

      delivery.ship(1, undefined, undefined, checkFn);

      expect(delivery.status.value).toBe(2);
      expect(checkFn).toHaveBeenCalledTimes(2);
      expect(checkFn).toHaveBeenNthCalledWith(1, 1, 1, 10);
      expect(checkFn).toHaveBeenNthCalledWith(2, 2, 1, 5);
    });

    it('ship 时 inventoryCheck 返回 false 抛错', () => {
      const delivery = createPendingDelivery();
      const checkFn = vi.fn(() => false);

      expect(() => delivery.ship(1, undefined, undefined, checkFn)).toThrow(
        '物料物料A库存不足，无法发货'
      );
      expect(delivery.status.value).toBe(1);
    });

    it('shipBy 缺失抛错', () => {
      const delivery = createPendingDelivery();
      expect(() => delivery.ship(0)).toThrow('发货人不能为空');
    });

    it('已 shipped 再次 ship 抛错', () => {
      const delivery = createShippedDelivery();
      expect(() => delivery.ship(2)).toThrow('当前状态"已发货"不允许发货');
    });

    it('已 cancelled 的 ship 抛错', () => {
      const delivery = createPendingDelivery();
      delivery.cancel('测试取消');
      expect(() => delivery.ship(1)).toThrow('当前状态"已取消"不允许发货');
    });
  });

  describe('sign() 方法', () => {
    it('shipped → signed 成功', () => {
      const delivery = createShippedDelivery();
      delivery.sign(2);

      expect(delivery.status.value).toBe(3);
      expect(delivery.signBy).toBe(2);
      expect(delivery.signTime).toBeTruthy();
    });

    it('sign 不传 signBy 时仍成功', () => {
      const delivery = createShippedDelivery();
      delivery.sign();

      expect(delivery.status.value).toBe(3);
      expect(delivery.signBy).toBeUndefined();
    });

    it('pending 的 sign 抛错', () => {
      const delivery = createPendingDelivery();
      expect(() => delivery.sign(2)).toThrow('当前状态"待发货"不允许签收');
    });

    it('已 signed 再次 sign 抛错', () => {
      const delivery = createSignedDelivery();
      expect(() => delivery.sign(3)).toThrow('当前状态"已签收"不允许签收');
    });

    it('cancelled 的 sign 抛错', () => {
      const delivery = createPendingDelivery();
      delivery.cancel();
      expect(() => delivery.sign(2)).toThrow('当前状态"已取消"不允许签收');
    });
  });

  describe('cancel() 方法', () => {
    it('pending → cancelled 成功', () => {
      const delivery = createPendingDelivery();
      delivery.cancel('客户取消');

      expect(delivery.status.value).toBe(9);
    });

    it('shipped → cancelled 成功', () => {
      const delivery = createShippedDelivery();
      delivery.cancel('物流异常');

      expect(delivery.status.value).toBe(9);
    });

    it('signed 的 cancel 抛错', () => {
      const delivery = createSignedDelivery();
      expect(() => delivery.cancel()).toThrow('当前状态"已签收"不允许取消');
    });

    it('已 cancelled 再次 cancel 抛错', () => {
      const delivery = createPendingDelivery();
      delivery.cancel();
      expect(() => delivery.cancel()).toThrow('当前状态"已取消"不允许取消');
    });
  });

  describe('状态判断方法', () => {
    it('canEdit/canDelete 仅 pending 返回 true', () => {
      const pending = createPendingDelivery();
      expect(pending.canEdit()).toBe(true);
      expect(pending.canDelete()).toBe(true);

      const shipped = createShippedDelivery();
      expect(shipped.canEdit()).toBe(false);
      expect(shipped.canDelete()).toBe(false);
    });

    it('isTerminal 在 signed/cancelled 返回 true', () => {
      expect(createPendingDelivery().status.isTerminal()).toBe(false);
      expect(createShippedDelivery().status.isTerminal()).toBe(false);
      expect(createSignedDelivery().status.isTerminal()).toBe(true);

      const cancelled = createPendingDelivery();
      cancelled.cancel();
      expect(cancelled.status.isTerminal()).toBe(true);
    });

    it('状态 label 正确', () => {
      expect(createPendingDelivery().status.label).toBe('待发货');
      expect(createShippedDelivery().status.label).toBe('已发货');
      expect(createSignedDelivery().status.label).toBe('已签收');

      const cancelled = createPendingDelivery();
      cancelled.cancel();
      expect(cancelled.status.label).toBe('已取消');
    });
  });

  describe('事件发布', () => {
    it('create 发布 DeliveryCreatedEvent', () => {
      const delivery = createPendingDelivery();
      const events = delivery.getDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('delivery.created');
      expect(events[0].payload).toMatchObject({
        deliveryId: 1,
        deliveryNo: 'DL20260706001',
        orderId: 100,
        customerId: 1,
        warehouseId: 1,
      });
      expect(events[0].payload.lines).toHaveLength(2);
    });

    it('ship 发布 DeliveryShippedEvent 含 shippedItems', () => {
      const delivery = createPendingDelivery();
      delivery.clearDomainEvents();
      delivery.ship(1, '顺丰', 'SF001');

      const events = delivery.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('delivery.shipped');
      expect(events[0].payload).toMatchObject({
        deliveryId: 1,
        orderId: 100,
        warehouseId: 1,
        logisticsCompany: '顺丰',
        trackingNo: 'SF001',
        totalAmount: 2000,
      });
      const payload = events[0].payload as any;
      expect(payload.shippedItems).toHaveLength(2);
      expect(payload.shippedItems[0]).toMatchObject({
        materialId: 1,
        quantity: 10,
        unitPrice: 100,
      });
    });

    it('sign 发布 DeliverySignedEvent', () => {
      const delivery = createShippedDelivery();
      delivery.sign(2);

      const events = delivery.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('delivery.signed');
      expect(events[0].payload).toMatchObject({
        deliveryId: 1,
        signedBy: 2,
      });
    });

    it('cancel 发布 DeliveryCancelledEvent', () => {
      const delivery = createPendingDelivery();
      delivery.clearDomainEvents();
      delivery.cancel('测试原因');

      const events = delivery.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('delivery.cancelled');
      expect(events[0].payload).toMatchObject({
        deliveryId: 1,
        reason: '测试原因',
      });
    });

    it('clearDomainEvents 清空事件', () => {
      const delivery = createPendingDelivery();
      expect(delivery.getDomainEvents()).toHaveLength(1);

      delivery.clearDomainEvents();
      expect(delivery.getDomainEvents()).toHaveLength(0);
    });
  });

  describe('lines 防御性拷贝', () => {
    it('外部修改 lines 不影响聚合内部状态', () => {
      const delivery = createPendingDelivery();
      const lines = delivery.lines;

      expect(lines).toHaveLength(2);
      lines.pop();
      expect(delivery.lines).toHaveLength(2);
    });
  });
});
