/**
 * color-diff — ΔE 色差计算纯函数单元测试
 *
 * 覆盖：
 * - calculateDeltaE（CIE76 公式）：相同色→0、已知值、小数位
 * - judgeDeltaE：阈值边界判定（≤ 阈值合格）
 */
import { describe, it, expect } from 'vitest';

import { calculateDeltaE, judgeDeltaE, extractSignColorLink } from '@/lib/color-diff';

describe('calculateDeltaE (CIE76)', () => {
  it('相同 Lab 值 → ΔE = 0', () => {
    expect(calculateDeltaE({ l: 50, a: 10, b: -5 }, { l: 50, a: 10, b: -5 })).toBe(0);
  });

  it('已知值：ΔL=2, Δa=1, Δb=2 → ΔE = 3', () => {
    // √(4 + 1 + 4) = 3
    expect(calculateDeltaE({ l: 52, a: 11, b: -3 }, { l: 50, a: 10, b: -5 })).toBeCloseTo(3, 4);
  });

  it('非整除结果保留 4 位小数：√3 → 1.7321', () => {
    expect(calculateDeltaE({ l: 1, a: 1, b: 1 }, { l: 0, a: 0, b: 0 })).toBe(1.7321);
  });

  it('符号无关：基准与实测互换结果一致', () => {
    const forward = calculateDeltaE({ l: 95, a: -2, b: 4 }, { l: 93, a: 0, b: 1 });
    const backward = calculateDeltaE({ l: 93, a: 0, b: 1 }, { l: 95, a: -2, b: 4 });
    expect(forward).toBe(backward);
  });
});

describe('judgeDeltaE', () => {
  it('ΔE < 阈值 → pass', () => {
    expect(judgeDeltaE(1.2, 1.5)).toBe('pass');
  });

  it('ΔE = 阈值 → pass（≤ 判合格）', () => {
    expect(judgeDeltaE(1.5, 1.5)).toBe('pass');
  });

  it('ΔE > 阈值 → fail', () => {
    expect(judgeDeltaE(1.51, 1.5)).toBe('fail');
  });
});

describe('extractSignColorLink（lab-test 编辑回显）', () => {
  it('detail_data 含 color_standard → 提取 id 与实测 Lab（转字符串）', () => {
    const detail = JSON.stringify({
      some: 'field',
      color_standard: {
        color_standard_id: 911,
        color_no: 'CS2026100400006',
        base_lab: { l: 45.2, a: 68.5, b: 42.1 },
        measured_lab: { l: 45.8, a: 67.9, b: 42.5 },
        delta_e: 0.8491,
        de_judge: 'pass',
      },
    });
    expect(extractSignColorLink(detail)).toEqual({
      color_standard_id: 911,
      measured_lab: { l: '45.8', a: '67.9', b: '42.5' },
    });
  });

  it('无 measured_lab → 仅返回 id', () => {
    const detail = JSON.stringify({
      color_standard: { color_standard_id: 912, base_lab: { l: 1, a: 2, b: 3 } },
    });
    expect(extractSignColorLink(detail)).toEqual({ color_standard_id: 912 });
  });

  it('无 color_standard 键 → color_standard_id 为 null', () => {
    expect(extractSignColorLink(JSON.stringify({ other: 1 }))).toEqual({ color_standard_id: null });
  });

  it('detail_data 为空/坏 JSON/非字符串 → color_standard_id 为 null', () => {
    expect(extractSignColorLink(null)).toEqual({ color_standard_id: null });
    expect(extractSignColorLink('')).toEqual({ color_standard_id: null });
    expect(extractSignColorLink('not-json{')).toEqual({ color_standard_id: null });
    expect(extractSignColorLink(123)).toEqual({ color_standard_id: null });
  });
});
