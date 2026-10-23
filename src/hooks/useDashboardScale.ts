'use client';

import { useEffect, useState } from 'react';

/**
 * 仪表盘大屏自适应缩放
 *
 * ── 为什么必须用 JS 而非纯 CSS ──────────────────────────────
 * 仪表盘页面大量使用 **px 硬编码**（`text-[10px]` / `h-[140px]` / `w-[300px]` /
 * `gap-1.5` 之外的任意像素值）。Tailwind 的 rem 方案对这些无效，
 * 容器查询单位 `cqw` 也无法直接喂给 `zoom`（zoom 只接受无单位数值）。
 * 因此在 JS 里算出比例，写进 `--dash-zoom`，由 CSS 的 `.dash-zoom { zoom: var(...) }` 落地。
 *
 * ── 为什么用 `zoom` 而不是 `transform: scale()` ─────────────
 * `transform: scale()` 只是**视觉**缩放：布局盒尺寸不变、父容器高度不跟随、
 * `position: absolute` 的定位基准也不变 → 大屏下会出现大片留白与错位。
 * `zoom` 会触发**真实重排**：`min-h-full` / flex / grid / 图表全部按缩放后的
 * 尺寸重新计算，正好是「等比放大到刚好填满」的语义。
 *
 * ── 为什么基准用 `window.innerWidth` 而不是容器宽度 ─────────
 * 容器宽度（`clientWidth`）在 `zoom` 生效后本身就被缩放了，用它计算会形成
 * 「测量 → 缩放 → 测量值变化 → 再缩放」的正反馈，比例会来回跳。
 * 视口宽度不受 `zoom` 影响，是稳定量。
 *
 * 基准 1920 = 现有设计的出稿宽度：视口正好 1920 时 scale=1（与现状完全一致，
 * 不改变任何已有观感），只有更宽的屏才放大。
 */

export interface DashboardScaleOptions {
  /** 设计稿基准视口宽度（px）。默认 1920。低于此宽度不放大。 */
  designWidth?: number;
  /** 缩放下限，默认 1（不缩小，避免笔记本端内容过密）。 */
  min?: number;
  /** 缩放上限，默认 2（4K 屏最多放大到 2 倍，再大字体会糊）。 */
  max?: number;
  /** 开关，默认 true。关掉后恒为 `min`。 */
  enabled?: boolean;
}

/** 保留三位小数：避免 1.3333… 这种值引起无意义的重排抖动 */
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * 返回当前应使用的缩放比例，直接 spread 到页面根容器的 `style` 上：
 * `style={{ zoom: scale }}`
 */
export function useDashboardScale(options: DashboardScaleOptions = {}): number {
  const { designWidth = 1920, min = 1, max = 2, enabled = true } = options;

  const [scale, setScale] = useState(min);

  useEffect(() => {
    if (!enabled) {
      setScale(min);
      return;
    }

    const compute = () => {
      const vw = typeof window === 'undefined' ? designWidth : window.innerWidth;
      const next = Math.min(max, Math.max(min, vw / designWidth));
      setScale((prev) => (prev === next ? prev : round3(next)));
    };

    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [designWidth, min, max, enabled]);

  return scale;
}

/**
 * CSS 变量形式，供不方便内联 style 的场景使用。
 * 返回 `{ '--dash-zoom': scale }`，配合 `.dash-zoom` 类使用。
 */
export function useDashboardScaleVar(options: DashboardScaleOptions = {}): {
  '--dash-zoom': number;
} {
  const scale = useDashboardScale(options);
  return { '--dash-zoom': scale };
}

export default useDashboardScale;
