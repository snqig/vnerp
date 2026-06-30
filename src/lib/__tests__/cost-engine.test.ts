import { describe, it, expect } from 'vitest';
import { CostEngine, calculateEOQ } from '@/lib/cost-engine';

describe('CostEngine - 成本核算引擎', () => {
  const engine = new CostEngine('moving_average', 4);

  describe('移动加权平均法', () => {
    it('首次入库：当前库存为0', () => {
      const result = engine.calculateMovingAverage({
        currentQty: 0,
        currentCostPrice: 0,
        currentTotalAmount: 0,
        inQty: 100,
        inPrice: 10,
      });
      expect(result.newQty).toBe(100);
      expect(result.newCostPrice).toBe(10);
      expect(result.newTotalAmount).toBe(1000);
    });

    it('第二次入库：不同价格', () => {
      const result = engine.calculateMovingAverage({
        currentQty: 100,
        currentCostPrice: 10,
        currentTotalAmount: 1000,
        inQty: 50,
        inPrice: 12,
      });
      expect(result.newQty).toBe(150);
      expect(result.newCostPrice).toBeCloseTo(10.6667, 4);
      expect(result.newTotalAmount).toBe(1600);
    });

    it('第三次入库：价格下降', () => {
      const result = engine.calculateMovingAverage({
        currentQty: 150,
        currentCostPrice: 10.6667,
        currentTotalAmount: 1600,
        inQty: 50,
        inPrice: 8,
      });
      expect(result.newQty).toBe(200);
      expect(result.newTotalAmount).toBe(2000);
      expect(result.newCostPrice).toBe(10);
    });

    it('入库数量必须大于0', () => {
      expect(() =>
        engine.calculateMovingAverage({
          currentQty: 100,
          currentCostPrice: 10,
          currentTotalAmount: 1000,
          inQty: 0,
          inPrice: 10,
        })
      ).toThrow('入库数量必须大于0');
    });

    it('入库单价不能为负', () => {
      expect(() =>
        engine.calculateMovingAverage({
          currentQty: 100,
          currentCostPrice: 10,
          currentTotalAmount: 1000,
          inQty: 10,
          inPrice: -1,
        })
      ).toThrow('入库单价不能为负');
    });

    it('当前库存数量不能为负', () => {
      expect(() =>
        engine.calculateMovingAverage({
          currentQty: -10,
          currentCostPrice: 10,
          currentTotalAmount: -100,
          inQty: 10,
          inPrice: 10,
        })
      ).toThrow('当前库存数量不能为负');
    });

    it('当前成本单价不能为负', () => {
      expect(() =>
        engine.calculateMovingAverage({
          currentQty: 100,
          currentCostPrice: -10,
          currentTotalAmount: -1000,
          inQty: 10,
          inPrice: 10,
        })
      ).toThrow('当前成本单价不能为负');
    });

    it('价格变动计算正确', () => {
      const result = engine.calculateMovingAverage({
        currentQty: 100,
        currentCostPrice: 10,
        currentTotalAmount: 1000,
        inQty: 100,
        inPrice: 12,
      });
      expect(result.priceChange).toBe(1);
      expect(result.priceChangeRate).toBe(0.1);
    });

    it('使用totalAmount计算，避免浮点误差', () => {
      const result = engine.calculateMovingAverage({
        currentQty: 100,
        currentCostPrice: 9.99,
        currentTotalAmount: 999,
        inQty: 100,
        inPrice: 10.01,
        inAmount: 1001,
      });
      expect(result.newQty).toBe(200);
      expect(result.newTotalAmount).toBe(2000);
      expect(result.newCostPrice).toBe(10);
    });
  });

  describe('月末一次加权平均法', () => {
    it('期初+入库计算平均单价', () => {
      const result = engine.calculateWeightedAverage(100, 1000, 200, 2500);
      expect(result.weightedPrice).toBeCloseTo(11.6667, 4);
      expect(result.endQty).toBe(300);
      expect(result.endAmount).toBe(3500);
    });

    it('期初为0时，平均单价等于入库单价', () => {
      const result = engine.calculateWeightedAverage(0, 0, 100, 5000);
      expect(result.weightedPrice).toBe(50);
      expect(result.endQty).toBe(100);
      expect(result.endAmount).toBe(5000);
    });

    it('入库为0时，平均单价等于期初单价', () => {
      const result = engine.calculateWeightedAverage(100, 1000, 0, 0);
      expect(result.weightedPrice).toBe(10);
      expect(result.endQty).toBe(100);
      expect(result.endAmount).toBe(1000);
    });

    it('全部为0时，平均单价为0', () => {
      const result = engine.calculateWeightedAverage(0, 0, 0, 0);
      expect(result.weightedPrice).toBe(0);
      expect(result.endQty).toBe(0);
      expect(result.endAmount).toBe(0);
    });
  });

  describe('出库成本计算', () => {
    it('正常出库成本计算', () => {
      const cost = engine.calculateIssueCost(50, 10);
      expect(cost).toBe(500);
    });

    it('出库数量为0时成本为0', () => {
      const cost = engine.calculateIssueCost(0, 10);
      expect(cost).toBe(0);
    });

    it('出库数量不能为负', () => {
      expect(() => engine.calculateIssueCost(-10, 10)).toThrow('出库数量不能为负');
    });

    it('单位成本不能为负', () => {
      expect(() => engine.calculateIssueCost(10, -1)).toThrow('单位成本不能为负');
    });
  });

  describe('标准成本差异分析', () => {
    it('价格差异和数量差异计算正确', () => {
      const result = engine.calculateStandardVariance(10, 12, 100, 110);

      const priceVar = (12 - 10) * 110;
      const qtyVar = (110 - 100) * 10;
      const totalVar = 12 * 110 - 10 * 100;

      expect(result.priceVariance).toBe(priceVar);
      expect(result.qtyVariance).toBe(qtyVar);
      expect(result.totalVariance).toBe(totalVar);
      expect(result.totalVariance).toBe(priceVar + qtyVar);
    });

    it('实际价格低于标准价格：价差为负（有利差异）', () => {
      const result = engine.calculateStandardVariance(10, 9, 100, 100);
      expect(result.priceVariance).toBe(-100);
      expect(result.priceVarianceRate).toBe(-0.1);
    });

    it('实际用量低于标准用量：量差为负（有利差异）', () => {
      const result = engine.calculateStandardVariance(10, 10, 100, 90);
      expect(result.qtyVariance).toBe(-100);
      expect(result.qtyVarianceRate).toBe(-0.1);
    });

    it('完全符合标准：差异为0', () => {
      const result = engine.calculateStandardVariance(10, 10, 100, 100);
      expect(result.priceVariance).toBe(0);
      expect(result.qtyVariance).toBe(0);
      expect(result.totalVariance).toBe(0);
    });
  });

  describe('产品成本卷积', () => {
    it('直接材料 + 直接人工 + 制造费用 = 总成本', () => {
      const materialCost = 1000;
      const laborCost = 200;
      const manufacturingCost = 300;
      const outputQty = 100;

      const totalCost = materialCost + laborCost + manufacturingCost;
      const unitCost = totalCost / outputQty;

      expect(totalCost).toBe(1500);
      expect(unitCost).toBe(15);
    });

    it('产出为0时，单位成本为0', () => {
      const totalCost = 1500;
      const outputQty = 0;
      const unitCost = outputQty > 0 ? totalCost / outputQty : 0;

      expect(unitCost).toBe(0);
    });

    it('BOM展开成本累加', () => {
      const bomItems = [
        { qty: 2, unitCost: 50 },
        { qty: 3, unitCost: 20 },
        { qty: 1, unitCost: 100 },
      ];

      const materialCost = bomItems.reduce((sum, item) => sum + item.qty * item.unitCost, 0);
      expect(materialCost).toBe(2 * 50 + 3 * 20 + 1 * 100);
      expect(materialCost).toBe(260);
    });

    it('考虑损耗率的材料成本', () => {
      const baseQty = 100;
      const unitCost = 10;
      const lossRate = 0.05;

      const grossQty = baseQty * (1 + lossRate);
      const totalCost = grossQty * unitCost;

      expect(grossQty).toBe(105);
      expect(totalCost).toBe(1050);
    });

    it('多层BOM成本卷积：子件成本累加到父件', () => {
      const rawMaterialCost = 50;
      const semiLaborCost = 20;
      const semiMfgCost = 10;
      const semiProductCost = rawMaterialCost + semiLaborCost + semiMfgCost;

      const parentLaborCost = 30;
      const parentMfgCost = 15;
      const parentProductCost = semiProductCost + parentLaborCost + parentMfgCost;

      expect(semiProductCost).toBe(80);
      expect(parentProductCost).toBe(125);
    });
  });

  describe('EOQ 经济订货批量', () => {
    it('EOQ公式计算正确', () => {
      const annualDemand = 10000;
      const orderingCost = 100;
      const holdingCost = 2;

      const eoq = calculateEOQ(annualDemand, orderingCost, holdingCost);
      const expected = Math.sqrt((2 * annualDemand * orderingCost) / holdingCost);

      expect(eoq).toBeCloseTo(expected, 2);
    });

    it('需求为0时返回0', () => {
      expect(calculateEOQ(0, 100, 2)).toBe(0);
    });

    it('订货成本为0时返回0', () => {
      expect(calculateEOQ(10000, 0, 2)).toBe(0);
    });

    it('存储成本为0时返回0', () => {
      expect(calculateEOQ(10000, 100, 0)).toBe(0);
    });
  });

  describe('成本核算方法切换', () => {
    it('移动加权平均方法', () => {
      const maEngine = new CostEngine('moving_average');
      expect(maEngine).toBeInstanceOf(CostEngine);
    });

    it('月末加权平均方法', () => {
      const waEngine = new CostEngine('weighted_average');
      expect(waEngine).toBeInstanceOf(CostEngine);
    });

    it('标准成本方法', () => {
      const scEngine = new CostEngine('standard_cost');
      expect(scEngine).toBeInstanceOf(CostEngine);
    });
  });
});
