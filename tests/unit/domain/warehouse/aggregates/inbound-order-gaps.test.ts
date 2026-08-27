import { describe, it, expect } from 'vitest';
import { InboundOrder, type InboundOrderProps } from '@/domain/warehouse/aggregates/InboundOrder';
import { InboundItem, type InboundItemProps } from '@/domain/warehouse/entities/InboundItem';
import { DomainError } from '@/domain/shared/DomainTypes';

/**
 * 入库聚合根 — 文档测试清单缺口补充
 * 覆盖：UT-IN-004（采购必填校验）、UT-IN-007（审核无明细抛错）、
 *       UT-IN-006（审核事件明细快照）、UT-IN-010（多币种字段落地）
 * 纯领域逻辑，无需数据库。
 */
function makeItem(overrides: Partial<InboundItemProps> = {}): InboundItemProps {
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
function makeOrder(overrides: Partial<InboundOrderProps> = {}): InboundOrderProps {
  return {
    id: 1,
    orderNo: 'IN001',
    warehouseId: 1,
    warehouseName: '主仓库',
    supplierName: '供应商',
    orderType: 'purchase',
    inboundDate: '2026-06-29',
    items: [makeItem()],
    ...overrides,
  };
}

describe('入库聚合根 - 文档缺口补充', () => {
  describe('UT-IN-004 采购入库必填校验', () => {
    it('sourceType=purchase_order 且缺 poId → 抛「采购入库必须关联采购订单」', () => {
      expect(() =>
        InboundOrder.create(
          makeOrder({ sourceType: 'purchase_order', poId: undefined } as Partial<InboundOrderProps>)
        )
      ).toThrow(/采购入库必须关联采购订单/);
    });

    it('有 poId 但缺 poNo → 抛「采购入库缺少采购订单号」', () => {
      expect(() =>
        InboundOrder.create(
          makeOrder({ sourceType: 'purchase_order', poId: 10, poNo: undefined } as Partial<InboundOrderProps>)
        )
      ).toThrow(/采购入库缺少采购订单号/);
    });

    it('有 poId/poNo 但缺 supplierId → 抛「采购入库缺少供应商」', () => {
      expect(() =>
        InboundOrder.create(
          makeOrder({
            sourceType: 'purchase_order',
            poId: 10,
            poNo: 'PO1',
            supplierId: undefined,
          } as Partial<InboundOrderProps>)
        )
      ).toThrow(/采购入库缺少供应商/);
    });

    it('非采购来源不触发该组校验', () => {
      const order = InboundOrder.create(
        makeOrder({ sourceType: 'manual', poId: undefined } as Partial<InboundOrderProps>)
      );
      expect(order.status.value).toBe('draft');
    });
  });

  describe('UT-IN-007 审核无明细抛错', () => {
    it('reconstitute 出空明细后 approve → 抛「入库单不能为空」', () => {
      const order = InboundOrder.reconstitute(makeOrder({ status: 'pending', items: [] }));
      expect(() => order.approve('主仓库')).toThrow(/入库单不能为空/);
    });
  });

  describe('UT-IN-006 审核事件含明细快照', () => {
    it('approved 事件 payload.items 含 materialId/quantity/unitPrice/batchNo', () => {
      const order = InboundOrder.reconstitute(
        makeOrder({
          id: 5,
          status: 'pending',
          items: [makeItem({ quantity: 7, unitPrice: 12, batchNo: 'BN' })],
        })
      );
      order.clearDomainEvents();
      order.approve('主仓库');

      const evt = order.getDomainEvents().find((e) => e.eventType === 'inbound.approved');
      expect(evt).toBeTruthy();
      expect(evt!.payload.items).toHaveLength(1);
      expect(evt!.payload.items[0]).toMatchObject({
        materialId: 1,
        quantity: 7,
        unitPrice: 12,
        batchNo: 'BN',
      });
    });
  });

  describe('UT-IN-010 多币种字段落地（领域层透传）', () => {
    it('create 透传 currency / exchangeRate / baseTotalAmount', () => {
      const order = InboundOrder.create(
        makeOrder({ currency: 'USD', exchangeRate: 7.2, baseTotalAmount: 720 })
      );
      expect(order.currency).toBe('USD');
      expect(order.exchangeRate).toBe(7.2);
      expect(order.baseTotalAmount).toBe(720);
    });

    it('reconstitute 还原多币种字段', () => {
      const order = InboundOrder.reconstitute(
        makeOrder({ currency: 'USD', exchangeRate: 7.2, baseTotalAmount: 720 })
      );
      expect(order.currency).toBe('USD');
      expect(order.baseTotalAmount).toBe(720);
    });

    it('默认币种为 CNY、汇率 1', () => {
      const order = InboundOrder.create(makeOrder());
      expect(order.currency).toBe('CNY');
      expect(order.exchangeRate).toBe(1);
    });
  });
});
