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
import { RefreshCw, BarChart3, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { useTranslations } from 'next-intl';
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
    } catch {}
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
    } catch {}
  }, []);

  useEffect(() => {
    fetchData();
    fetchSummary();
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

        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <span className="text-sm text-muted-foreground">{t('totalRevenue')}</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                ¥{formatAmount(summary.total_revenue)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-500" />
                <span className="text-sm text-muted-foreground">{t('totalCost')}</span>
              </div>
              <div className="text-2xl font-bold text-red-600">
                ¥{formatAmount(summary.total_cost)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-500" />
                <span className="text-sm text-muted-foreground">{t('totalProfit')}</span>
              </div>
              <div className="text-2xl font-bold">¥{formatAmount(summary.total_profit)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-500" />
                <span className="text-sm text-muted-foreground">{t('profitRate')}</span>
              </div>
              <div className="text-2xl font-bold">{(summary.profit_rate || 0).toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('incomeExpenseDetail')}</CardTitle>
            <GlobalExportToolbar
              filename="财务收支报表"
              title="财务收支明细报表"
              subtitle={periodType || ''}
              columns={
                [
                  { key: 'period', label: '期间', width: 18 },
                  { key: 'type', label: '类型', width: 12 },
                  { key: 'category', label: '类别', width: 15 },
                  {
                    key: 'revenue',
                    label: '收入',
                    width: 12,
                    formatter: (v) => Number(v || 0).toFixed(2),
                  },
                  {
                    key: 'cost',
                    label: '成本',
                    width: 12,
                    formatter: (v) => Number(v || 0).toFixed(2),
                  },
                  {
                    key: 'profit',
                    label: '利润',
                    width: 12,
                    formatter: (v) => Number(v || 0).toFixed(2),
                  },
                  {
                    key: 'profit_rate',
                    label: '利润率',
                    width: 10,
                    formatter: (v) => `${Number(v || 0).toFixed(1)}%`,
                  },
                ] as ExportColumn[]
              }
              data={list}
              footer="本报表由 ERP 系统自动生成，仅供参考。"
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
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {tc('noData')}
                    </TableCell>
                  </TableRow>
                ) : (
                  list.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.period}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{r.type}</Badge>
                      </TableCell>
                      <TableCell>{r.category}</TableCell>
                      <TableCell className="text-right text-green-600">
                        ¥{formatAmount(r.revenue)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        ¥{formatAmount(r.cost)}
                      </TableCell>
                      <TableCell
                        className={`text-right ${r.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}
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
          <span>{tc('totalRecords', { total })}</span>
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
