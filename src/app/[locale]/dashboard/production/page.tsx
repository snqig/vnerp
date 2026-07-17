'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState, useRef } from 'react';
import { MainLayout } from '@/components/layout';
import { useCompanyName } from '@/hooks/useCompanyName';
import GlassGauge from '@/components/GlassGauge';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  PlayCircle,
  BarChart3,
  Activity,
  Users,
  Package,
  Settings,
  Maximize,
  Minimize,
  Target,
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

interface ProductionData {
  overview: {
    totalOrders: number;
    activeOrders: number;
    completedToday: number;
    efficiency: number;
    oee: number;
    qualityRate: number;
  };
  equipmentStatus: {
    id: string;
    name: string;
    type: string;
    status: string;
    efficiency: number;
    currentOrder: string;
    operator: string;
    runtime: number;
  }[];
  productionProgress: {
    orderNo: string;
    customer: string;
    productName: string;
    process: string;
    progress: number;
    planQty: number;
    completedQty: number;
    status: string;
    priority: string;
    estimatedComplete: string;
  }[];
  efficiencyTrend: { time: string; efficiency: number; target: number }[];
  alerts: { id: string; type: string; message: string; severity: string; timestamp: string }[];
  staffStatus: { total: number; onDuty: number; onLeave: number; attendance: number };
}

const STATUS_MAP: Record<string, { labelKey: string; className: string }> = {
  running: {
    labelKey: 'running',
    className: 'bg-green-500/20 text-green-300 border border-green-500/30',
  },
  idle: {
    labelKey: 'standby',
    className: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  },
  maintenance: {
    labelKey: 'underMaintenance',
    className: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  },
  error: { labelKey: 'fault', className: 'bg-red-500/20 text-red-300 border border-red-500/30' },
};

const PRIORITY_MAP: Record<string, { labelKey: string; className: string }> = {
  high: { labelKey: 'high', className: 'bg-red-500/20 text-red-300 border border-red-500/30' },
  medium: {
    labelKey: 'medium',
    className: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  },
  low: { labelKey: 'low', className: 'bg-blue-500/20 text-blue-300 border border-blue-500/30' },
};

