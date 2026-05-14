'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

interface GlassGaugeProps {
  value: number;
  min?: number;
  max?: number;
  size?: number;
  label?: string;
  unit?: string;
  colorArc?: string;
  colorDanger?: string;
  colorSafe?: string;
  dangerStart?: number;
  showCurve?: boolean;
  history?: number[];
  animate?: boolean;
}

export default function GlassGauge({
  value,
  min = 0,
  max = 100,
  size = 160,
  label,
  unit = '%',
  colorArc = '#1fcfff',
  colorDanger = '#ff5555',
  colorSafe = '#15ffbb',
  dangerStart = 80,
  showCurve = false,
  history = [],
  animate = true,
}: GlassGaugeProps) {
  const [displayVal, setDisplayVal] = useState(animate ? 0 : value);
  const animRef = useRef<number>(0);
  const currentRef = useRef(animate ? 0 : value);

  useEffect(() => {
    if (!animate) {
      setDisplayVal(value);
      currentRef.current = value;
      return;
    }
    const step = () => {
      const diff = value - currentRef.current;
      if (Math.abs(diff) < 0.3) {
        currentRef.current = value;
        setDisplayVal(value);
        return;
      }
      currentRef.current += diff * 0.08;
      setDisplayVal(currentRef.current);
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, [value, animate]);

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 14;
  const startAngle = -225;
  const totalSweep = 270;
  const pct = Math.max(0, Math.min(1, (displayVal - min) / (max - min)));
  const sweepAngle = pct * totalSweep;

  const polarToCart = useCallback(
    (angle: number, radius: number) => {
      const rad = (angle - 90) * (Math.PI / 180);
      return {
        x: Math.round((cx + radius * Math.cos(rad)) * 1e10) / 1e10,
        y: Math.round((cy + radius * Math.sin(rad)) * 1e10) / 1e10,
      };
    },
    [cx, cy]
  );

  const arcPath = (start: number, sweep: number, radius: number) => {
    if (sweep <= 0.1) return '';
    const s = polarToCart(start, radius);
    const e = polarToCart(start + sweep, radius);
    const large = sweep > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 1 ${e.x} ${e.y}`;
  };

  const dangerPct = (dangerStart - min) / (max - min);
  const dangerAngle = dangerPct * totalSweep;

  const tickCount = 27;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const angle = startAngle + (i / tickCount) * totalSweep;
    const isMajor = i % 3 === 0;
    const innerR = isMajor ? r - 10 : r - 7;
    const inner = polarToCart(angle, innerR);
    const outer = polarToCart(angle, r - 2);
    const tickPct = i / tickCount;
    const inDanger = tickPct >= dangerPct;
    const isActive = tickPct <= pct;
    return { inner, outer, isMajor, inDanger, isActive, key: i, tickPct };
  });

  const pointerAngle = startAngle + sweepAngle;
  const pointerTip = polarToCart(pointerAngle, r - 16);
  const pointerBase1 = polarToCart(pointerAngle - 4, 8);
  const pointerBase2 = polarToCart(pointerAngle + 4, 8);

  const curveH = showCurve ? 32 : 0;
  const totalH = size + curveH + 8;
  const curveY = size;

  const id = `gauge-${colorArc.replace('#', '')}-${size}`;

  const curveSvg = (() => {
    if (!showCurve || history.length < 2) return null;
    const curveW = size - 28;
    const maxV = Math.max(...history, 1);
    const minV = Math.min(...history, 0);
    const range = maxV - minV || 1;
    const pts = history
      .map((v, i) => {
        const x = 14 + (i / (history.length - 1)) * curveW;
        const y = curveY + curveH - ((v - minV) / range) * (curveH - 6) - 3;
        return `${x},${y}`;
      })
      .join(' ');
    const areaPts = `14,${curveY + curveH} ${pts} ${14 + curveW},${curveY + curveH}`;
    return (
      <svg
        viewBox={`0 0 ${size} ${totalH}`}
        width={size}
        height={totalH}
        className="absolute inset-0 pointer-events-none"
      >
        <defs>
          <linearGradient id={`${id}-curve-grad`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colorArc} stopOpacity="0.3" />
            <stop offset="100%" stopColor={colorArc} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={areaPts} fill={`url(#${id}-curve-grad)`} />
        <polyline
          points={pts}
          fill="none"
          stroke={colorArc}
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
          opacity="0.7"
        />
      </svg>
    );
  })();

  return (
    <div className="relative flex flex-col items-center" style={{ width: size, height: totalH }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <radialGradient id={`${id}-bg`} cx="45%" cy="40%" r="55%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.2)" />
          </radialGradient>
          <filter id={`${id}-glow`}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.03)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
          </linearGradient>
          <filter id={`${id}-pointer-shadow`}>
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="rgba(0,0,0,0.5)" />
          </filter>
        </defs>

        <circle
          cx={cx}
          cy={cy}
          r={r + 4}
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="5"
        />
        <circle cx={cx} cy={cy} r={r + 1} fill={`url(#${id}-bg)`} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={`url(#${id}-rim)`} strokeWidth="1" />

        <path
          d={arcPath(startAngle, totalSweep, r - 5)}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {dangerAngle < totalSweep && (
          <path
            d={arcPath(startAngle + dangerAngle, totalSweep - dangerAngle, r - 5)}
            fill="none"
            stroke={colorDanger}
            strokeWidth="6"
            strokeLinecap="round"
            opacity="0.2"
          />
        )}

        <path
          d={arcPath(startAngle, Math.min(sweepAngle, dangerAngle), r - 5)}
          fill="none"
          stroke={colorSafe}
          strokeWidth="6"
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${colorSafe}60)` }}
        />

        {sweepAngle > dangerAngle && (
          <path
            d={arcPath(startAngle + dangerAngle, sweepAngle - dangerAngle, r - 5)}
            fill="none"
            stroke={colorDanger}
            strokeWidth="6"
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${colorDanger}80)` }}
          />
        )}

        {ticks.map((t) => {
          let color = 'rgba(255,255,255,0.12)';
          if (t.isActive && !t.inDanger) color = colorSafe;
          else if (t.isActive && t.inDanger) color = colorDanger;
          else if (t.inDanger) color = `${colorDanger}40`;
          return (
            <line
              key={t.key}
              x1={t.inner.x}
              y1={t.inner.y}
              x2={t.outer.x}
              y2={t.outer.y}
              stroke={color}
              strokeWidth={t.isMajor ? 1.5 : 0.7}
              strokeLinecap="round"
            />
          );
        })}

        {ticks
          .filter((t) => t.isMajor)
          .map((t, i) => {
            const labelR = r - 18;
            const pos = polarToCart(startAngle + t.tickPct * totalSweep, labelR);
            const val = Math.round(min + t.tickPct * (max - min));
            return (
              <text
                key={`lbl-${i}`}
                x={pos.x}
                y={pos.y + 3}
                textAnchor="middle"
                fill="rgba(255,255,255,0.3)"
                fontSize="7"
                fontFamily="monospace"
              >
                {val}
              </text>
            );
          })}

        <polygon
          points={`${pointerTip.x},${pointerTip.y} ${pointerBase1.x},${pointerBase1.y} ${pointerBase2.x},${pointerBase2.y}`}
          fill={pct >= dangerPct ? colorDanger : colorArc}
          filter={`url(#${id}-pointer-shadow)`}
          style={{ transition: 'fill 0.3s' }}
        />

        <circle
          cx={cx}
          cy={cy}
          r="5"
          fill="rgba(0,0,0,0.5)"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1"
        />
        <circle cx={cx - 1} cy={cy - 1} r="1.5" fill="rgba(255,255,255,0.12)" />

        <ellipse
          cx={cx}
          cy={cy - r * 0.3}
          rx={r * 0.4}
          ry={r * 0.15}
          fill="rgba(255,255,255,0.03)"
        />

        <text
          x={cx}
          y={cy + 22}
          textAnchor="middle"
          fill="white"
          fontSize="18"
          fontWeight="bold"
          fontFamily="monospace"
        >
          {Math.round(displayVal)}
        </text>
        <text
          x={cx}
          y={cy + 34}
          textAnchor="middle"
          fill="rgba(255,255,255,0.4)"
          fontSize="9"
          fontFamily="monospace"
        >
          {unit}
        </text>

        {label && (
          <text x={cx} y={cy + 48} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="8">
            {label}
          </text>
        )}
      </svg>

      {curveSvg}
    </div>
  );
}
