import { describe, it, expect } from 'vitest';
import { InboundItem, type InboundItemProps } from '@/domain/warehouse/entities/InboundItem';

/**
 * 8.2 InboundItem 实体测试
 */
function makeProps(overrides: Partial<InboundItemProps> = {}): InboundItemProps {
  return {
    materialId: 1,
    materialCode: 'M001',
    materialName: '测试物料',
    materialSpec: '规格1',
    batchNo: 'B001',
    quantity: 10,
    unit: '件',
    unitPrice: 100,
    warehouseLocation: 'A01',
    produceDate: '2026-06-29',
    ...overrides,
  };
}

describe('8.2 InboundItem 实体', () => {
  describe('create() 工厂', () => {
    it('合法参数创建成功', () => {
      const item = InboundItem.create(makeProps());
      expect(item.materialId).toBe(1);
      expect(item.materialName).toBe('测试物料');
      expect(item.quantity).toBe(10);
      expect(item.unitPrice).toBe(100);
    });

    it('materialId 为 0 抛错', () => {
      expect(() => InboundItem.create(makeProps({ materialId: 0 }))).toThrow(/物料ID不能为空/);
    });

    it('quantity <= 0 抛错', () => {
      expect(() => InboundItem.create(makeProps({ quantity: 0 }))).toThrow(/入库数量必须大于0/);
      expect(() => InboundItem.create(makeProps({ quantity: -1 }))).toThrow(/入库数量必须大于0/);
    });

    it('默认值回退（unit/unitPrice/materialCode 等）', () => {
      const item = InboundItem.create(
        makeProps({
          unit: undefined,
          unitPrice: undefined,
          materialCode: undefined,
          materialSpec: undefined,
          warehouseLocation: undefined,
        })
      );
      expect(item.unit).toBe('件');
      expect(item.unitPrice).toBe(0);
      expect(item.materialCode).toBe('');
      expect(item.materialSpec).toBe('');
      expect(item.warehouseLocation).toBe('');
    });
  });

  describe('reconstitute() 重建', () => {
    it('从 DB 字段重建（跳过校验）', () => {
      const item = InboundItem.reconstitute(
        makeProps({
          id: 100,
          orderId: 200,
          quantity: 0, // reconstitute 不校验
          materialId: 0, // reconstitute 不校验
        })
      );
      expect(item.id).toBe(100);
      expect(item.orderId).toBe(200);
      expect(item.quantity).toBe(0);
    });
  });

  describe('totalPrice 计算', () => {
    it('quantity * unitPrice 四舍五入到 2 位小数', () => {
      expect(InboundItem.create(makeProps({ quantity: 3, unitPrice: 33.33 })).totalPrice).toBe(
        99.99
      );
      expect(InboundItem.create(makeProps({ quantity: 10, unitPrice: 100 })).totalPrice).toBe(1000);
      expect(InboundItem.create(makeProps({ quantity: 7, unitPrice: 1.15 })).totalPrice).toBe(8.05);
    });

    it('unitPrice 缺省为 0 时 totalPrice 为 0', () => {
      const item = InboundItem.create(makeProps({ unitPrice: 0 }));
      expect(item.totalPrice).toBe(0);
    });
  });
});
