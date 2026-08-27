import { describe, it, expect } from 'vitest';
import {
  InboundOrderApprovedEvent,
  InboundOrderCreatedEvent,
  InboundOrderSubmittedEvent,
  InboundOrderUnapprovedEvent,
  InboundOrderCancelledEvent,
  OutboundOrderShippedEvent,
} from '@/domain/warehouse/events/InboundOrderEvents';

/**
 * 8.3 InboundOrderEvents 领域事件构造测试
 *
 * 覆盖目标：
 * 1. 各事件类型常量正确
 * 2. occurredAt 自动填充
 * 3. payload 透传
 */
describe('8.3 InboundOrderEvents 领域事件', () => {
  it('InboundOrderCreatedEvent', () => {
    const e = new InboundOrderCreatedEvent({
      inboundId: 1,
      inboundNo: 'IN001',
      warehouseId: 10,
      supplierId: 20,
    });
    expect(e.eventType).toBe('inbound.created');
    expect(e.occurredAt).toBeInstanceOf(Date);
    expect(e.payload.inboundId).toBe(1);
    expect(e.payload.inboundNo).toBe('IN001');
  });

  it('InboundOrderSubmittedEvent', () => {
    const e = new InboundOrderSubmittedEvent({
      inboundId: 1,
      inboundNo: 'IN001',
      warehouseId: 10,
      supplierId: 20,
      totalAmount: 1500.5,
    });
    expect(e.eventType).toBe('inbound.submitted');
    expect(e.payload.totalAmount).toBe(1500.5);
  });

  it('InboundOrderApprovedEvent（含 items 数组）', () => {
    const items = [
      { materialId: 1, materialCode: 'M001', materialName: '物料1', quantity: 5, unitPrice: 100, batchNo: 'B1' },
    ];
    const e = new InboundOrderApprovedEvent({
      inboundId: 1,
      inboundNo: 'IN001',
      warehouseId: 10,
      warehouseName: '主仓库',
      supplierId: 20,
      supplierName: '供应商',
      items,
      totalAmount: 500,
    });
    expect(e.eventType).toBe('inbound.approved');
    expect(e.payload.items).toHaveLength(1);
    expect(e.payload.items[0].materialId).toBe(1);
    expect(e.payload.warehouseName).toBe('主仓库');
  });

  it('InboundOrderUnapprovedEvent', () => {
    const e = new InboundOrderUnapprovedEvent({
      inboundId: 1,
      inboundNo: 'IN001',
      reason: '质检不通过',
    });
    expect(e.eventType).toBe('inbound.unapproved');
    expect(e.payload.reason).toBe('质检不通过');
  });

  it('InboundOrderCancelledEvent', () => {
    const e = new InboundOrderCancelledEvent({
      inboundId: 1,
      inboundNo: 'IN001',
      reason: '订单取消',
    });
    expect(e.eventType).toBe('inbound.cancelled');
    expect(e.payload.reason).toBe('订单取消');
  });

  it('OutboundOrderShippedEvent（含 items 数组）', () => {
    const items = [
      { materialId: 1, materialCode: 'M001', quantity: 5, warehouseId: 10 },
    ];
    const e = new OutboundOrderShippedEvent({
      outboundId: 2,
      outboundNo: 'OUT001',
      customerId: 30,
      customerName: '客户A',
      items,
    });
    expect(e.eventType).toBe('outbound.shipped');
    expect(e.payload.outboundNo).toBe('OUT001');
    expect(e.payload.items[0].warehouseId).toBe(10);
  });
});
