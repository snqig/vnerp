'use client';

import { authFetch } from '@/lib/auth-fetch';
import { MainLayout } from '@/components/layout';
import { useEffect, useState, useRef } from 'react';
import {
  Package,
  Factory,
  AlertTriangle,
  DollarSign,
  ShoppingCart,
  Activity,
  CheckCircle2,
  Cpu,
  Maximize,
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

/* ═══ 数据接口 ═══ */
interface CEOData {
  overview: {
    todayOrders: number;
    todayProduction: number;
    todayDelivery: number;
    inventoryValue: number;
    orderChange: number;
    productionChange: number;
    deliveryChange: number;
    inventoryChange: number;
  };
  production: {
    efficiency: number;
    activeOrders: number;
    completedToday: number;
    warningCount: number;
    equipmentStatus: { name: string; status: string; efficiency: number }[];
    activeWorkOrders?: {
      work_order_no: string;
      product_name: string;
      customer_name: string;
      status: string;
      priority: string;
    }[];
  };
  quality: {
    passRate: number;
    totalInspections: number;
    passedInspections: number;
    failedInspections: number;
    recentDefects: { product_name?: string; defect_type?: string; quantity?: number }[];
  };
  finance: {
    totalReceivable: number;
    totalPayable: number;
    monthRevenue: number;
    monthExpense: number;
    revenueChange: number;
    expenseChange: number;
  };
  inventory: {
    totalItems: number;
    lowStock: number;
    totalValue: number;
    warehouseUtilization: number;
  };
  orderTrend: { date: string; count: number }[];
  topProducts: { product_name: string; total_qty: number }[];
  shiftData: {
    dayShift: { plan: number; actual: number; rate: number };
    middleShift: { plan: number; actual: number; rate: number };
    nightShift: { plan: number; actual: number; rate: number };
  };
}

const emptyData: CEOData = {
  overview: { todayOrders: 0, todayProduction: 0, todayDelivery: 0, inventoryValue: 0, orderChange: 0, productionChange: 0, deliveryChange: 0, inventoryChange: 0 },
  production: { efficiency: 0, activeOrders: 0, completedToday: 0, warningCount: 0, equipmentStatus: [], activeWorkOrders: [] },
  quality: { passRate: 0, totalInspections: 0, passedInspections: 0, failedInspections: 0, recentDefects: [] },
  finance: { totalReceivable: 0, totalPayable: 0, monthRevenue: 0, monthExpense: 0, revenueChange: 0, expenseChange: 0 },
  inventory: { totalItems: 0, lowStock: 0, totalValue: 0, warehouseUtilization: 0 },
  orderTrend: [],
  topProducts: [],
  shiftData: {
    dayShift: { plan: 0, actual: 0, rate: 0 },
    middleShift: { plan: 0, actual: 0, rate: 0 },
    nightShift: { plan: 0, actual: 0, rate: 0 },
  },
};

/* ═══ 主题色 ═══ */
const C = {
  bg: '#0A1E3D',
  silver: '#C0D0E0',
  orange: '#FF6B35',
  cyan: '#22d3ee',
  blue: '#3b82f6',
  green: '#22c55e',
  red: '#ef4444',
  amber: '#f59e0b',
};

/* ═══ 玻璃卡片 ═══ */
function GlassPanel({
  title,
  icon: Icon,
  children,
  accent = C.cyan,
  className = '',
}: {
  title: string;
  icon: Loose;
  children: React.ReactNode;
  accent?: string;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(10,30,61,0.85) 0%, rgba(5,15,35,0.9) 100%)',
        border: `1px solid ${C.silver}22`,
        borderRadius: '12px',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* 顶部光带 */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />
      {/* 标题栏 */}
      <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: `1px solid ${C.silver}11` }}>
        <div className="w-1 h-4 rounded-full" style={{ background: accent, boxShadow: `0 0 8px ${accent}` }} />
        <Icon className="h-4 w-4" style={{ color: accent }} />
        <span className="text-sm font-medium" style={{ color: C.silver }}>{title}</span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

/* ═══ 迷你折线图 ═══ */
function Sparkline({ data, color = C.cyan, height = 60 }: { data: number[]; color?: string; height?: number }) {
  if (data.length < 2) return <div className="flex items-center justify-center text-white/20 text-xs" style={{ height }}>—</div>;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 100;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${height - ((v - min) / range) * (height - 8) - 4}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }}>
      <polygon points={`0,${height} ${pts} ${w},${height}`} fill={color} opacity={0.08} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* ═══ 环形进度 ═══ */
