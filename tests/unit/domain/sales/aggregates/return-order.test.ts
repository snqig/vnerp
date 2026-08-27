/**
 * ReturnOrder 聚合根单元测试
 * 覆盖 create/reconstitute/approve/complete/cancel 全流程
 * 重点：complete 回调协作、红字应收创建、入库触发、状态机流转
 */

import { describe, it, expect, vi } from 'vitest';
import { ReturnOrder } from '@/domain/sales/aggregates/ReturnOrder';
import type { ReturnOrderProps, InboundResult, ReceivableResult } from '@/domain/sales/aggregates/ReturnOrder';
import type { ReturnOrderLineProps } from '@/domain/sales/entities/ReturnOrderLine';

function createLines(overrides?: Partial<ReturnOrderLineProps>[]): ReturnOrderLineProps[] {
  return [
    {
      lineNo: 1,
      deliveryDetailId: 201,
      orderDetailId: 101,
      materialId: 1,
      materialCode: 'M001',
      materialName: '物料A',
      materialSpec: '规格A',
      unit: '件',
      quantity: 3,
      unitPrice: 100,
      batchNo: 'B20260701',
      ...(overrides?.[0] || {}),
    },
    {
      lineNo: 2,
      deliveryDetailId: 202,
      orderDetailId: 102,
      materialId: 2,
      materialCode: 'M002',
      materialName: '物料B',
      materialSpec: '规格B',
      unit: '个',
      quantity: 2,
      unitPrice: 200,
      batchNo: 'B20260702',
      ...(overrides?.[1] || {}),
    },
  ];
}

function createPendingReturn(overrides?: Partial<ReturnOrderProps>): ReturnOrder {
  return ReturnOrder.create({
    id: 1,
    returnNo: 'RT20260706001',
    orderId: 100,
    orderNo: 'SO20260701001',
    customerId: 1,
    customerName: '客户A',
    warehouseId: 1,
    deliveryId: 50,
    deliveryNo: 'DL20260705001',
    reason: '质量问题',
    lines: createLines(),
    createBy: 1,
    ...overrides,
  });
}

function createApprovedReturn(overrides?: Partial<ReturnOrderProps>): ReturnOrder {
  const ret = createPendingReturn(overrides);
  ret.approve(2);
  ret.clearDomainEvents();
  return ret;
}

function createCompletedReturn(overrides?: Partial<ReturnOrderProps>): ReturnOrder {
  const ret = createApprovedReturn(overrides);
  const inboundFn = vi.fn((): InboundResult => ({ inboundOrderId: 1001, inboundOrderNo: 'IN001' }));
  const receivableFn = vi.fn((): ReceivableResult => ({ receivableId: 2001, receivableNo: 'RV001' }));
  ret.complete(3, inboundFn, receivableFn);
  ret.clearDomainEvents();
  return ret;
}

function defaultInbound(): InboundResult {
  return { inboundOrderId: 1001, inboundOrderNo: 'IN20260706001' };
}

function defaultReceivable(): ReceivableResult {
  return { receivableId: 2001, receivableNo: 'RV20260706001' };
}

