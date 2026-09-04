'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 纵向无缝无限循环滚动（垂直跑马灯 / vertical marquee）
 *
 * 实现要点：
 *  1. 内容渲染**两份**，整体从 translateY(0) 平移到 translateY(-50%)，
 *     到达终点时第一份的末尾正好接上第二份的开头 → 视觉完全无缝、无跳变。
 *  2. 用 **CSS transform 动画**（GPU 合成层），不用逐帧改 scrollTop
 *     （后者会触发重排，数据量大时明显掉帧）。
 *  3. **速度恒定**：按内容实际高度换算 duration（px/s），
 *     避免内容多少不同导致快慢差异。
 *  4. 悬停暂停用 `animationPlayState: 'paused'`（保留当前位置），
 *     而不是销毁重建动画 —— 后者会导致位置归零、视觉跳回顶部。
 *  5. 内容不足一屏时**自动停止滚动**，且只渲染一份（避免无意义留白）。
 *  6. 尊重 `prefers-reduced-motion`：用户关闭动效时不滚动。
 */
export interface VerticalMarqueeProps {
  children: React.ReactNode;
  /** 可视区最大高度（px），默认 320 */
  maxHeight?: number;
  /** 滚动速度：像素/秒，默认 30 */
  speed?: number;
  /** 鼠标悬停时暂停，默认 true */
  pauseOnHover?: boolean;
  className?: string;
  /** 顶部/底部渐隐遮罩，默认 true */
  fadeEdges?: boolean;
}

export function VerticalMarquee({
  children,
  maxHeight = 320,
  speed = 30,
  pauseOnHover = true,
  className = '',
  fadeEdges = true,
}: VerticalMarqueeProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  // 内容异步加载/尺寸变化时重新测量（数据从接口回来后高度才会确定）
  const measure = useCallback(() => {
    const el = contentRef.current;
    if (el) setContentHeight(el.scrollHeight);
  }, []);

  useEffect(() => {
    measure();
    const el = contentRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, children]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const shouldScroll = !reduceMotion && contentHeight > maxHeight;
  const duration = contentHeight > 0 ? contentHeight / speed : 0;

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ maxHeight: `${maxHeight}px` }}
      onMouseEnter={pauseOnHover ? () => setPaused(true) : undefined}
      onMouseLeave={pauseOnHover ? () => setPaused(false) : undefined}
    >
      <div
        className="[animation-name:marquee-vertical] [animation-timing-function:linear] [animation-iteration-count:infinite]"
        style={
          shouldScroll
            ? {
                animationDuration: `${duration}s`,
                animationPlayState: paused ? 'paused' : 'running',
              }
            : { animationName: 'none' }
        }
      >
        {/* 第一份：用于测量真实高度，也是用户实际看到的内容 */}
        <div ref={contentRef}>{children}</div>
        {/*
          第二份：必须与第一份等高占位，translateY(-50%) 才等于「上移一份内容高度」。
          到达终点时第二份的开头恰好对齐容器顶部，视觉上等价于第一份的开头 → 无缝衔接。
          仅当需要滚动时渲染，内容不足一屏时不产生额外留白。
          两份位于不同父节点，children 内的 key 互不冲突。
        */}
        {shouldScroll && <div aria-hidden="true">{children}</div>}
      </div>

      {/* 上下渐隐遮罩，弱化裁切感 */}
      {fadeEdges && shouldScroll && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-[#0a1628] to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-[#0a1628] to-transparent" />
        </>
      )}
    </div>
  );
}

export default VerticalMarquee;
