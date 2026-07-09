'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Search, RefreshCw, DollarSign, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { authFetch } from '@/lib/auth-fetch';

interface CostItem {
  id: number;
  cost_no: string;
  cost_type: string;
  source_type: string;
  source_no: string;
  department: string;
  amount: number;
  cost_date: string;
  description: string;
  status: number;
}

const costTypeMap: Record<string, string> = {
  material: 'materialCost',
  labor: 'laborCost',
  overhead: 'overheadCost',
  outsource: 'outsourceCost',
  other: 'otherCost',
};

export default function CostPage() {
  // 翻译钩子
  const t = useTranslations('Finance');
  const tc = useTranslations('Common');

  const [list, setList] = useState<CostItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [summary, setSummary] = useState({
    material: 0,
    labor: 0,
    overhead: 0,
    outsource: 0,
    total: 0,
  });

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        keyword,
        cost_type: typeFilter,
      });
      const res = await authFetch('/api/finance/cost?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data?.list || []);
        setTotal(result.data?.total || 0);
      }
    } catch {}
  }, [page, keyword, typeFilter]);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await authFetch('/api/finance/stats');
      const result = await res.json();
      if (result.success && result.data) {
        setSummary(result.data.cost_summary || summary);
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
          <h2 className="text-2xl font-bold">{t('costManagement')}</h2>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchNoOrDesc')}
                value={keyword}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v === 'all' ? '' : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-32 h-9">
                <SelectValue placeholder={t('costType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tc('all')}</SelectItem>
                <SelectItem value="material">{t('materialCost')}</SelectItem>
                <SelectItem value="labor">{t('laborCost')}</SelectItem>
                <SelectItem value="overhead">{t('overheadCost')}</SelectItem>
                <SelectItem value="outsource">{t('outsourceCost')}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4" />
              {tc('refresh')}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">{t('materialCost')}</div>
              <div className="text-2xl font-bold">¥{formatAmount(summary.material)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">{t('laborCost')}</div>
              <div className="text-2xl font-bold">¥{formatAmount(summary.labor)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">{t('overheadCost')}</div>
              <div className="text-2xl font-bold">¥{formatAmount(summary.overhead)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">{t('outsourceCost')}</div>
              <div className="text-2xl font-bold">¥{formatAmount(summary.outsource)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">{t('totalCost')}</div>
              <div className="text-2xl font-bold text-red-600">¥{formatAmount(summary.total)}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('costNo')}</TableHead>
                  <TableHead>{t('costType')}</TableHead>
                  <TableHead>{t('sourceNo')}</TableHead>
                  <TableHead>{tc('department')}</TableHead>
                  <TableHead className="text-right">{tc('amount')}</TableHead>
                  <TableHead>{tc('date')}</TableHead>
                  <TableHead>{t('description')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {t('noData')}
                    </TableCell>
                  </TableRow>
                ) : (
                  list.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-sm">{c.cost_no}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {t(costTypeMap[c.cost_type]) || c.cost_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{c.source_no}</TableCell>
                      <TableCell>{c.department}</TableCell>
                      <TableCell className="text-right">¥{formatAmount(c.amount)}</TableCell>
                      <TableCell>{c.cost_date?.slice(0, 10)}</TableCell>
                      <TableCell className="max-w-xs truncate">{c.description}</TableCell>
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
