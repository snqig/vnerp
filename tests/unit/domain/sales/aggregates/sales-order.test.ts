/**
 * SalesOrder 聚合根单元测试
 * 覆盖 create/reconstitute/submit/approve/ship/close 全流程
 * 重点：状态机流转、库存校验回调、事件发布、明细出库数量校验
 */

import { describe, it, expect } from 'vitest';
import { SalesOrder } from '@/domain/sales/aggregates/SalesOrder';
import type { SalesOrderProps } from '@/domain/sales/aggregates/SalesOrder';
import type { SalesOrderLineProps } from '@/domain/sales/entities/SalesOrderLine';
import { SalesOrderStatus } from '@/domain/sales/value-objects/SalesOrderStatus';
import { DomainError } from '@/domain/shared/DomainTypes';

function createLines(overrides?: Partial<SalesOrderLineProps>[]): SalesOrderLineProps[] {
  return [
    {
      lineNo: 1,
      materialId: 1,
      materialCode: 'M001',
      materialName: '物料A',
      specification: '规格A',
      unit: '件',
      orderQty: 100,
      shippedQty: 0,
      unitPrice: 10,
      amount: 1000,
      ...(overrides?.[0] || {}),
    },
    {
      lineNo: 2,
      materialId: 2,
      materialCode: 'M002',
      materialName: '物料B',
      specification: '规格B',
      unit: '个',
      orderQty: 50,
      shippedQty: 0,
      unitPrice: 20,
      amount: 1000,
      ...(overrides?.[1] || {}),
    },
  ];
}

function createDraftOrder(overrides?: Partial<SalesOrderProps>): SalesOrder {
  return SalesOrder.create({
    id: 1,
    orderNo: 'SO20260701001',
    customerId: 1,
    customerName: '客户A',
    orderDate: '2026-07-01',
    deliveryDate: '2026-07-15',
    warehouseId: 1,
    createBy: 1,
    lines: createLines(),
    ...overrides,
  });
}

function createApprovedOrder(overrides?: Partial<SalesOrderProps>): SalesOrder {
  const order = createDraftOrder(overrides);
  order.submit();
  order.approve(1);
  return order;
}

