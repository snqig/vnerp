import { describe, it, expect } from 'vitest';
import { guillotineCut, type CuttingInput } from '@/lib/cutting-optimizer';

/**
 * 切料排样算法单元测试（对应文档 CALC-015 / 016 整料拆分的数学不变量）
 * 纯算法，无数据库依赖。
 */
function piece(id: string, width: number, height: number, quantity: number): CuttingInput {
  return { id, width, height, quantity, label: `${width}x${height}`, rotate: false };
}

describe('切料排样算法 (CALC-015 / 016)', () => {
  it('单个 30x30 件放入 100x100 母料 → 1 张、1 切、利用率 0.09', () => {
    const res = guillotineCut([piece('p1', 30, 30, 1)], 100, 100);
    expect(res.total_sheets).toBe(1);
    expect(res.sheets[0].cuts).toHaveLength(1);
    expect(res.sheets[0].cuts[0]).toMatchObject({ width: 30, height: 30 });
    expect(res.overall_utilization).toBeCloseTo(0.09, 5);
  });

  it('多个相同件全部放入 → 切数等于需求数', () => {
    const res = guillotineCut([piece('p1', 30, 30, 3)], 100, 100);
    const placed = res.sheets.reduce((s, sh) => s + sh.cuts.length, 0);
    expect(placed).toBe(3);
  });

  it('件大于母料 → 无法放置，进入 unplaced', () => {
    const res = guillotineCut([piece('big', 200, 200, 1)], 100, 100);
    expect(res.unplaced_items).toHaveLength(1);
    expect(res.unplaced_items[0].remaining_qty).toBe(1);
  });

  it('整料拆分后：已放置面积 = Σ小料面积，余料 = 母料面积 - 已放置', () => {
    const res = guillotineCut([piece('a', 20, 100, 1), piece('b', 30, 100, 1)], 100, 100);
    const placedArea = res.sheets.reduce((s, sh) => s + sh.utilized_area, 0);
    const expected = 20 * 100 + 30 * 100;
    expect(placedArea).toBe(expected);
    const waste = res.sheets.reduce((s, sh) => s + sh.waste_area, 0);
    expect(waste).toBe(100 * 100 - expected);
  });
});
