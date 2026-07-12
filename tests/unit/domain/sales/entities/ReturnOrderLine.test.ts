import { describe, it, expect } from 'vitest';
import { ReturnOrderLine } from '@/domain/sales/entities/ReturnOrderLine';

describe('ReturnOrderLine', () => {
  describe('create', () => {
    it('should create a return order line with valid props', () => {
      const line = ReturnOrderLine.create({
        lineNo: 1,
        materialId: 1,
        materialCode: 'M001',
        materialName: '物料1',
        quantity: 10,
        unit: '件',
        unitPrice: 10,
      });

      expect(line.quantity).toBe(10);
      expect(line.amount).toBe(100);
    });

    it('should throw error if quantity is zero', () => {
      expect(() =>
        ReturnOrderLine.create({
          lineNo: 1,
          materialId: 1,
          materialCode: 'M001',
          materialName: '物料1',
          quantity: 0,
          unit: '件',
        })
      ).toThrow('退货数量必须大于0');
    });

    it('should throw error if quantity is negative', () => {
      expect(() =>
        ReturnOrderLine.create({
          lineNo: 1,
          materialId: 1,
          materialCode: 'M001',
          materialName: '物料1',
          quantity: -5,
          unit: '件',
        })
      ).toThrow('退货数量必须大于0');
    });

    it('should throw error if delivered quantity is exceeded', () => {
      expect(() =>
        ReturnOrderLine.create({
          lineNo: 1,
          materialId: 1,
          materialCode: 'M001',
          materialName: '物料1',
          quantity: 100,
          unit: '件',
          deliveredQty: 50,
        })
      ).toThrow('退货数量不能超过已发货数量');
    });

    it('should allow return quantity equal to delivered quantity', () => {
      const line = ReturnOrderLine.create({
        lineNo: 1,
        materialId: 1,
        materialCode: 'M001',
        materialName: '物料1',
        quantity: 50,
        unit: '件',
        deliveredQty: 50,
      });

      expect(line.quantity).toBe(50);
    });

    it('should allow return quantity less than delivered quantity', () => {
      const line = ReturnOrderLine.create({
        lineNo: 1,
        materialId: 1,
        materialCode: 'M001',
        materialName: '物料1',
        quantity: 30,
        unit: '件',
        deliveredQty: 50,
      });

      expect(line.quantity).toBe(30);
    });

    it('should skip validation when deliveredQty is not provided', () => {
      const line = ReturnOrderLine.create({
        lineNo: 1,
        materialId: 1,
        materialCode: 'M001',
        materialName: '物料1',
        quantity: 100,
        unit: '件',
      });

      expect(line.quantity).toBe(100);
    });

    it('should throw error if materialId is empty', () => {
      expect(() =>
        ReturnOrderLine.create({
          lineNo: 1,
          materialId: 0,
          materialCode: 'M001',
          materialName: '物料1',
          quantity: 10,
          unit: '件',
        })
      ).toThrow('物料ID不能为空');
    });

    it('should throw error if lineNo is empty', () => {
      expect(() =>
        ReturnOrderLine.create({
          lineNo: 0,
          materialId: 1,
          materialCode: 'M001',
          materialName: '物料1',
          quantity: 10,
          unit: '件',
        })
      ).toThrow('行号不能为空');
    });
  });
});