describe('SalesOrder Aggregate', () => {
  // ========================================
  // 1. create()
  // ========================================
  describe('create()', () => {
    it('应创建草稿状态的销售订单', () => {
      const order = createDraftOrder();
      expect(order.status.value).toBe('draft');
      expect(order.orderNo).toBe('SO20260701001');
      expect(order.customerId).toBe(1);
      expect(order.customerName).toBe('客户A');
      expect(order.lines).toHaveLength(2);
    });

    it('应自动计算总金额和总数量', () => {
      const order = createDraftOrder();
      expect(order.totalAmount).toBe(2000);
      expect(order.totalQuantity).toBe(150);
    });

    it('应自动分配行号', () => {
      const lines: SalesOrderLineProps[] = [
        { lineNo: 0, materialId: 1, materialCode: 'M001', materialName: 'A', unit: '件', orderQty: 10, shippedQty: 0, unitPrice: 5, amount: 50 },
        { lineNo: 0, materialId: 2, materialCode: 'M002', materialName: 'B', unit: '个', orderQty: 20, shippedQty: 0, unitPrice: 3, amount: 60 },
      ];
      const order = SalesOrder.create({ id: 1, orderNo: 'SO001', customerId: 1, customerName: 'C', orderDate: '2026-07-01', lines });
      expect(order.lines[0].lineNo).toBe(1);
      expect(order.lines[1].lineNo).toBe(2);
    });

    it('有id时应生成SalesOrderCreatedEvent', () => {
      const order = createDraftOrder();
      const events = order.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('sales.created');
    });

    it('无id时不应生成事件', () => {
      const order = SalesOrder.create({
        customerId: 1,
        customerName: '客户A',
        orderDate: '2026-07-01',
        lines: createLines(),
      });
      expect(order.getDomainEvents()).toHaveLength(0);
    });

    it('客户为空时应抛出DomainError', () => {
      expect(() =>
        SalesOrder.create({ customerId: 0, customerName: '', orderDate: '2026-07-01', lines: createLines() })
      ).toThrow(DomainError);
    });

    it('明细为空时应抛出DomainError', () => {
      expect(() =>
        SalesOrder.create({ customerId: 1, customerName: 'A', orderDate: '2026-07-01', lines: [] })
      ).toThrow(DomainError);
    });

    it('应支持可选字段的默认值', () => {
      const order = SalesOrder.create({
        id: 1,
        customerId: 1,
        customerName: 'A',
        orderDate: '2026-07-01',
        lines: createLines(),
      });
      expect(order.orderNo).toBe('');
      expect(order.deliveryDate).toBe('');
      expect(order.warehouseId).toBe(1);
      expect(order.remark).toBe('');
    });
  });

  // ========================================
  // 2. reconstitute()
  // ========================================
  describe('reconstitute()', () => {
    it('应从持久化数据恢复订单', () => {
      const order = SalesOrder.reconstitute({
        id: 10,
        orderNo: 'SO010',
        status: 'approved',
        customerId: 2,
        customerName: '客户B',
        orderDate: '2026-06-01',
        deliveryDate: '2026-06-15',
        totalAmount: 5000,
        totalQuantity: 300,
        warehouseId: 2,
        createBy: 1,
        auditBy: 2,
        auditTime: '2026-06-02 10:00:00',
        lines: [
          { lineNo: 1, materialId: 1, materialCode: 'M001', materialName: 'A', unit: '件', orderQty: 300, shippedQty: 0, unitPrice: 5000, amount: 5000 },
        ],
      });
      expect(order.id).toBe(10);
      expect(order.status.value).toBe('approved');
      expect(order.auditBy).toBe(2);
      expect(order.lines).toHaveLength(1);
      expect(order.getDomainEvents()).toHaveLength(0);
    });
  });

  // ========================================
  // 3. submit()
  // ========================================
  describe('submit()', () => {
    it('应从草稿转为已提交', () => {
      const order = createDraftOrder();
      order.submit();
      expect(order.status.value).toBe('submitted');
    });

    it('应生成SalesOrderSubmittedEvent', () => {
      const order = createDraftOrder();
      order.clearDomainEvents();
      order.submit();
      const events = order.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('sales.submitted');
    });
  });

  // ========================================
  // 4. approve()
  // ========================================
  describe('approve()', () => {
    it('应从已提交转为已审核', () => {
      const order = createDraftOrder();
      order.submit();
      order.approve(5);
      expect(order.status.value).toBe('approved');
      expect(order.auditBy).toBe(5);
      expect(order.auditTime).toBeTruthy();
    });

    it('应生成SalesOrderApprovedEvent', () => {
      const order = createDraftOrder();
      order.submit();
      order.clearDomainEvents();
      order.approve(1);
      const events = order.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('sales.approved');
    });

    it('草稿状态不允许审核', () => {
      const order = createDraftOrder();
      expect(() => order.approve(1)).toThrow(DomainError);
    });

    it('已审核状态不允许重复审核', () => {
      const order = createApprovedOrder();
      expect(() => order.approve(2)).toThrow(DomainError);
    });
  });

  // ========================================
  // 5. ship()
  // ========================================
  describe('ship()', () => {
    it('部分出库应转为partially_shipped', () => {
      const order = createApprovedOrder();
      order.ship([{ lineNo: 1, quantity: 50, batchNo: 'B001', warehouseId: 1 }]);
      expect(order.status.value).toBe('partially_shipped');
      expect(order.lines[0].shippedQty).toBe(50);
      expect(order.lines[1].shippedQty).toBe(0);
      expect(order.totalShippedQty).toBe(50);
      expect(order.isFullyShipped).toBe(false);
    });

    it('全部出库应转为completed', () => {
      const order = createApprovedOrder();
      order.ship([
        { lineNo: 1, quantity: 100, batchNo: 'B001', warehouseId: 1 },
        { lineNo: 2, quantity: 50, batchNo: 'B002', warehouseId: 1 },
      ]);
      expect(order.status.value).toBe('completed');
      expect(order.isFullyShipped).toBe(true);
      expect(order.totalShippedQty).toBe(150);
    });

    it('分批出库应正确累计', () => {
      const order = createApprovedOrder();
      order.ship([{ lineNo: 1, quantity: 30, batchNo: 'B001', warehouseId: 1 }]);
      expect(order.status.value).toBe('partially_shipped');
      order.ship([
        { lineNo: 1, quantity: 70, batchNo: 'B002', warehouseId: 1 },
        { lineNo: 2, quantity: 50, batchNo: 'B003', warehouseId: 1 },
      ]);
      expect(order.status.value).toBe('completed');
      expect(order.lines[0].shippedQty).toBe(100);
    });

    it('应生成SalesOrderShippedEvent', () => {
      const order = createApprovedOrder();
      order.clearDomainEvents();
      order.ship([{ lineNo: 1, quantity: 50, batchNo: 'B001', warehouseId: 1 }]);
      const events = order.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('sales.shipped');
    });

    it('库存校验失败时应抛出DomainError', () => {
      const order = createApprovedOrder();
      const checkFn = () => false;
      expect(() =>
        order.ship([{ lineNo: 1, quantity: 50, batchNo: 'B001', warehouseId: 1 }], checkFn)
      ).toThrow(DomainError);
    });

    it('库存校验通过时应正常出库', () => {
      const order = createApprovedOrder();
      const checkFn = () => true;
      order.ship([{ lineNo: 1, quantity: 50, batchNo: 'B001', warehouseId: 1 }], checkFn);
      expect(order.status.value).toBe('partially_shipped');
    });

    it('不存在的行号应抛出DomainError', () => {
      const order = createApprovedOrder();
      expect(() =>
        order.ship([{ lineNo: 99, quantity: 10, batchNo: 'B001', warehouseId: 1 }])
      ).toThrow(DomainError);
    });

    it('出库数量超过订购数量应抛出DomainError', () => {
      const order = createApprovedOrder();
      expect(() =>
        order.ship([{ lineNo: 1, quantity: 200, batchNo: 'B001', warehouseId: 1 }])
      ).toThrow(DomainError);
    });

    it('草稿状态不允许出库', () => {
      const order = createDraftOrder();
      expect(() =>
        order.ship([{ lineNo: 1, quantity: 10, batchNo: 'B001', warehouseId: 1 }])
      ).toThrow(DomainError);
    });
  });

  // ========================================
  // 6. close()
  // ========================================
  describe('close()', () => {
    it('应从草稿关闭', () => {
      const order = createDraftOrder();
      order.close();
      expect(order.status.value).toBe('closed');
    });

    it('应从已提交关闭', () => {
      const order = createDraftOrder();
      order.submit();
      order.close();
      expect(order.status.value).toBe('closed');
    });

    it('应从已审核关闭', () => {
      const order = createApprovedOrder();
      order.close();
      expect(order.status.value).toBe('closed');
    });

    it('应生成SalesOrderClosedEvent', () => {
      const order = createDraftOrder();
      order.clearDomainEvents();
      order.close();
      const events = order.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('sales.closed');
    });

    it('已完成状态不允许关闭', () => {
      const order = createApprovedOrder();
      order.ship([
        { lineNo: 1, quantity: 100, batchNo: 'B001', warehouseId: 1 },
        { lineNo: 2, quantity: 50, batchNo: 'B002', warehouseId: 1 },
      ]);
      expect(() => order.close()).toThrow(DomainError);
    });
  });

  // ========================================
  // 7. canEdit() / canDelete()
  // ========================================
  describe('canEdit() / canDelete()', () => {
    it('草稿状态可编辑可删除', () => {
      const order = createDraftOrder();
      expect(order.canEdit()).toBe(true);
      expect(order.canDelete()).toBe(true);
    });

    it('已提交状态不可编辑不可删除', () => {
      const order = createDraftOrder();
      order.submit();
      expect(order.canEdit()).toBe(false);
      expect(order.canDelete()).toBe(false);
    });

    it('已审核状态不可编辑不可删除', () => {
      const order = createApprovedOrder();
      expect(order.canEdit()).toBe(false);
      expect(order.canDelete()).toBe(false);
    });
  });

  // ========================================
  // 8. DomainEvents 管理
  // ========================================
  describe('DomainEvents', () => {
    it('clearDomainEvents应清空事件', () => {
      const order = createDraftOrder();
      expect(order.getDomainEvents()).toHaveLength(1);
      order.clearDomainEvents();
      expect(order.getDomainEvents()).toHaveLength(0);
    });

    it('多步操作应累积事件', () => {
      const order = createDraftOrder();
      order.clearDomainEvents();
      order.submit();
      order.approve(1);
      expect(order.getDomainEvents()).toHaveLength(2);
    });
  });
});

