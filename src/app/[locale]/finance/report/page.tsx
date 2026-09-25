'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RefreshCw, BarChart3, TrendingUp, TrendingDown, DollarSign, CheckCircle, Clock, AlertTriangle, CreditCard, PiggyBank } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { StatsCards, StatsTheme } from '@/components/stats-cards';
import { GlobalExportToolbar } from '@/components/ui/global-export-toolbar';
import type { ExportColumn } from '@/lib/global-export-service';

interface ReportItem {
  id: number;
  period: string;
  type: string;
  category: string;
  revenue: number;
  cost: number;
  profit: number;
  profit_rate: number;
}

export default function FinanceReportPage() {
  // 翻译钩子
  const t = useTranslations('Finance');
  const tc = useTranslations('Common');

  const [list, setList] = useState<ReportItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [periodType, setPeriodType] = useState('month');
  const [summary, setSummary] = useState({
    total_revenue: 0,
    total_cost: 0,
    total_profit: 0,
    profit_rate: 0,
  });
  const [stats, setStats] = useState({
    monthlyIncome: 0,
    monthlyExpense: 0,
    receivable: 0,
    payable: 0,
    monthlyProfit: 0,
  });

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        period_type: periodType,
      });
      const res = await authFetch('/api/finance/report?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data?.list || []);
        setTotal(result.data?.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch report:', error);
      setList([]);
    }
  }, [page, periodType]);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await authFetch('/api/finance/stats');
      const result = await res.json();
      if (result.success && result.data) {
        const d = result.data;
        setSummary({
          total_revenue: d.total_revenue || 0,
          total_cost: d.total_cost || 0,
          total_profit: d.total_profit || 0,
          profit_rate: d.profit_rate || 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    }
  }, []);

  const fetchStats = async () => {
    try {
      const res = await authFetch('/api/finance/report/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    fetchData();
    fetchSummary();
    fetchStats();
  }, [fetchData, fetchSummary]);

  const formatAmount = (amount: number) => ((amount || 0) / 100).toFixed(2);

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{t('financialReport')}</h2>
          <div className="flex items-center gap-2">
            <Select
              value={periodType}
              onValueChange={(v) => {
                setPeriodType(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-32 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">{t('byDay')}</SelectItem>
                <SelectItem value="week">{t('byWeek')}</SelectItem>
                <SelectItem value="month">{t('byMonth')}</SelectItem>
                <SelectItem value="quarter">{t('byQuarter')}</SelectItem>
                <SelectItem value="year">{t('byYear')}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4" />
              {tc('refresh')}
            </Button>
          </div>
        </div>

        <StatsCards
          configs={[
            { key: 'monthlyIncome', label: '本月收入', icon: TrendingUp, ...StatsTheme.green },
            { key: 'monthlyExpense', label: '本月支出', icon: TrendingDown, ...StatsTheme.red },
            { key: 'receivable', label: '应收总额', icon: DollarSign, ...StatsTheme.blue },
            { key: 'payable', label: '应付总额', icon: CreditCard, ...StatsTheme.orange },
            { key: 'monthlyProfit', label: '本月利润', icon: PiggyBank, ...StatsTheme.purple },
          ]}
          stats={[
            { key: 'monthlyIncome', count: stats.monthlyIncome, prefix: '¥' },
            { key: 'monthlyExpense', count: stats.monthlyExpense, prefix: '¥' },
            { key: 'receivable', count: stats.receivable, prefix: '¥' },
            { key: 'payable', count: stats.payable, prefix: '¥' },
            { key: 'monthlyProfit', count: stats.monthlyProfit, prefix: '¥' },
          ]}
          cols={{ mobile: 2, tablet: 3, desktop: 5 }}
        />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('incomeExpenseDetail')}</CardTitle>
            <GlobalExportToolbar
              filename={tc('financeReportFileName')}
              title={tc('financeReportTitle')}
              subtitle={periodType || ''}
              columns={
                [
                  { key: 'period', label: tc('period'), width: 18 },
                  { key: 'type', label: tc('type'), width: 12 },
                  { key: 'category', label: tc('category'), width: 15, formatter: (v) => tc(String(v)) },
                  {
                    key: 'revenue',
                    label: tc('revenue'),
                    width: 12,
                    formatter: (v) => Number(v || 0).toFixed(2),
                  },
                  {
                    key: 'cost',
                    label: tc('cost'),
                    width: 12,
                    formatter: (v) => Number(v || 0).toFixed(2),
                  },
                  {
                    key: 'profit',
                    label: tc('profit'),
                    width: 12,
                    formatter: (v) => Number(v || 0).toFixed(2),
                  },
                  {
                    key: 'profit_rate',
                    label: tc('profitRate'),
                    width: 10,
                    formatter: (v) => `${Number(v || 0).toFixed(1)}%`,
                  },
                ] as ExportColumn[]
              }
              data={list}
              footer={tc('reportFooter')}
            />
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('period')}</TableHead>
                  <TableHead>{tc('type')}</TableHead>
                  <TableHead>{tc('category')}</TableHead>
                  <TableHead className="text-right">{tc('revenue')}</TableHead>
                  <TableHead className="text-right">{tc('cost')}</TableHead>
                  <TableHead className="text-right">{tc('profit')}</TableHead>
                  <TableHead className="text-right">{t('profitRate')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.length === 0 ? (
                  <TableRow key="empty">
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {tc('noData')}
                    </TableCell>
                  </TableRow>
                ) : (
                  list.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.period}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{tc(r.type)}</Badge>
                      </TableCell>
                      <TableCell>{tc(r.category)}</TableCell>
                      <TableCell className="text-right text-green-600 dark:text-green-400">
                        ¥{formatAmount(r.revenue)}
                      </TableCell>
                      <TableCell className="text-right text-red-600 dark:text-red-400">
                        ¥{formatAmount(r.cost)}
                      </TableCell>
                      <TableCell
                        className={`text-right ${r.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                      >
                        ¥{formatAmount(r.profit)}
                      </TableCell>
                      <TableCell className="text-right">
                        {(r.profit_rate || 0).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{tc('totalRecords', { count: total })}</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              {t('previousPage')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page * 20 >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              {t('nextPage')}
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
