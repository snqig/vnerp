/**
 * reference-validation 单元测试
 * 覆盖：存在性断言（命中/缺失/非法 id）、批量物料校验（过滤 0、缺漏列出、空集合）。
 * 通过 mock @/lib/db 的 query 模拟不同返回，断言抛错信息或返回行。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
}));

import { query } from '@/lib/db';
import {
  assertEntityExists,
  assertWarehouseExists,
  assertMaterialExists,
  assertSupplierExists,
  assertAllMaterialsExist,
} from '@/lib/reference-validation';

const mockQuery = vi.mocked(query);

beforeEach(() => {
  mockQuery.mockReset();
});

describe('assertEntityExists', () => {
  it('命中：返回匹配首行（含 nameColumn）', async () => {
    mockQuery.mockResolvedValue([{ id: 1, warehouse_name: '主仓库' }] as any);
    const row = await assertWarehouseExists(1);
    expect(row.warehouse_name).toBe('主仓库');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('FROM inv_warehouse WHERE id = ? AND deleted = 0'),
      [1]
    );
  });

  it('缺失：抛 400 并提示实体不存在或已删除', async () => {
    mockQuery.mockResolvedValue([] as any);
    await expect(assertWarehouseExists(999)).rejects.toThrow(/不存在或已删除/);
  });

  it('非法 id（<=0 / 非整数）：直接抛 400，不查库', async () => {
    await expect(assertWarehouseExists(0)).rejects.toThrow(/ID非法/);
    await expect(assertWarehouseExists(-3)).rejects.toThrow(/ID非法/);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('软删除行视为不存在', async () => {
    // deleted=0 过滤后无行
    mockQuery.mockResolvedValue([] as any);
    await expect(assertMaterialExists(5)).rejects.toThrow(/不存在或已删除/);
  });
});

describe('assertSupplierExists', () => {
  it('命中返回 supplier_name', async () => {
    mockQuery.mockResolvedValue([{ id: 2, supplier_name: '供应商A' }] as any);
    const row = await assertSupplierExists(2);
    expect(row.supplier_name).toBe('供应商A');
  });
});

describe('assertAllMaterialsExist', () => {
  it('自动过滤 material_id<=0（自由录入允许为 0），不查库', async () => {
    await assertAllMaterialsExist([0, null, undefined, -1]);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('全部存在：单次往返，通过', async () => {
    mockQuery.mockResolvedValue([{ id: 1 }, { id: 2 }] as any);
    await expect(assertAllMaterialsExist([1, 2, 1])).resolves.toBeUndefined();
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('部分缺失：列出缺失的 ID（最多 10 个）', async () => {
    mockQuery.mockResolvedValue([{ id: 1 }] as any);
    await expect(assertAllMaterialsExist([1, 99])).rejects.toThrow(/以下物料不存在或已删除：99/);
  });

  it('空集合：直接通过', async () => {
    await assertAllMaterialsExist([]);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
