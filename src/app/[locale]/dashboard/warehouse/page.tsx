'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState, useRef, useMemo } from 'react';
import { MainLayout } from '@/components/layout';
import { useCompanyName } from '@/hooks/useCompanyName';
import GlassGauge from '@/components/GlassGauge';
import {
  Package,
  ArrowDown,
  ArrowUp,
  AlertTriangle,
  TrendingUp,
  Warehouse,
  BarChart3,
  Maximize,
  Minimize,
  Clock,
  PieChart as PieChartIcon,
  TrendingDown,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';

interface WarehouseData {
  overview: {
    totalItems: number;
    totalValue: number;
    lowStock: number;
    todayInbound: number;
    todayOutbound: number;
    pendingInbound: number;
    pendingOutbound: number;
  };
  categoryDistribution: { material_type: string; count: number; value: number }[];
  lowStockItems: {
    material_code: string;
    material_name: string;
    stock_qty: number;
    min_stock: number;
    unit: string;
    specification: string;
  }[];
  recentTransactions: {
    transaction_type: string;
    material_code: string;
    material_name: string;
    quantity: number;
    unit: string;
    create_time: string;
    remark: string;
  }[];
  warehouseOccupancy: {
    warehouse_name: string;
    item_count: number;
    total_qty: number;
    capacity?: number;
  }[];
}

function AutoScroll({
  children,
  maxHeight = 320,
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

const COLORS = [
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#f43f5e',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#6366f1',
];

export default function WarehouseDashboard() {
  // 翻译钩子
  const t = useTranslations('Dashboard');
  const tc = useTranslations('Common');

  const { companyName } = useCompanyName();
  const [data, setData] = useState<WarehouseData>({
    overview: {
      totalItems: 0,
      totalValue: 0,
      lowStock: 0,
      todayInbound: 0,
      todayOutbound: 0,
      pendingInbound: 0,
      pendingOutbound: 0,
    },
    categoryDistribution: [],
    lowStockItems: [],
    recentTransactions: [],
    warehouseOccupancy: [],
  });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [warehouseHistory, setWarehouseHistory] = useState<number[]>([65, 68, 70, 72, 69, 73]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await authFetch('/api/dashboard/warehouse');
        const result = await res.json();
        if (result.success && result.data) setData(result.data);
      } catch {
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    setCurrentTime(new Date());
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

  const formatTime = (date: Date) => {
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const formatMoney = (v: number) =>
    '¥' + (v / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const warehouses3D = useMemo(() => {
    const maxQty = Math.max(...data.warehouseOccupancy.map((w) => w.total_qty), 1);
    return data.warehouseOccupancy.map((w) => ({
      name: w.warehouse_name,
      occupancy: w.capacity ? (w.total_qty / w.capacity) * 100 : (w.total_qty / maxQty) * 100,
      color: '#06b6d4',
    }));
  }, [data.warehouseOccupancy]);

  const avgOccupancy =
    warehouses3D.length > 0
      ? warehouses3D.reduce((sum, w) => sum + w.occupancy, 0) / warehouses3D.length
      : 0;

  const categoryChartData = useMemo(() => {
    return data.categoryDistribution.map((c) => ({
      name: c.material_type,
      count: c.count,
      value: c.value,
    }));
  }, [data.categoryDistribution]);

  const occupancyChartData = useMemo(() => {
    return data.warehouseOccupancy.map((w) => {
      const occupancy = w.capacity ? (w.total_qty / w.capacity) * 100 : avgOccupancy;
      return {
        name: w.warehouse_name,
        occupancy: Math.round(occupancy),
        total_qty: w.total_qty,
      };
    });
  }, [data.warehouseOccupancy, avgOccupancy]);

  const trendChartData = useMemo(() => {
    const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const inboundData = [65, 68, 70, 72, 69, 73, 71];
    const outboundData = [45, 52, 48, 55, 49, 58, 51];
    return days.map((day, i) => ({
      name: day,
      inbound: inboundData[i],
      outbound: outboundData[i],
    }));
  }, [data.recentTransactions]);

  return (
    <MainLayout>
      <div
        ref={dashboardRef}
        className="min-h-screen text-white p-4 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #091637 0%, #010205 100%)',
        }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-blob" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-blob animation-delay-2000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl animate-blob animation-delay-4000" />
        </div>
        <div className="absolute inset-0 tech-grid-bg pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center mb-3">
          <div className="tech-title-wrapper">
            <div className="tech-title-row">
              <div className="tech-title-line-left" />
              <div>
                <h1 className="text-lg font-bold tracking-wider bg-gradient-to-r from-cyan-300 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
                  {companyName}
                </h1>
                <p className="text-[10px] text-white/50">{t('warehouseBoard')}</p>
              </div>
              <div className="tech-title-line-right" />
            </div>
            <div className="tech-title-bottom-line" />
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <div className="text-sm font-mono font-bold text-cyan-400">
              {currentTime && formatTime(currentTime)}
            </div>
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              title={isFullscreen ? t('exitFullscreen') : t('fullscreen')}
            >
              {isFullscreen ? (
                <Minimize className="h-3.5 w-3.5 text-cyan-400" />
              ) : (
                <Maximize className="h-3.5 w-3.5 text-cyan-400" />
              )}
            </button>
            <div className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-[10px] text-cyan-300">
              {loading ? tc('loading') : '● ' + t('realtime')}
            </div>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {[
            {
              title: t('materialTypes'),
              value: data.overview.totalItems,
              icon: Package,
              color: 'from-cyan-500 to-blue-500',
            },
            {
              title: t('totalStockValue'),
              value: formatMoney(data.overview.totalValue),
              icon: TrendingUp,
              color: 'from-green-500 to-emerald-500',
            },
            {
              title: t('stockWarning'),
              value: data.overview.lowStock,
              icon: AlertTriangle,
              color: 'from-red-500 to-orange-500',
            },
            {
              title: t('todayInbound'),
              value: data.overview.todayInbound,
              icon: ArrowDown,
              color: 'from-emerald-500 to-teal-500',
            },
            {
              title: t('todayOutbound'),
              value: data.overview.todayOutbound,
              icon: ArrowUp,
              color: 'from-orange-500 to-amber-500',
            },
            {
              title: t('warehouseCount'),
              value: data.warehouseOccupancy.length,
              icon: Warehouse,
              color: 'from-purple-500 to-pink-500',
            },
          ].map((s, i) => (
            <div key={i} className={`tech-card tech-glow tech-card-delay-${i + 1} p-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/60">{s.title}</p>
                  <p className="text-xl font-bold mt-1 bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">
                    {s.value}
                  </p>
                </div>
                <div className={`p-2 rounded-lg bg-gradient-to-br ${s.color}`}>
                  <s.icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="tech-card tech-glow p-0 lg:col-span-2">
            <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2 bg-white/5">
              <div className="w-1 h-4 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600" />
              <Warehouse className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-medium text-white/80">{t('warehouseUtilization')}</span>
            </div>
            <div className="p-4">
              {data.warehouseOccupancy.length === 0 ? (
                <p className="text-white/40 text-center py-8">{tc('noData')}</p>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={occupancyChartData}
                      layout="vertical"
                      margin={{ left: 50, right: 20, top: 10, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={80}
                        tick={{ fill: 'rgba(255,255,255,0.8)', fontSize: 11 }}
                      />
                      <Tooltip
                        formatter={(value: number) => [`${value}%`, '利用率']}
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 42, 0.95)',
                          borderColor: '#06b6d4',
                          borderRadius: '8px',
                        }}
                        labelStyle={{ color: '#06b6d4' }}
                      />
                      <Bar dataKey="occupancy" radius={[0, 4, 4, 0]} fill="url(#gradient)" />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#06b6d4" />
                          <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          <div className="tech-card tech-glow p-0">
            <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2 bg-white/5">
              <div className="w-1 h-4 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600" />
              <BarChart3 className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-medium text-white/80">{t('warehouseUtilization')}</span>
            </div>
            <div className="p-4 flex flex-col items-center">
              <div className="relative">
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(ellipse at 50% 15%, rgba(6,182,212,0.08) 0%, transparent 70%)',
                  }}
                />
                <GlassGauge
                  value={Math.round(avgOccupancy)}
                  label={t('utilizationRate')}
                  unit="%"
                  colorArc="#06b6d4"
                  colorDanger="#ff5555"
                  colorSafe="#10b981"
                  dangerStart={85}
                  showCurve
                  history={warehouseHistory}
                  size={140}
                />
              </div>
              <div className="mt-3 w-full space-y-2">
                {warehouses3D.slice(0, 5).map((w, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-white/60 text-xs">{w.name}</span>
                    <span
                      className={`font-bold text-xs ${
                        w.occupancy > 80
                          ? 'text-red-400'
                          : w.occupancy > 50
                            ? 'text-yellow-400'
                            : 'text-green-400'
                      }`}
                    >
                      {w.occupancy.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="tech-card tech-glow p-0">
            <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2 bg-white/5">
              <div className="w-1 h-4 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600" />
              <PieChartIcon className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-medium text-white/80">
                {t('materialCategoryDistribution')}
              </span>
            </div>
            <div className="p-4 h-[300px]">
              {data.categoryDistribution.length === 0 ? (
                <p className="text-white/40 text-center py-8">{tc('noData')}</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={categoryChartData}
                    margin={{ left: 0, right: 0, top: 10, bottom: 10 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.1)"
                      horizontal={false}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                    />
                    <YAxis
                      tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value}种`, '数量']}
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        borderColor: '#8b5cf6',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: '#8b5cf6' }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="tech-card tech-glow p-0 lg:col-span-2">
            <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2 bg-white/5">
              <div className="w-1 h-4 rounded-full bg-gradient-to-b from-green-400 to-emerald-600" />
              <TrendingDown className="h-4 w-4 text-green-400" />
              <span className="text-sm font-medium text-white/80">{t('inoutTrend')}</span>
            </div>
            <div className="p-4 h-[300px]">
              {data.recentTransactions.length === 0 ? (
                <p className="text-white/40 text-center py-8">{tc('noData')}</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={trendChartData}
                    margin={{ left: 0, right: 0, top: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                    />
                    <YAxis
                      tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        borderColor: '#10b981',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: '#10b981' }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="inbound"
                      name="入库"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ fill: '#10b981', strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="outbound"
                      name="出库"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ fill: '#f59e0b', strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="tech-card tech-glow p-0">
            <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2 bg-white/5">
              <div className="w-1 h-4 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600" />
              <BarChart3 className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-medium text-white/80">
                {t('materialCategoryDistribution')}
              </span>
            </div>
            <AutoScroll maxHeight={320}>
              <div className="p-4">
                {data.categoryDistribution.length === 0 ? (
                  <p className="text-white/40 text-center py-8">{tc('noData')}</p>
                ) : (
                  <div className="space-y-2">
                    {data.categoryDistribution.map((c, i) => {
                      const total = data.categoryDistribution.reduce((a, b) => a + b.count, 0);
                      const maxCount = Math.max(
                        ...data.categoryDistribution.map((d) => d.count),
                        1
                      );
                      const _pct = total > 0 ? Math.round((c.count / total) * 100) : 0;
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: COLORS[i % COLORS.length] }}
                          />
                          <span className="text-sm flex-1 text-white/70">
                            {c.material_type || tc('unclassified')}
                          </span>
                          <div className="flex-1 bg-white/10 rounded-full h-5 relative overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${(c.count / maxCount) * 100}%`,
                                background: 'linear-gradient(90deg, #06b6d4, #3b82f6)',
                              }}
                            />
                            <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                              {c.count}种
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </AutoScroll>
          </div>

          <div className="tech-card tech-glow p-0">
            <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2 bg-white/5">
              <div className="w-1 h-4 rounded-full bg-gradient-to-b from-red-400 to-orange-500" />
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <span className="text-sm font-medium text-white/80">{t('stockWarning')}</span>
            </div>
            <AutoScroll maxHeight={320}>
              <div className="p-4">
                {data.lowStockItems.length === 0 ? (
                  <p className="text-white/40 text-center py-8">{t('noAlerts')}</p>
                ) : (
                  <div className="space-y-2">
                    {data.lowStockItems.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 rounded-lg bg-red-500/5 border border-red-500/20"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white/80 truncate">{item.material_name}</p>
                          <p className="text-[10px] text-white/40 font-mono">
                            {item.material_code}
                          </p>
                        </div>
                        <div className="text-right ml-2">
                          <p className="text-xs text-red-400 font-bold">
                            {Number(item.stock_qty).toLocaleString()} {item.unit}
                          </p>
                          <p className="text-[10px] text-white/30">
                            {tc('lowest')} {Number(item.min_stock).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </AutoScroll>
          </div>
        </div>

        <div className="relative z-10 tech-card tech-glow p-0">
          <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2 bg-white/5">
            <div className="w-1 h-4 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600" />
            <Clock className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-medium text-white/80">{t('recentInoutRecords')}</span>
          </div>
          <div className="p-4">
            {data.recentTransactions.length === 0 ? (
              <p className="text-white/40 text-center py-8">{tc('noRecords')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 px-3 text-white/60 font-medium">
                        {tc('inspectionType')}
                      </th>
                      <th className="text-left py-2 px-3 text-white/60 font-medium">
                        {tc('materialCode')}
                      </th>
                      <th className="text-left py-2 px-3 text-white/60 font-medium">
                        {tc('materialName')}
                      </th>
                      <th className="text-left py-2 px-3 text-white/60 font-medium">
                        {tc('planQty')}
                      </th>
                      <th className="text-left py-2 px-3 text-white/60 font-medium">
                        {tc('time')}
                      </th>
                      <th className="text-left py-2 px-3 text-white/60 font-medium">
                        {tc('remark')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentTransactions.slice(0, 10).map((t, i) => (
                      <tr
                        key={i}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${
                              t.transaction_type === 'inbound'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                            }`}
                          >
                            {t.transaction_type === 'inbound'
                              ? tc('inbound')
                              : t.transaction_type === 'outbound'
                                ? tc('outbound')
                                : t.transaction_type}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-cyan-300 text-xs">
                          {t.material_code}
                        </td>
                        <td className="py-2 px-3 text-white/80 text-xs">{t.material_name}</td>
                        <td className="py-2 px-3 text-white/60 text-xs font-medium">
                          {Number(t.quantity).toLocaleString()} {t.unit}
                        </td>
                        <td className="py-2 px-3 text-white/50 text-xs">
                          {t.create_time?.substring(5, 16)}
                        </td>
                        <td className="py-2 px-3 text-white/40 text-xs">{t.remark || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
