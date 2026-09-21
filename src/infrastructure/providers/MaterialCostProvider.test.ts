// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock db 模块，防止导入时创建真实数据库连接池
vi.mock('@/lib/db', () => ({
  query: vi.fn(),
}));

import { query } from '@/lib/db';
import { MaterialCostProvider } from './MaterialCostProvider';

const mockQuery = vi.mocked(query) as unknown as ReturnType<typeof vi.fn>;

/**
 * 成本数据集：刻意让 inv_material.id 与 base_ink.id 撞车（两者都存在 id=10），
 * 用于锁定「按编码解析、不按 id 解析」这一不变量。
 */
const INV_MATERIAL = [
  { material_code: 'MAT005', weighted_avg_cost: '5.0000' },
  { material_code: 'MAT010', weighted_avg_cost: '8.0000' },
];
const BASE_INK = [{ ink_code: 'INK-BLK-001', unit_price: '12.5000' }];
const INV_BY_ID = [
  { id: 5, weighted_avg_cost: '5.0000' },
  { id: 10, weighted_avg_cost: '8.0000' },
];

function wireDb(): void {
  mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
    const args = (params ?? []) as Array<string | number>;
    if (sql.includes('FROM inv_material') && sql.includes('material_code IN')) {
      return Promise.resolve(INV_MATERIAL.filter((r) => args.includes(r.material_code)));
    }
    if (sql.includes('FROM base_ink')) {
      return Promise.resolve(BASE_INK.filter((r) => args.includes(r.ink_code)));
    }
    if (sql.includes('FROM inv_material') && sql.includes('id IN')) {
      return Promise.resolve(INV_BY_ID.filter((r) => args.map(Number).includes(r.id)));
    }
    return Promise.resolve([]);
  });
}

describe('MaterialCostProvider.getBatchCosts', () => {
  const provider = new MaterialCostProvider();

  beforeEach(() => {
    vi.clearAllMocks();
    wireDb();
  });

  it('空列表返回空 Map', async () => {
    expect((await provider.getBatchCosts([])).size).toBe(0);
  });

  it('按 material_code 解析库存物料移动加权平均成本', async () => {
    const m = await provider.getBatchCosts([{ id: 5, code: 'MAT005' }]);
    expect(m.get(5)).toBe(5);
  });

  it('按 ink_code 解析油墨主数据计划价', async () => {
    const m = await provider.getBatchCosts([{ id: 11, code: 'INK-BLK-001' }]);
    expect(m.get(11)).toBe(12.5);
  });

  it('id 与库存物料撞车时不得借用库存物料的成本（回归：静默成本错配）', async () => {
    // inv_material 中 id=10 是 MAT010（成本 8），而该条目的编码是油墨 INK-BLK-001
    const m = await provider.getBatchCosts([{ id: 10, code: 'INK-BLK-001' }]);
    expect(m.get(10)).toBe(12.5);
    expect(m.get(10)).not.toBe(8);
  });

  it('编码在两套主数据中都找不到时不写入 Map（如实暴露「缺失」）', async () => {
    // 复刻现网真实数据：31 条配方的 material_id=1、material_code='M-1'，
    // 而 inv_material.id=1 是 MAT001 —— 旧实现会把 MAT001 的成本算到 'M-1' 上
    const m = await provider.getBatchCosts([{ id: 1, code: 'M-1' }]);
    expect(m.has(1)).toBe(false);
    expect(m.size).toBe(0);
  });

  it('没有编码的条目退化为按 id 解析', async () => {
    const m = await provider.getBatchCosts([{ id: 10 }]);
    expect(m.get(10)).toBe(8);
  });

  it('混合批次各自独立解析', async () => {
    const m = await provider.getBatchCosts([
      { id: 5, code: 'MAT005' },
      { id: 10, code: 'INK-BLK-001' },
      { id: 1, code: 'M-1' },
    ]);
    expect(m.get(5)).toBe(5);
    expect(m.get(10)).toBe(12.5);
    expect(m.has(1)).toBe(false);
    expect(m.size).toBe(2);
  });

  it('查询条件排除 NULL 与 0 成本，避免把「无成本」伪装成「成本为零」', async () => {
    await provider.getBatchCosts([
      { id: 5, code: 'MAT005' },
      { id: 11, code: 'INK-BLK-001' },
    ]);
    const sqls = mockQuery.mock.calls.map((c) => String(c[0]));
    expect(
      sqls.some((s) => s.includes('weighted_avg_cost IS NOT NULL AND weighted_avg_cost > 0'))
    ).toBe(true);
    expect(sqls.some((s) => s.includes('unit_price IS NOT NULL AND unit_price > 0'))).toBe(true);
  });

  it('数据库查询异常不冒泡，降级为空 Map', async () => {
    mockQuery.mockRejectedValue(new Error('ER_BAD_FIELD_ERROR'));
    const m = await provider.getBatchCosts([{ id: 5, code: 'MAT005' }]);
    expect(m.size).toBe(0);
  });
});