describe('SalesOrderStatus Value Object', () => {
  describe('fromDbCode() / toDbCode()', () => {
    it('应正确映射状态码', () => {
      expect(SalesOrderStatus.draft().toDbCode()).toBe(0);
      expect(SalesOrderStatus.submitted().toDbCode()).toBe(1);
      expect(SalesOrderStatus.approved().toDbCode()).toBe(2);
      expect(SalesOrderStatus.partiallyShipped().toDbCode()).toBe(3);
      expect(SalesOrderStatus.completed().toDbCode()).toBe(4);
      expect(SalesOrderStatus.closed().toDbCode()).toBe(9);
    });

    it('应从数据库码恢复状态', () => {
      expect(SalesOrderStatus.fromDbCode(0).value).toBe('draft');
      expect(SalesOrderStatus.fromDbCode(1).value).toBe('submitted');
      expect(SalesOrderStatus.fromDbCode(2).value).toBe('approved');
      expect(SalesOrderStatus.fromDbCode(3).value).toBe('partially_shipped');
      expect(SalesOrderStatus.fromDbCode(4).value).toBe('completed');
      expect(SalesOrderStatus.fromDbCode(9).value).toBe('closed');
    });

    it('无效状态码应抛出DomainError', () => {
      expect(() => SalesOrderStatus.fromDbCode(99)).toThrow(DomainError);
    });
  });

  describe('状态流转', () => {
    it('草稿可流转到已提交', () => {
      expect(SalesOrderStatus.draft().canTransitionTo('submitted')).toBe(true);
    });

    it('草稿可流转到已关闭', () => {
      expect(SalesOrderStatus.draft().canTransitionTo('closed')).toBe(true);
    });

    it('草稿不可直接流转到已审核', () => {
      expect(SalesOrderStatus.draft().canTransitionTo('approved')).toBe(false);
    });

    it('已完成不可流转', () => {
      expect(SalesOrderStatus.completed().canTransitionTo('closed')).toBe(false);
    });

    it('已关闭不可流转', () => {
      expect(SalesOrderStatus.closed().canTransitionTo('draft')).toBe(false);
    });

    it('非法流转应抛出DomainError', () => {
      expect(() => SalesOrderStatus.draft().transitionTo('approved')).toThrow(DomainError);
    });
  });

  describe('label()', () => {
    it('应返回中文标签', () => {
      expect(SalesOrderStatus.draft().label()).toBe('草稿');
      expect(SalesOrderStatus.submitted().label()).toBe('已提交');
      expect(SalesOrderStatus.approved().label()).toBe('已审核');
      expect(SalesOrderStatus.partiallyShipped().label()).toBe('部分出库');
      expect(SalesOrderStatus.completed().label()).toBe('已完成');
      expect(SalesOrderStatus.closed().label()).toBe('已关闭');
    });
  });

  describe('equals()', () => {
    it('相同状态应相等', () => {
      expect(SalesOrderStatus.draft().equals(SalesOrderStatus.draft())).toBe(true);
    });

    it('不同状态应不相等', () => {
      expect(SalesOrderStatus.draft().equals(SalesOrderStatus.submitted())).toBe(false);
    });
  });
});
