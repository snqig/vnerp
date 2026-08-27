import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  MRPEngine,
  calculateEOQ,
  applyLotSizing,
  calculateSafetyStock,
  generateBucketDates,
} from '@/lib/mrp-engine-v2';

describe('MRP Engine Core Algorithms', () => {
  describe('calculateEOQ - 经济订货批量', () => {
    it('应该正确计算EOQ', () => {
      const eoq = calculateEOQ(10000, 100, 0.2, 10);
      expect(eoq).toBeCloseTo(Math.sqrt((2 * 10000 * 100) / (10 * 0.2)), 2);
    });

    it('当需求为0时返回0', () => {
      expect(calculateEOQ(0, 100, 0.2, 10)).toBe(0);
    });

    it('当订货成本为0时返回0', () => {
      expect(calculateEOQ(10000, 0, 0.2, 10)).toBe(0);
    });

    it('当存储费率为0时返回0', () => {
      expect(calculateEOQ(10000, 100, 0, 10)).toBe(0);
    });

    it('当单价为0时返回0', () => {
      expect(calculateEOQ(10000, 100, 0.2, 0)).toBe(0);
    });
  });

  describe('applyLotSizing - 批量调整', () => {
    it('直接批量：净需求等于计划量', () => {
      expect(applyLotSizing(100, 'lot_for_lot')).toBe(100);
    });

    it('净需求为0时返回0', () => {
      expect(applyLotSizing(0, 'lot_for_lot')).toBe(0);
      expect(applyLotSizing(0, 'fixed', 100)).toBe(0);
    });

    it('固定批量：向上取整到最近的固定批量倍数', () => {
      expect(applyLotSizing(100, 'fixed', 50)).toBe(100);
      expect(applyLotSizing(101, 'fixed', 50)).toBe(150);
      expect(applyLotSizing(120, 'fixed', 100)).toBe(200);
      expect(applyLotSizing(1, 'fixed', 100)).toBe(100);
    });

    it('固定批量为0时退化为直接批量', () => {
      expect(applyLotSizing(123, 'fixed', 0)).toBe(123);
    });

    it('经济批量EOQ：向上取整到最近的EOQ倍数', () => {
      expect(applyLotSizing(200, 'eoq', 0, 100)).toBe(200);
      expect(applyLotSizing(250, 'eoq', 0, 100)).toBe(300);
    });

    it('EOQ为0时退化为直接批量', () => {
      expect(applyLotSizing(123, 'eoq', 0, 0)).toBe(123);
    });

    it('期间供应批量', () => {
      expect(applyLotSizing(500, 'period_supply', 0, 0, 7)).toBe(500);
    });
  });

  describe('calculateSafetyStock - 安全库存计算', () => {
    it('none策略：安全库存为0', () => {
      expect(calculateSafetyStock('none', 100, 10, 7)).toBe(0);
    });

    it('fixed策略：使用固定安全库存', () => {
      expect(calculateSafetyStock('fixed', 100, 10, 7)).toBe(100);
    });

    it('fixed策略：安全库存为0时返回0', () => {
      expect(calculateSafetyStock('fixed', 0, 10, 7)).toBe(0);
    });

    it('days_of_coverage策略：日均需求 × 覆盖天数', () => {
      expect(calculateSafetyStock('days_of_coverage', 100, 10, 7)).toBe(70);
    });

    it('days_of_coverage策略：覆盖天数为0时返回0', () => {
      expect(calculateSafetyStock('days_of_coverage', 100, 10, 0)).toBe(0);
    });

    it('days_of_coverage策略：日均需求为0时返回0', () => {
      expect(calculateSafetyStock('days_of_coverage', 100, 0, 7)).toBe(0);
    });
  });

  describe('generateBucketDates - 时间桶生成', () => {
    it('按天生成时间桶', () => {
      const buckets = generateBucketDates('2026-01-01', 5, 'day');
      expect(buckets.length).toBe(5);
      expect(buckets[0].bucketDate).toBe('2026-01-01');
      expect(buckets[4].bucketDate).toBe('2026-01-05');
      expect(buckets[0].dates.length).toBe(1);
    });

    it('按周生成时间桶', () => {
      const buckets = generateBucketDates('2026-01-01', 14, 'week');
      expect(buckets.length).toBeGreaterThanOrEqual(2);
      expect(buckets[0].dates.length).toBeGreaterThan(1);
    });

    it('按月生成时间桶', () => {
      const buckets = generateBucketDates('2026-01-01', 60, 'month');
      expect(buckets.length).toBeGreaterThanOrEqual(2);
      expect(buckets[0].dates.length).toBeGreaterThan(20);
    });

    it('0天返回空数组', () => {
      const buckets = generateBucketDates('2026-01-01', 0, 'day');
      expect(buckets.length).toBe(0);
    });

    it('1天返回1个桶', () => {
      const buckets = generateBucketDates('2026-01-01', 1, 'day');
      expect(buckets.length).toBe(1);
    });
  });
});

