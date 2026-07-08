'use client';

import { useEffect, useState, useRef } from 'react';
import { MainLayout } from '@/components/layout';
import { useCompanyName } from '@/hooks/useCompanyName';
import GlassKnob from '@/components/GlassKnob';
import GlassGauge from '@/components/GlassGauge';
import {
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingDown,
  BarChart3,
  Clock,
  Maximize,
  Minimize,
  Activity,
  Target,
  AlertCircle,
  Zap,
  ClipboardCheck,
  Calendar,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

interface QualityData {
  overview: {
    totalInspections: number;
    passRate: number;
    todayInspections: number;
    todayPassRate: number;
    pendingInspections: number;
    defectRate: number;
    passedInspections: number;
    failedInspections: number;
  };
  byType: { inspect_type: string; total: number; passed: number }[];
  defectTrend: { date: string; total: number; defects: number }[];
  topDefects: { defect_type: string; count: number }[];
  recentInspections: {
    id: number;
    inspect_no: string;
    inspect_type: string;
    inspect_result: string;
    inspector: string;
    inspect_time: string;
    remark: string;
  }[];
  processQuality: {
    product_name: string;
    burdening_status: number;
    inspect_count: number;
    passed: number;
  }[];
}

// 环形图组件
function DonutChart({
  percentage,
  color,
  size = 120,
}: {
  percentage: number;
  color: string;
  size?: number;
}) {
  const tc = useTranslations('Common');
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="12"
      />
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="12"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 60 60)"
        className="transition-all duration-1000 ease-out"
      />
      <text x="60" y="55" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">
        {percentage.toFixed(1)}%
      </text>
      <text x="60" y="75" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="10">
        {tc('qualityPassRate')}
      </text>
    </svg>
  );
}

// 折线图组件
function LineChart({
  data,
  width = 400,
  height = 150,
}: {
  data: { date: string; total: number; defects: number }[];
  width?: number;
  height?: number;
}) {
  const tc = useTranslations('Common');
  if (data.length === 0) return null;

  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxTotal = Math.max(...data.map((d) => d.total), 1);
  const maxDefects = Math.max(...data.map((d) => d.defects), 1);
  const maxVal = Math.max(maxTotal, maxDefects);

  const getX = (i: number) => padding.left + (i / (data.length - 1 || 1)) * chartWidth;
  const getY = (val: number) => padding.top + chartHeight - (val / maxVal) * chartHeight;

  const totalPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.total)}`)
    .join(' ');
  const defectsPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.defects)}`)
    .join(' ');

  return (
    <svg width={width} height={height} className="w-full">
      {/* 网格线 */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
        <g key={i}>
          <line
            x1={padding.left}
            y1={padding.top + chartHeight * ratio}
            x2={width - padding.right}
            y2={padding.top + chartHeight * ratio}
            stroke="rgba(255,255,255,0.1)"
            strokeDasharray="4 4"
          />
          <text
            x={padding.left - 5}
            y={padding.top + chartHeight * ratio + 4}
            textAnchor="end"
            fill="rgba(255,255,255,0.5)"
            fontSize="10"
          >
            {Math.round(maxVal * (1 - ratio))}
          </text>
        </g>
      ))}

      {/* X轴标签 */}
      {data
        .filter((_, i) => i % Math.ceil(data.length / 6) === 0 || i === data.length - 1)
        .map((d, i, arr) => {
          const idx = data.indexOf(d);
          return (
            <text
              key={i}
              x={getX(idx)}
              y={height - 5}
              textAnchor="middle"
              fill="rgba(255,255,255,0.5)"
              fontSize="10"
            >
              {d.date.substring(5)}
            </text>
          );
        })}

      {/* 检验总数线 */}
      <path d={totalPath} fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" />

      {/* 不良数线 */}
      <path d={defectsPath} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />

      {/* 数据点 */}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={getX(i)} cy={getY(d.total)} r="3" fill="#06b6d4" />
          <circle cx={getX(i)} cy={getY(d.defects)} r="3" fill="#ef4444" />
        </g>
      ))}

      {/* 图例 */}
      <g transform={`translate(${width - 150}, 10)`}>
        <line x1="0" y1="0" x2="20" y2="0" stroke="#06b6d4" strokeWidth="2" />
        <text x="25" y="4" fill="rgba(255,255,255,0.7)" fontSize="10">
           {tc('totalInspections')}
          </text>
          <line x1="0" y1="15" x2="20" y2="15" stroke="#ef4444" strokeWidth="2" />
          <text x="25" y="19" fill="rgba(255,255,255,0.7)" fontSize="10">
           {tc('defectsCount')}
          </text>
      </g>
    </svg>
  );
}

