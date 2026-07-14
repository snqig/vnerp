import { describe, it, expect } from 'vitest';
import { PurchaseOrder, PurchaseOrderProps } from '@/domain/purchase/aggregates/PurchaseOrder';
import { PurchaseOrderStatus } from '@/domain/purchase/value-objects/PurchaseOrderStatus';
import { DomainError } from '@/domain/shared/DomainTypes';

function buildValidProps(overrides: Partial<PurchaseOrderProps> = {}): PurchaseOrderProps {
  return {
    id: 1,
    orderNo: 'PO20260707001',
    supplierId: 100,
    supplierName: '测试供应商',
    orderDate: '2026-07-07',
    lines: [
      {
        lineNo: 1,
        materialId: 200,
        materialCode: 'MAT001',
        materialName: '测试物料A',
        unit: '个',
        orderQty: 100,
        receivedQty: 0,
        returnedQty: 0,
        unitPrice: 10,
        amount: 1000,
        taxRate: 13,
        taxAmount: 130,
        lineTotal: 1130,
      },
      {
        lineNo: 2,
        materialId: 201,
        materialCode: 'MAT002',
        materialName: '测试物料B',
        unit: '个',
        orderQty: 50,
        receivedQty: 0,
        returnedQty: 0,
        unitPrice: 20,
        amount: 1000,
        taxRate: 13,
        taxAmount: 130,
        lineTotal: 1130,
      },
    ],
    ...overrides,
  };
}

