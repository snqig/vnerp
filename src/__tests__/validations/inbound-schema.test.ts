import { describe, it, expect } from 'vitest';
import { createInboundOrderSchema, updateInboundOrderSchema } from '@/lib/validations/inbound';

describe('入库单 Zod 校验回归测试', () => {
  describe('createInboundOrderSchema', () => {
    it('应通过合法的入库单数据', () => {
      const result = createInboundOrderSchema.parse({
        warehouse_id: 1,
        items: [
          {
            material_id: 100,
            material_name: '测试物料',
            quantity: 50,
            unit_price: 10.5,
          },
        ],
      });
      expect(result.warehouse_id).toBe(1);
      expect(result.items.length).toBe(1);
    });

    it('应拒绝空的 items 数组', () => {
      expect(() =>
        createInboundOrderSchema.parse({
          warehouse_id: 1,
          items: [],
        })
      ).toThrow();
    });

    it('应拒绝缺少 warehouse_id', () => {
      expect(() =>
        createInboundOrderSchema.parse({
          items: [
            {
              material_id: 1,
              material_name: '测试',
              quantity: 1,
            },
          ],
        })
      ).toThrow();
    });

    it('应拒绝负数的 quantity', () => {
      expect(() =>
        createInboundOrderSchema.parse({
          warehouse_id: 1,
          items: [
            {
              material_id: 1,
              material_name: '测试',
              quantity: -5,
            },
          ],
        })
      ).toThrow();
    });

    it('应拒绝负数的 unit_price', () => {
      expect(() =>
        createInboundOrderSchema.parse({
          warehouse_id: 1,
          items: [
            {
              material_id: 1,
              material_name: '测试',
              quantity: 1,
              unit_price: -10,
            },
          ],
        })
      ).toThrow();
    });

    it('应拒绝超过100个入库项', () => {
      const items = Array.from({ length: 101 }, (_, i) => ({
        material_id: i + 1,
        material_name: `物料${i}`,
        quantity: 1,
      }));
      expect(() =>
        createInboundOrderSchema.parse({
          warehouse_id: 1,
          items,
        })
      ).toThrow();
    });

    it('应设置默认值', () => {
      const result = createInboundOrderSchema.parse({
        warehouse_id: 1,
        items: [
          {
            material_id: 1,
            material_name: '测试',
            quantity: 10,
          },
        ],
      });
      expect(result.supplier_name).toBe('');
      expect(result.items[0].unit).toBe('件');
      expect(result.items[0].unit_price).toBe(0);
    });

    it('应拒绝过长的物料名称', () => {
      expect(() =>
        createInboundOrderSchema.parse({
          warehouse_id: 1,
          items: [
            {
              material_id: 1,
              material_name: 'A'.repeat(101),
              quantity: 1,
            },
          ],
        })
      ).toThrow();
    });

    it('应拒绝非整数的 material_id', () => {
      expect(() =>
        createInboundOrderSchema.parse({
          warehouse_id: 1,
          items: [
            {
              material_id: 1.5,
              material_name: '测试',
              quantity: 1,
            },
          ],
        })
      ).toThrow();
    });
  });

  describe('updateInboundOrderSchema', () => {
    it('应通过合法的更新数据', () => {
      const result = updateInboundOrderSchema.parse({
        id: 1,
        action: 'approve',
      });
      expect(result.id).toBe(1);
      expect(result.action).toBe('approve');
    });

    it('应拒绝缺少 id', () => {
      expect(() =>
        updateInboundOrderSchema.parse({
          action: 'approve',
        })
      ).toThrow();
    });

    it('应拒绝无效的 action', () => {
      expect(() =>
        updateInboundOrderSchema.parse({
          id: 1,
          action: 'invalid',
        })
      ).toThrow();
    });

    it('应接受所有合法的 action', () => {
      for (const action of ['submit', 'approve', 'cancel', 'unapprove']) {
        const result = updateInboundOrderSchema.parse({ id: 1, action });
        expect(result.action).toBe(action);
      }
    });

    it('应拒绝负数的 id', () => {
      expect(() =>
        updateInboundOrderSchema.parse({
          id: -1,
          action: 'approve',
        })
      ).toThrow();
    });

    it('应拒绝过长的备注', () => {
      expect(() =>
        updateInboundOrderSchema.parse({
          id: 1,
          remark: 'A'.repeat(501),
        })
      ).toThrow();
    });
  });
});