describe('ReturnOrder 聚合根', () => {
  describe('create() 工厂方法', () => {
    it('合法参数创建成功', () => {
      const ret = createPendingReturn();

      expect(ret.id).toBe(1);
      expect(ret.returnNo).toBe('RT20260706001');
      expect(ret.status.value).toBe(1);
      expect(ret.orderId).toBe(100);
      expect(ret.customerId).toBe(1);
      expect(ret.warehouseId).toBe(1);
      expect(ret.deliveryId).toBe(50);
      expect(ret.reason).toBe('质量问题');
      expect(ret.lines).toHaveLength(2);
      expect(ret.createBy).toBe(1);
    });

    it('自动计算 totalAmount 等于明细金额之和', () => {
      const ret = createPendingReturn();
      expect(ret.totalAmount).toBe(700);
    });

    it('orderId 缺失抛错', () => {
      expect(() =>
        ReturnOrder.create({
          orderId: 0,
          customerId: 1,
          warehouseId: 1,
          reason: '质量问题',
          lines: createLines(),
        } as ReturnOrderProps)
      ).toThrow('销售订单ID不能为空');
    });

    it('customerId 缺失抛错', () => {
      expect(() =>
        ReturnOrder.create({
          orderId: 100,
          customerId: 0,
          warehouseId: 1,
          reason: '质量问题',
          lines: createLines(),
        } as ReturnOrderProps)
      ).toThrow('客户ID不能为空');
    });

    it('warehouseId 缺失抛错', () => {
      expect(() =>
        ReturnOrder.create({
          orderId: 100,
          customerId: 1,
          warehouseId: 0,
          reason: '质量问题',
          lines: createLines(),
        } as ReturnOrderProps)
      ).toThrow('仓库ID不能为空');
    });

    it('lines 为空抛错', () => {
      expect(() =>
        ReturnOrder.create({
          orderId: 100,
          customerId: 1,
          warehouseId: 1,
          reason: '质量问题',
          lines: [],
        } as ReturnOrderProps)
      ).toThrow('退货明细不能为空');
    });

    it('reason 为空抛错', () => {
      expect(() =>
        ReturnOrder.create({
          orderId: 100,
          customerId: 1,
          warehouseId: 1,
          reason: '',
          lines: createLines(),
        } as ReturnOrderProps)
      ).toThrow('退货原因不能为空');
    });

    it('reason 仅空白字符抛错', () => {
      expect(() =>
        ReturnOrder.create({
          orderId: 100,
          customerId: 1,
          warehouseId: 1,
          reason: '   ',
          lines: createLines(),
        } as ReturnOrderProps)
      ).toThrow('退货原因不能为空');
    });
  });

  describe('reconstitute() 工厂方法', () => {
    it('从 DB 重建 pending 状态', () => {
      const ret = ReturnOrder.reconstitute({
        id: 5,
        returnNo: 'RT001',
        status: 1,
        orderId: 100,
        orderNo: 'SO001',
        customerId: 1,
        customerName: '客户A',
        warehouseId: 1,
        reason: '质量问题',
        totalAmount: 700,
        lines: createLines(),
        createBy: 1,
        createTime: '2026-07-01 10:00:00',
      });

      expect(ret.id).toBe(5);
      expect(ret.status.value).toBe(1);
      expect(ret.totalAmount).toBe(700);
      expect(ret.lines).toHaveLength(2);
      expect(ret.reason).toBe('质量问题');
    });

    it('从 DB 重建 completed 状态含关联单号', () => {
      const ret = ReturnOrder.reconstitute({
        id: 5,
        returnNo: 'RT001',
        status: 3,
        orderId: 100,
        customerId: 1,
        warehouseId: 1,
        reason: '质量问题',
        totalAmount: 700,
        lines: createLines(),
        completeBy: 3,
        completeTime: '2026-07-03 14:00:00',
        inboundOrderId: 1001,
        inboundOrderNo: 'IN001',
        receivableId: 2001,
        receivableNo: 'RV001',
      });

      expect(ret.status.value).toBe(3);
      expect(ret.completeBy).toBe(3);
      expect(ret.inboundOrderId).toBe(1001);
      expect(ret.inboundOrderNo).toBe('IN001');
      expect(ret.receivableId).toBe(2001);
      expect(ret.receivableNo).toBe('RV001');
    });
  });

  describe('approve() 方法', () => {
    it('pending → approved 成功', () => {
      const ret = createPendingReturn();
      ret.approve(2);

      expect(ret.status.value).toBe(2);
      expect(ret.approveBy).toBe(2);
      expect(ret.approveTime).toBeTruthy();
    });

    it('approveBy 缺失抛错', () => {
      const ret = createPendingReturn();
      expect(() => ret.approve(0)).toThrow('审核人不能为空');
    });

    it('已 approved 再次 approve 抛错', () => {
      const ret = createApprovedReturn();
      expect(() => ret.approve(3)).toThrow('当前状态"已审核"不允许审核');
    });

    it('cancelled 的 approve 抛错', () => {
      const ret = createPendingReturn();
      ret.cancel();
      expect(() => ret.approve(2)).toThrow('当前状态"已取消"不允许审核');
    });
  });

  describe('complete() 方法', () => {
    it('approved → completed 成功（回调正常）', () => {
      const ret = createApprovedReturn();
      const inboundFn = vi.fn(() => defaultInbound());
      const receivableFn = vi.fn(() => defaultReceivable());

      ret.complete(3, inboundFn, receivableFn);

      expect(ret.status.value).toBe(3);
      expect(ret.completeBy).toBe(3);
      expect(ret.completeTime).toBeTruthy();
    });

    it('complete 设置 inboundOrderId/No 和 receivableId/No', () => {
      const ret = createApprovedReturn();
      ret.complete(3, () => defaultInbound(), () => defaultReceivable());

      expect(ret.inboundOrderId).toBe(1001);
      expect(ret.inboundOrderNo).toBe('IN20260706001');
      expect(ret.receivableId).toBe(2001);
      expect(ret.receivableNo).toBe('RV20260706001');
    });

    it('complete 调用 inboundCallback 传入正确参数', () => {
      const ret = createApprovedReturn();
      const inboundFn = vi.fn(() => defaultInbound());

      ret.complete(3, inboundFn, () => defaultReceivable());

      expect(inboundFn).toHaveBeenCalledTimes(1);
      const [items, warehouseId, returnId, returnNo] = inboundFn.mock.calls[0] as any[];
      expect(items).toHaveLength(2);
      expect(items[0]).toMatchObject({
        materialId: 1,
        materialName: '物料A',
        quantity: 3,
        unit: '件',
        batchNo: 'B20260701',
      });
      expect(warehouseId).toBe(1);
      expect(returnId).toBe(1);
      expect(returnNo).toBe('RT20260706001');
    });

    it('complete 调用 receivableCallback 传入正确参数', () => {
      const ret = createApprovedReturn();
      const receivableFn = vi.fn(() => defaultReceivable());

      ret.complete(3, () => defaultInbound(), receivableFn);

      expect(receivableFn).toHaveBeenCalledTimes(1);
      const [customerId, refundAmount, returnId, returnNo] = receivableFn.mock.calls[0] as any[];
      expect(customerId).toBe(1);
      expect(refundAmount).toBe(700);
      expect(returnId).toBe(1);
      expect(returnNo).toBe('RT20260706001');
    });

    it('inboundCallback 返回空 inboundOrderId 抛错', () => {
      const ret = createApprovedReturn();
      const inboundFn = vi.fn((): InboundResult => ({ inboundOrderId: 0, inboundOrderNo: '' }));

      expect(() => ret.complete(3, inboundFn, () => defaultReceivable())).toThrow(
        '入库单创建失败，无法完成退货'
      );
      expect(ret.status.value).toBe(2);
    });

    it('receivableCallback 返回空 receivableId 抛错', () => {
      const ret = createApprovedReturn();
      const receivableFn = vi.fn((): ReceivableResult => ({ receivableId: 0, receivableNo: '' }));

      expect(() => ret.complete(3, () => defaultInbound(), receivableFn)).toThrow(
        '红字应收单创建失败，无法完成退货'
      );
      expect(ret.status.value).toBe(2);
    });

    it('completeBy 缺失抛错', () => {
      const ret = createApprovedReturn();
      expect(() => ret.complete(0, () => defaultInbound(), () => defaultReceivable())).toThrow(
        '完成人不能为空'
      );
    });

    it('pending 的 complete 抛错', () => {
      const ret = createPendingReturn();
      expect(() => ret.complete(3, () => defaultInbound(), () => defaultReceivable())).toThrow(
        '当前状态"待审核"不允许完成'
      );
    });

    it('completed 的 complete 抛错', () => {
      const ret = createCompletedReturn();
      expect(() => ret.complete(4, () => defaultInbound(), () => defaultReceivable())).toThrow(
        '当前状态"已完成"不允许完成'
      );
    });
  });

  describe('cancel() 方法', () => {
    it('pending → cancelled 成功', () => {
      const ret = createPendingReturn();
      ret.cancel('客户取消');

      expect(ret.status.value).toBe(9);
    });

    it('approved → cancelled 成功', () => {
      const ret = createApprovedReturn();
      ret.cancel('审核后取消');

      expect(ret.status.value).toBe(9);
    });

    it('completed 的 cancel 抛错', () => {
      const ret = createCompletedReturn();
      expect(() => ret.cancel()).toThrow('当前状态"已完成"不允许取消');
    });

    it('已 cancelled 再次 cancel 抛错', () => {
      const ret = createPendingReturn();
      ret.cancel();
      expect(() => ret.cancel()).toThrow('当前状态"已取消"不允许取消');
    });
  });

  describe('状态判断方法', () => {
    it('canEdit/canDelete 仅 pending 返回 true', () => {
      const pending = createPendingReturn();
      expect(pending.canEdit()).toBe(true);
      expect(pending.canDelete()).toBe(true);

      const approved = createApprovedReturn();
      expect(approved.canEdit()).toBe(false);
      expect(approved.canDelete()).toBe(false);
    });

    it('validateAgainstShippedQuantities 退货量 ≤ 已发货量 时通过（T204）', () => {
      const ret = createPendingReturn();
      // 物料 1: 已发 10；本次退 3 ≤ 10 ✅
      // 物料 2: 已发 5；本次退 2 ≤ 5 ✅
      const shipped = new Map([
        [1, 10],
        [2, 5],
      ]);
      expect(() => ret.validateAgainstShippedQuantities(shipped)).not.toThrow();
    });

    it('validateAgainstShippedQuantities 退货量超过已发货量时抛错（T204）', () => {
      const ret = createPendingReturn();
      // 物料 1: 已发 2；本次退 3 > 2 ❌
      const shipped = new Map([
        [1, 2],
        [2, 5],
      ]);
      expect(() => ret.validateAgainstShippedQuantities(shipped)).toThrow();
    });

    it('validateAgainstShippedQuantities 扣减已退数量后校验', () => {
      const ret = createPendingReturn();
      // 物料 1: 已发 10，已退 8 → 可退 2；本次退 3 > 2 ❌
      const shipped = new Map([[1, 10]]);
      const alreadyReturned = new Map([[1, 8]]);
      expect(() =>
        ret.validateAgainstShippedQuantities(shipped, alreadyReturned)
      ).toThrow();
    });

    it('validateAgainstShippedQuantities 物料不在 Map 中视为 0 抛错', () => {
      const ret = createPendingReturn();
      // 空 Map → 所有物料视为已发 0；本次退 > 0 → 抛错
      const shipped = new Map<number, number>();
      expect(() => ret.validateAgainstShippedQuantities(shipped)).toThrow();
    });

    it('validateAgainstShippedQuantities 多物料混合校验', () => {
      const ret = createPendingReturn();
      // 物料 1: 已发 10，已退 5 → 可退 5；本次退 3 ≤ 5 ✅
      // 物料 2: 已发 5，已退 0 → 可退 5；本次退 2 ≤ 5 ✅
      const shipped = new Map([
        [1, 10],
        [2, 5],
      ]);
      const alreadyReturned = new Map([
        [1, 5],
        [2, 0],
      ]);
      expect(() =>
        ret.validateAgainstShippedQuantities(shipped, alreadyReturned)
      ).not.toThrow();
    });

    it('isTerminal 在 completed/cancelled 返回 true', () => {
      expect(createPendingReturn().status.isTerminal()).toBe(false);
      expect(createApprovedReturn().status.isTerminal()).toBe(false);
      expect(createCompletedReturn().status.isTerminal()).toBe(true);

      const cancelled = createPendingReturn();
      cancelled.cancel();
      expect(cancelled.status.isTerminal()).toBe(true);
    });

    it('状态 label 正确', () => {
      expect(createPendingReturn().status.label).toBe('待审核');
      expect(createApprovedReturn().status.label).toBe('已审核');
      expect(createCompletedReturn().status.label).toBe('已完成');

      const cancelled = createPendingReturn();
      cancelled.cancel();
      expect(cancelled.status.label).toBe('已取消');
    });
  });

  describe('事件发布', () => {
    it('create 发布 ReturnOrderCreatedEvent', () => {
      const ret = createPendingReturn();
      const events = ret.getDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('return_order.created');
      expect(events[0].payload).toMatchObject({
        returnId: 1,
        returnNo: 'RT20260706001',
        orderId: 100,
        customerId: 1,
        warehouseId: 1,
        reason: '质量问题',
      });
      expect(events[0].payload.lines).toHaveLength(2);
    });

    it('approve 发布 ReturnOrderApprovedEvent', () => {
      const ret = createPendingReturn();
      ret.clearDomainEvents();
      ret.approve(2);

      const events = ret.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('return_order.approved');
      expect(events[0].payload).toMatchObject({
        returnId: 1,
        approvedBy: 2,
      });
    });

    it('complete 发布 ReturnOrderCompletedEvent 含关联单号', () => {
      const ret = createApprovedReturn();
      ret.clearDomainEvents();
      ret.complete(3, () => defaultInbound(), () => defaultReceivable());

      const events = ret.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('return_order.completed');
      expect(events[0].payload).toMatchObject({
        returnId: 1,
        orderId: 100,
        customerId: 1,
        warehouseId: 1,
        inboundOrderId: 1001,
        inboundOrderNo: 'IN20260706001',
        receivableId: 2001,
        receivableNo: 'RV20260706001',
        refundAmount: 700,
        completedBy: 3,
      });
      expect(events[0].payload.items).toHaveLength(2);
    });

    it('cancel 发布 ReturnOrderCancelledEvent', () => {
      const ret = createPendingReturn();
      ret.clearDomainEvents();
      ret.cancel('测试原因');

      const events = ret.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('return_order.cancelled');
      expect(events[0].payload).toMatchObject({
        returnId: 1,
        reason: '测试原因',
      });
    });

    it('clearDomainEvents 清空事件', () => {
      const ret = createPendingReturn();
      expect(ret.getDomainEvents()).toHaveLength(1);

      ret.clearDomainEvents();
      expect(ret.getDomainEvents()).toHaveLength(0);
    });
  });

  describe('lines 防御性拷贝', () => {
    it('外部修改 lines 不影响聚合内部状态', () => {
      const ret = createPendingReturn();
      const lines = ret.lines;

      expect(lines).toHaveLength(2);
      lines.pop();
      expect(ret.lines).toHaveLength(2);
    });
  });

  describe('浮点精度处理', () => {
    it('明细金额四舍五入到 2 位小数', () => {
      const ret = ReturnOrder.create({
        id: 1,
        returnNo: 'RT001',
        orderId: 100,
        customerId: 1,
        warehouseId: 1,
        reason: '测试',
        lines: [
          {
            lineNo: 1,
            materialId: 1,
            materialCode: 'M001',
            materialName: '物料A',
            unit: '件',
            quantity: 3,
            unitPrice: 100.005,
          },
        ],
      });

      // unitPrice 100.005 经 roundMoney(100.005*100)/100 = 100.01（V8 中 100.005*100=10000.5，Math.round 上取整）
      // amount = 3 * 100.01 = 300.03
      expect(ret.totalAmount).toBe(300.03);
    });
  });
});