function AutoScroll({
  children,
  maxHeight = 320,
  speed = 50,
}: {
  children: React.ReactNode;
  maxHeight?: number;
  speed?: number;
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

export default function ProductionDashboard() {
  // 翻译钩子
  const t = useTranslations('Dashboard');
  const tc = useTranslations('Common');
  const locale = useLocale();

  const { companyName } = useCompanyName();
  const [data, setData] = useState<ProductionData>({
    overview: {
      totalOrders: 0,
      activeOrders: 0,
      completedToday: 0,
      efficiency: 0,
      oee: 0,
      qualityRate: 0,
    },
    equipmentStatus: [],
    productionProgress: [],
    efficiencyTrend: [],
    alerts: [],
    staffStatus: { total: 0, onDuty: 0, onLeave: 0, attendance: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [efficiencyHistory, setEfficiencyHistory] = useState<number[]>([88, 90, 92, 91, 93, 95]);
  const [oeeHistory, setOeeHistory] = useState<number[]>([85, 87, 88, 86, 89, 90]);
  const [qualityHistory, setQualityHistory] = useState<number[]>([94, 95, 96, 95, 97, 96]);

  useEffect(() => {
    const t = setInterval(() => {
      setEfficiencyHistory((h) => {
        const val = Math.max(70, Math.min(100, h[h.length - 1] + (Math.random() * 6 - 3)));
        return h.length > 20 ? [...h.slice(1), Math.round(val)] : [...h, Math.round(val)];
      });
      setOeeHistory((h) => {
        const val = Math.max(60, Math.min(100, h[h.length - 1] + (Math.random() * 6 - 3)));
        return h.length > 20 ? [...h.slice(1), Math.round(val)] : [...h, Math.round(val)];
      });
      setQualityHistory((h) => {
        const val = Math.max(80, Math.min(100, h[h.length - 1] + (Math.random() * 4 - 2)));
        return h.length > 20 ? [...h.slice(1), Math.round(val)] : [...h, Math.round(val)];
      });
    }, 2500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await authFetch('/api/dashboard/production');
        const result = await res.json();
        if (result.success && result.data) {
          const d = result.data;
          setData({
            overview: d.overview || {
              totalOrders: 0,
              activeOrders: 0,
              completedToday: 0,
              efficiency: 0,
              oee: 0,
              qualityRate: 0,
            },
            equipmentStatus: d.equipmentStatus || [],
            productionProgress: (d.recentOrders || []).map((o: Loose) => ({
              orderNo: o.orderNo || '',
              customer: o.customer || '',
              productName: o.product || '',
              process: '',
              progress: o.status === 3 ? 100 : o.status === 2 ? 50 : 0,
              planQty: o.quantity || 0,
              completedQty: o.status === 3 ? o.quantity : Math.round(o.quantity * 0.5),
              status: o.status === 3 ? 'completed' : o.status === 2 ? 'producing' : 'pending',
              priority: 'medium',
              estimatedComplete: '',
            })),
            efficiencyTrend: d.efficiencyTrend || [],
            alerts: [
              ...(d.inkStatus?.expiringSoon > 0
                ? [
                    {
                      id: 'ink-exp',
                      type: 'material',
                      message: t('inkExpiringAlert', { count: d.inkStatus.expiringSoon }),
                      severity: 'medium',
                      timestamp: '',
                    },
                  ]
                : []),
              ...(d.dieStatus?.warning > 0
                ? [
                    {
                      id: 'die-warn',
                      type: 'equipment',
                      message: t('dieUsageAlert', { count: d.dieStatus.warning }),
                      severity: 'medium',
                      timestamp: '',
                    },
                  ]
                : []),
            ],
            staffStatus: d.personnel || { total: 0, onDuty: 0, onLeave: 0, attendance: 0 },
          });
        }
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
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const formatTime = (date: Date) =>
    date.toLocaleString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

  return (
    <MainLayout>
      <div
        ref={dashboardRef}
        className="min-h-screen text-white p-4 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #091637 0%, #010205 100%)' }}
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
                <p className="text-[10px] text-white/50">{t('productionSubtitle')}</p>
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
              title: t('todayWorkOrders'),
              value: data.overview.totalOrders,
              icon: Package,
              color: 'from-cyan-500 to-blue-500',
            },
            {
              title: tc('inProgress'),
              value: data.overview.activeOrders,
              icon: PlayCircle,
              color: 'from-amber-500 to-orange-500',
            },
            {
              title: tc('completed'),
              value: data.overview.completedToday,
              icon: CheckCircle,
              color: 'from-green-500 to-emerald-500',
            },
            {
              title: t('productionEfficiency'),
              value: `${data.overview.efficiency}%`,
              icon: TrendingUp,
              color: 'from-blue-500 to-indigo-500',
            },
            {
              title: 'OEE',
              value: `${data.overview.oee}%`,
              icon: BarChart3,
              color: 'from-purple-500 to-pink-500',
            },
            {
              title: t('qualityYieldRate'),
              value: `${data.overview.qualityRate}%`,
              icon: Activity,
              color: 'from-emerald-500 to-teal-500',
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

        <div className="relative z-10 mb-6">
          <div className="tech-card tech-glow p-0">
            <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2 bg-white/5">
              <div className="w-1 h-4 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600" />
              <Target className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-medium text-white/80">{tc('coreMetrics')}</span>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center relative">
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        'radial-gradient(ellipse at 50% 15%, rgba(6,182,212,0.08) 0%, transparent 70%)',
                    }}
                  />
                  <GlassGauge
                    value={data.overview.efficiency}
                    label={t('productionEfficiency')}
                    unit="%"
                    colorArc="#06b6d4"
                    colorDanger="#ff5555"
                    colorSafe="#06b6d4"
                    dangerStart={85}
                    showCurve
                    history={efficiencyHistory}
                    size={130}
                  />
                </div>
                <div className="flex flex-col items-center relative">
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        'radial-gradient(ellipse at 50% 15%, rgba(139,92,246,0.08) 0%, transparent 70%)',
                    }}
                  />
                  <GlassGauge
                    value={data.overview.oee}
                    label="OEE"
                    unit="%"
                    colorArc="#8b5cf6"
                    colorDanger="#ff5555"
                    colorSafe="#8b5cf6"
                    dangerStart={80}
                    showCurve
                    history={oeeHistory}
                    size={130}
                  />
                </div>
                <div className="flex flex-col items-center relative">
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        'radial-gradient(ellipse at 50% 15%, rgba(16,185,129,0.08) 0%, transparent 70%)',
                    }}
                  />
                  <GlassGauge
                    value={data.overview.qualityRate}
                    label={t('qualityYieldRate')}
                    unit="%"
                    colorArc="#10b981"
                    colorDanger="#ff5555"
                    colorSafe="#10b981"
                    dangerStart={90}
                    showCurve
                    history={qualityHistory}
                    size={130}
                  />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Users className="h-3 w-3 text-cyan-400" />
                    <p className="text-xs text-white/40">{t('attendance')}</p>
                  </div>
                  <p className="text-lg font-bold text-cyan-300">
                    {data.staffStatus.onDuty}
                    <span className="text-white/30 text-sm">/{data.staffStatus.total}</span>
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Activity className="h-3 w-3 text-green-400" />
                    <p className="text-xs text-white/40">{t('attendanceRate')}</p>
                  </div>
                  <p className="text-lg font-bold text-green-300">
                    {data.staffStatus.attendance}
                    <span className="text-white/30 text-sm">%</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="tech-card tech-glow p-0">
            <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2 bg-white/5">
              <div className="w-1 h-4 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600" />
              <Settings className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-medium text-white/80">{t('equipmentMonitor')}</span>
            </div>
            <AutoScroll maxHeight={320}>
              <div className="p-4">
                {data.equipmentStatus.length === 0 ? (
                  <p className="text-white/40 text-center py-8">{tc('noData')}</p>
                ) : (
                  <div className="space-y-3">
                    {data.equipmentStatus.map((eq) => {
                      const cfg = STATUS_MAP[eq.status] || STATUS_MAP.idle;
                      return (
                        <div
                          key={eq.id}
                          className="p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="text-xs font-medium text-white/80">{eq.name}</h4>
                              <p className="text-[10px] text-white/40 mt-0.5">
                                {t('currentWorkOrder')}: {eq.currentOrder}
                              </p>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] ${cfg.className}`}>
                              {tc(cfg.labelKey)}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-white/40">{t('productionEfficiency')}</span>
                              <span className="font-medium">{eq.efficiency}%</span>
                            </div>
                            <div className="bg-white/10 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${eq.efficiency > 80 ? 'bg-green-400' : eq.efficiency > 60 ? 'bg-yellow-400' : 'bg-red-400'}`}
                                style={{ width: `${eq.efficiency}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-white/30">
                              <span>
                                {t('operator')}: {eq.operator}
                              </span>
                              <span>
                                {t('runtime')}: {Math.floor(eq.runtime / 60)}h{eq.runtime % 60}m
                              </span>
                            </div>
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
              <div className="w-1 h-4 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600" />
              <Package className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-medium text-white/80">
                {t('workOrderProductionProgress')}
              </span>
            </div>
            <AutoScroll maxHeight={320}>
              <div className="p-4">
                {data.productionProgress.length === 0 ? (
                  <p className="text-white/40 text-center py-8">{tc('noData')}</p>
                ) : (
                  <div className="space-y-3">
                    {data.productionProgress.map((order) => {
                      const priCfg = PRIORITY_MAP[order.priority] || PRIORITY_MAP.medium;
                      return (
                        <div
                          key={order.orderNo}
                          className="p-3 rounded-lg bg-white/5 border border-white/10"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-cyan-300">
                                {order.orderNo}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] ${priCfg.className}`}
                              >
                                {tc(priCfg.labelKey)}
                              </span>
                              {order.status === 'completed' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-green-500/20 text-green-300 border border-green-500/30">
                                  {tc('completed')}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-white/40">
                              {tc('estimated')}: {order.estimatedComplete || '-'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                            <div>
                              <span className="text-white/40">{tc('customer')}: </span>
                              <span className="text-white/70">{order.customer}</span>
                            </div>
                            <div>
                              <span className="text-white/40">{tc('product')}: </span>
                              <span className="text-white/70">{order.productName}</span>
                            </div>
                            <div>
                              <span className="text-white/40">{tc('process')}: </span>
                              <span className="text-white/70">{order.process || '-'}</span>
                            </div>
                            <div>
                              <span className="text-white/40">{tc('planQty')}: </span>
                              <span className="text-white/70">
                                {(order.completedQty ?? 0).toLocaleString()} /{' '}
                                {(order.planQty ?? 0).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-white/40">{tc('progress')}</span>
                              <span className="font-medium">{order.progress}%</span>
                            </div>
                            <div className="bg-white/10 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${order.progress >= 100 ? 'bg-green-400' : order.progress >= 50 ? 'bg-cyan-400' : 'bg-amber-400'}`}
                                style={{ width: `${order.progress}%` }}
                              />
                            </div>
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
              <span className="text-sm font-medium text-white/80">{t('alertNotifications')}</span>
            </div>
            <AutoScroll maxHeight={320}>
              <div className="p-4">
                {data.alerts.length === 0 ? (
                  <p className="text-white/40 text-center py-8">{t('noAlerts')}</p>
                ) : (
                  <div className="space-y-3">
                    {data.alerts.map((alert) => {
                      const severityClass =
                        alert.severity === 'high'
                          ? 'border-red-500/30 bg-red-500/5'
                          : alert.severity === 'medium'
                            ? 'border-amber-500/30 bg-amber-500/5'
                            : 'border-blue-500/30 bg-blue-500/5';
                      const iconColor =
                        alert.severity === 'high'
                          ? 'text-red-400'
                          : alert.severity === 'medium'
                            ? 'text-amber-400'
                            : 'text-blue-400';
                      const AlertIcon =
                        alert.type === 'efficiency'
                          ? TrendingDown
                          : alert.type === 'quality'
                            ? AlertTriangle
                            : alert.type === 'equipment'
                              ? Settings
                              : Package;
                      return (
                        <div key={alert.id} className={`p-3 rounded-lg border ${severityClass}`}>
                          <div className="flex items-start gap-2">
                            <AlertIcon className={`h-4 w-4 mt-0.5 ${iconColor}`} />
                            <div className="flex-1">
                              <p className="text-xs text-white/80">{alert.message}</p>
                              {alert.timestamp && (
                                <p className="text-[10px] text-white/30 mt-1">{alert.timestamp}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </AutoScroll>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
