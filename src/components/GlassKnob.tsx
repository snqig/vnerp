'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';

interface GlassKnobProps {
  value?: number;
  min?: number;
  max?: number;
  size?: number;
  accent?: string;
  onChange?: (v: number) => void;
  label?: string;
  damping?: number;
  stiffness?: number;
}

export default function GlassKnob({
  value = 50,
  min = 0,
  max = 100,
  size = 100,
  accent = '#22d3ee',
  onChange,
  label,
  damping = 0.65,
  stiffness = 0.12,
}: GlassKnobProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState(false);
  const [scale, setScale] = useState(1);
  const animRef = useRef<number>(0);
  const velocityRef = useRef(0);
  const displayAngleRef = useRef(((value - min) / (max - min)) * 270 - 135);
  const targetAngleRef = useRef(((value - min) / (max - min)) * 270 - 135);
  const lastAngleRef = useRef(0);
  const lastTimeRef = useRef(0);

  const valueToAngle = useCallback(
    (v: number) => ((v - min) / (max - min)) * 270 - 135,
    [min, max]
  );

  useEffect(() => {
    targetAngleRef.current = valueToAngle(value);
  }, [value, valueToAngle]);

  useEffect(() => {
    const animate = () => {
      const diff = targetAngleRef.current - displayAngleRef.current;
      velocityRef.current = velocityRef.current * damping + diff * stiffness;
      displayAngleRef.current += velocityRef.current;

      if (Math.abs(diff) < 0.05 && Math.abs(velocityRef.current) < 0.05) {
        displayAngleRef.current = targetAngleRef.current;
        velocityRef.current = 0;
      }

      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [damping, stiffness]);

  const getAngleFromEvent = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return 0;
    const rect = svg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let angle = Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI) + 90;
    if (angle < -180) angle += 360;
    if (angle > 180) angle -= 360;
    return Math.max(-135, Math.min(135, angle));
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setDragging(true);
      setScale(1.06);
      lastAngleRef.current = getAngleFromEvent(e.clientX, e.clientY);
      lastTimeRef.current = Date.now();
      velocityRef.current = 0;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [getAngleFromEvent]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const angle = getAngleFromEvent(e.clientX, e.clientY);
      const now = Date.now();
      const dt = Math.max(now - lastTimeRef.current, 1);
      const delta = angle - lastAngleRef.current;

      if (Math.abs(delta) < 30) {
        const newAngle = Math.max(-135, Math.min(135, displayAngleRef.current + delta));
        displayAngleRef.current = newAngle;
        targetAngleRef.current = newAngle;
        velocityRef.current = (delta / dt) * 16;

        const pct = (newAngle + 135) / 270;
        const newVal = Math.round(min + pct * (max - min));
        onChange?.(newVal);
      }

      lastAngleRef.current = angle;
      lastTimeRef.current = now;
    },
    [dragging, getAngleFromEvent, min, max, onChange]
  );

  const handlePointerUp = useCallback(() => {
    setDragging(false);
    setScale(1);
  }, []);

  const displayAngle = displayAngleRef.current;
  const pct = (value - min) / (max - min);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 10;
  const startAngle = -135;
  const arcAngle = pct * 270;

  const polarToCart = (angle: number, radius: number) => {
    const rad = (angle - 90) * (Math.PI / 180);
    return {
      x: Math.round((cx + radius * Math.cos(rad)) * 1e10) / 1e10,
      y: Math.round((cy + radius * Math.sin(rad)) * 1e10) / 1e10,
    };
  };

  const arcPath = (start: number, sweep: number, radius: number) => {
    if (sweep <= 0) return '';
    const s = polarToCart(start, radius);
    const e = polarToCart(start + sweep, radius);
    const large = sweep > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 1 ${e.x} ${e.y}`;
  };

  const tickCount = 27;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const angle = startAngle + (i / tickCount) * 270;
    const inner = polarToCart(angle, r - 6);
    const outer = polarToCart(angle, r - 2);
    const active = angle <= startAngle + arcAngle;
    return { inner, outer, active, key: i };
  });

  const pointerEnd = polarToCart(displayAngle, r - 14);
  const glowPos = polarToCart(displayAngle, r - 20);

  const id = `knob-${accent.replace('#', '')}-${size}`;

  return (
    <div className="flex flex-col items-center select-none" style={{ width: size }}>
      <svg
        ref={svgRef}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="cursor-grab active:cursor-grabbing"
        style={{
          transform: `scale(${scale})`,
          transition: 'transform 0.15s cubic-bezier(.22,1,.36,1)',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <defs>
          <radialGradient id={`${id}-bg`} cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.25)" />
          </radialGradient>
          <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={accent} stopOpacity="0.6" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </radialGradient>
          <filter id={`${id}-shadow`} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="rgba(0,0,0,0.5)" />
          </filter>
          <filter id={`${id}-inner-shadow`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
            <feOffset dx="0" dy="1" result="offsetBlur" />
            <feComposite in="SourceGraphic" in2="offsetBlur" operator="over" />
          </filter>
          <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.05)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.12)" />
          </linearGradient>
        </defs>

        <circle
          cx={cx}
          cy={cy}
          r={r + 2}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="3"
        />
        <circle cx={cx} cy={cy} r={r} fill={`url(#${id}-bg)`} filter={`url(#${id}-shadow)`} />
        <circle
          cx={cx}
          cy={cy}
          r={r - 1}
          fill="none"
          stroke={`url(#${id}-rim)`}
          strokeWidth="1.5"
        />

        <path
          d={arcPath(startAngle, 270, r - 4)}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d={arcPath(startAngle, arcAngle, r - 4)}
          fill="none"
          stroke={accent}
          strokeWidth="4"
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${accent}80)` }}
        />

        {ticks.map((t) => (
          <line
            key={t.key}
            x1={t.inner.x}
            y1={t.inner.y}
            x2={t.outer.x}
            y2={t.outer.y}
            stroke={t.active ? accent : 'rgba(255,255,255,0.15)'}
            strokeWidth={t.key % 3 === 0 ? 1.5 : 0.8}
            strokeLinecap="round"
            style={t.active ? { filter: `drop-shadow(0 0 2px ${accent}60)` } : undefined}
          />
        ))}

        <line
          x1={cx}
          y1={cy}
          x2={pointerEnd.x}
          y2={pointerEnd.y}
          stroke={accent}
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${accent})` }}
        />
        <circle
          cx={pointerEnd.x}
          cy={pointerEnd.y}
          r="3"
          fill={accent}
          style={{ filter: `drop-shadow(0 0 6px ${accent})` }}
        />

        <circle
          cx={glowPos.x}
          cy={glowPos.y}
          r="8"
          fill={`url(#${id}-glow)`}
          opacity={dragging ? 0.8 : 0.4}
        />

        <circle
          cx={cx}
          cy={cy}
          r="6"
          fill="rgba(0,0,0,0.4)"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1"
        />
        <circle cx={cx - 1.5} cy={cy - 1.5} r="2" fill="rgba(255,255,255,0.15)" />

        <ellipse
          cx={cx}
          cy={cy - r * 0.35}
          rx={r * 0.45}
          ry={r * 0.18}
          fill="rgba(255,255,255,0.04)"
        />
      </svg>
      {label && <div className="text-xs text-white/40 mt-1 tracking-wide">{label}</div>}
    </div>
  );
}