function RingProgress({ value, label, color = C.cyan, size = 72 }: { value: number; label: string; color?: string; size?: number }) {
  const r = size / 2 - 5;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={5}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 4px ${color}88)`, transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold" style={{ color }}>{value}%</span>
        </div>
      </div>
      <span className="text-xs" style={{ color: C.silver + '88' }}>{label}</span>
    </div>
  );
}

/* ═══ 滚动预警条 ═══ */
function AlertTicker({ alerts }: { alerts: { level: string; msg: string }[] }) {
  const list = alerts.length > 0 ? alerts : [
    { level: 'info', msg: '系统运行正常，所有产线在线' },
    { level: 'warning', msg: '原材料仓库 B-3 区油墨库存偏低，建议补货' },
    { level: 'info', msg: '今日已完成 3 批次出货，合计 12,500 PCS' },
    { level: 'warning', msg: '设备 SP-003 计划保养倒计时 2 天' },
    { level: 'success', msg: '客户「深圳电子」追加订单已确认，交期 7/28' },
  ];
  return (
    <div
      className="flex items-center gap-2 overflow-hidden"
      style={{ background: 'rgba(10,30,61,0.9)', border: `1px solid ${C.silver}11`, borderRadius: '8px', height: '36px' }}
    >
      <div className="flex items-center gap-1.5 px-3 shrink-0 h-full" style={{ background: C.orange + '22', borderRight: `1px solid ${C.silver}11` }}>
        <AlertTriangle className="h-3.5 w-3.5" style={{ color: C.orange }} />
        <span className="text-xs font-medium" style={{ color: C.orange }}>预警</span>
      </div>
      <div className="flex-1 overflow-hidden relative">
        <div className="flex gap-8 whitespace-nowrap" style={{ animation: 'tickerScroll 30s linear infinite' }}>
          {[...list, ...list].map((a, i) => (
            <span key={i} className="text-xs flex items-center gap-1.5" style={{ color: C.silver + 'aa' }}>
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: a.level === 'warning' ? C.amber : a.level === 'success' ? C.green : C.cyan }}
              />
              {a.msg}
            </span>
          ))}
        </div>
      </div>
      <style>{`@keyframes tickerScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>
    </div>
  );
}

/* ═══ 自动滚动列表 ═══ */
function AutoScrollList({ children, speed = 30 }: { children: React.ReactNode; speed?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || el.scrollHeight <= el.clientHeight) return;
    let id: ReturnType<typeof setInterval>;
    const tick = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight) {
        el.scrollTo({ top: 0, behavior: 'instant' });
      } else {
        el.scrollBy({ top: 1, behavior: 'instant' });
      }
    };
    id = setInterval(tick, speed);
    return () => clearInterval(id);
  }, [speed]);

  return (
    <div ref={ref} className="flex-1 overflow-y-auto min-h-0 space-y-1" style={{ scrollBehavior: 'smooth' }}>
      {children}
    </div>
  );
}

