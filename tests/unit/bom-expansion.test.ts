/**
 * BOM展开计算单元测试
 * 测试BOM展开的核心逻辑，包括递归展开、损耗率计算、循环引用检测等
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock数据库查询
vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  execute: vi.fn(),
  transaction: vi.fn(),
}));

import { query } from '@/lib/db';
import {
  expandBom,
  expandBomBatch,
  mergeExpansionResults,
  clearBomExpansionCache,
  type BomExpansionItem,
  type BomExpansionResult,
} from '@/lib/bom-expansion';

describe('BOM展开计算', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearBomExpansionCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('expandBom - 基础功能', () => {
    it('应该正确展开单层BOM', async () => {
      // Mock产品信息
      vi.mocked(query).mockResolvedValueOnce([
        { id: 1, code: 'PROD-001', name: '产品A', specification: '规格A' },
      ]);

      // Mock BOM明细
      vi.mocked(query).mockResolvedValueOnce([
        {
          materialId: 101,
          materialCode: 'MAT-001',
          materialName: '材料1',
          materialSpec: '规格1',
          unit: 'kg',
          quantity: 2,
          lossRate: 5,
          bomId: 1,
        },
        {
          materialId: 102,
          materialCode: 'MAT-002',
          materialName: '材料2',
          materialSpec: '规格2',
          unit: 'pcs',
          quantity: 4,
          lossRate: 0,
          bomId: 1,
        },
      ]);

      // Mock检查物料是否有BOM（无BOM，为原材料）
      vi.mocked(query).mockResolvedValue([]);
      vi.mocked(query).mockResolvedValue([]);

      const result = await expandBom(1, 10);

      expect(result.productId).toBe(1);
      expect(result.productCode).toBe('PROD-001');
      expect(result.requiredQuantity).toBe(10);
      expect(result.items).toHaveLength(2);

      // 验证材料1的计算
      const material1 = result.items.find((i) => i.materialId === 101);
      expect(material1).toBeDefined();
      expect(material1!.baseQuantity).toBe(20); // 10 * 2
      expect(material1!.accumulatedLossRate).toBe(5);
      expect(material1!.actualQuantity).toBeCloseTo(21); // 20 * (1 + 5/100)
      expect(material1!.isLeaf).toBe(true);

      // 验证材料2的计算
      const material2 = result.items.find((i) => i.materialId === 102);
      expect(material2).toBeDefined();
      expect(material2!.baseQuantity).toBe(40); // 10 * 4
      expect(material2!.accumulatedLossRate).toBe(0);
      expect(material2!.actualQuantity).toBe(40);
      expect(material2!.isLeaf).toBe(true);
    });

    it('应该正确展开多层BOM（半成品）', async () => {
      // Mock产品信息
      vi.mocked(query).mockResolvedValueOnce([
        { id: 1, code: 'PROD-001', name: '产品A', specification: '规格A' },
      ]);

      // Mock第一层BOM（包含半成品）
      vi.mocked(query).mockResolvedValueOnce([
        {
          materialId: 101,
          materialCode: 'SEMI-001',
          materialName: '半成品1',
          materialSpec: '',
          unit: 'pcs',
          quantity: 1,
          lossRate: 2,
          bomId: 1,
        },
      ]);

      // Mock检查半成品是否有BOM（有BOM）
      vi.mocked(query).mockResolvedValueOnce([{ bomId: 2 }]);
      // Mock获取半成品对应的产品ID
      vi.mocked(query).mockResolvedValueOnce([{ productId: 2 }]);

      // Mock第二层BOM（半成品的BOM）
      vi.mocked(query).mockResolvedValueOnce([
        {
          materialId: 201,
          materialCode: 'MAT-001',
          materialName: '原材料1',
          materialSpec: '',
          unit: 'kg',
          quantity: 3,
          lossRate: 3,
          bomId: 2,
        },
      ]);

      // Mock检查原材料是否有BOM（无BOM）
      vi.mocked(query).mockResolvedValueOnce([]);
      vi.mocked(query).mockResolvedValueOnce([]);

      const result = await expandBom(1, 10);

      expect(result.items).toHaveLength(2);

      // 验证半成品
      const semiProduct = result.items.find((i) => i.materialId === 101);
      expect(semiProduct).toBeDefined();
      expect(semiProduct!.isLeaf).toBe(false);
      expect(semiProduct!.level).toBe(0);

      // 验证原材料（展开后的）
      const rawMaterial = result.items.find((i) => i.materialId === 201);
      expect(rawMaterial).toBeDefined();
      expect(rawMaterial!.isLeaf).toBe(true);
      expect(rawMaterial!.level).toBe(1);
      // 基础用量 = 父级 actualQuantity(10*1.02=10.2) * 子件用量3 = 30.6
      expect(rawMaterial!.baseQuantity).toBeCloseTo(30.6);
      // 累计损耗率 = 2 + 3 = 5
      expect(rawMaterial!.accumulatedLossRate).toBe(5);
      // 实际用量 = 30.6 * (1 + 5/100) = 32.13
      expect(rawMaterial!.actualQuantity).toBeCloseTo(32.13);
    });

    it('应该正确处理损耗率累加', async () => {
      vi.mocked(query).mockResolvedValueOnce([
        { id: 1, code: 'PROD-001', name: '产品A', specification: '' },
      ]);

      vi.mocked(query).mockResolvedValueOnce([
        {
          materialId: 101,
          materialCode: 'MAT-001',
          materialName: '材料1',
          materialSpec: '',
          unit: 'kg',
          quantity: 5,
          lossRate: 10,
          bomId: 1,
        },
      ]);

      vi.mocked(query).mockResolvedValue([]);
      vi.mocked(query).mockResolvedValue([]);

      const result = await expandBom(1, 100);

      const material = result.items[0];
      expect(material.baseQuantity).toBe(500); // 100 * 5
      expect(material.accumulatedLossRate).toBe(10);
      // 实际用量 = 500 * 1.1 = 550
      expect(material.actualQuantity).toBeCloseTo(550);
    });

    it('应该检测循环引用并发出警告', async () => {
      vi.mocked(query).mockResolvedValueOnce([
        { id: 1, code: 'PROD-001', name: '产品A', specification: '' },
      ]);

      // 产品A包含自己（循环引用）
      vi.mocked(query).mockResolvedValueOnce([
        {
          materialId: 1,
          materialCode: 'PROD-001',
          materialName: '产品A',
          materialSpec: '',
          unit: 'pcs',
          quantity: 1,
          lossRate: 0,
          bomId: 1,
        },
      ]);

      // 检查是否有BOM
      vi.mocked(query).mockResolvedValue([{ bomId: 1 }]);
      vi.mocked(query).mockResolvedValue([{ productId: 1 }]);

      const result = await expandBom(1, 10);

      expect(result.circularReferenceWarnings).toBeDefined();
      expect(result.circularReferenceWarnings!.length).toBeGreaterThan(0);
      expect(result.circularReferenceWarnings![0]).toContain('循环引用');
    });

    it('应该限制最大递归深度', async () => {
      vi.mocked(query).mockResolvedValueOnce([
        { id: 1, code: 'PROD-001', name: '产品A', specification: '' },
      ]);

      vi.mocked(query).mockResolvedValueOnce([
        {
          materialId: 101,
          materialCode: 'MAT-001',
          materialName: '材料1',
          materialSpec: '',
          unit: 'kg',
          quantity: 1,
          lossRate: 0,
          bomId: 1,
        },
      ]);

      vi.mocked(query).mockResolvedValue([]);
      vi.mocked(query).mockResolvedValue([]);

      const result = await expandBom(1, 10, { maxDepth: 1 });

      expect(result.statistics.maxDepth).toBeLessThanOrEqual(1);
    });

    it('应该正确合并相同物料', async () => {
      vi.mocked(query).mockResolvedValueOnce([
        { id: 1, code: 'PROD-001', name: '产品A', specification: '' },
      ]);

      // 同一物料出现两次
      vi.mocked(query).mockResolvedValueOnce([
        {
          materialId: 101,
          materialCode: 'MAT-001',
          materialName: '材料1',
          materialSpec: '',
          unit: 'kg',
          quantity: 2,
          lossRate: 5,
          bomId: 1,
        },
        {
          materialId: 101,
          materialCode: 'MAT-001',
          materialName: '材料1',
          materialSpec: '',
          unit: 'kg',
          quantity: 3,
          lossRate: 5,
          bomId: 1,
        },
      ]);

      vi.mocked(query).mockResolvedValue([]);
      vi.mocked(query).mockResolvedValue([]);

      const result = await expandBom(1, 10);

      // 合并后应该只有一项
      expect(result.items).toHaveLength(1);
      // 基础用量应该累加 = 10 * 2 + 10 * 3 = 50
      expect(result.items[0].baseQuantity).toBe(50);
    });

    it('应该抛出错误当产品不存在', async () => {
      vi.mocked(query).mockResolvedValueOnce([]);

      await expect(expandBom(999, 10)).rejects.toThrow('产品不存在');
    });
  });

  describe('expandBom - 缓存功能', () => {
    it('应该使用缓存提高性能', async () => {
      vi.mocked(query).mockResolvedValueOnce([
        { id: 1, code: 'PROD-001', name: '产品A', specification: '' },
      ]);
      vi.mocked(query).mockResolvedValueOnce([
        {
          materialId: 101,
          materialCode: 'MAT-001',
          materialName: '材料1',
          materialSpec: '',
          unit: 'kg',
          quantity: 2,
          lossRate: 0,
          bomId: 1,
        },
      ]);
      vi.mocked(query).mockResolvedValue([]);
      vi.mocked(query).mockResolvedValue([]);

      // 第一次调用
      const result1 = await expandBom(1, 10, { enableCache: true });
      expect(query).toHaveBeenCalledTimes(4);

      vi.clearAllMocks();

      // 第二次调用（应该使用缓存）
      const result2 = await expandBom(1, 10, { enableCache: true });
      expect(query).toHaveBeenCalledTimes(0);
      expect(result2).toEqual(result1);
    });

    it('应该能够清除缓存', async () => {
      vi.mocked(query).mockResolvedValueOnce([
        { id: 1, code: 'PROD-001', name: '产品A', specification: '' },
      ]);
      vi.mocked(query).mockResolvedValueOnce([
        {
          materialId: 101,
          materialCode: 'MAT-001',
          materialName: '材料1',
          materialSpec: '',
          unit: 'kg',
          quantity: 2,
          lossRate: 0,
          bomId: 1,
        },
      ]);
      vi.mocked(query).mockResolvedValue([]);
      vi.mocked(query).mockResolvedValue([]);

      await expandBom(1, 10, { enableCache: true });
      clearBomExpansionCache();

      vi.clearAllMocks();
      vi.mocked(query).mockResolvedValueOnce([
        { id: 1, code: 'PROD-001', name: '产品A', specification: '' },
      ]);
      vi.mocked(query).mockResolvedValueOnce([
        {
          materialId: 101,
          materialCode: 'MAT-001',
          materialName: '材料1',
          materialSpec: '',
          unit: 'kg',
          quantity: 2,
          lossRate: 0,
          bomId: 1,
        },
      ]);
      vi.mocked(query).mockResolvedValue([]);
      vi.mocked(query).mockResolvedValue([]);

      // 清除缓存后应该重新查询
      await expandBom(1, 10, { enableCache: true });
      expect(query).toHaveBeenCalled();
    });
  });

  describe('expandBomBatch - 批量展开', () => {
    it('应该正确展开多个产品', async () => {
      vi.mocked(query)
        // 产品1：产品信息
        .mockResolvedValueOnce([{ id: 1, code: 'PROD-001', name: '产品A', specification: '' }])
        // 产品1：BOM明细
        .mockResolvedValueOnce([
          {
            materialId: 101,
            materialCode: 'MAT-001',
            materialName: '材料1',
            materialSpec: '',
            unit: 'kg',
            quantity: 2,
            lossRate: 0,
            bomId: 1,
          },
        ])
        // 产品1：checkMaterialHasBom(101) → 无BOM
        .mockResolvedValueOnce([])
        // 产品1：getProductIdByMaterialId(101) → null
        .mockResolvedValueOnce([])
        // 产品2：产品信息
        .mockResolvedValueOnce([{ id: 2, code: 'PROD-002', name: '产品B', specification: '' }])
        // 产品2：BOM明细
        .mockResolvedValueOnce([
          {
            materialId: 102,
            materialCode: 'MAT-002',
            materialName: '材料2',
            materialSpec: '',
            unit: 'pcs',
            quantity: 3,
            lossRate: 0,
            bomId: 2,
          },
        ])
        // 产品2：checkMaterialHasBom(102) → 无BOM
        .mockResolvedValueOnce([])
        // 产品2：getProductIdByMaterialId(102) → null
        .mockResolvedValueOnce([]);

      const results = await expandBomBatch([
        { productId: 1, quantity: 10 },
        { productId: 2, quantity: 5 },
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].productId).toBe(1);
      expect(results[0].requiredQuantity).toBe(10);
      expect(results[1].productId).toBe(2);
      expect(results[1].requiredQuantity).toBe(5);
    });
  });

  describe('mergeExpansionResults - 合并结果', () => {
    it('应该正确合并多个展开结果', () => {
      const result1: BomExpansionResult = {
        productId: 1,
        productCode: 'PROD-001',
        productName: '产品A',
        requiredQuantity: 10,
        items: [
          {
            materialId: 101,
            materialCode: 'MAT-001',
            materialName: '材料1',
            unit: 'kg',
            baseQuantity: 20,
            accumulatedLossRate: 5,
            actualQuantity: 21,
            level: 0,
            parentPath: [],
            sourceBomId: 1,
            isLeaf: true,
          },
        ],
        statistics: { totalMaterials: 1, maxDepth: 0, leafMaterials: 1, intermediateMaterials: 0 },
      };

      const result2: BomExpansionResult = {
        productId: 2,
        productCode: 'PROD-002',
        productName: '产品B',
        requiredQuantity: 5,
        items: [
          {
            materialId: 101,
            materialCode: 'MAT-001',
            materialName: '材料1',
            unit: 'kg',
            baseQuantity: 15,
            accumulatedLossRate: 5,
            actualQuantity: 15.75,
            level: 0,
            parentPath: [],
            sourceBomId: 2,
            isLeaf: true,
          },
        ],
        statistics: { totalMaterials: 1, maxDepth: 0, leafMaterials: 1, intermediateMaterials: 0 },
      };

      const merged = mergeExpansionResults([result1, result2]);

      expect(merged.materials.size).toBe(1);
      const material = merged.materials.get(101);
      expect(material).toBeDefined();
      expect(material!.totalActualQuantity).toBeCloseTo(36.75); // 21 + 15.75
      expect(material!.sources).toHaveLength(2);
    });

    it('应该忽略非叶子节点', () => {
      const result: BomExpansionResult = {
        productId: 1,
        productCode: 'PROD-001',
        productName: '产品A',
        requiredQuantity: 10,
        items: [
          {
            materialId: 101,
            materialCode: 'SEMI-001',
            materialName: '半成品',
            unit: 'pcs',
            baseQuantity: 10,
            accumulatedLossRate: 0,
            actualQuantity: 10,
            level: 0,
            parentPath: [],
            sourceBomId: 1,
            isLeaf: false, // 非叶子节点
          },
        ],
        statistics: { totalMaterials: 1, maxDepth: 0, leafMaterials: 0, intermediateMaterials: 1 },
      };

      const merged = mergeExpansionResults([result]);

      expect(merged.materials.size).toBe(0);
    });
  });

  describe('统计信息', () => {
    it('应该正确计算统计信息', async () => {
      vi.mocked(query)
        // 产品1信息
        .mockResolvedValueOnce([
          { id: 1, code: 'PROD-001', name: '产品A', specification: '' },
        ])
        // 产品1 BOM：半成品 + 原材料
        .mockResolvedValueOnce([
          {
            materialId: 101,
            materialCode: 'SEMI-001',
            materialName: '半成品',
            materialSpec: '',
            unit: 'pcs',
            quantity: 1,
            lossRate: 0,
            bomId: 1,
          },
          {
            materialId: 102,
            materialCode: 'MAT-001',
            materialName: '原材料',
            materialSpec: '',
            unit: 'kg',
            quantity: 2,
            lossRate: 0,
            bomId: 1,
          },
        ])
        // 对 SEMI-001：checkMaterialHasBom(101) → 有BOM
        .mockResolvedValueOnce([{ bomId: 2 }])
        // 对 SEMI-001：getProductIdByMaterialId(101) → productId=2
        .mockResolvedValueOnce([{ productId: 2 }])
        // 半成品的BOM（MAT-002）
        .mockResolvedValueOnce([
          {
            materialId: 201,
            materialCode: 'MAT-002',
            materialName: '原材料2',
            materialSpec: '',
            unit: 'kg',
            quantity: 3,
            lossRate: 0,
            bomId: 2,
          },
        ])
        // 对 MAT-002：checkMaterialHasBom(201) → 无BOM
        .mockResolvedValueOnce([])
        // 对 MAT-002：getProductIdByMaterialId(201) → null
        .mockResolvedValueOnce([])
        // 对 MAT-001：checkMaterialHasBom(102) → 无BOM
        .mockResolvedValueOnce([])
        // 对 MAT-001：getProductIdByMaterialId(102) → null
        .mockResolvedValueOnce([]);

      const result = await expandBom(1, 10);

      expect(result.statistics.totalMaterials).toBe(3);
      expect(result.statistics.maxDepth).toBe(1);
      expect(result.statistics.leafMaterials).toBe(2); // MAT-001, MAT-002
      expect(result.statistics.intermediateMaterials).toBe(1); // SEMI-001
    });
  });
});