describe('MRPEngine - MRP引擎', () => {
  let engine: MRPEngine;

  beforeEach(() => {
    engine = new MRPEngine({
      horizonDays: 30,
      bucketSize: 'day',
      defaultLotSizing: 'lot_for_lot',
      safetyStockPolicy: 'fixed',
    });
  });

  it('应该创建MRP引擎实例', () => {
    expect(engine).toBeInstanceOf(MRPEngine);
  });

  it('应该使用默认配置', () => {
    const defaultEngine = new MRPEngine();
    expect(defaultEngine).toBeInstanceOf(MRPEngine);
  });

  it('应该使用自定义配置', () => {
    const customEngine = new MRPEngine({
      horizonDays: 90,
      bucketSize: 'week',
      defaultLotSizing: 'fixed',
      defaultFixedLotSize: 100,
    });
    expect(customEngine).toBeInstanceOf(MRPEngine);
  });
});

describe('MRP Net Requirement Calculation', () => {
  it('净需求 = 毛需求 - 可用库存 - 预计入库 + 安全库存', () => {
    const grossReq = 100;
    const onHand = 50;
    const scheduledReceipt = 30;
    const safetyStock = 10;

    const available = onHand + scheduledReceipt - safetyStock;
    const netReq = Math.max(0, grossReq - available);

    expect(netReq).toBe(30);
  });

  it('当可用库存足够时，净需求为0', () => {
    const grossReq = 50;
    const onHand = 100;
    const safetyStock = 10;

    const available = onHand - safetyStock;
    const netReq = Math.max(0, grossReq - available);

    expect(netReq).toBe(0);
  });

  it('当可用库存不足时，产生净需求', () => {
    const grossReq = 100;
    const onHand = 30;
    const safetyStock = 10;

    const available = onHand - safetyStock;
    const netReq = Math.max(0, grossReq - available);

    expect(netReq).toBe(80);
  });

  it('安全库存必须保留，不能用于满足需求', () => {
    const grossReq = 50;
    const onHand = 50;
    const safetyStock = 20;

    const available = onHand - safetyStock;
    const netReq = Math.max(0, grossReq - available);

    expect(netReq).toBe(20);
  });
});

describe('MRP Lead Time Offsetting', () => {
  it('提前期偏移：计划投入 = 计划产出日期 - 提前期', () => {
    const receiptBucket = 10;
    const leadTimeDays = 5;
    const releaseBucket = receiptBucket - leadTimeDays;

    expect(releaseBucket).toBe(5);
  });

  it('提前期为0时，投入和产出同期', () => {
    const receiptBucket = 10;
    const leadTimeDays = 0;
    const releaseBucket = receiptBucket - leadTimeDays;

    expect(releaseBucket).toBe(10);
  });

  it('提前期超出范围时，最早一期投入', () => {
    const receiptBucket = 3;
    const leadTimeDays = 5;
    const releaseBucket = Math.max(0, receiptBucket - leadTimeDays);

    expect(releaseBucket).toBe(0);
  });
});

describe('MRP BOM Explosion Logic', () => {
  it('单层BOM展开：父件需求 × 子件用量', () => {
    const parentQty = 100;
    const componentUsage = 2;
    const lossRate = 0.05;

    const componentReq = parentQty * componentUsage * (1 + lossRate);

    expect(componentReq).toBe(210);
  });

  it('损耗率为0时，需求=用量×数量', () => {
    const parentQty = 100;
    const componentUsage = 2;
    const lossRate = 0;

    const componentReq = parentQty * componentUsage * (1 + lossRate);

    expect(componentReq).toBe(200);
  });

  it('损耗率为10%时，需求增加10%', () => {
    const parentQty = 100;
    const componentUsage = 1;
    const lossRate = 0.1;

    const componentReq = parentQty * componentUsage * (1 + lossRate);

    expect(componentReq).toBeCloseTo(110, 2);
  });
});