/* ═══ 主组件 ═══ */
export default function CEODashboard() {
  const tc = useTranslations('Common');
  const locale = useLocale();

  const [data, setData] = useState<CEOData>(emptyData);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [efficiencyHistory, setEfficiencyHistory] = useState<number[]>([65, 70, 68, 72, 75, 73, 78]);
  const [qualityHistory, setQualityHistory] = useState<number[]>([94, 96, 93, 95, 97, 94, 96]);
  const dashboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentTime(new Date());
    const fetchData = async () => {
      try {
        const res = await authFetch('/api/dashboard/ceo');
        const result = await res.json();
        if (result.success && result.data) setData(result.data);
      } catch {}
    };
    fetchData();
    const t1 = setInterval(fetchData, 60000);
    const t2 = setInterval(() => setCurrentTime(new Date()), 1000);
    const t3 = setInterval(() => {
      setEfficiencyHistory((h) => [...h.slice(-19), Math.max(40, Math.min(98, (h[h.length - 1] || 70) + Math.round(Math.random() * 16 - 8)))]);
      setQualityHistory((h) => [...h.slice(-19), Math.max(80, Math.min(100, (h[h.length - 1] || 95) + Math.round(Math.random() * 6 - 3)))]);
    }, 2500);
    return () => { clearInterval(t1); clearInterval(t2); clearInterval(t3); };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      dashboardRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };
  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  const fmtMoney = (v: number) => '¥' + v.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtNum = (v: number) => v.toLocaleString(locale);
  const fmtQty = (v: number) => (v >= 10000 ? (v / 10000).toFixed(1) + '万' : fmtNum(v));
  const fmtPct = (v: number) => (v > 0 ? '+' : '') + v.toFixed(1) + '%';

  const wo = data.production.activeWorkOrders || [];
  const eqList = data.production.equipmentStatus || [];
  const defects = data.quality.recentDefects || [];

  return (
    <MainLayout>
      <div
        ref={dashboardRef}
        className="w-full h-full overflow-hidden relative flex flex-col"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, #0F2851 0%, ${C.bg} 40%, #050E22 100%)`,
          fontFamily: '-apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
        }}
      >
      {/* ── 背景网格 ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(${C.cyan}04 1px, transparent 1px), linear-gradient(90deg, ${C.cyan}04 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
        }}
      />
      {/* ── 背景光斑 ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px]" style={{ background: C.cyan + '08' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px]" style={{ background: C.orange + '06' }} />
      </div>

      {/* ═════════ 科技标题 ═════════ */}
      <style>{`
        .tech-title-wrapper { display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .tech-title-row { display: flex; align-items: center; gap: 12px; }
        .tech-title-line-left, .tech-title-line-right { width: 60px; height: 1px; background: linear-gradient(90deg, transparent, rgba(34,211,238,0.5)); }
        .tech-title-line-right { background: linear-gradient(90deg, rgba(34,211,238,0.5), transparent); }
        .tech-title-bottom-line { width: 100%; height: 1px; background: linear-gradient(90deg, transparent, rgba(34,211,238,0.3), transparent); }
      `}</style>
      <div className="relative z-10 flex items-center justify-between mb-3 px-1">
        <div className="flex-1" />
        <div className="tech-title-wrapper">
          <div className="tech-title-row">
            <div className="tech-title-line-left" />
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-wider bg-gradient-to-r from-cyan-300 via-blue-400 to-cyan-300 bg-clip-text text-transparent">VNERP丝网印刷管理系统</h1>
              <p className="text-xs mt-0.5" style={{ color: C.silver + '88' }}>CEO</p>
            </div>
            <div className="tech-title-line-right" />
          </div>
          <div className="tech-title-bottom-line" />
        </div>
        <div className="flex-1 flex justify-end items-center gap-4">
          <div className="text-right">
            {currentTime && (
              <div className="text-lg font-mono font-bold" style={{ color: C.cyan }}>
                {currentTime.toLocaleString(locale)}
              </div>
            )}
          </div>
          <button onClick={toggleFullscreen} className="p-2 rounded-lg transition-colors" style={{ background: 'rgba(255,255,255,0.08)', color: C.cyan }} title="全屏">
            <Maximize className="h-4 w-4" />
          </button>
          <div className="px-3 py-1 rounded-full text-xs" style={{ background: C.cyan + '22', border: `1px solid ${C.cyan}44`, color: C.cyan }}>● 实时</div>
        </div>
      </div>

      {/* ═════════ 主体三栏 ═════════ */}
      <main className="relative z-10 grid grid-cols-12 gap-2 p-3 flex-1 min-h-0">

        {/* ═══ 左列 ═══ */}
        <div className="col-span-2 flex flex-col gap-3 overflow-hidden">
          {/* 1. 销售订单 */}
          <GlassPanel title="销售订单" icon={ShoppingCart} accent={C.cyan} className="flex-1">
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="rounded-lg p-2" style={{ background: C.cyan + '11', border: `1px solid ${C.cyan}22` }}>
                <p className="text-[10px]" style={{ color: C.silver + '88' }}>今日新增</p>
                <p className="text-xl font-bold" style={{ color: C.cyan }}>{data.overview.todayOrders}</p>
                <p className="text-[10px]" style={{ color: data.overview.orderChange >= 0 ? C.green : C.red }}>
                  {fmtPct(data.overview.orderChange)}
                </p>
              </div>
              <div className="rounded-lg p-2" style={{ background: C.orange + '11', border: `1px solid ${C.orange}22` }}>
                <p className="text-[10px]" style={{ color: C.silver + '88' }}>待交付</p>
                <p className="text-xl font-bold" style={{ color: C.orange }}>{data.overview.todayDelivery}</p>
                <p className="text-[10px]" style={{ color: data.overview.deliveryChange >= 0 ? C.green : C.red }}>
                  {fmtPct(data.overview.deliveryChange)}
                </p>
              </div>
            </div>
            <p className="text-xs mb-1.5" style={{ color: C.silver + '66' }}>近 7 日趋势</p>
            <Sparkline
              data={data.orderTrend.length > 0 ? data.orderTrend.map((d) => d.count) : [12, 18, 15, 22, 19, 25, data.overview.todayOrders]}
              color={C.cyan}
              height={70}
            />
          </GlassPanel>

          {/* 2. 生产工单 */}
          <GlassPanel title="生产工单" icon={Factory} accent={C.green} className="flex-1 flex flex-col">
            <div className="grid grid-cols-3 gap-2 mb-3 shrink-0">
              <div className="text-center rounded-lg p-2" style={{ background: C.green + '11' }}>
                <p className="text-[10px]" style={{ color: C.green + '88' }}>在产</p>
                <p className="text-lg font-bold" style={{ color: C.green }}>{data.production.activeOrders}</p>
              </div>
              <div className="text-center rounded-lg p-2" style={{ background: C.cyan + '11' }}>
                <p className="text-[10px]" style={{ color: C.cyan + '88' }}>完成</p>
                <p className="text-lg font-bold" style={{ color: C.cyan }}>{data.production.completedToday}</p>
              </div>
              <div className="text-center rounded-lg p-2" style={{ background: C.amber + '11' }}>
                <p className="text-[10px]" style={{ color: C.amber + '88' }}>预警</p>
                <p className="text-lg font-bold" style={{ color: C.amber }}>{data.production.warningCount}</p>
              </div>
            </div>
            <AutoScrollList>
              {wo.length > 0 ? wo.map((w, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{
                      background: w.status === 'producing' ? C.green : w.status === 'pending' ? C.amber : C.cyan,
                      boxShadow: w.status === 'producing' ? `0 0 6px ${C.green}` : 'none',
                      animation: w.status === 'producing' ? 'pulse 2s infinite' : 'none',
                    }}
                  />
                  <span className="text-[11px] font-mono truncate" style={{ color: C.cyan }}>{w.work_order_no}</span>
                  <span className="text-[10px] truncate flex-1" style={{ color: C.silver + '88' }}>{w.product_name}</span>
                  {w.priority === 'urgent' && <span className="px-1 rounded text-[9px]" style={{ background: C.red + '22', color: C.red }}>急</span>}
                </div>
              )) : <div className="text-center py-4 text-xs" style={{ color: C.silver + '44' }}>{tc('noData')}</div>}
            </AutoScrollList>
          </GlassPanel>

          {/* 3. 质量合格率 */}
          <GlassPanel title="质量合格率" icon={CheckCircle2} accent={C.cyan} className="flex-1">
            <div className="flex items-center justify-around">
              <RingProgress value={data.quality.passRate || 96} label="合格率" color={C.cyan} size={68} />
              <div className="space-y-1.5 flex-1 ml-4">
                <div className="flex justify-between text-xs">
                  <span style={{ color: C.silver + '88' }}>检验总数</span>
                  <span className="font-mono" style={{ color: C.silver }}>{data.quality.totalInspections || 0}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: C.green + '88' }}>合格</span>
                  <span className="font-mono" style={{ color: C.green }}>{data.quality.passedInspections || 0}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: C.red + '88' }}>不合格</span>
                  <span className="font-mono" style={{ color: C.red }}>{data.quality.failedInspections || 0}</span>
                </div>
              </div>
            </div>
            <div className="mt-2">
              <Sparkline data={qualityHistory} color={C.cyan} height={40} />
            </div>
          </GlassPanel>
        </div>

        {/* ═══ 中央 3D ═══ */}
        <div className="col-span-8 flex flex-col gap-3">
          {/* 3D 全息投影 */}
          <div
            className="flex-1 relative overflow-hidden rounded-xl"
            style={{
              border: `1px solid ${C.silver}22`,
              background: 'radial-gradient(ellipse at center, rgba(10,30,61,0.4) 0%, transparent 70%)',
              backdropFilter: 'blur(8px)',
            }}
          >
            {/* 角标装饰 */}
            <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.cyan, boxShadow: `0 0 8px ${C.cyan}` }} />
              <span className="text-xs" style={{ color: C.cyan }}>全息投影 · 丝网印刷机</span>
            </div>
            <div className="absolute top-2 right-2 z-10 flex items-center gap-2 text-xs" style={{ color: C.silver + '88' }}>
              <span>SP-2026</span>
              <span style={{ color: C.green }}>● 在线</span>
            </div>

            {/* 3D 全息丝网印刷机 */}
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(135deg, ${C.cyan}15 0%, transparent 30%, transparent 70%, ${C.blue}15 100%)`,
                  mixBlendMode: 'overlay',
                }}
              />
              <img
                src="/bj.jpg"
                alt="3D 全息丝网印刷机"
                className="w-full h-full object-cover transition-transform duration-1000"
                style={{
                  filter: 'contrast(1.05) brightness(0.85) saturate(1.2) drop-shadow(0 0 40px rgba(34, 211, 238, 0.25))',
                }}
              />
              {/* 扫描线 */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(34, 211, 238, 0.03) 2px, rgba(34, 211, 238, 0.03) 4px)`,
                }}
              />
            </div>

            {/* 底部数据光晕条 */}
            <div className="absolute bottom-0 left-0 right-0 p-3 flex justify-around" style={{ background: 'linear-gradient(0deg, rgba(10,30,61,0.9) 0%, transparent 100%)' }}>
              {[
                { label: '生产效率', val: data.production.efficiency || 78, unit: '%', color: C.green },
                { label: '设备运转', val: data.inventory.warehouseUtilization || 85, unit: '%', color: C.cyan },
                { label: '产能负载', val: 67, unit: '%', color: C.orange },
              ].map((m, i) => (
                <div key={i} className="text-center">
                  <p className="text-[10px]" style={{ color: C.silver + '88' }}>{m.label}</p>
                  <p className="text-2xl font-extrabold" style={{ color: m.color, textShadow: `0 0 12px ${m.color}66` }}>
                    {m.val}<span className="text-sm ml-0.5">{m.unit}</span>
                  </p>
                </div>
              ))}
            </div>

            {/* 右侧悬浮效率仪表 */}
            <div className="absolute bottom-16 right-3 z-10 flex flex-col gap-2">
              <GlassPanel title="综合效率" icon={Activity} accent={C.green} className="!p-2">
                <RingProgress value={data.production.efficiency || 78} label="" color={C.green} size={60} />
              </GlassPanel>
              <GlassPanel title="质量合格率" icon={CheckCircle2} accent={C.cyan} className="!p-2">
                <RingProgress value={data.quality.passRate || 96} label="" color={C.cyan} size={60} />
              </GlassPanel>
            </div>

            {/* 四角科技装饰 */}
            {[
              { top: 0, left: 0, border: 'border-l border-t' },
              { top: 0, right: 0, border: 'border-r border-t' },
              { bottom: 0, left: 0, border: 'border-l border-b' },
              { bottom: 0, right: 0, border: 'border-r border-b' },
            ].map((c, i) => (
              <div key={i} className={`absolute w-4 h-4 ${c.border}`} style={{ borderColor: C.cyan + '44', ...c }} />
            ))}
          </div>
        </div>

        {/* ═══ 右列 ═══ */}
        <div className="col-span-2 flex flex-col gap-2 overflow-hidden">
          {/* 4. 原材料库存 */}
          <GlassPanel title="原材料库存" icon={Package} accent={C.blue} className="flex-1">
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              <div className="rounded-md p-1.5" style={{ background: C.blue + '11' }}>
                <p className="text-[9px]" style={{ color: C.silver + '88' }}>物料种类</p>
                <p className="text-base font-bold" style={{ color: C.blue }}>{fmtQty(data.inventory.totalItems)}</p>
              </div>
              <div className="rounded-md p-1.5" style={{ background: C.orange + '11' }}>
                <p className="text-[9px]" style={{ color: C.orange + '88' }}>低库存</p>
                <p className="text-base font-bold" style={{ color: C.orange }}>{data.inventory.lowStock}</p>
              </div>
            </div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px]" style={{ color: C.silver + '88' }}>仓库利用率</span>
              <span className="text-xs font-bold" style={{ color: C.cyan }}>{data.inventory.warehouseUtilization}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${data.inventory.warehouseUtilization}%`,
                  background: `linear-gradient(90deg, ${C.blue}, ${C.cyan})`,
                  boxShadow: `0 0 8px ${C.cyan}66`,
                }}
              />
            </div>
            <div className="mt-2 space-y-0.5">
              {defects.length > 0 ? defects.slice(0, 2).map((d, i) => (
                <div key={i} className="flex items-center justify-between px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <span className="text-[9px] truncate" style={{ color: C.silver + '88' }}>{d.product_name || d.defect_type || '—'}</span>
                  <span className="text-[9px] font-mono" style={{ color: C.amber }}>{d.quantity || 0}</span>
                </div>
              )) : (
                <div className="text-center py-1 text-[10px]" style={{ color: C.silver + '44' }}>库存正常</div>
              )}
            </div>
          </GlassPanel>

          {/* 5. 设备状态 */}
          <GlassPanel title="设备状态" icon={Cpu} accent={C.orange} className="flex-1">
            <div className="grid grid-cols-3 gap-1.5 mb-1.5 text-center">
              <div className="rounded p-1" style={{ background: C.green + '11' }}>
                <p className="text-[8px]" style={{ color: C.green + '88' }}>运行</p>
                <p className="text-sm font-bold" style={{ color: C.green }}>{eqList.filter((e) => e.status === 'running').length}</p>
              </div>
              <div className="rounded p-1" style={{ background: C.amber + '11' }}>
                <p className="text-[8px]" style={{ color: C.amber + '88' }}>保养</p>
                <p className="text-sm font-bold" style={{ color: C.amber }}>{eqList.filter((e) => e.status === 'maintenance').length}</p>
              </div>
              <div className="rounded p-1" style={{ background: C.red + '11' }}>
                <p className="text-[8px]" style={{ color: C.red + '88' }}>故障</p>
                <p className="text-sm font-bold" style={{ color: C.red }}>{eqList.filter((e) => e.status === 'fault').length}</p>
              </div>
            </div>
            <div className="space-y-0.5 overflow-y-auto" style={{ maxHeight: '100px' }}>
              {eqList.length > 0 ? eqList.slice(0, 4).map((eq, i) => (
                <div key={i} className="flex items-center gap-1.5 px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div
                    className="w-1 h-1 rounded-full shrink-0"
                    style={{
                      background: eq.status === 'running' ? C.green : eq.status === 'idle' ? C.blue : eq.status === 'maintenance' ? C.amber : C.red,
                      animation: eq.status === 'running' ? 'pulse 2s infinite' : 'none',
                    }}
                  />
                  <span className="text-[9px] truncate flex-1" style={{ color: C.silver + 'aa' }}>{eq.name}</span>
                  <span className="text-[9px] font-mono" style={{ color: eq.efficiency > 80 ? C.green : eq.efficiency > 60 ? C.amber : C.red }}>{eq.efficiency}%</span>
                </div>
              )) : <div className="text-center py-1 text-[10px]" style={{ color: C.silver + '44' }}>{tc('noData')}</div>}
            </div>
          </GlassPanel>

          {/* 6. 财务日报 */}
          <GlassPanel title="财务日报" icon={DollarSign} accent={C.green} className="flex-1">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px]" style={{ color: C.silver + '88' }}>应收总额</span>
                <span className="text-xs font-mono font-bold" style={{ color: C.green }}>{fmtMoney(data.finance.totalReceivable)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px]" style={{ color: C.silver + '88' }}>应付总额</span>
                <span className="text-xs font-mono font-bold" style={{ color: C.red + 'cc' }}>{fmtMoney(data.finance.totalPayable)}</span>
              </div>
              <div className="h-px" style={{ background: C.silver + '11' }} />
              <div className="flex justify-between items-center">
                <span className="text-[10px]" style={{ color: C.silver + '88' }}>月度收入</span>
                <span className="text-xs font-mono font-bold" style={{ color: C.cyan }}>{fmtMoney(data.finance.monthRevenue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px]" style={{ color: C.silver + '88' }}>月度支出</span>
                <span className="text-xs font-mono font-bold" style={{ color: C.amber }}>{fmtMoney(data.finance.monthExpense)}</span>
              </div>
              <div className="h-px" style={{ background: C.silver + '11' }} />
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-medium" style={{ color: C.silver + 'aa' }}>净利润</span>
                <span className="text-sm font-mono font-extrabold" style={{ color: C.orange }}>
                  {fmtMoney(data.finance.monthRevenue - data.finance.monthExpense)}
                </span>
              </div>
            </div>
          </GlassPanel>
        </div>
      </main>

      {/* ═════════ 底部预警滚动条 ═════════ */}
      <footer className="relative z-10 px-3 pb-2">
        <AlertTicker alerts={[]} />
      </footer>
    </div>
    </MainLayout>
  );
}
