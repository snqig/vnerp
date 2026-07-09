'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState, useRef, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { useCompanyName } from '@/hooks/useCompanyName';
import GlassKnob from '@/components/GlassKnob';
import GlassGauge from '@/components/GlassGauge';
import {
  Package,
  Factory,
  AlertTriangle,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  TrendingUp,
  Truck,
  Users,
  ShoppingCart,
  BarChart3,
  Maximize,
  Minimize,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

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
    recentDefects: DefectItem[];
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
  workshopDaily: { name: string; total: number; completed: number }[];
  materialConsumption: { name: string; qty: number }[];
  monthlyMaterialConsumption: { name: string; qty: number }[];
  workshopHistory: { year: number; total: number }[];
  shiftData: {
    dayShift: { plan: number; actual: number; rate: number };
    middleShift: { plan: number; actual: number; rate: number };
    nightShift: { plan: number; actual: number; rate: number };
  };
  powerConsumption: { date: string; power: number }[];
  materialUsage: { date: string; usage: number }[];
  processRelations: string[];
}

interface DefectItem {
  id?: number;
  product_name?: string;
  defect_type?: string;
  quantity?: number;
  description?: string;
}

export default function CEODashboard() {
  const t = useTranslations('Dashboard');
  const tc = useTranslations('Common');

  const { companyName } = useCompanyName();
  const [data, setData] = useState<CEOData>({
    overview: {
      todayOrders: 0,
      todayProduction: 0,
      todayDelivery: 0,
      inventoryValue: 0,
      orderChange: 0,
      productionChange: 0,
      deliveryChange: 0,
      inventoryChange: 0,
    },
    production: {
      efficiency: 0,
      activeOrders: 0,
      completedToday: 0,
      warningCount: 0,
      equipmentStatus: [],
      activeWorkOrders: [],
    },
    quality: {
      passRate: 0,
      totalInspections: 0,
      passedInspections: 0,
      failedInspections: 0,
      recentDefects: [],
    },
    finance: {
      totalReceivable: 0,
      totalPayable: 0,
      monthRevenue: 0,
      monthExpense: 0,
      revenueChange: 0,
      expenseChange: 0,
    },
    inventory: { totalItems: 0, lowStock: 0, totalValue: 0, warehouseUtilization: 0 },
    orderTrend: [],
    topProducts: [],
    workshopDaily: [],
    materialConsumption: [],
    monthlyMaterialConsumption: [],
    workshopHistory: [],
    shiftData: {
      dayShift: { plan: 0, actual: 0, rate: 0 },
      middleShift: { plan: 0, actual: 0, rate: 0 },
      nightShift: { plan: 0, actual: 0, rate: 0 },
    },
    powerConsumption: [],
    materialUsage: [],
    processRelations: [],
  });
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [knobSpeed, setKnobSpeed] = useState(67);
  const [efficiencyHistory, setEfficiencyHistory] = useState<number[]>([50, 54, 56, 60, 66, 62]);
  const [qualityHistory, setQualityHistory] = useState<number[]>([92, 94, 91, 95, 93, 96]);

  useEffect(() => {
    const t = setInterval(() => {
      setEfficiencyHistory((h) => {
        const val = Math.max(20, Math.min(98, h[h.length - 1] + (Math.random() * 12 - 6)));
        return h.length > 20 ? [...h.slice(1), Math.round(val)] : [...h, Math.round(val)];
      });
      setQualityHistory((h) => {
        const val = Math.max(70, Math.min(100, h[h.length - 1] + (Math.random() * 6 - 3)));
        return h.length > 20 ? [...h.slice(1), Math.round(val)] : [...h, Math.round(val)];
      });
    }, 2000);
    return () => clearInterval(t);
  }, []);

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
    const timer1 = setInterval(fetchData, 60000);
    const timer2 = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      clearInterval(timer1);
      clearInterval(timer2);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      dashboardRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const formatMoney = (v: number) =>
    '¥' + (v / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatNumber = (v: number) => v.toLocaleString('zh-CN');
  const formatQty = (v: number) => {
    if (v >= 10000) return (v / 10000).toFixed(1) + '万';
    return formatNumber(v);
  };

  const activeWorkOrders = data.production.activeWorkOrders || [];

  const RingChart = ({
    percent,
    label,
    color = 'cyan',
  }: {
    percent: number;
    label: string;
    color?: string;
  }) => {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;
    const colorMap: Record<string, string> = {
      cyan: '#22d3ee',
      blue: '#3b82f6',
      green: '#22c55e',
      amber: '#f59e0b',
    };
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="6"
            />
            <circle
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              stroke={colorMap[color] || colorMap.cyan}
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-white">{percent}%</span>
          </div>
        </div>
        <span className="text-xs text-white/50">{label}</span>
      </div>
    );
  };

  const LineChart = ({
    data,
    color = '#22d3ee',
    height = 120,
  }: {
    data: number[];
    color?: string;
    height?: number;
  }) => {
    if (data.length < 2)
      return (
        <div className="h-32 flex items-center justify-center text-white/30 text-xs">
          {tc('noData')}
        </div>
      );
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    const w = 100;
    const h = height;
    const points = data
      .map((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - ((v - min) / range) * (h - 20) - 10;
        return `${x},${y}`;
      })
      .join(' ');
    const areaPoints = `0,${h} ${points} ${w},${h}`;
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
        <defs>
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill={`url(#grad-${color.replace('#', '')})`} />
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  };

  const DualLineChart = ({
    data1,
    data2,
    color1 = '#22d3ee',
    color2 = '#f59e0b',
    height = 120,
  }: {
    data1: number[];
    data2: number[];
    color1?: string;
    color2?: string;
    height?: number;
  }) => {
    const allData = [...data1, ...data2];
    if (data1.length < 2 || data2.length < 2)
      return (
        <div className="h-32 flex items-center justify-center text-white/30 text-xs">
          {tc('noData')}
        </div>
      );
    const max = Math.max(...allData, 1);
    const min = Math.min(...allData, 0);
    const range = max - min || 1;
    const w = 100;
    const h = height;
    const makePoints = (d: number[]) =>
      d
        .map((v, i) => {
          const x = (i / (d.length - 1)) * w;
          const y = h - ((v - min) / range) * (h - 20) - 10;
          return `${x},${y}`;
        })
        .join(' ');
    const points1 = makePoints(data1);
    const points2 = makePoints(data2);
    const areaPoints1 = `0,${h} ${points1} ${w},${h}`;
    const areaPoints2 = `0,${h} ${points2} ${w},${h}`;
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
        <defs>
          <linearGradient id={`dual-grad-${color1.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color1} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color1} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`dual-grad-${color2.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color2} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color2} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints1} fill={`url(#dual-grad-${color1.replace('#', '')})`} />
        <polygon points={areaPoints2} fill={`url(#dual-grad-${color2.replace('#', '')})`} />
        <polyline
          points={points1}
          fill="none"
          stroke={color1}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points={points2}
          fill="none"
          stroke={color2}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          strokeDasharray="3,2"
        />
      </svg>
    );
  };

  const Panel = ({
    title,
    icon: Icon,
    children,
    className = '',
  }: {
    title: string;
    icon: any;
    children: React.ReactNode;
    className?: string;
  }) => (
    <div
      className={`p-0 ${className}`}
      style={{
        background: 'rgba(9, 22, 55, 0.6)',
        border: '1px solid rgba(6, 182, 212, 0.15)',
        backdropFilter: 'blur(12px)',
        borderRadius: '0.75rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2 bg-white/5">
        <div className="w-1 h-4 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600" />
        <Icon className="h-4 w-4 text-cyan-400" />
        <span className="text-sm font-medium text-white/80">{title}</span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );

  function AutoScroll({
    children,
    maxHeight = 200,
  }: {
    children: React.ReactNode;
    maxHeight?: number;
  }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
      const container = containerRef.current;
      const inner = innerRef.current;
      if (!container || !inner) return;

      let animId: number;
      let scrollPos = 0;
      const contentHeight = inner.scrollHeight / 2;
      const viewportHeight = maxHeight;

      if (contentHeight <= viewportHeight) return;

      const step = () => {
        if (!isPaused) {
          scrollPos += 0.3;
          if (scrollPos >= contentHeight) {
            scrollPos = 0;
          }
          container.scrollTop = scrollPos;
        }
        animId = requestAnimationFrame(step);
      };

      animId = requestAnimationFrame(step);
      return () => cancelAnimationFrame(animId);
    }, [isPaused, maxHeight, children]);

    return (
      <div
        ref={containerRef}
        className="overflow-hidden"
        style={{ maxHeight: `${maxHeight}px` }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div ref={innerRef}>
          {children}
          {children}
        </div>
      </div>
    );
  }

  const workshopDaily = data.workshopDaily.length > 0 ? data.workshopDaily : [];
  const materialConsumption = data.materialConsumption.length > 0 ? data.materialConsumption : [];
  const monthlyMaterialConsumption =
    data.monthlyMaterialConsumption.length > 0 ? data.monthlyMaterialConsumption : [];
  const workshopHistory = data.workshopHistory.length > 0 ? data.workshopHistory : [];
  const shiftData = data.shiftData;

  const totalShiftPlan =
    shiftData.dayShift.plan + shiftData.middleShift.plan + shiftData.nightShift.plan;
  const dayShiftPct =
    totalShiftPlan > 0 ? Math.round((shiftData.dayShift.plan / totalShiftPlan) * 100) : 0;
  const middleShiftPct =
    totalShiftPlan > 0 ? Math.round((shiftData.middleShift.plan / totalShiftPlan) * 100) : 0;
  const nightShiftPct =
    totalShiftPlan > 0 ? Math.round((shiftData.nightShift.plan / totalShiftPlan) * 100) : 0;

  return (
    <MainLayout>
      <div
        ref={dashboardRef}
        className="min-h-screen text-white p-3 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #091637 0%, #010205 100%)',
        }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl" />
        </div>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(6, 182, 212, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.03) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 px-2">
            <div className="flex-1" />
            <div className="tech-title-wrapper">
              <div className="tech-title-row">
                <div className="tech-title-line-left" />
                <div className="text-center">
                  <h1 className="text-xl font-bold tracking-wider bg-gradient-to-r from-cyan-300 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
                    {companyName}
                  </h1>
                  <p className="text-xs text-white/50 mt-0.5">{t('factoryDashboard')}</p>
                </div>
                <div className="tech-title-line-right" />
              </div>
              <div className="tech-title-bottom-line" />
            </div>
            <div className="flex-1 flex items-center justify-end gap-4">
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="text-white/50">{t('todayOrders')}</span>
                  <span className="text-cyan-300 font-bold text-sm">
                    {data.overview.todayOrders}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Factory className="h-3.5 w-3.5 text-green-400" />
                  <span className="text-white/50">{t('todayProduction')}</span>
                  <span className="text-green-300 font-bold text-sm">
                    {formatQty(data.overview.todayProduction)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-blue-400" />
                  <span className="text-white/50">{t('todayShipment')}</span>
                  <span className="text-blue-300 font-bold text-sm">
                    {data.overview.todayDelivery}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-400 text-xs">{t('realtime')}</span>
              </div>
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                title={isFullscreen ? t('exitFullscreen') : t('fullscreen')}
              >
                {isFullscreen ? (
                  <Minimize className="h-4 w-4 text-cyan-400" />
                ) : (
                  <Maximize className="h-4 w-4 text-cyan-400" />
                )}
              </button>
              <div className="text-right">
                {currentTime && (
                  <>
                    <div className="text-lg font-mono font-bold text-cyan-300">
                      {currentTime.toLocaleDateString('zh-CN')}
                    </div>
                    <div className="text-cyan-200/60 text-sm font-mono">
                      {currentTime.toLocaleTimeString('zh-CN')}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-12 gap-3">
            {/* Left Column */}
            <div className="col-span-4 space-y-3">
              {/* 车间日产量 */}
              <Panel title={t('workshopDailyProduction')} icon={Factory}>
                <div className="space-y-1.5">
                  {workshopDaily.length > 0 ? (
                    workshopDaily.slice(0, 8).map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between px-2 py-1.5 rounded bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-cyan-400 font-mono w-5">{i + 1}</span>
                          <span className="text-xs text-white/70">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-white/10 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full rounded-full"
                              style={{
                                width: `${item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-cyan-300 font-mono">
                            {formatQty(item.total)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-white/30 text-xs">{tc('noData')}</div>
                  )}
                </div>
              </Panel>

              {/* 原材料采购&日消耗 */}
              <Panel title={t('materialPurchaseConsumption')} icon={ShoppingCart}>
                <div className="space-y-3">
                  {materialConsumption.length > 0 ? (
                    materialConsumption.map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-xs text-white/60">{item.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-cyan-300 font-mono">
                            {formatQty(item.qty)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-white/30 text-xs">{tc('noData')}</div>
                  )}
                </div>
                <div className="flex justify-center gap-6 mt-4 pt-3 border-t border-white/10">
                  <RingChart
                    percent={data.production.efficiency}
                    label={t('equipmentEfficiency')}
                    color="cyan"
                  />
                  <RingChart
                    percent={data.inventory.warehouseUtilization}
                    label={t('warehouseUtilization')}
                    color="blue"
                  />
                </div>
              </Panel>

              {/* 原材料当月消耗 */}
              <Panel title={t('monthlyMaterialConsumption')} icon={BarChart3}>
                <div className="space-y-2">
                  {monthlyMaterialConsumption.length > 0 ? (
                    monthlyMaterialConsumption.map((item, i) => {
                      const maxQty = Math.max(...monthlyMaterialConsumption.map((m) => m.qty), 1);
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-between px-2 py-1 rounded bg-white/5"
                        >
                          <span className="text-xs text-white/60">{item.name}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-white/10 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-green-400 to-cyan-500 h-full rounded-full"
                                style={{ width: `${Math.round((item.qty / maxQty) * 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-green-300 font-mono">
                              {formatQty(item.qty)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-4 text-white/30 text-xs">{tc('noData')}</div>
                  )}
                </div>
              </Panel>

              {/* 车间历史产量 */}
              <Panel title={t('workshopHistory')} icon={TrendingUp}>
                <div className="space-y-2">
                  {workshopHistory.length > 0 ? (
                    workshopHistory.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between px-2 py-1.5 rounded bg-white/5"
                      >
                        <span className="text-xs text-white/50">{item.year}</span>
                        <span className="text-xs text-cyan-300 font-mono">
                          {formatQty(item.total)}
                        </span>
                        <span className="text-xs text-green-400">-</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-white/30 text-xs">{tc('noData')}</div>
                  )}
                </div>
              </Panel>
            </div>

            {/* Center Column */}
            <div className="col-span-4 space-y-3">
              {/* 三班生产情况 */}
              <Panel title={t('shiftProduction')} icon={Factory}>
                <div className="grid grid-cols-3 gap-3">
                  {/* 设备运转率 */}
                  <div className="space-y-2">
                    <p className="text-xs text-white/50 text-center mb-2">
                      {t('equipmentOperatingRate')}
                    </p>
                    {data.production.equipmentStatus.length > 0 ? (
                      data.production.equipmentStatus.slice(0, 6).map((eq, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between px-2 py-1 rounded bg-white/5"
                        >
                          <span className="text-xs text-white/60 truncate w-24">{eq.name}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-white/10 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${eq.efficiency > 80 ? 'bg-green-400' : eq.efficiency > 60 ? 'bg-yellow-400' : 'bg-red-400'}`}
                                style={{ width: `${eq.efficiency}%` }}
                              />
                            </div>
                            <span
                              className={`text-xs font-mono ${eq.efficiency > 80 ? 'text-green-400' : eq.efficiency > 60 ? 'text-yellow-400' : 'text-red-400'}`}
                            >
                              {eq.efficiency}%
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-white/30 text-xs">{tc('noData')}</div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-cyan-300 text-center font-medium">
                      {tc('shiftDay')}
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded bg-white/5">
                        <p className="text-xs text-white/40">{tc('planQty')}</p>
                        <p className="text-sm font-bold text-cyan-300">
                          {formatQty(shiftData.dayShift.plan)}
                        </p>
                      </div>
                      <div className="p-2 rounded bg-white/5">
                        <p className="text-xs text-white/40">{tc('actualQty')}</p>
                        <p className="text-sm font-bold text-green-300">
                          {formatQty(shiftData.dayShift.actual)}
                        </p>
                      </div>
                      <div className="p-2 rounded bg-white/5">
                        <p className="text-xs text-white/40">{tc('achieveRate')}</p>
                        <p className="text-sm font-bold text-blue-300">
                          {shiftData.dayShift.rate}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 中班 */}
                  <div className="space-y-2">
                    <p className="text-xs text-blue-300 text-center font-medium">
                      {tc('shiftMiddle')}
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded bg-white/5">
                        <p className="text-xs text-white/40">{tc('planQty')}</p>
                        <p className="text-sm font-bold text-cyan-300">
                          {formatQty(shiftData.middleShift.plan)}
                        </p>
                      </div>
                      <div className="p-2 rounded bg-white/5">
                        <p className="text-xs text-white/40">{tc('actualQty')}</p>
                        <p className="text-sm font-bold text-green-300">
                          {formatQty(shiftData.middleShift.actual)}
                        </p>
                      </div>
                      <div className="p-2 rounded bg-white/5">
                        <p className="text-xs text-white/40">{tc('achieveRate')}</p>
                        <p className="text-sm font-bold text-blue-300">
                          {shiftData.middleShift.rate}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 夜班 + 三班比率 */}
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="grid grid-cols-4 gap-3">
                    <div className="space-y-2">
                      <p className="text-xs text-purple-300 text-center font-medium">
                        {tc('shiftNight')}
                      </p>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 rounded bg-white/5">
                          <p className="text-xs text-white/40">{tc('planQty')}</p>
                          <p className="text-sm font-bold text-cyan-300">
                            {formatQty(shiftData.nightShift.plan)}
                          </p>
                        </div>
                        <div className="p-2 rounded bg-white/5">
                          <p className="text-xs text-white/40">{tc('actualQty')}</p>
                          <p className="text-sm font-bold text-green-300">
                            {formatQty(shiftData.nightShift.actual)}
                          </p>
                        </div>
                        <div className="p-2 rounded bg-white/5">
                          <p className="text-xs text-white/40">{tc('achieveRate')}</p>
                          <p className="text-sm font-bold text-blue-300">
                            {shiftData.nightShift.rate}%
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-3">
                      <p className="text-xs text-white/50 mb-2">{tc('shiftRatio')}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/40 w-8">{tc('shiftDay')}</span>
                        <div className="flex-1 bg-white/10 rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-cyan-400 to-cyan-500 h-full rounded-full"
                            style={{ width: `${dayShiftPct}%` }}
                          />
                        </div>
                        <span className="text-xs text-cyan-300 w-10 text-right">
                          {dayShiftPct}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-white/40 w-8">{tc('shiftMiddle')}</span>
                        <div className="flex-1 bg-white/10 rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-blue-400 to-blue-500 h-full rounded-full"
                            style={{ width: `${middleShiftPct}%` }}
                          />
                        </div>
                        <span className="text-xs text-blue-300 w-10 text-right">
                          {middleShiftPct}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-white/40 w-8">{tc('shiftNight')}</span>
                        <div className="flex-1 bg-white/10 rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-purple-400 to-purple-500 h-full rounded-full"
                            style={{ width: `${nightShiftPct}%` }}
                          />
                        </div>
                        <span className="text-xs text-purple-300 w-10 text-right">
                          {nightShiftPct}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Panel>

              {/* 订单趋势 */}
              <Panel title={t('orderTrend')} icon={TrendingUp}>
                <div className="h-40">
                  <LineChart
                    data={data.orderTrend.length > 0 ? data.orderTrend.map((d) => d.count) : []}
                    color="#22d3ee"
                    height={150}
                  />
                </div>
                <div className="flex justify-between mt-2 px-1">
                  {data.orderTrend.length > 0 ? (
                    data.orderTrend.map((d, i) => (
                      <span key={i} className="text-[10px] text-white/30">
                        {d.date?.slice(5) || ''}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-white/30">{tc('noData')}</span>
                  )}
                </div>
              </Panel>

              {/* 生产单位电耗 */}
              <Panel title={t('powerConsumptionMaterial')} icon={Zap}>
                <div className="h-32">
                  <DualLineChart
                    data1={
                      data.powerConsumption.length > 0
                        ? data.powerConsumption.map((d) => d.power)
                        : []
                    }
                    data2={
                      data.materialUsage.length > 0 ? data.materialUsage.map((d) => d.usage) : []
                    }
                    color1="#22d3ee"
                    color2="#f59e0b"
                    height={120}
                  />
                </div>
                <div className="flex items-center justify-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span className="text-xs text-white/50">{t('powerConsumptionKwh')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-xs text-white/50">{t('consumableKg')}</span>
                  </div>
                </div>
              </Panel>
            </div>

            {/* Right Column */}
            <div className="col-span-4 space-y-3">
              {/* 各产品与车间生产工序关系 */}
              <Panel title={t('productProcessRelation')} icon={Factory}>
                <div className="flex justify-center py-4">
                  <div className="relative w-48 h-48">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-600/20 border border-cyan-400/30 flex items-center justify-center">
                        <Factory className="h-6 w-6 text-cyan-400" />
                      </div>
                    </div>
                    {data.processRelations.length > 0 ? (
                      data.processRelations.slice(0, 8).map((name, i) => {
                        const angle =
                          (i / Math.min(data.processRelations.length, 8)) * 2 * Math.PI -
                          Math.PI / 2;
                        const x = 50 + 40 * Math.cos(angle);
                        const y = 50 + 40 * Math.sin(angle);
                        return (
                          <div
                            key={i}
                            className="absolute w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors"
                            style={{
                              left: `${x}%`,
                              top: `${y}%`,
                              transform: 'translate(-50%, -50%)',
                            }}
                          >
                            <span className="text-[10px] text-white/70">{name}</span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs text-white/30">{tc('noData')}</span>
                      </div>
                    )}
                    {data.processRelations.length > 0 && (
                      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                        {data.processRelations.slice(0, 8).map((_, i) => {
                          const angle =
                            (i / Math.min(data.processRelations.length, 8)) * 2 * Math.PI -
                            Math.PI / 2;
                          const x = 50 + 40 * Math.cos(angle);
                          const y = 50 + 40 * Math.sin(angle);
                          return (
                            <line
                              key={i}
                              x1="50"
                              y1="50"
                              x2={x}
                              y2={y}
                              stroke="rgba(34,211,238,0.2)"
                              strokeWidth="0.5"
                            />
                          );
                        })}
                      </svg>
                    )}
                  </div>
                </div>
              </Panel>

              {/* 生产状态 */}
              <Panel title={t('productionStatus')} icon={Factory}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/50">{t('inProgressOrders')}</span>
                    <span className="text-green-400 font-bold text-base">
                      {data.production.activeOrders}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/50">{t('todayCompleted')}</span>
                    <span className="text-green-400 font-bold text-base">
                      {data.production.completedToday}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/50">{t('warningOrders')}</span>
                    <span className="text-yellow-400 font-bold text-base">
                      {data.production.warningCount}
                    </span>
                  </div>
                </div>
                {activeWorkOrders.length > 0 && (
                  <AutoScroll maxHeight={160}>
                    <div className="mt-3 pt-3 border-t border-white/10 space-y-1">
                      {activeWorkOrders.map((wo, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 px-2 py-1.5 rounded bg-white/5 hover:bg-white/10 transition-colors"
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${wo.status === 'producing' ? 'bg-green-400 animate-pulse' : 'bg-blue-400'}`}
                          />
                          <span className="text-xs font-mono text-cyan-300 w-20 truncate">
                            {wo.work_order_no}
                          </span>
                          <span className="text-xs text-white/60 flex-1 truncate">
                            {wo.product_name}
                          </span>
                          <span
                            className={`text-xs ${wo.priority === 'urgent' ? 'text-red-400' : wo.priority === 'high' ? 'text-yellow-400' : 'text-white/40'}`}
                          >
                            {wo.priority === 'urgent'
                              ? tc('critical')
                              : wo.priority === 'high'
                                ? tc('high')
                                : wo.priority === 'normal'
                                  ? tc('medium')
                                  : tc('low')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </AutoScroll>
                )}
              </Panel>

              {/* 设备状态 */}
              <Panel title={t('equipmentStatusTitle')} icon={Zap}>
                <AutoScroll maxHeight={160}>
                  <div className="grid grid-cols-2 gap-1.5">
                    {data.production.equipmentStatus.length > 0 ? (
                      data.production.equipmentStatus.map((eq, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 px-2 py-1.5 rounded bg-white/5"
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${eq.status === 'running' ? 'bg-green-400' : eq.status === 'idle' ? 'bg-blue-400' : eq.status === 'maintenance' ? 'bg-yellow-400' : 'bg-red-400'}`}
                          />
                          <span className="text-xs text-white/60 flex-1 truncate">{eq.name}</span>
                          <span
                            className={`text-xs ${eq.status === 'running' ? 'text-green-400' : eq.status === 'idle' ? 'text-blue-400' : eq.status === 'maintenance' ? 'text-yellow-400' : 'text-red-400'}`}
                          >
                            {eq.status === 'running'
                              ? tc('running')
                              : eq.status === 'idle'
                                ? tc('idle')
                                : eq.status === 'maintenance'
                                  ? tc('underMaintenance')
                                  : tc('fault')}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 text-center py-4 text-white/30 text-xs">
                        {tc('noData')}
                      </div>
                    )}
                  </div>
                </AutoScroll>
              </Panel>

              {/* 财务概览 */}
              <Panel title={t('financeOverview')} icon={DollarSign}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/50">{t('totalReceivable')}</span>
                    <span className="text-sm text-green-300 font-mono">
                      {formatMoney(data.finance.totalReceivable)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/50">{t('totalPayable')}</span>
                    <span className="text-sm text-red-300 font-mono">
                      {formatMoney(data.finance.totalPayable)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/50">{t('monthlyIncome')}</span>
                    <span className="text-sm text-cyan-300 font-mono">
                      {formatMoney(data.finance.monthRevenue)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/50">{t('monthlyExpense')}</span>
                    <span className="text-sm text-amber-300 font-mono">
                      {formatMoney(data.finance.monthExpense)}
                    </span>
                  </div>
                </div>
              </Panel>
            </div>
          </div>

          {/* 仪表盘控制区 */}
          <div className="grid grid-cols-12 gap-3 mt-3">
            <div className="col-span-3">
              <Panel title={t('powerCapacityAdjust')} icon={Zap}>
                <div className="flex flex-col items-center py-3 relative">
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        'radial-gradient(ellipse at 50% 20%, rgba(34,211,238,0.08) 0%, transparent 70%)',
                    }}
                  />
                  <GlassKnob
                    value={knobSpeed}
                    onChange={setKnobSpeed}
                    accent="#22d3ee"
                    size={100}
                    label={t('powerLabel')}
                  />
                  <div className="mt-3 text-cyan-300 font-extrabold text-xl">
                    {knobSpeed}
                    <span className="text-white/40 text-sm ml-1">%</span>
                  </div>
                  <div className="text-white/30 text-xs mt-1">{t('powerRange')}</div>
                </div>
              </Panel>
            </div>
            <div className="col-span-3">
              <Panel title={t('efficiencyGauge')} icon={Factory}>
                <div className="flex flex-col items-center py-2 relative">
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        'radial-gradient(ellipse at 50% 15%, rgba(21,255,187,0.08) 0%, transparent 70%)',
                    }}
                  />
                  <GlassGauge
                    value={data.production.efficiency}
                    label={t('equipmentEfficiency')}
                    unit="%"
                    colorArc="#15ffbb"
                    colorDanger="#ff5555"
                    colorSafe="#15ffbb"
                    dangerStart={85}
                    showCurve
                    history={efficiencyHistory}
                    size={140}
                  />
                </div>
              </Panel>
            </div>
            <div className="col-span-3">
              <Panel title={t('qualityRateGauge')} icon={AlertTriangle}>
                <div className="flex flex-col items-center py-2 relative">
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        'radial-gradient(ellipse at 50% 15%, rgba(31,207,255,0.08) 0%, transparent 70%)',
                    }}
                  />
                  <GlassGauge
                    value={data.quality.passRate}
                    label={t('qualityRate')}
                    unit="%"
                    colorArc="#1fcfff"
                    colorDanger="#ff5555"
                    colorSafe="#22d3ee"
                    dangerStart={90}
                    showCurve
                    history={qualityHistory}
                    size={140}
                  />
                </div>
              </Panel>
            </div>
            <div className="col-span-3">
              <Panel title={t('warehouseUtilizationAdjust')} icon={Package}>
                <div className="flex flex-col items-center py-3 relative">
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        'radial-gradient(ellipse at 50% 20%, rgba(59,130,246,0.08) 0%, transparent 70%)',
                    }}
                  />
                  <GlassKnob
                    value={data.inventory.warehouseUtilization}
                    accent="#3b82f6"
                    size={100}
                    label={t('utilizationRate')}
                  />
                  <div className="mt-3 text-blue-300 font-extrabold text-xl">
                    {data.inventory.warehouseUtilization}
                    <span className="text-white/40 text-sm ml-1">%</span>
                  </div>
                  <div className="text-white/30 text-xs mt-1">{t('warehouseSpaceUsage')}</div>
                </div>
              </Panel>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
