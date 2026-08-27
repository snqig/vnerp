import { describe, it, expect } from 'vitest';

/**
 * 移动加权平均成本核算 单元测试
 * 
 * 公式: 新成本 = (原库存数量 × 原成本单价 + 入库数量 × 入库单价) / (原库存数量 + 入库数量)
 */

interface CostCalculationInput {
  currentQty: number;      // 当前库存数量
  currentCostPrice: number; // 当前成本单价
  inQty: number;           // 入库数量
  inPrice: number;         // 入库单价
}

interface CostCalculationResult {
  newQty: number;          // 新库存数量
  newCostPrice: number;    // 新成本单价
  totalCost: number;       // 总成本
}

/**
 * 计算移动加权平均成本
 */
export function calculateMovingAverageCost(input: CostCalculationInput): CostCalculationResult {
  const { currentQty, currentCostPrice, inQty, inPrice } = input;

  if (inQty <= 0) {
    throw new Error('入库数量必须大于0');
  }
  if (inPrice < 0) {
    throw new Error('入库单价不能为负');
  }
  if (currentQty < 0) {
    throw new Error('当前库存数量不能为负');
  }
  if (currentCostPrice < 0) {
    throw new Error('当前成本单价不能为负');
  }

  const newQty = currentQty + inQty;
  const totalCost = currentQty * currentCostPrice + inQty * inPrice;
  const newCostPrice = newQty > 0 ? totalCost / newQty : 0;

  return {
    newQty,
    newCostPrice: Math.round(newCostPrice * 10000) / 10000, // 保留4位小数
    totalCost: Math.round(totalCost * 100) / 100,
  };
}

describe('移动加权平均成本核算', () => {
  describe('calculateMovingAverageCost', () => {
    it('首次入库：当前库存为0', () => {
      const result = calculateMovingAverageCost({
        currentQty: 0,
        currentCostPrice: 0,
        inQty: 100,
        inPrice: 10,
      });
      expect(result.newQty).toBe(100);
      expect(result.newCostPrice).toBe(10);
      expect(result.totalCost).toBe(1000);
    });

    it('第二次入库：不同价格', () => {
      const result = calculateMovingAverageCost({
        currentQty: 100,
        currentCostPrice: 10,
        inQty: 50,
        inPrice: 12,
      });
      // (100*10 + 50*12) / 150 = 1600/150 = 10.6667
      expect(result.newQty).toBe(150);
      expect(result.newCostPrice).toBe(10.6667);
      expect(result.totalCost).toBe(1600);
    });

    it('第三次入库：价格下降', () => {
      const result = calculateMovingAverageCost({
        currentQty: 150,
        currentCostPrice: 10.6667,
        inQty: 200,
        inPrice: 8,
      });
      // (150*10.6667 + 200*8) / 350 = (1600 + 1600) / 350 = 3200/350 = 9.1429
      expect(result.newQty).toBe(350);
      expect(result.newCostPrice).toBeCloseTo(9.1429, 3);
    });

    it('入库价格为0（赠品/样品）', () => {
      const result = calculateMovingAverageCost({
        currentQty: 100,
        currentCostPrice: 10,
        inQty: 10,
        inPrice: 0,
      });
      // (100*10 + 10*0) / 110 = 1000/110 = 9.0909
      expect(result.newQty).toBe(110);
      expect(result.newCostPrice).toBeCloseTo(9.0909, 3);
    });

    it('大批量入库稀释成本', () => {
      const result = calculateMovingAverageCost({
        currentQty: 10,
        currentCostPrice: 100,
        inQty: 1000,
        inPrice: 5,
      });
      // (10*100 + 1000*5) / 1010 = 6000/1010 = 5.9406
      expect(result.newQty).toBe(1010);
      expect(result.newCostPrice).toBeCloseTo(5.9406, 3);
    });

    it('抛出错误：入库数量为0', () => {
      expect(() => calculateMovingAverageCost({
        currentQty: 100,
        currentCostPrice: 10,
        inQty: 0,
        inPrice: 10,
      })).toThrow('入库数量必须大于0');
    });

    it('抛出错误：入库数量为负', () => {
      expect(() => calculateMovingAverageCost({
        currentQty: 100,
        currentCostPrice: 10,
        inQty: -10,
        inPrice: 10,
      })).toThrow('入库数量必须大于0');
    });

    it('抛出错误：入库单价为负', () => {
      expect(() => calculateMovingAverageCost({
        currentQty: 100,
        currentCostPrice: 10,
        inQty: 50,
        inPrice: -5,
      })).toThrow('入库单价不能为负');
    });

    it('抛出错误：当前库存为负', () => {
      expect(() => calculateMovingAverageCost({
        currentQty: -10,
        currentCostPrice: 10,
        inQty: 50,
        inPrice: 10,
      })).toThrow('当前库存数量不能为负');
    });

    it('小数精度处理', () => {
      const result = calculateMovingAverageCost({
        currentQty: 3,
        currentCostPrice: 33.3333,
        inQty: 7,
        inPrice: 28.5714,
      });
      // (3*33.3333 + 7*28.5714) / 10 = (100 + 200) / 10 = 30
      expect(result.newQty).toBe(10);
      expect(result.newCostPrice).toBeCloseTo(30, 0);
    });
  });
});
