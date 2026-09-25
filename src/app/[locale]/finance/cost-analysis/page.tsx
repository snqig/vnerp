'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { MainLayout } from '@/components/layout';
import { StatsCards, StatsItem } from '@/components/stats-cards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { authFetch } from '@/lib/auth-fetch';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Percent,
  AlertTriangle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface TrendItem {
  month: string;
  total: number;
  material: number;
  labor: number;
  manufacturing: number;
  outsource: number;
}

interface LastYearTrendItem {
  month: string;
  total: number;
}

interface CostStats {
  thisMonth: number;
  lastMonth: number;
  change: number;
  budgetExecRate: number;
}

interface AnalysisData {
  trend: TrendItem[];
  lastYearTrend: LastYearTrendItem[];
  stats: CostStats;
}

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function CostAnalysisPage() {
  const t = useTranslations('Finance');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalysisData | null>(null);

  useEffect(() => {
    setLoading(true);
    authFetch('/api/finance/cost-analysis')
      .then(async (res) => {
        const json = await res.json();
        if (json.success) setData(json.data);
      })
      .catch((err) => {
        console.error('Failed to fetch cost analysis:', err);
        setData(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const statsConfigs = [
    {
      key: 'thisMonth',
      label: t('thisMonthCost'),
      icon: Calendar,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      key: 'lastMonth',
      label: t('lastMonthCost'),
      icon: DollarSign,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      key: 'change',
      label: t('costChange'),
      icon: TrendingUp,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      key: 'budgetExecRate',
      label: t('budgetExecRate'),
      icon: Percent,
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-900/20',
    },
  ];

  const statsItems: StatsItem<string>[] = data
    ? [
        {
          key: 'thisMonth',
          count: data.stats.thisMonth,
          trend: data.stats.change >= 0 ? 'up' : 'down',
          trendPercent: Math.abs(data.stats.change),
        },
        {
          key: 'lastMonth',
          count: data.stats.lastMonth,
        },
        {
          key: 'change',
          count: Math.abs(data.stats.change),
          trend: data.stats.change >= 0 ? 'up' : 'down',
          trendPercent: Math.abs(data.stats.change),
        },
        {
          key: 'budgetExecRate',
          count: data.stats.budgetExecRate,
          extra:
            data.stats.budgetExecRate > 100 ? (
              <span className="text-xs text-red-500 dark:text-red-400 flex items-center gap-0.5">
                <AlertTriangle className="h-3 w-3" />
                {t('overBudget')}
              </span>
            ) : null,
        },
      ]
    : [];

  const costTypeConfig: Record<string, { label: string; color: string }> = {
    material: { label: t('material'), color: '#3b82f6' },
    labor: { label: t('labor'), color: '#10b981' },
    manufacturing: { label: t('manufacturing'), color: '#f59e0b' },
    outsource: { label: t('outsource'), color: '#ef4444' },
  };

  const pieData = data
    ? Object.entries(costTypeConfig).map(([type, cfg]) => ({
        name: cfg.label,
        value: data.trend.reduce((sum, row) => sum + (Number(row[type as keyof TrendItem]) || 0), 0),
        color: cfg.color,
      }))
    : [];

  const avgPieData = data && data.trend.length > 0
    ? Object.entries(costTypeConfig).map(([type, cfg]) => {
        const totalVal = data.trend.reduce((sum, row) => sum + (Number((row as unknown as Record<string, unknown>)[type]) ?? 0), 0);
        const avg = totalVal / data.trend.length;
        return { name: cfg.label, value: avg, color: cfg.color };
      })
    : [];

  if (loading) {
    return (
      <MainLayout title={t('costAnalysis')}>
        <div className="flex items-center justify-center py-20">
          <div className="text-gray-500 dark:text-gray-400">{t('loading')}</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={t('costAnalysis')}>
      <div className="space-y-6">
        {/* 统计卡片 */}
        <StatsCards configs={statsConfigs} stats={statsItems} currencySymbol="¥" showTrend />

        {/* 成本趋势图 */}
        <Card>
          <CardHeader>
            <CardTitle>{t('costTrend')}</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.trend && data.trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={data.trend}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-700" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    stroke="currentColor"
                    className="text-gray-500 dark:text-gray-400"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="currentColor"
                    className="text-gray-500 dark:text-gray-400"
                    tickFormatter={(v) => `¥${v.toLocaleString()}`}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [`¥${value.toLocaleString()}`, name]}
                    labelFormatter={(label) => `${label}`}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name={t('total')}
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="material"
                    name={t('material')}
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="labor"
                    name={t('labor')}
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="manufacturing"
                    name={t('manufacturing')}
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="outsource"
                    name={t('outsource')}
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center py-12 text-gray-400 dark:text-gray-500">
                {t('noData')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 成本构成饼图 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('costComposition')}</CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 && pieData.some((d) => d.value > 0) ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => `¥${value.toLocaleString()}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center py-12 text-gray-400 dark:text-gray-500">
                  {t('noData')}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('costComposition')}</CardTitle>
            </CardHeader>
            <CardContent>
              {data?.trend && data.trend.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart
                    data={data.trend}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-700" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                      stroke="currentColor"
                      className="text-gray-500 dark:text-gray-400"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      stroke="currentColor"
                      className="text-gray-500 dark:text-gray-400"
                      tickFormatter={(v) => `¥${v.toLocaleString()}`}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [`¥${value.toLocaleString()}`, name]}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line
                      type="monotone"
                      dataKey="material"
                      name={t('material')}
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="labor"
                      name={t('labor')}
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="manufacturing"
                      name={t('manufacturing')}
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="outsource"
                      name={t('outsource')}
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center py-12 text-gray-400 dark:text-gray-500">
                  {t('noData')}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 月度明细表 */}
        {data?.trend && data.trend.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('monthlyBreakdown')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400">
                        {t('month')}
                      </th>
                      <th className="text-right py-2 px-3 font-medium text-blue-600 dark:text-blue-400">
                        {t('material')}
                      </th>
                      <th className="text-right py-2 px-3 font-medium text-green-600 dark:text-green-400">
                        {t('labor')}
                      </th>
                      <th className="text-right py-2 px-3 font-medium text-yellow-600 dark:text-yellow-400">
                        {t('manufacturing')}
                      </th>
                      <th className="text-right py-2 px-3 font-medium text-red-600 dark:text-red-400">
                        {t('outsource')}
                      </th>
                      <th className="text-right py-2 px-3 font-medium text-indigo-600 dark:text-indigo-400">
                        {t('total')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.trend.map((row, idx) => (
                      <tr
                        key={row.month}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <td className="py-2 px-3 font-medium">{row.month}</td>
                        <td className="py-2 px-3 text-right">¥{row.material.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right">¥{row.labor.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right">¥{row.manufacturing.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right">¥{row.outsource.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-bold">¥{row.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