describe('PurchaseOrder Aggregate', () => {
  describe('create()', () => {
    it('应成功创建草稿状态采购单', () => {
      const order = PurchaseOrder.create(buildValidProps());

      expect(order.id).toBe(1);
      expect(order.orderNo).toBe('PO20260707001');
      expect(order.status.value).toBe('draft');
      expect(order.supplierId).toBe(100);
      expect(order.supplierName).toBe('测试供应商');
      expect(order.lines).toHaveLength(2);
    });

    it('应自动计算总金额和税额', () => {
      const order = PurchaseOrder.create(buildValidProps());

      expect(order.totalAmount).toBe(2000);
      expect(order.totalQuantity).toBe(150);
      expect(order.taxRate).toBe(13);
      expect(order.taxAmount).toBe(260);
      expect(order.grandTotal).toBe(2260);
    });

    it('应自动分配行号（若未提供）', () => {
      const props = buildValidProps({
        lines: [
          {
            materialId: 200,
            materialCode: 'MAT001',
            materialName: '物料A',
            unit: '个',
            orderQty: 10,
            unitPrice: 5,
          } as any,
          {
            materialId: 201,
            materialCode: 'MAT002',
            materialName: '物料B',
            unit: '个',
            orderQty: 20,
            unitPrice: 8,
          } as any,
        ],
      });

      const order = PurchaseOrder.create(props);
      expect(order.lines[0].lineNo).toBe(1);
      expect(order.lines[1].lineNo).toBe(2);
    });

    it('供应商为空时应抛出 DomainError', () => {
      expect(() => PurchaseOrder.create(buildValidProps({ supplierId: 0 }))).toThrow(DomainError);
      expect(() => PurchaseOrder.create(buildValidProps({ supplierId: -1 }))).toThrow(DomainError);
    });

    it('明细为空时应抛出 DomainError', () => {
      expect(() => PurchaseOrder.create(buildValidProps({ lines: [] }))).toThrow(DomainError);
    });

    it('无 id 时不应发布 PurchaseOrderCreatedEvent', () => {
      const order = PurchaseOrder.create(buildValidProps({ id: undefined }));
      expect(order.getDomainEvents()).toHaveLength(0);
    });

    it('有 id 时应发布 PurchaseOrderCreatedEvent', () => {
      const order = PurchaseOrder.create(buildValidProps({ id: 1 }));
      const events = order.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('purchase.created');
    });

    it('应支持自定义税率和默认 13% 税率', () => {
      const order1 = PurchaseOrder.create(buildValidProps({ taxRate: 6 }));
      expect(order1.taxRate).toBe(6);
      expect(order1.taxAmount).toBe(120);

      const order2 = PurchaseOrder.create(buildValidProps({ taxRate: undefined }));
      expect(order2.taxRate).toBe(13);
    });
  });

  describe('reconstitute()', () => {
    it('应从持久化数据重建聚合根', () => {
      const props = buildValidProps({
        status: 'approved',
        totalAmount: 5000,
        totalQuantity: 300,
        taxAmount: 650,
        grandTotal: 5650,
        auditBy: 999,
        auditTime: '2026-07-07 10:00:00',
      });

      const order = PurchaseOrder.reconstitute(props);

      expect(order.status.value).toBe('approved');
      expect(order.totalAmount).toBe(5000);
      expect(order.totalQuantity).toBe(300);
      expect(order.auditBy).toBe(999);
      expect(order.auditTime).toBe('2026-07-07 10:00:00');
      expect(order.getDomainEvents()).toHaveLength(0);
    });

    it('重建时不触发 domain events', () => {
      const order = PurchaseOrder.reconstitute(buildValidProps({ id: 1, status: 'approved' }));
      expect(order.getDomainEvents()).toHaveLength(0);
    });
  });

  describe('submit()', () => {
    it('草稿状态可提交', () => {
      const order = PurchaseOrder.create(buildValidProps({ id: 1 }));
      order.submit();

      expect(order.status.value).toBe('submitted');
      const events = order.getDomainEvents();
      const submitEvent = events.find((e) => e.eventType === 'purchase.submitted');
      expect(submitEvent).toBeDefined();
    });

    it('已提交状态再次提交应抛出错误', () => {
      const order = PurchaseOrder.create(buildValidProps({ id: 1 }));
      order.submit();
      expect(() => order.submit()).toThrow(DomainError);
    });
  });

  describe('approve()', () => {
    it('已提交状态可审核', () => {
      const order = PurchaseOrder.create(buildValidProps({ id: 1 }));
      order.submit();
      order.approve(888);

      expect(order.status.value).toBe('approved');
      expect(order.auditBy).toBe(888);
      expect(order.auditTime).toBeDefined();

      const approveEvent = order.getDomainEvents().find((e) => e.eventType === 'purchase.approved');
      expect(approveEvent).toBeDefined();
    });

    it('草稿状态不允许审核', () => {
      const order = PurchaseOrder.create(buildValidProps({ id: 1 }));
      expect(() => order.approve(1)).toThrow(DomainError);
    });

    it('审核事件应包含明细行信息', () => {
      const order = PurchaseOrder.create(buildValidProps({ id: 1 }));
      order.submit();
      order.approve(1);

      const approveEvent = order.getDomainEvents().find(
        (e) => e.eventType === 'purchase.approved'
      ) as any;
      expect(approveEvent.payload.lines).toHaveLength(2);
      expect(approveEvent.payload.lines[0].materialId).toBe(200);
      expect(approveEvent.payload.totalAmount).toBe(2000);
      expect(approveEvent.payload.grandTotal).toBe(2260);
    });
  });

  describe('receive()', () => {
    it('已审核状态可部分入库', () => {
      const order = PurchaseOrder.create(buildValidProps({ id: 1 }));
      order.submit();
      order.approve(1);

      order.receive([
        { lineNo: 1, quantity: 50, batchNo: 'B001', warehouseId: 10 },
      ]);

      expect(order.status.value).toBe('partially_received');
      expect(order.totalReceivedQty).toBe(50);
      expect(order.isFullyReceived).toBe(false);

      const receiveEvent = order.getDomainEvents().find(
        (e) => e.eventType === 'purchase.received'
      );
      expect(receiveEvent).toBeDefined();
    });

    it('全部入库后状态应变为已完成', () => {
      const order = PurchaseOrder.create(buildValidProps({ id: 1 }));
      order.submit();
      order.approve(1);

      order.receive([
        { lineNo: 1, quantity: 100, batchNo: 'B001', warehouseId: 10 },
        { lineNo: 2, quantity: 50, batchNo: 'B002', warehouseId: 10 },
      ]);

      expect(order.status.value).toBe('completed');
      expect(order.isFullyReceived).toBe(true);
      expect(order.totalReceivedQty).toBe(150);
    });

    it('草稿状态不允许入库', () => {
      const order = PurchaseOrder.create(buildValidProps({ id: 1 }));
      expect(() =>
        order.receive([{ lineNo: 1, quantity: 10, batchNo: 'B1', warehouseId: 1 }])
      ).toThrow(DomainError);
    });

    it('不存在的行号应抛出错误', () => {
      const order = PurchaseOrder.create(buildValidProps({ id: 1 }));
      order.submit();
      order.approve(1);

      expect(() =>
        order.receive([{ lineNo: 99, quantity: 10, batchNo: 'B1', warehouseId: 1 }])
      ).toThrow(DomainError);
    });

    it('部分入库状态可继续入库', () => {
      const order = PurchaseOrder.create(buildValidProps({ id: 1 }));
      order.submit();
      order.approve(1);

      order.receive([{ lineNo: 1, quantity: 50, batchNo: 'B001', warehouseId: 10 }]);
      expect(order.status.value).toBe('partially_received');

      order.receive([
        { lineNo: 1, quantity: 50, batchNo: 'B002', warehouseId: 10 },
        { lineNo: 2, quantity: 50, batchNo: 'B003', warehouseId: 10 },
      ]);
      expect(order.status.value).toBe('completed');
    });

    it('入库事件应包含批次和仓库信息', () => {
      const order = PurchaseOrder.create(buildValidProps({ id: 1 }));
      order.submit();
      order.approve(1);

      order.receive([{ lineNo: 1, quantity: 100, batchNo: 'BATCH001', warehouseId: 99 }]);

      const event = order.getDomainEvents().find(
        (e) => e.eventType === 'purchase.received'
      ) as any;
      expect(event.payload.receivedItems[0].batchNo).toBe('BATCH001');
      expect(event.payload.receivedItems[0].warehouseId).toBe(99);
      expect(event.payload.receivedItems[0].materialId).toBe(200);
    });
  });

  describe('close()', () => {
    it.each(['draft', 'submitted', 'approved', 'partially_received'] as const)(
      '%s 状态可关闭',
      (status) => {
        const order = PurchaseOrder.reconstitute(buildValidProps({ id: 1, status }));
        order.close();
        expect(order.status.value).toBe('closed');

        const closeEvent = order.getDomainEvents().find(
          (e) => e.eventType === 'purchase.closed'
        );
        expect(closeEvent).toBeDefined();
      }
    );

    it('已完成状态可关闭（支持作废全链路回滚）', () => {
      const order = PurchaseOrder.reconstitute(buildValidProps({ id: 1, status: 'completed' }));
      order.close();
      expect(order.status.value).toBe('closed');
      const closeEvent = order.getDomainEvents().find((e) => e.eventType === 'purchase.closed');
      expect(closeEvent).toBeDefined();
    });

    it('已关闭状态不可再次关闭', () => {
      const order = PurchaseOrder.reconstitute(buildValidProps({ id: 1, status: 'closed' }));
      expect(() => order.close()).toThrow(DomainError);
    });
  });

  describe('canEdit()', () => {
    it('草稿状态可编辑', () => {
      const order = PurchaseOrder.create(buildValidProps());
      expect(order.canEdit()).toBe(true);
    });

    it.each(['submitted', 'approved', 'partially_received', 'completed', 'closed'] as const)(
      '%s 状态不可编辑',
      (status) => {
        const order = PurchaseOrder.reconstitute(buildValidProps({ status }));
        expect(order.canEdit()).toBe(false);
      }
    );
  });

  describe('domainEvents 生命周期', () => {
    it('完整生命周期应累积所有事件', () => {
      const order = PurchaseOrder.create(buildValidProps({ id: 1 }));

      order.submit();
      order.approve(1);
      order.receive([
        { lineNo: 1, quantity: 100, batchNo: 'B1', warehouseId: 1 },
        { lineNo: 2, quantity: 50, batchNo: 'B2', warehouseId: 1 },
      ]);

      const types = order.getDomainEvents().map((e) => e.eventType);
      expect(types).toContain('purchase.created');
      expect(types).toContain('purchase.submitted');
      expect(types).toContain('purchase.approved');
      expect(types).toContain('purchase.received');
      expect(order.getDomainEvents()).toHaveLength(4);
    });

    it('clearDomainEvents 后事件列表应为空', () => {
      const order = PurchaseOrder.create(buildValidProps({ id: 1 }));
      order.submit();

      order.clearDomainEvents();
      expect(order.getDomainEvents()).toHaveLength(0);
    });
  });
});

