import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * 物料分类强制校验单元测试（对应文档 IT-IN-002）
 * 通过 mock @/lib/db 与 CalcParamService，验证 checkMaterialsCategorized 的阻断策略：
 *   - category.require_on_business = false → 仅提示（blocked=false）
 *   - category.require_on_business = true  → 阻断提交（blocked=true）
 */
vi.mock('@/lib/db', () => ({ query: vi.fn() }));
vi.mock('@/lib/calc-param-service', () => ({
  CalcParamService: {
    getBoolean: vi.fn(),
    getString: vi.fn(),
    getInt: vi.fn(),
  },
}));

import { query } from '@/lib/db';
import { CalcParamService } from '@/lib/calc-param-service';
import { checkMaterialsCategorized } from '@/lib/category-validation';

describe('物料分类强制校验 (IT-IN-002)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('空物料列表 → 不阻断、不查库', async () => {
    const r = await checkMaterialsCategorized([]);
    expect(r.blocked).toBe(false);
    expect(r.uncategorized).toHaveLength(0);
    expect(query).not.toHaveBeenCalled();
  });

  it('存在未归类物料 + 仅提示配置 → blocked=false，提示文案', async () => {
    vi.mocked(CalcParamService.getBoolean).mockResolvedValue(false);
    vi.mocked(query).mockResolvedValue([
      { id: 1, material_code: 'M1', material_name: '物料1' },
    ] as never);
    const r = await checkMaterialsCategorized([1, 2]);
    expect(r.blocked).toBe(false);
    expect(r.uncategorized).toHaveLength(1);
    expect(r.message).toMatch(/提示/);
  });

  it('存在未归类物料 + 强制配置 → blocked=true，阻断文案', async () => {
    vi.mocked(CalcParamService.getBoolean).mockResolvedValue(true);
    vi.mocked(query).mockResolvedValue([
      { id: 1, material_code: 'M1', material_name: '物料1' },
    ] as never);
    const r = await checkMaterialsCategorized([1]);
    expect(r.blocked).toBe(true);
    expect(r.message).toMatch(/无法提交业务单据/);
  });

  it('全部已归类 → 不阻断', async () => {
    vi.mocked(CalcParamService.getBoolean).mockResolvedValue(true);
    vi.mocked(query).mockResolvedValue([] as never);
    const r = await checkMaterialsCategorized([1, 2, 3]);
    expect(r.blocked).toBe(false);
    expect(r.uncategorized).toHaveLength(0);
  });
});
