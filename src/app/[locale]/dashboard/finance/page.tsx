'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState, useRef } from 'react';
import { MainLayout } from '@/components/layout';
import { useCompanyName } from '@/hooks/useCompanyName';
import { useDashboardScale } from '@/hooks/useDashboardScale';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Maximize,
  Minimize,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Target,
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { VerticalMarquee } from '@/components/ui/VerticalMarquee';

interface FinanceData {
  overview: {
    totalReceivable: number;
    totalPayable: number;
    monthRevenue: number;
    monthExpense: number;
    revenueChange: number;
    expenseChange: number;
    netProfit: number;
  };
  revenueTrend: { date: string; amount: number }[];
  expenseTrend: { date: string; amount: number }[];
  receivableAging: { aging: string; count: number; total: number }[];
  recentTransactions: { type: string; id: number; amount: number; date: string; remark: string }[];
  topPayables: { supplier_name: string; total: number; count: number }[];
}

/** 轴标签日期格式化：ISO(2026-09-13T16:00:00.000Z) → 09-13；已是短串则原样截断 */
function fmtAxisDate(v: unknown): string {
  const s = String(v ?? '');
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[2]}-${m[3]}` : s.slice(0, 5);
}

function DonutChart({
  percentage,
  color,
  size = 120,
}: {
  percentage: number;
  color: string;
  size?: number;
}) {
  const t = useTranslations('Dashboard');
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
        className="transition-[stroke-dashoffset] duration-1000 ease-out"
      />
      <text x="60" y="55" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">
        {percentage.toFixed(1)}%
      </text>
      <text x="60" y="75" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="10">
        {t('profitMargin')}
      </text>
    </svg>
  );
}

function DualLineChart({
  revenueData,
  expenseData,
  width = 400,
  height = 150,
}: {
  revenueData: { date: string; amount: number }[];
  expenseData: { date: string; amount: number }[];
  width?: number;
  height?: number;
}) {
  const tc = useTranslations('Common');
  const allData = [...revenueData, ...expenseData];
  if (allData.length === 0) return null;

  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxVal = Math.max(
    ...revenueData.map((d) => d.amount),
    ...expenseData.map((d) => d.amount),
    1
  );

  const getX = (i: number, total: number) => padding.left + (i / (total - 1 || 1)) * chartWidth;
  const getY = (val: number) => padding.top + chartHeight - (val / maxVal) * chartHeight;

  const revenuePath = revenueData
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i, revenueData.length)} ${getY(d.amount)}`)
    .join(' ');
  const expensePath = expenseData
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i, expenseData.length)} ${getY(d.amount)}`)
    .join(' ');

  return (
    <svg width={width} height={height} className="w-full">
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

      {revenueData
        .filter(
          (_, i) => i % Math.ceil(revenueData.length / 6) === 0 || i === revenueData.length - 1
        )
        .map((d, i) => {
          const idx = revenueData.indexOf(d);
          return (
            <text
              key={i}
              x={getX(idx, revenueData.length)}
              y={height - 5}
              textAnchor="middle"
              fill="rgba(255,255,255,0.5)"
              fontSize="10"
            >
              {fmtAxisDate(d.date)}
            </text>
          );
        })}

      <path d={revenuePath} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
      <path d={expensePath} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />

      {revenueData.map((d, i) => (
        <circle
          key={`r${i}`}
          cx={getX(i, revenueData.length)}
          cy={getY(d.amount)}
          r="3"
          fill="#22c55e"
        />
      ))}
      {expenseData.map((d, i) => (
        <circle
          key={`e${i}`}
          cx={getX(i, expenseData.length)}
          cy={getY(d.amount)}
          r="3"
          fill="#ef4444"
        />
      ))}

      <g transform={`translate(${width - 150}, 10)`}>
        <line x1="0" y1="0" x2="20" y2="0" stroke="#22c55e" strokeWidth="2" />
        <text x="25" y="4" fill="rgba(255,255,255,0.7)" fontSize="10">
          {tc('income')}
        </text>
        <line x1="0" y1="15" x2="20" y2="15" stroke="#ef4444" strokeWidth="2" />
        <text x="25" y="19" fill="rgba(255,255,255,0.7)" fontSize="10">
          {tc('expense')}
        </text>
      </g>
    </svg>
  );
}

function HorizontalBarChart({
  data,
}: {
  data: { supplier_name: string; count: number; total: number }[];
}) {
  const tc = useTranslations('Common');
  const locale = useLocale();
  if (data.length === 0) return null;
  const maxTotal = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs w-24 text-right text-[#8A4A22] dark:text-cyan-300 truncate">
            {d.supplier_name || tc('unknown')}
          </span>
          <div className="flex-1 bg-slate-200 dark:bg-white/10 rounded-full h-5 relative overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${(d.total / maxTotal) * 100}%`,
                background: `linear-gradient(90deg, #f97316, #ef4444)`,
              }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-slate-900 dark:text-gray-200 dark:text-white">
              ¥{(d.total / 100).toLocaleString(locale, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FinanceDashboard() {
  const ts = useTranslations('Dashboard');
  const t = useTranslations('Dashboard');
  const tc = useTranslations('Common');
  const locale = useLocale();

  const { companyName } = useCompanyName();
  const [data, setData] = useState<FinanceData>({
    overview: {
      totalReceivable: 0,
      totalPayable: 0,
      monthRevenue: 0,
      monthExpense: 0,
      revenueChange: 0,
      expenseChange: 0,
      netProfit: 0,
    },
    revenueTrend: [],
    expenseTrend: [],
    receivableAging: [],
    recentTransactions: [],
    topPayables: [],
  });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const dashScale = useDashboardScale();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await authFetch('/api/dashboard/finance');
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

  const toggleFullscreen = async () => {
    const el = dashboardRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      const isDark = document.documentElement.classList.contains('dark');
      el.style.background = isDark
        ? 'linear-gradient(135deg, #091637 0%, #010205 100%)'
        : 'linear-gradient(135deg, #FDFBF6 0%, #F1E7D6 100%)';
      // 容器带 zoom：CSS 长度先按缩放前的布局值算，再乘 dashScale 渲染。
      // 故全屏铺满要除以 dashScale，否则 2560 屏（scale≈1.33）会溢出到 ~3400px。
      el.style.width = `calc(100vw / ${dashScale})`;
      el.style.height = `calc(100vh / ${dashScale})`;
      el.style.minHeight = `calc(100vh / ${dashScale})`;
      el.style.padding = '1.5rem';
      el.style.overflowY = 'auto';
      await el.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      el.style.background = '';
      el.style.width = '';
      el.style.height = '';
      el.style.minHeight = '';
      el.style.padding = '';
      el.style.overflowY = '';
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

  const formatMoney = (v: number) =>
    '¥' + (v / 100).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const profitRate =
    data.overview.monthRevenue > 0
      ? (data.overview.netProfit / data.overview.monthRevenue) * 100
      : 0;

  return (
    <MainLayout>
      <div
        ref={dashboardRef}
        style={{ zoom: dashScale }}
        className="dash-zoom dash-scope dashboard-gradient min-h-full text-slate-900 dark:text-gray-200 dark:text-white p-4 relative overflow-hidden"
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-[#A0522D]/5 rounded-full blur-3xl animate-blob dark:bg-cyan-500/5" />
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
                <h1 className="text-2xl font-bold tracking-wider bg-gradient-to-r from-[#8A4A22] via-[#A0522D] to-[#8A4A22] dark:from-cyan-300 dark:via-blue-400 dark:to-cyan-300 bg-clip-text text-transparent">
                  {companyName}
                </h1>
                <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5">{t('financeMonitorSubtitle')}</p>
              </div>
              <div className="tech-title-line-right" />
            </div>
            <div className="tech-title-bottom-line" />
          </div>

          <div className="flex-1 flex justify-end items-center gap-4">
            <div className="text-right">
              <div className="text-lg font-mono font-bold text-[#8A4A22] dark:text-cyan-400">
                {currentTime && formatTime(currentTime)}
              </div>
            </div>
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 transition-colors"
              title={isFullscreen ? t('exitFullscreen') : t('fullscreen')}
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4 text-[#8A4A22] dark:text-cyan-400" />
              ) : (
                <Maximize className="h-4 w-4 text-[#8A4A22] dark:text-cyan-400" />
              )}
            </button>
            <div className="px-3 py-1 rounded-full bg-[#A0522D]/15 border border-[#A0522D]/30 text-xs text-[#8A4A22] dark:bg-cyan-500/20 dark:border-cyan-500/30 dark:text-cyan-300">
              {loading ? tc('loading') : '● ' + t('realtime')}
            </div>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            {
              title: t('totalReceivable'),
              value: formatMoney(data.overview.totalReceivable),
              icon: ArrowUpRight,
              color: 'from-blue-500 to-cyan-500',
            },
            {
              title: t('totalPayable'),
              value: formatMoney(data.overview.totalPayable),
              icon: ArrowDownRight,
              color: 'from-orange-500 to-red-500',
            },
            {
              title: t('monthlyIncome'),
              value: formatMoney(data.overview.monthRevenue),
              icon: TrendingUp,
              color: 'from-green-500 to-emerald-500',
            },
            {
              title: t('monthlyExpense'),
              value: formatMoney(data.overview.monthExpense),
              icon: TrendingDown,
              color: 'from-red-500 to-pink-500',
            },
            {
              title: t('netProfit'),
              value: formatMoney(data.overview.netProfit),
              icon: Wallet,
              color:
                data.overview.netProfit >= 0
                  ? 'from-emerald-500 to-green-500'
                  : 'from-red-500 to-orange-500',
            },
          ].map((s, i) => (
            <div key={i} className={`tech-card tech-glow tech-card-delay-${i + 1} p-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 dark:text-white/60">{s.title}</p>
                  <p className="text-xl font-bold mt-1 bg-gradient-to-r from-[#8A4A22] to-[#9C5527] dark:from-cyan-300 dark:to-blue-300 bg-clip-text text-transparent">
                    {s.value}
                  </p>
                </div>
                <div className={`p-3 rounded-lg bg-gradient-to-br ${s.color}`}>
                  <s.icon className="h-5 w-5 text-slate-900 dark:text-gray-200 dark:text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="tech-card tech-glow p-0">
            <div className="px-4 py-2 border-b border-slate-200 dark:border-white/10 flex items-center gap-2 bg-white dark:bg-white/5">
              <div className="w-1 h-4 rounded-full bg-gradient-to-b from-[#C2763C] to-[#8A4A22] dark:from-cyan-400 dark:to-blue-600" />
              <Target className="h-4 w-4 text-[#8A4A22] dark:text-cyan-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-gray-200 dark:text-white/80">{t('profitMargin')}</span>
            </div>
            <div className="p-4">
              <div className="flex justify-center">
                <DonutChart
                  percentage={Math.max(profitRate, 0)}
                  color={profitRate >= 0 ? '#22c55e' : '#ef4444'}
                  size={160}
                />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-xs text-slate-500 dark:text-white/50">{t('monthlyIncome')}</p>
                  <p className="text-lg font-bold text-green-400">
                    {formatMoney(data.overview.monthRevenue)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-white/50">{t('monthlyExpense')}</p>
                  <p className="text-lg font-bold text-red-400">
                    {formatMoney(data.overview.monthExpense)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="tech-card tech-glow p-0 lg:col-span-2">
            <div className="px-4 py-2 border-b border-slate-200 dark:border-white/10 flex items-center gap-2 bg-white dark:bg-white/5">
              <div className="w-1 h-4 rounded-full bg-gradient-to-b from-[#C2763C] to-[#8A4A22] dark:from-cyan-400 dark:to-blue-600" />
              <Activity className="h-4 w-4 text-[#8A4A22] dark:text-cyan-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-gray-200 dark:text-white/80">{t('incomeExpenseTrend')}</span>
            </div>
            <div className="p-4">
              {data.revenueTrend.length === 0 && data.expenseTrend.length === 0 ? (
                <p className="text-slate-400 dark:text-white/40 text-center py-8">{tc('noData')}</p>
              ) : (
                <DualLineChart
                  revenueData={data.revenueTrend}
                  expenseData={data.expenseTrend}
                  width={600}
                  height={200}
                />
              )}
            </div>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="tech-card tech-glow p-0">
            <div className="px-4 py-2 border-b border-slate-200 dark:border-white/10 flex items-center gap-2 bg-white dark:bg-white/5">
              <div className="w-1 h-4 rounded-full bg-gradient-to-b from-orange-400 to-red-500" />
              <AlertTriangle className="h-4 w-4 text-orange-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-gray-200 dark:text-white/80">{t('agingAnalysis')}</span>
            </div>
            <div className="p-4">
              {data.receivableAging.length === 0 ? (
                <p className="text-slate-400 dark:text-white/40 text-center py-8">{tc('noData')}</p>
              ) : (
                <div className="space-y-4">
                  {data.receivableAging.map((a, i) => {
                    const total = data.receivableAging.reduce((s, x) => s + x.total, 0);
                    const pct = total > 0 ? Math.round((a.total / total) * 100) : 0;
                    const isOverdue = a.aging === ts('k_1nrub1o');
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${isOverdue ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-gray-200 dark:text-white/80 border border-slate-200 dark:border-white/10'}`}
                          >
                            {a.aging}
                          </span>
                          <span className="text-slate-500 dark:text-white/50">
                            {a.count}
                            {tc('agingRecordsUnit')}
                            {formatMoney(a.total)} ({pct}%)
                          </span>
                        </div>
                        <div className="bg-slate-200 dark:bg-white/10 rounded-full h-3 relative overflow-hidden">
                          <div
                            className="h-full rounded-full transition-[width]"
                            style={{
                              width: `${pct}%`,
                              background: isOverdue
                                ? 'linear-gradient(90deg, #ef4444, #f97316)'
                                : 'linear-gradient(90deg, #22c55e, #06b6d4)',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="tech-card tech-glow p-0">
            <div className="px-4 py-2 border-b border-slate-200 dark:border-white/10 flex items-center gap-2 bg-white dark:bg-white/5">
              <div className="w-1 h-4 rounded-full bg-gradient-to-b from-[#C2763C] to-[#8A4A22] dark:from-cyan-400 dark:to-blue-600" />
              <DollarSign className="h-4 w-4 text-[#8A4A22] dark:text-cyan-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-gray-200 dark:text-white/80">{t('topSuppliers')}</span>
            </div>
            <div className="p-4">
              {data.topPayables.length === 0 ? (
                <p className="text-slate-400 dark:text-white/40 text-center py-8">{tc('noData')}</p>
              ) : (
                <HorizontalBarChart data={data.topPayables.slice(0, 5)} />
              )}
            </div>
          </div>
        </div>

        <div className="relative z-10 tech-card tech-glow tech-flat p-0">
          <div className="px-4 py-2 border-b border-slate-200 dark:border-white/10 flex items-center gap-2 bg-white dark:bg-white/5">
            <div className="w-1 h-4 rounded-full bg-gradient-to-b from-[#C2763C] to-[#8A4A22] dark:from-cyan-400 dark:to-blue-600" />
            <Clock className="h-4 w-4 text-[#8A4A22] dark:text-cyan-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-gray-200 dark:text-white/80">{t('recentTransactions')}</span>
          </div>
          <div className="p-4">
            {data.recentTransactions.length === 0 ? (
              <p className="text-slate-400 dark:text-white/40 text-center py-8">{tc('noRecords')}</p>
            ) : (
              <VerticalMarquee maxHeight={300} speed={28}>
                <div className="space-y-2">
                  {data.recentTransactions.slice(0, 10).map((t, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-white/[0.03] hover:bg-white dark:bg-white/5 transition-colors"
                    >
                      <span
                        className={`px-2 py-0.5 rounded text-xs shrink-0 ${
                          t.type === 'receipt'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {t.type === 'receipt' ? tc('income') : tc('expense')}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-500 dark:text-white/60 truncate">{t.remark || '-'}</p>
                        <p className="text-[10px] text-slate-400 dark:text-white/40">{t.date?.substring(0, 10)}</p>
                      </div>
                      <span
                        className={`font-mono font-medium text-sm shrink-0 ${
                          t.type === 'receipt' ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {t.type === 'receipt' ? '+' : '-'}
                        {formatMoney(t.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </VerticalMarquee>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