describe('PurchaseOrderStatus Value Object', () => {
  describe('状态流转', () => {
    it('草稿可流转到已提交', () => {
      expect(PurchaseOrderStatus.draft().canTransitionTo('submitted')).toBe(true);
    });

    it('草稿可流转到已关闭', () => {
      expect(PurchaseOrderStatus.draft().canTransitionTo('closed')).toBe(true);
    });

    it('已提交可流转到已审核', () => {
      expect(PurchaseOrderStatus.submitted().canTransitionTo('approved')).toBe(true);
    });

    it('已审核可流转到部分入库', () => {
      expect(PurchaseOrderStatus.approved().canTransitionTo('partially_received')).toBe(true);
    });

    it('部分入库可流转到已完成', () => {
      expect(PurchaseOrderStatus.partiallyReceived().canTransitionTo('completed')).toBe(true);
    });

    it('已完成可流转到已关闭（支持作废全链路回滚）', () => {
      expect(PurchaseOrderStatus.completed().canTransitionTo('closed')).toBe(true);
    });

    it('已作废不可流转', () => {
      expect(PurchaseOrderStatus.voided().canTransitionTo('closed')).toBe(false);
      expect(PurchaseOrderStatus.voided().canTransitionTo('approved')).toBe(false);
    });

    it('草稿/已提交/已审核/部分入库可流转到已作废', () => {
      expect(PurchaseOrderStatus.draft().canTransitionTo('voided')).toBe(true);
      expect(PurchaseOrderStatus.submitted().canTransitionTo('voided')).toBe(true);
      expect(PurchaseOrderStatus.approved().canTransitionTo('voided')).toBe(true);
      expect(PurchaseOrderStatus.partiallyReceived().canTransitionTo('voided')).toBe(true);
    });

    it('非法流转应抛出 DomainError', () => {
      expect(() => PurchaseOrderStatus.draft().transitionTo('approved')).toThrow(DomainError);
    });
  });

  describe('操作权限', () => {
    it('草稿状态可编辑/删除/提交', () => {
      const s = PurchaseOrderStatus.draft();
      expect(s.canEdit()).toBe(true);
      expect(s.canDelete()).toBe(true);
    });

    it('已提交状态可审核', () => {
      expect(PurchaseOrderStatus.submitted().canApprove()).toBe(true);
    });

    it('已审核状态可入库', () => {
      expect(PurchaseOrderStatus.approved().canReceive()).toBe(true);
    });

    it('部分入库状态可入库', () => {
      expect(PurchaseOrderStatus.partiallyReceived().canReceive()).toBe(true);
    });

    it('已完成状态不可入库', () => {
      expect(PurchaseOrderStatus.completed().canReceive()).toBe(false);
    });
  });

  describe('数据库状态码映射', () => {
    it.each([
      [10, 'draft'],
      [20, 'submitted'],
      [30, 'approved'],
      [40, 'partially_received'],
      [50, 'completed'],
      [90, 'closed'],
      [99, 'voided'],
    ] as const)('状态码 %i 对应状态 %s', (code, status) => {
      expect(PurchaseOrderStatus.fromDbCode(code).value).toBe(status);
      expect(PurchaseOrderStatus.from(status).toDbCode()).toBe(code);
    });

    it('无效状态码应抛出错误', () => {
      expect(() => PurchaseOrderStatus.fromDbCode(999)).toThrow(DomainError);
    });
  });

  describe('equals()', () => {
    it('相同状态应相等', () => {
      expect(PurchaseOrderStatus.draft().equals(PurchaseOrderStatus.draft())).toBe(true);
    });

    it('不同状态不应相等', () => {
      expect(PurchaseOrderStatus.draft().equals(PurchaseOrderStatus.approved())).toBe(false);
    });
  });

  describe('label()', () => {
    it('应返回中文标签', () => {
      expect(PurchaseOrderStatus.draft().label()).toBe('草稿');
      expect(PurchaseOrderStatus.approved().label()).toBe('已审核');
      expect(PurchaseOrderStatus.completed().label()).toBe('已完成');
    });
  });
});
