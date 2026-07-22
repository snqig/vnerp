'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription as _CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Scissors,
  Droplets,
  Wrench,
  FlaskConical,
  AlertTriangle,
  Package,
  BarChart3,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { GlobalExportToolbar } from '@/components/ui/global-export-toolbar';
import type { ExportColumn } from '@/lib/global-export-service';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
} from 'recharts';

const PIE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'];

const PERIODS = ['7', '30', '90'] as const;
type Period = (typeof PERIODS)[number];

export default function PrepressReportsContent() {
  const t = useTranslations('PrepressReports');
  const [period, setPeriod] = useState<Period>('30');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const [dashboardData, setDashboardData] = useState<Loose>(null);
  const [dieData, setDieData] = useState<Loose>(null);
  const [inkData, setInkData] = useState<Loose>(null);
  const [surplusData, setSurplusData] = useState<Loose>(null);
  const [toolData, setToolData] = useState<Loose>(null);
  const [sampleData, setSampleData] = useState<Loose>(null);

  const fetchData = useCallback(
    async (endpoint: string) => {
      const res = await authFetch(`/api/reports/prepress/${endpoint}?period=${period}`);
      const result = await res.json();
      return result.success ? result.data : null;
    },
    [period]
  );

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchData('dashboard').then(setDashboardData)]).finally(() => setLoading(false));
  }, [period, fetchData]);

  const loadTabData = useCallback(
    async (tab: string) => {
      switch (tab) {
        case 'die':
          if (!dieData) setDieData(await fetchData('die'));
          break;
        case 'ink':
          if (!inkData) setInkData(await fetchData('ink'));
          break;
        case 'surplus':
          if (!surplusData) setSurplusData(await fetchData('surplus'));
          break;
        case 'tool':
          if (!toolData) setToolData(await fetchData('tool'));
          break;
        case 'sample':
          if (!sampleData) setSampleData(await fetchData('sample'));
          break;
      }
    },
    [dieData, inkData, surplusData, toolData, sampleData, fetchData]
  );

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    loadTabData(value);
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
    }).format(v);

  const formatNum = (v: number) => new Intl.NumberFormat('zh-CN').format(v);

  const S = ({ rows = 4 }: { rows?: number }) => (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  );

  function KpiCard({
    title,
    value,
    sub,
    icon,
  }: {
    title: string;
    value: string;
    sub?: string;
    icon: React.ReactNode;
  }) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </CardContent>
      </Card>
    );
  }

  if (loading && !dashboardData) {
    return (
      <div className="space-y-6">
        <div className="flex justify-end gap-2">
          {PERIODS.map((p) => (
            <Skeleton key={p} className="h-9 w-20" />
          ))}
        </div>
        <S rows={6} />
      </div>
    );
  }

  const exportColumns: ExportColumn[] = [
    { key: 'category', label: t('type'), width: 15 },
    { key: 'metric', label: t('name'), width: 20 },
    { key: 'value', label: t('count'), width: 15 },
    { key: 'unit', label: '单位', width: 10 },
  ];

  const getExportData = () => {
    if (!dashboardData) return [];
    const d = dashboardData;
    return [
      {
        category: t('die'),
        metric: t('dieTotal'),
        value: d.dieMetrics?.totalTemplates,
        unit: t('count'),
      },
      {
        category: t('die'),
        metric: t('dieAvailable'),
        value: d.dieMetrics?.availableCount,
        unit: t('count'),
      },
      {
        category: t('die'),
        metric: t('dieUsageRate'),
        value: `${d.dieMetrics?.usageRate}%`,
        unit: '%',
      },
      {
        category: t('ink'),
        metric: t('inkConsumed'),
        value: `${d.inkMetrics?.totalConsumed}kg`,
        unit: 'kg',
      },
      {
        category: t('ink'),
        metric: t('inkAffectedOrders'),
        value: d.inkMetrics?.affectedWorkOrders,
        unit: t('count'),
      },
      {
        category: t('surplus'),
        metric: t('openingTotal'),
        value: d.openingMetrics?.totalOpenings,
        unit: t('count'),
      },
      {
        category: t('tool'),
        metric: t('toolTotal'),
        value: d.toolMetrics?.totalTools,
        unit: t('count'),
      },
      {
        category: t('sample'),
        metric: t('sampleTotal'),
        value: d.sampleMetrics?.totalSamples,
        unit: t('count'),
      },
    ];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t('title')}</p>
        <div className="flex gap-2 items-center">
          <span className="text-sm text-muted-foreground mr-1">{t('periodLabel')}:</span>
          {PERIODS.map((p) => (
            <Button
              key={p}
              variant={period === p ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(p)}
            >
              {t(`last${p}Days`)}
            </Button>
          ))}
        </div>
      </div>

      <GlobalExportToolbar
        filename={t('exportFilename')}
        title={t('exportTitle')}
        subtitle={`${t('periodLabel')}: ${t(`last${period}Days`)}`}
        columns={exportColumns}
        data={getExportData()}
        landscape
        footer={t('exportFooter')}
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">{t('overview')}</TabsTrigger>
          <TabsTrigger value="die">{t('die')}</TabsTrigger>
          <TabsTrigger value="ink">{t('ink')}</TabsTrigger>
          <TabsTrigger value="surplus">{t('surplus')}</TabsTrigger>
          <TabsTrigger value="tool">{t('tool')}</TabsTrigger>
          <TabsTrigger value="sample">{t('sample')}</TabsTrigger>
        </TabsList>

        {/* ───── Overview ───── */}
        <TabsContent value="overview" className="space-y-6">
          {!dashboardData ? (
            <S rows={8} />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <KpiCard
                  title={t('dieTotal')}
                  value={formatNum(dashboardData.dieMetrics?.totalTemplates)}
                  sub={`${t('dieAvailable')}: ${dashboardData.dieMetrics?.availableCount} | ${t('dieWarning')}: ${dashboardData.dieMetrics?.warningCount}`}
                  icon={<Scissors className="h-4 w-4 text-muted-foreground" />}
                />
                <KpiCard
                  title={t('inkConsumed')}
                  value={`${formatNum(dashboardData.inkMetrics?.totalConsumed)}kg`}
                  sub={`${t('inkAffectedOrders')}: ${dashboardData.inkMetrics?.affectedWorkOrders}`}
                  icon={<Droplets className="h-4 w-4 text-muted-foreground" />}
                />
                <KpiCard
                  title={t('openingTotal')}
                  value={formatNum(dashboardData.openingMetrics?.totalOpenings)}
                  sub={`${t('openingExpired')}: ${dashboardData.openingMetrics?.expiredCount} | ${t('openingExpiryRate')}: ${dashboardData.openingMetrics?.expiryRate}%`}
                  icon={<Package className="h-4 w-4 text-muted-foreground" />}
                />
                <KpiCard
                  title={t('toolTotal')}
                  value={formatNum(dashboardData.toolMetrics?.totalTools)}
                  sub={`${t('toolDieCount')}: ${dashboardData.toolMetrics?.dieCount} | ${t('toolPlateCount')}: ${dashboardData.toolMetrics?.screenPlateCount}`}
                  icon={<Wrench className="h-4 w-4 text-muted-foreground" />}
                />
                <KpiCard
                  title={t('sampleTotal')}
                  value={formatNum(dashboardData.sampleMetrics?.totalSamples)}
                  sub={`${t('sampleCost')}: ${formatCurrency(dashboardData.sampleMetrics?.totalCost)}`}
                  icon={<FlaskConical className="h-4 w-4 text-muted-foreground" />}
                />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {t('die')} {t('statusDistribution')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={[
                            {
                              name: t('dieAvailable'),
                              value: dashboardData.dieMetrics?.availableCount,
                            },
                            { name: t('dieInUse'), value: dashboardData.dieMetrics?.inUseCount },
                            {
                              name: t('warningList'),
                              value: dashboardData.dieMetrics?.warningCount,
                            },
                            { name: t('dieScrap'), value: dashboardData.dieMetrics?.scrapCount },
                          ]}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label
                        >
                          {['可用', '使用中', '预警', '报废'].map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>{t('sampleCostBreakdown')}</CardTitle>
                  </CardHeader>
                  <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={[
                            {
                              name: t('materialCost'),
                              value: dashboardData.sampleMetrics?.totalMaterialCost,
                            },
                            {
                              name: t('laborCost'),
                              value: dashboardData.sampleMetrics?.totalLaborCost,
                            },
                            {
                              name: t('toolCost'),
                              value: dashboardData.sampleMetrics?.totalToolCost,
                            },
                          ]}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label
                        >
                          {[0, 1, 2].map((i) => (
                            <Cell key={i} fill={PIE_COLORS[i]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* ───── Die ───── */}
        <TabsContent value="die" className="space-y-6">
          {!dieData ? (
            <S rows={8} />
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('statusDistribution')}</CardTitle>
                  </CardHeader>
                  <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={(dieData.statusDistribution || []).map((s: Loose) => ({
                            name: s.die_status,
                            value: s.count,
                          }))}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label
                        >
                          {(dieData.statusDistribution || []).map((_: Loose, i: number) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>{t('lifeDistribution')}</CardTitle>
                  </CardHeader>
                  <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={(dieData.lifeDistribution || []).map((s: Loose) => ({
                          name: s.life_level,
                          count: s.count,
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>{t('usageTrend')}</CardTitle>
                </CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={(dieData.usageTrend || []).map((s: Loose) => ({
                        date: s.date,
                        impressions: s.total_impressions,
                        activeDies: s.active_dies,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="impressions"
                        stroke="#3b82f6"
                        name={t('impressions')}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="activeDies"
                        stroke="#22c55e"
                        name={t('activeDies')}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('topUsed')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('templateCode')}</TableHead>
                          <TableHead>{t('templateName')}</TableHead>
                          <TableHead className="text-right">{t('periodUsage')}</TableHead>
                          <TableHead className="text-right">{t('remaining')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(dieData.topUsedDies || []).map((d: Loose, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono">{d.template_code}</TableCell>
                            <TableCell>{d.template_name}</TableCell>
                            <TableCell className="text-right">
                              {formatNum(d.period_usage)}
                            </TableCell>
                            <TableCell className="text-right">{d.remaining_usage}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>{t('warningList')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(dieData.warningList || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t('count')}: 0</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('templateCode')}</TableHead>
                            <TableHead>{t('remaining')}</TableHead>
                            <TableHead>{t('usage')}</TableHead>
                            <TableHead>{t('statusDistribution')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(dieData.warningList || []).map((d: Loose, i: number) => (
                            <TableRow key={i}>
                              <TableCell className="font-mono">{d.template_code}</TableCell>
                              <TableCell className="text-right text-red-500 font-bold">
                                {d.remaining_usage}
                              </TableCell>
                              <TableCell className="text-right">
                                {d.cumulative_impressions}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{d.die_status}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* ───── Ink ───── */}
        <TabsContent value="ink" className="space-y-6">
          {!inkData ? (
            <S rows={8} />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <KpiCard
                  title={t('inkConsumed')}
                  value={`${formatNum(inkData.summary?.totalConsumed)}kg`}
                  icon={<Droplets className="h-4 w-4 text-muted-foreground" />}
                />
                <KpiCard
                  title={t('inkReturned')}
                  value={`${formatNum(inkData.summary?.totalReturned)}kg`}
                  icon={<Droplets className="h-4 w-4 text-muted-foreground" />}
                />
                <KpiCard
                  title={t('inkScraped')}
                  value={`${formatNum(inkData.summary?.totalScraped)}kg`}
                  icon={<Droplets className="h-4 w-4 text-muted-foreground" />}
                />
                <KpiCard
                  title={t('inkAffectedOrders')}
                  value={formatNum(inkData.summary?.workOrderCount)}
                  icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
                />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>{t('dailyConsumptionTrend')}</CardTitle>
                </CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={(inkData.dailyTrend || []).map((s: Loose) => ({
                        date: s.date,
                        consumed: Number(s.consumed),
                        returned: Number(s.returned),
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="consumed"
                        stroke="#3b82f6"
                        name={t('inkConsumed')}
                      />
                      <Line
                        type="monotone"
                        dataKey="returned"
                        stroke="#22c55e"
                        name={t('inkReturned')}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{t('topWorkOrders')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('workOrder')}</TableHead>
                        <TableHead>{t('name')}</TableHead>
                        <TableHead className="text-right">{t('consumed')}</TableHead>
                        <TableHead className="text-right">{t('inkReturned')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(inkData.topWorkOrders || []).map((d: Loose, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono">{d.workorder_no}</TableCell>
                          <TableCell>{d.color_name}</TableCell>
                          <TableCell className="text-right">
                            {Number(d.consumed).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            {Number(d.returned).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ───── Surplus / Opening ───── */}
        <TabsContent value="surplus" className="space-y-6">
          {!surplusData ? (
            <S rows={8} />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  title={t('surplusSummary')}
                  value={`${formatNum(surplusData.surplusSummary?.totalSurplus)}kg`}
                  sub={`${t('surplusAvailable')}: ${surplusData.surplusSummary?.availableCount}`}
                  icon={<Package className="h-4 w-4 text-muted-foreground" />}
                />
                <KpiCard
                  title={t('surplusReuseRate')}
                  value={`${surplusData.surplusSummary?.reuseRate}%`}
                  sub={`${t('surplusReused')}: ${surplusData.surplusSummary?.reusedCount}`}
                  icon={<Package className="h-4 w-4 text-muted-foreground" />}
                />
                <KpiCard
                  title={t('openingTotal')}
                  value={formatNum(
                    surplusData.openingStatus?.reduce(
                      (a: number, s: Loose) => a + Number(s.count),
                      0
                    ) || 0
                  )}
                  icon={<Package className="h-4 w-4 text-muted-foreground" />}
                />
                <KpiCard
                  title={t('openingExpired')}
                  value={formatNum(surplusData.expiredWarning?.length || 0)}
                  sub={t('overdueUsing')}
                  icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
                />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('reuseTrend')}</CardTitle>
                  </CardHeader>
                  <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={(surplusData.monthlyReuseTrend || []).map((s: Loose) => ({
                          month: s.month,
                          rate:
                            Number(s.total) > 0
                              ? Math.round((Number(s.reused) / Number(s.total)) * 100)
                              : 0,
                          total: Number(s.total),
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="rate" fill="#22c55e" name={t('surplusReuseRate')} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>{t('openingStatus')}</CardTitle>
                  </CardHeader>
                  <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={(surplusData.openingStatus || []).map((s: Loose) => ({
                            name:
                              s.status === 1
                                ? t('overview')
                                : s.status === 2
                                  ? t('openingExpired')
                                  : t('dieScrap'),
                            value: Number(s.count),
                          }))}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label
                        >
                          {(surplusData.openingStatus || []).map((_: Loose, i: number) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>{t('expiredWarning')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {(surplusData.expiredWarning || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('overview')}: 0</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('recordNo')}</TableHead>
                          <TableHead>{t('materialName')}</TableHead>
                          <TableHead>{t('openTime')}</TableHead>
                          <TableHead>{t('expireTime')}</TableHead>
                          <TableHead className="text-right">{t('remainingQty')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(surplusData.expiredWarning || []).map((d: Loose, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono">{d.record_no}</TableCell>
                            <TableCell>{d.material_name}</TableCell>
                            <TableCell>{d.open_time?.slice(0, 10)}</TableCell>
                            <TableCell className="text-red-500">
                              {d.expire_time?.slice(0, 10)}
                            </TableCell>
                            <TableCell className="text-right">{d.remaining_qty}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ───── Tool / Screen Plate ───── */}
        <TabsContent value="tool" className="space-y-6">
          {!toolData ? (
            <S rows={8} />
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('toolTypeStatus')}</CardTitle>
                  </CardHeader>
                  <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={(toolData.typeStatusStats || []).map((s: Loose) => ({
                          type: s.tool_type === 1 ? t('toolDieCount') : t('toolPlateCount'),
                          status: s.status,
                          count: Number(s.count),
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="type" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>{t('costSummary')}</CardTitle>
                  </CardHeader>
                  <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={(toolData.productCostSummary || []).map((s: Loose) => ({
                          type: s.tool_type === 1 ? t('toolDieCount') : t('toolPlateCount'),
                          原值: Number(s.total_original_cost),
                          累计摊销: Number(s.total_accumulated_cost),
                          净值: Number(s.total_net_value),
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="type" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="原值" fill="#3b82f6" />
                        <Bar dataKey="累计摊销" fill="#f59e0b" />
                        <Bar dataKey="净值" fill="#22c55e" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>{t('screenPlateDetail')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('toolCode')}</TableHead>
                        <TableHead>{t('toolName')}</TableHead>
                        <TableHead>{t('meshCount')}</TableHead>
                        <TableHead className="text-right">{t('tensionValue')}</TableHead>
                        <TableHead className="text-right">{t('reclaimCount')}</TableHead>
                        <TableHead>{t('date')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(toolData.screenPlateDetail || []).map((d: Loose, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono">{d.tool_code}</TableCell>
                          <TableCell>{d.tool_name}</TableCell>
                          <TableCell>{d.mesh_count}</TableCell>
                          <TableCell className="text-right">{d.tension_value}</TableCell>
                          <TableCell className="text-right">{d.reclaim_count}</TableCell>
                          <TableCell>{d.last_reclaim_date?.slice(0, 10) || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{t('recentActivities')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('toolCode')}</TableHead>
                        <TableHead>{t('toolName')}</TableHead>
                        <TableHead>{t('processName')}</TableHead>
                        <TableHead className="text-right">{t('usage')}</TableHead>
                        <TableHead className="text-right">{t('amortizedCost')}</TableHead>
                        <TableHead>{t('useTime')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(toolData.recentActivities || []).map((d: Loose, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono">{d.tool_code}</TableCell>
                          <TableCell>{d.tool_name}</TableCell>
                          <TableCell>{d.process_name}</TableCell>
                          <TableCell className="text-right">{d.use_count}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(d.amortized_cost)}
                          </TableCell>
                          <TableCell>{d.use_time?.slice(0, 16)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ───── Sample ───── */}
        <TabsContent value="sample" className="space-y-6">
          {!sampleData ? (
            <S rows={8} />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  title={t('sampleTotal')}
                  value={formatNum(sampleData.summary?.total)}
                  sub={`${t('sampleCompleted')}: ${sampleData.summary?.completed}`}
                  icon={<FlaskConical className="h-4 w-4 text-muted-foreground" />}
                />
                <KpiCard
                  title={t('sampleCost')}
                  value={formatCurrency(sampleData.summary?.totalCost)}
                  sub={`${t('materialCost')} ${sampleData.summary?.materialRatio}% / ${t('laborCost')} ${sampleData.summary?.laborRatio}%`}
                  icon={<FlaskConical className="h-4 w-4 text-muted-foreground" />}
                />
                <KpiCard
                  title={t('completedCount')}
                  value={formatNum(sampleData.summary?.completed)}
                  sub={`${t('cancelledCount')}: ${sampleData.summary?.cancelled}`}
                  icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
                />
                <KpiCard
                  title={t('inProgressCount')}
                  value={formatNum(sampleData.summary?.inProgress)}
                  icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
                />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('sampleMonthlyTrend')}</CardTitle>
                  </CardHeader>
                  <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={(sampleData.monthlyTrend || []).map((s: Loose) => ({
                          month: s.month,
                          count: Number(s.count),
                          completed: Number(s.completed_count),
                          cost: Number(s.total_cost),
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Legend />
                        <Bar
                          yAxisId="left"
                          dataKey="count"
                          fill="#3b82f6"
                          name={t('sampleCount')}
                        />
                        <Bar
                          yAxisId="left"
                          dataKey="completed"
                          fill="#22c55e"
                          name={t('sampleCompleted')}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>{t('sampleCostBreakdown')}</CardTitle>
                  </CardHeader>
                  <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={(sampleData.costBreakdown || []).map((s: Loose) => ({
                            name: s.cost_range,
                            value: Number(s.total_cost),
                          }))}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label
                        >
                          {(sampleData.costBreakdown || []).map((_: Loose, i: number) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>{t('sampleTopCustomer')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('customer')}</TableHead>
                        <TableHead className="text-right">{t('sampleCount')}</TableHead>
                        <TableHead className="text-right">{t('completedCount')}</TableHead>
                        <TableHead className="text-right">{t('sampleCost')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(sampleData.topByCustomer || []).map((d: Loose, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{d.customer_name}</TableCell>
                          <TableCell className="text-right">{d.sample_count}</TableCell>
                          <TableCell className="text-right">{d.completed_count}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(d.total_cost)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