// 水平条形图组件
function HorizontalBarChart({ data }: { data: { defect_type: string; count: number }[] }) {
  const tc = useTranslations('Common');
  if (data.length === 0) return null;
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs w-20 text-right text-cyan-300 truncate">
            {d.defect_type || tc('unknown')}
          </span>
          <div className="flex-1 bg-white/10 rounded-full h-5 relative overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(d.count / maxCount) * 100}%`,
                background: `linear-gradient(90deg, #06b6d4, #3b82f6)`,
              }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
              {d.count}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function QualityDashboard() {
  // 翻译钩子
  const t = useTranslations('Dashboard');
  const tc = useTranslations('Common');

  const { companyName } = useCompanyName();
  const [data, setData] = useState<QualityData>({
    overview: {
      totalInspections: 0,
      passRate: 0,
      todayInspections: 0,
      todayPassRate: 0,
      pendingInspections: 0,
      defectRate: 0,
      passedInspections: 0,
      failedInspections: 0,
    },
    byType: [],
    defectTrend: [],
    topDefects: [],
    recentInspections: [],
    processQuality: [],
  });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [passRateHistory, setPassRateHistory] = useState<number[]>([92, 94, 91, 95, 93, 96]);
  const [defectRateHistory, setDefectRateHistory] = useState<number[]>([8, 6, 9, 5, 7, 4]);

  useEffect(() => {
    const t = setInterval(() => {
      setPassRateHistory((h) => {
        const val = Math.max(70, Math.min(100, h[h.length - 1] + (Math.random() * 6 - 3)));
        return h.length > 20 ? [...h.slice(1), Math.round(val)] : [...h, Math.round(val)];
      });
      setDefectRateHistory((h) => {
        const val = Math.max(0, Math.min(30, h[h.length - 1] + (Math.random() * 6 - 3)));
        return h.length > 20 ? [...h.slice(1), Math.round(val)] : [...h, Math.round(val)];
      });
    }, 2000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/dashboard/quality');
        const result = await res.json();
        if (result.success && result.data) setData(result.data);
      } catch (e) {
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

        <div className="relative z-10 flex items-center justify-between mb-6">
          <div className="flex-1" />
          <div className="tech-title-wrapper">
            <div className="tech-title-row">
              <div className="tech-title-line-left" />
              <div className="text-center">
                <h1 className="text-2xl font-bold tracking-wider bg-gradient-to-r from-cyan-300 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
                  {companyName}
                </h1>
                <p className="text-xs text-white/50 mt-0.5">{t('qualityMonitor')}</p>
              </div>
              <div className="tech-title-line-right" />
            </div>
            <div className="tech-title-bottom-line" />
          </div>

          <div className="flex-1 flex justify-end items-center gap-4">
            <div className="text-right">
              <div className="text-lg font-mono font-bold text-cyan-400">
                {currentTime && formatTime(currentTime)}
              </div>
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
            <div className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-xs text-cyan-300">
              {loading ? tc('loading') : '● ' + t('realtime')}
            </div>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            {
              title: t('totalInspections'),
              value: data.overview.totalInspections,
              icon: ClipboardCheck,
              color: 'from-cyan-500 to-blue-500',
            },
            {
              title: t('overallPassRate'),
              value: `${data.overview.passRate}%`,
              icon: CheckCircle,
              color: 'from-green-500 to-emerald-500',
            },
            {
              title: t('todayInspections'),
              value: data.overview.todayInspections,
              icon: Calendar,
              color: 'from-amber-500 to-orange-500',
            },
            {
              title: t('defectRate'),
              value: `${data.overview.defectRate}%`,
              icon: AlertTriangle,
              color: 'from-red-500 to-orange-500',
            },
          ].map((s, i) => (
            <div key={i} className={`tech-card tech-glow tech-card-delay-${i + 1} p-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/60">{s.title}</p>
                  <p className="text-2xl font-bold mt-1 bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">
                    {s.value}
                  </p>
                </div>
                <div className={`p-3 rounded-lg bg-gradient-to-br ${s.color}`}>
                  <s.icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="tech-card tech-glow p-0">
            <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2 bg-white/5">
              <div className="w-1 h-4 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600" />
              <Target className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-medium text-white/80">{t('qualityPassRate')}</span>
            </div>
            <div className="p-4">
              <div className="flex justify-center">
                <DonutChart percentage={data.overview.passRate} color="#06b6d4" size={160} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-xs text-white/50">{tc('qualified')}</p>
                  <p className="text-lg font-bold text-green-400">
                    {data.overview.passedInspections || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/50">{tc('unqualified')}</p>
                  <p className="text-lg font-bold text-red-400">
                    {data.overview.failedInspections || '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="tech-card tech-glow p-0 lg:col-span-2">
            <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2 bg-white/5">
              <div className="w-1 h-4 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600" />
              <TrendingDown className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-medium text-white/80">{t('defectTrend')}</span>
            </div>
            <div className="p-4">
              {data.defectTrend.length === 0 ? (
                  <p className="text-white/40 text-center py-8">{tc('noData')}</p>
                ) : (
                <LineChart data={data.defectTrend} width={600} height={200} />
              )}
            </div>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-12 gap-4 mb-6">
          <div className="col-span-3">
            <div className="tech-card tech-glow p-0 h-full">
              <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2 bg-white/5">
                <div className="w-1 h-4 rounded-full bg-gradient-to-b from-green-400 to-emerald-600" />
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-sm font-medium text-white/80">{t('passRateGauge')}</span>
              </div>
              <div className="p-3 flex flex-col items-center relative">
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(ellipse at 50% 15%, rgba(21,255,187,0.08) 0%, transparent 70%)',
                  }}
                />
                <GlassGauge
                  value={data.overview.passRate}
                  label={t('overallPassRate')}
                  unit="%"
                  colorArc="#15ffbb"
                  colorDanger="#ff5555"
                  colorSafe="#15ffbb"
                  dangerStart={90}
                  showCurve
                  history={passRateHistory}
                  size={140}
                />
              </div>
            </div>
          </div>
          <div className="col-span-3">
            <div className="tech-card tech-glow p-0 h-full">
              <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2 bg-white/5">
                <div className="w-1 h-4 rounded-full bg-gradient-to-b from-red-400 to-orange-500" />
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <span className="text-sm font-medium text-white/80">{t('defectRateGauge')}</span>
              </div>
              <div className="p-3 flex flex-col items-center relative">
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(ellipse at 50% 15%, rgba(239,68,68,0.08) 0%, transparent 70%)',
                  }}
                />
                <GlassGauge
                  value={data.overview.defectRate}
                  label={t('defectRate')}
                  unit="%"
                  colorArc="#ef4444"
                  colorDanger="#ef4444"
                  colorSafe="#22d3ee"
                  dangerStart={10}
                  showCurve
                  history={defectRateHistory}
                  size={140}
                />
              </div>
            </div>
          </div>
          <div className="col-span-3">
            <div className="tech-card tech-glow p-0 h-full">
              <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2 bg-white/5">
                <div className="w-1 h-4 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600" />
                <Activity className="h-4 w-4 text-cyan-400" />
                <span className="text-sm font-medium text-white/80">{t('todayPassRateGauge')}</span>
              </div>
              <div className="p-3 flex flex-col items-center relative">
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(ellipse at 50% 15%, rgba(31,207,255,0.08) 0%, transparent 70%)',
                  }}
                />
                <GlassGauge
                  value={data.overview.todayPassRate}
                  label={t('todayPassRate')}
                  unit="%"
                  colorArc="#1fcfff"
                  colorDanger="#ff5555"
                  colorSafe="#22d3ee"
                  dangerStart={85}
                  size={140}
                />
              </div>
            </div>
          </div>
          <div className="col-span-3">
            <div className="tech-card tech-glow p-0 h-full">
              <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2 bg-white/5">
                <div className="w-1 h-4 rounded-full bg-gradient-to-b from-purple-400 to-pink-500" />
                <Shield className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-medium text-white/80">{t('inspectionStandard')}</span>
              </div>
              <div className="p-3 flex flex-col items-center relative">
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(ellipse at 50% 20%, rgba(168,85,247,0.08) 0%, transparent 70%)',
                  }}
                />
                <GlassKnob
                  value={data.overview.passRate}
                  accent="#a855f7"
                  size={100}
                  label={t('passThreshold')}
                />
                <div className="mt-3 text-purple-300 font-extrabold text-xl">
                  {Math.round(data.overview.passRate)}
                  <span className="text-white/40 text-sm ml-1">%</span>
                </div>
                <div className="text-white/30 text-xs mt-1">{t('passBaseline')}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="tech-card tech-glow p-0">
            <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2 bg-white/5">
              <div className="w-1 h-4 rounded-full bg-gradient-to-b from-red-400 to-orange-500" />
              <AlertCircle className="h-4 w-4 text-red-400" />
              <span className="text-sm font-medium text-white/80">{t('defectTypeTop5')}</span>
            </div>
            <div className="p-4">
              {data.topDefects.length === 0 ? (
                <p className="text-white/40 text-center py-8">{tc('noData')}</p>
              ) : (
                <HorizontalBarChart data={data.topDefects.slice(0, 5)} />
              )}
            </div>
          </div>

          <div className="tech-card tech-glow p-0">
            <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2 bg-white/5">
              <div className="w-1 h-4 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600" />
              <BarChart3 className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-medium text-white/80">{t('inspectionTypeDistribution')}</span>
            </div>
            {/* 检验类型分布 */}
            <div className="p-4">
              {data.processQuality.length === 0 ? (
                <p className="text-white/40 text-center py-8">{tc('noData')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-2 px-3 text-white/60 font-medium">{tc('productName')}</th>
                        <th className="text-left py-2 px-3 text-white/60 font-medium">{tc('inspectionCount')}</th>
                        <th className="text-left py-2 px-3 text-white/60 font-medium">{tc('passCount')}</th>
                        <th className="text-left py-2 px-3 text-white/60 font-medium">{tc('passRate')}</th>
                        <th className="text-left py-2 px-3 text-white/60 font-medium">{tc('status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.processQuality.map((p, i) => {
                        const rate =
                          p.inspect_count > 0 ? Math.round((p.passed / p.inspect_count) * 100) : 0;
                        return (
                          <tr
                            key={i}
                            className="border-b border-white/5 hover:bg-white/5 transition-colors"
                          >
                            <td className="py-2 px-3 text-white/80">{p.product_name}</td>
                            <td className="py-2 px-3 text-white/60">{p.inspect_count}</td>
                            <td className="py-2 px-3 text-white/60">{p.passed}</td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <div className="bg-white/10 rounded-full h-2 w-24 relative overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                      width: `${rate}%`,
                                      background:
                                        rate >= 95
                                          ? 'linear-gradient(90deg, #10b981, #34d399)'
                                          : rate >= 80
                                            ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                                            : 'linear-gradient(90deg, #ef4444, #f87171)',
                                    }}
                                  />
                                </div>
                                <span className="text-xs text-white/60 w-10">{rate}%</span>
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-xs ${
                                  rate >= 95
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                    : rate >= 80
                                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                }`}
                              >
                                {rate >= 95 ? tc('excellent') : rate >= 80 ? tc('good') : tc('needImprovement')}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
