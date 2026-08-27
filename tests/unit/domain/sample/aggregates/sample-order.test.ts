/**
 * SampleOrder 聚合根单元测试
 * 覆盖 create/reconstitute/submit/startProduction/complete/confirm/convertToSalesOrder/cancel 全流程
 * 重点：7态状态机流转、非法流转拦截、转大货字段写入与费用抵扣逻辑、领域事件发布、toProps 往返
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SampleOrder } from '@/domain/sample/aggregates/SampleOrder';
import type { SampleOrderProps } from '@/domain/sample/aggregates/SampleOrder';
import { SampleOrderStatus } from '@/domain/sample/value-objects/SampleOrderStatus';
import { DomainError } from '@/domain/shared/DomainTypes';

function createDraftOrder(overrides?: Partial<SampleOrderProps>): SampleOrder {
  return SampleOrder.create({
    id: 1,
    orderNo: 'SP20260713001',
    customerName: '深圳测试客户',
    productName: '仪表盘面板',
    materialNo: 'M-001',
    quantity: 100,
    orderDate: '2026-07-13',
    deliveryDate: '2026-07-20',
    createBy: 1,
    ...overrides,
  });
}

function createOrderAtStatus(status: SampleOrderStatus): SampleOrder {
  const order = createDraftOrder();
  switch (status) {
    case SampleOrderStatus.DRAFT:
      return order;
    case SampleOrderStatus.PENDING:
      order.submit(1);
      return order;
    case SampleOrderStatus.IN_PROGRESS:
      order.submit(1);
      order.startProduction(1);
      return order;
    case SampleOrderStatus.COMPLETED:
      order.submit(1);
      order.startProduction(1);
      order.complete(1);
      return order;
    case SampleOrderStatus.CONFIRMED:
      order.submit(1);
      order.startProduction(1);
      order.complete(1);
      order.confirm(1);
      return order;
    case SampleOrderStatus.CONVERTED:
      order.submit(1);
      order.startProduction(1);
      order.complete(1);
      order.confirm(1);
      order.convertToSalesOrder(999, 1);
      return order;
    case SampleOrderStatus.CANCELLED:
      order.cancel('测试作废', 1);
      return order;
    default:
      return order;
  }
}

describe('SampleOrder 聚合根', () => {
  // ============================================================
  // create()
  // ============================================================
  describe('create()', () => {
    it('应使用完整属性创建草稿打样单', () => {
      const order = createDraftOrder();
      expect(order.id).toBe(1);
      expect(order.orderNo).toBe('SP20260713001');
      expect(order.customerName).toBe('深圳测试客户');
      expect(order.status).toBe(SampleOrderStatus.DRAFT);
      expect(order.deliveryStatus).toBe('pending');
      expect(order.quantity).toBe(100);
    });

    it('应使用默认值填充缺失字段', () => {
      const order = SampleOrder.create({ orderNo: 'SP001' });
      expect(order.version).toBe('A');
      expect(order.deliveryStatus).toBe('pending');
      expect(order.status).toBe(SampleOrderStatus.DRAFT);
      expect(order.quantity).toBe(0);
      expect(order.sampleVersion).toBe(1);
      expect(order.sampleFee).toBe(0);
      expect(order.feeCharged).toBe(0);
      expect(order.feeDeductible).toBe(0);
      expect(order.feeDeducted).toBe(0);
    });

    it('缺少 orderNo 时应抛出 DomainError', () => {
      expect(() => SampleOrder.create({ orderNo: '' })).toThrow(DomainError);
      expect(() => SampleOrder.create({} as SampleOrderProps)).toThrow(DomainError);
    });

    it('创建时应发布 SampleOrderCreated 事件', () => {
      const order = createDraftOrder();
      expect(order.domainEvents).toHaveLength(1);
      expect(order.domainEvents[0].eventType).toBe('SampleOrderCreated');
    });
  });

  // ============================================================
  // reconstitute() + toProps() 往返
  // ============================================================
  describe('reconstitute() 与 toProps()', () => {
    it('reconstitute 应保留所有字段', () => {
      const props: SampleOrderProps = {
        id: 42,
        orderNo: 'SP-RECON-001',
        notifyDate: '2026-07-10',
        customerId: 5,
        customerName: '广州客户',
        productName: '丝网印刷品',
        materialNo: 'M-002',
        version: 'B',
        sizeSpec: '300x200',
        materialSpec: 'PET 0.5mm',
        specification: '四色印刷',
        quantity: 500,
        orderDate: '2026-07-13',
        customerRequireDate: '2026-07-25',
        deliveryDate: '2026-07-30',
        actualDeliveryDate: '',
        deliveryStatus: 'delivered',
        status: SampleOrderStatus.IN_PROGRESS,
        remark: '加急',
        createBy: 3,
        createTime: '2026-07-13 10:00:00',
        updateTime: '2026-07-13 11:00:00',
        processCardId: 7,
        workOrderId: 8,
        salesOrderId: undefined,
        sampleFee: 800,
        feeCharged: 1,
        feeDeductible: 1,
        feeDeducted: 0,
        sampleVersion: 2,
        parentVersionId: 41,
        convertedAt: '',
        convertedBy: undefined,
      };
      const order = SampleOrder.reconstitute(props);
      expect(order.id).toBe(42);
      expect(order.orderNo).toBe('SP-RECON-001');
      expect(order.customerName).toBe('广州客户');
      expect(order.status).toBe(SampleOrderStatus.IN_PROGRESS);
      expect(order.deliveryStatus).toBe('delivered');
      expect(order.processCardId).toBe(7);
      expect(order.workOrderId).toBe(8);
      expect(order.sampleFee).toBe(800);
      expect(order.feeCharged).toBe(1);
      expect(order.feeDeductible).toBe(1);
      expect(order.sampleVersion).toBe(2);
      expect(order.parentVersionId).toBe(41);
    });

    it('toProps 应与 reconstitute 输入往返一致', () => {
      const order = createOrderAtStatus(SampleOrderStatus.CONFIRMED);
      const props = order.toProps();
      const reconstituted = SampleOrder.reconstitute(props);
      expect(reconstituted.toProps()).toEqual(props);
    });
  });

  // ============================================================
  // 状态流转：合法路径
  // ============================================================
  describe('合法状态流转', () => {
    it('draft → pending (submit)', () => {
      const order = createDraftOrder();
      order.submit(1);
      expect(order.status).toBe(SampleOrderStatus.PENDING);
      const events = order.domainEvents.filter((e) => e.eventType === 'SampleOrderSubmitted');
      expect(events).toHaveLength(1);
    });

    it('pending → in_progress (startProduction)', () => {
      const order = createOrderAtStatus(SampleOrderStatus.PENDING);
      order.startProduction(1);
      expect(order.status).toBe(SampleOrderStatus.IN_PROGRESS);
      const events = order.domainEvents.filter((e) => e.eventType === 'SampleOrderStarted');
      expect(events).toHaveLength(1);
    });

    it('in_progress → completed (complete)', () => {
      const order = createOrderAtStatus(SampleOrderStatus.IN_PROGRESS);
      order.complete(1);
      expect(order.status).toBe(SampleOrderStatus.COMPLETED);
      const events = order.domainEvents.filter((e) => e.eventType === 'SampleOrderCompleted');
      expect(events).toHaveLength(1);
    });

    it('completed → confirmed (confirm)', () => {
      const order = createOrderAtStatus(SampleOrderStatus.COMPLETED);
      order.confirm(1);
      expect(order.status).toBe(SampleOrderStatus.CONFIRMED);
      const events = order.domainEvents.filter((e) => e.eventType === 'SampleOrderConfirmed');
      expect(events).toHaveLength(1);
    });

    it('confirmed → converted (convertToSalesOrder)', () => {
      const order = createOrderAtStatus(SampleOrderStatus.CONFIRMED);
      order.convertToSalesOrder(999, 1);
      expect(order.status).toBe(SampleOrderStatus.CONVERTED);
      const events = order.domainEvents.filter((e) => e.eventType === 'SampleOrderConverted');
      expect(events).toHaveLength(1);
    });

    it('draft → cancelled (cancel)', () => {
      const order = createDraftOrder();
      order.cancel('不需要了', 1);
      expect(order.status).toBe(SampleOrderStatus.CANCELLED);
      const events = order.domainEvents.filter((e) => e.eventType === 'SampleOrderCancelled');
      expect(events).toHaveLength(1);
    });
  });

  // ============================================================
  // 状态流转：非法路径拦截
  // ============================================================
  describe('非法状态流转拦截', () => {
    it('draft 不能直接 complete', () => {
      const order = createDraftOrder();
      expect(() => order.complete(1)).toThrow(DomainError);
    });

    it('draft 不能直接 startProduction', () => {
      const order = createDraftOrder();
      expect(() => order.startProduction(1)).toThrow(DomainError);
    });

    it('draft 不能直接 confirm', () => {
      const order = createDraftOrder();
      expect(() => order.confirm(1)).toThrow(DomainError);
    });

    it('draft 不能直接 convertToSalesOrder', () => {
      const order = createDraftOrder();
      expect(() => order.convertToSalesOrder(1, 1)).toThrow(DomainError);
    });

    it('pending 不能直接 complete', () => {
      const order = createOrderAtStatus(SampleOrderStatus.PENDING);
      expect(() => order.complete(1)).toThrow(DomainError);
    });

    it('in_progress 不能直接 confirm', () => {
      const order = createOrderAtStatus(SampleOrderStatus.IN_PROGRESS);
      expect(() => order.confirm(1)).toThrow(DomainError);
    });

    it('completed 不能直接 submit', () => {
      const order = createOrderAtStatus(SampleOrderStatus.COMPLETED);
      expect(() => order.submit(1)).toThrow(DomainError);
    });

    it('converted 是终态，不能再流转', () => {
      const order = createOrderAtStatus(SampleOrderStatus.CONVERTED);
      expect(() => order.submit(1)).toThrow(DomainError);
      expect(() => order.cancel('理由', 1)).toThrow(DomainError);
    });

    it('cancelled 是终态，不能再流转', () => {
      const order = createOrderAtStatus(SampleOrderStatus.CANCELLED);
      expect(() => order.submit(1)).toThrow(DomainError);
      expect(() => order.startProduction(1)).toThrow(DomainError);
    });

    it('confirmed 不能 cancel', () => {
      const order = createOrderAtStatus(SampleOrderStatus.CONFIRMED);
      expect(() => order.cancel('理由', 1)).toThrow(DomainError);
    });
  });

  // ============================================================
  // convertToSalesOrder — 核心修复逻辑
  // ============================================================
  describe('convertToSalesOrder() 转大货逻辑', () => {
    it('应设置 salesOrderId、convertedAt、convertedBy', () => {
      const order = createOrderAtStatus(SampleOrderStatus.CONFIRMED);
      order.convertToSalesOrder(500, 7);
      expect(order.salesOrderId).toBe(500);
      expect(order.convertedBy).toBe(7);
      expect(order.convertedAt).not.toBe('');
      expect(order.convertedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('feeCharged=1 且 feeDeductible=1 时应标记 feeDeducted=1', () => {
      const order = createOrderAtStatus(SampleOrderStatus.CONFIRMED);
      order.updateSampleFee(800, 1, 1);
      order.convertToSalesOrder(500, 7);
      expect(order.feeDeducted).toBe(1);
    });

    it('feeCharged=0 时不应标记 feeDeducted', () => {
      const order = createOrderAtStatus(SampleOrderStatus.CONFIRMED);
      order.updateSampleFee(0, 0, 1);
      order.convertToSalesOrder(500, 7);
      expect(order.feeDeducted).toBe(0);
    });

    it('feeDeductible=0 时不应标记 feeDeducted', () => {
      const order = createOrderAtStatus(SampleOrderStatus.CONFIRMED);
      order.updateSampleFee(800, 1, 0);
      order.convertToSalesOrder(500, 7);
      expect(order.feeDeducted).toBe(0);
    });

    it('转大货后 toProps 应包含 salesOrderId 和 convertedAt', () => {
      const order = createOrderAtStatus(SampleOrderStatus.CONFIRMED);
      order.updateSampleFee(1000, 1, 1);
      order.convertToSalesOrder(500, 7);
      const props = order.toProps();
      expect(props.salesOrderId).toBe(500);
      expect(props.convertedAt).not.toBe('');
      expect(props.convertedBy).toBe(7);
      expect(props.feeDeducted).toBe(1);
    });
  });

  // ============================================================
  // 关联与费用操作
  // ============================================================
  describe('关联与费用操作', () => {
    it('linkProcessCard 应设置 processCardId', () => {
      const order = createDraftOrder();
      order.linkProcessCard(15);
      expect(order.processCardId).toBe(15);
    });

    it('linkWorkOrder 应设置 workOrderId', () => {
      const order = createDraftOrder();
      order.linkWorkOrder(22);
      expect(order.workOrderId).toBe(22);
    });

    it('updateSampleFee 应更新费用三字段', () => {
      const order = createDraftOrder();
      order.updateSampleFee(600, 1, 0);
      expect(order.sampleFee).toBe(600);
      expect(order.feeCharged).toBe(1);
      expect(order.feeDeductible).toBe(0);
    });
  });

  // ============================================================
  // 领域事件管理
  // ============================================================
  describe('领域事件管理', () => {
    it('完整流转链应累积 6 个事件', () => {
      const order = createDraftOrder();
      order.submit(1);
      order.startProduction(1);
      order.complete(1);
      order.confirm(1);
      order.convertToSalesOrder(1, 1);
      expect(order.domainEvents.length).toBe(6);
      const types = order.domainEvents.map((e) => e.eventType);
      expect(types).toEqual([
        'SampleOrderCreated',
        'SampleOrderSubmitted',
        'SampleOrderStarted',
        'SampleOrderCompleted',
        'SampleOrderConfirmed',
        'SampleOrderConverted',
      ]);
    });

    it('clearDomainEvents 应清空事件', () => {
      const order = createDraftOrder();
      expect(order.domainEvents.length).toBeGreaterThan(0);
      order.clearDomainEvents();
      expect(order.domainEvents).toHaveLength(0);
    });

    it('domainEvents getter 应返回副本，不泄露内部引用', () => {
      const order = createDraftOrder();
      const events1 = order.domainEvents;
      const events2 = order.domainEvents;
      expect(events1).not.toBe(events2);
      expect(events1).toEqual(events2);
    });
  });

  // ============================================================
  // generateCode 静态方法
  // ============================================================
  describe('generateCode()', () => {
    it('应生成 SP + 日期 + 4位序号 格式', () => {
      const code = SampleOrder.generateCode(1);
      expect(code).toMatch(/^SP\d{8}\d{4}$/);
    });

    it('序号应补零至4位', () => {
      const code = SampleOrder.generateCode(5);
      expect(code).toMatch(/0005$/);
    });

    it('大序号不截断', () => {
      const code = SampleOrder.generateCode(12345);
      expect(code).toMatch(/12345$/);
    });
  });
});
