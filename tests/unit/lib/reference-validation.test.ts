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
  assertCustomerExists,
  assertSalesOrderExists,
  assertDeliveryExists,
  assertWorkOrderExists,
  assertAllMaterialsExist,
  assertMaterialSplittable,
  assertMaterialByCode,
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

describe('assertCustomerExists', () => {
  it('命中返回 customer_name（来自 crm_customer）', async () => {
    mockQuery.mockResolvedValue([{ id: 7, customer_name: '客户甲' }] as any);
    const row = await assertCustomerExists(7);
    expect(row.customer_name).toBe('客户甲');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('FROM crm_customer WHERE id = ? AND deleted = 0'),
      [7]
    );
  });

  it('缺失：抛 400', async () => {
    mockQuery.mockResolvedValue([] as any);
    await expect(assertCustomerExists(404)).rejects.toThrow(/不存在或已删除/);
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

describe('assertMaterialSplittable (#21 分切物料类型限制)', () => {
  it('is_splittable=1：通过，不抛错', () => {
    expect(() =>
      assertMaterialSplittable({ id: 10, materialName: 'BOPP薄膜', isSplittable: 1 })
    ).not.toThrow();
  });

  it('is_splittable=0：抛 400 并点名物料', () => {
    expect(() =>
      assertMaterialSplittable({ id: 11, materialName: '胶水', isSplittable: 0 })
    ).toThrow(/该物料【胶水】不允许分切/);
  });

  it('flag 为 null/undefined：视为不可切，抛 400', () => {
    expect(() =>
      assertMaterialSplittable({ id: 12, materialName: '未知料', isSplittable: null })
    ).toThrow(/不允许分切/);
    expect(() =>
      assertMaterialSplittable({ id: 13, materialName: '未知料', isSplittable: undefined })
    ).toThrow(/不允许分切/);
  });

  it('物料整体不存在（undefind）：提示母料物料不存在', () => {
    expect(() => assertMaterialSplittable(undefined)).toThrow(/母料对应的物料不存在/);
  });
});

describe('assertMaterialByCode（按物料编码查重）', () => {
  it('空编码：直接抛 400，不查库', async () => {
    await expect(assertMaterialByCode('')).rejects.toThrow(/物料编码为空/);
    await expect(assertMaterialByCode(undefined)).rejects.toThrow(/物料编码为空/);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('命中：返回 material_code / material_name', async () => {
    mockQuery.mockResolvedValue([{ material_code: 'M001', material_name: 'BOPP' }] as any);
    const row = await assertMaterialByCode('M001');
    expect(row.material_name).toBe('BOPP');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("FROM inv_material WHERE material_code = ? AND deleted = 0"),
      ['M001']
    );
  });

  it('缺失/已软删：抛 400', async () => {
    mockQuery.mockResolvedValue([] as any);
    await expect(assertMaterialByCode('NO_SUCH')).rejects.toThrow(/不存在或已删除/);
  });
});

describe('assertSalesOrderExists (#深层服务守卫扩展)', () => {
  it('命中返回 order_no（来自 sal_order）', async () => {
    mockQuery.mockResolvedValue([{ id: 3, order_no: 'SO-001' }] as any);
    const row = await assertSalesOrderExists(3);
    expect(row.order_no).toBe('SO-001');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('FROM sal_order WHERE id = ? AND deleted = 0'),
      [3]
    );
  });

  it('缺失：抛 400', async () => {
    mockQuery.mockResolvedValue([] as any);
    await expect(assertSalesOrderExists(404)).rejects.toThrow(/不存在或已删除/);
  });
});

describe('assertDeliveryExists (#深层服务守卫扩展)', () => {
  it('命中返回 delivery_no（来自 sal_delivery）', async () => {
    mockQuery.mockResolvedValue([{ id: 4, delivery_no: 'DN-001' }] as any);
    const row = await assertDeliveryExists(4);
    expect(row.delivery_no).toBe('DN-001');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('FROM sal_delivery WHERE id = ? AND deleted = 0'),
      [4]
    );
  });

  it('缺失：抛 400', async () => {
    mockQuery.mockResolvedValue([] as any);
    await expect(assertDeliveryExists(404)).rejects.toThrow(/不存在或已删除/);
  });
});

describe('assertWorkOrderExists (#深层服务守卫扩展)', () => {
  it('命中返回 work_order_no（来自 prod_work_order）', async () => {
    mockQuery.mockResolvedValue([{ id: 5, work_order_no: 'WO-001' }] as any);
    const row = await assertWorkOrderExists(5);
    expect(row.work_order_no).toBe('WO-001');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('FROM prod_work_order WHERE id = ? AND deleted = 0'),
      [5]
    );
  });

  it('缺失：抛 400', async () => {
    mockQuery.mockResolvedValue([] as any);
    await expect(assertWorkOrderExists(404)).rejects.toThrow(/不存在或已删除/);
  });
});
