'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  StandardTable,
  type StandardTableColumn,
} from '@/components/common';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, RefreshCw, DollarSign, FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { StatsCards, StatsTheme } from '@/components/stats-cards';
import { authFetch } from '@/lib/auth-fetch';
import { formatDate } from '@/lib/date-utils';

interface CostRecord {
  id: number;
  cost_no: string;
  cost_type: string;
  source_type: string;
  source_no: string;
  work_order_no: string | null;
  department: string;
  amount: number;
  currency: string;
  cost_date: string;
  description: string;
  remark: string;
  status: number;
}

const costTypeMap: Record<string, string> = {
  material: 'materialCost',
  labor: 'laborCost',
  overhead: 'overheadCost',
  outsource: 'outsourceCost',
  other: 'otherCost',
};

const typeColors: Record<string, string> = {
  material: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  labor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  overhead: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  outsource: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
};

export default function CostDetailPage() {
  const t = useTranslations('Finance');
  const tc = useTranslations('Common');

  const [list, setList] = useState<CostRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setSearch] = useState('');
  const [costType, setCostType] = useState('');
  const [workOrderNo, setWorkOrderNo] = useState('');
  const [summary, setSummary] = useState({
    material: 0,
    labor: 0,
    manufacturing: 0,
    total: 0,
  });

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        keyword,
        workOrderNo,
      });
      if (costType) params.set('cost_type', costType);
      const res = await authFetch('/api/finance/costs?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data?.list || []);
        setTotal(result.data?.total || 0);
        setSummary(result.data?.cost_summary || summary);
      }
    } catch (error) {
      console.error('Failed to fetch cost detail:', error);
      setList([]);
    }
  }, [page, pageSize, keyword, costType, workOrderNo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatAmount = (amount: number) => Number(amount || 0).toFixed(2);

  const columns: StandardTableColumn<CostRecord>[] = [
    {
      key: 'cost_no',
      title: t('costNo'),
      render: (c) => <span className="font-mono text-sm">{c.cost_no}</span>,
    },
    {
      key: 'work_order_no',
      title: tc('workOrderNo'),
      render: (c) => <span className="font-mono text-sm">{c.work_order_no || '-'}</span>,
    },
    {
      key: 'cost_type',
      title: t('costType'),
      render: (c) => (
        <Badge
          variant="outline"
          className={typeColors[c.cost_type] || 'bg-gray-100 text-gray-700'}
        >
          {t(costTypeMap[c.cost_type]) || c.cost_type}
        </Badge>
      ),
    },
    {
      key: 'amount',
      title: tc('amount'),
      align: 'right',
      render: (c) => <span className="font-medium">¥{formatAmount(c.amount)}</span>,
    },
    {
      key: 'currency',
      title: tc('currency'),
      render: (c) => c.currency || 'CNY',
    },
    {
      key: 'cost_date',
      title: tc('date'),
      render: (c) => formatDate(c.cost_date),
    },
    {
      key: 'description',
      title: t('description'),
      render: (c) => <span className="max-w-xs truncate block">{c.description}</span>,
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{t('costDetail')}</h2>
          <div className="flex items-center gap-2">
            <div className="relative w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchNoOrDesc')}
                value={keyword}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
            <Input
              placeholder={t('searchWorkOrder')}
              value={workOrderNo}
              onChange={(e) => setWorkOrderNo(e.target.value)}
              className="h-9 w-40"
            />
            <Select
              value={costType}
              onValueChange={(v) => {
                setCostType(v === 'all' ? '' : v);
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
                <SelectItem value="overhead">{t('manufacturingCost')}</SelectItem>
                <SelectItem value="outsource">{t('outsourceCost')}</SelectItem>
                <SelectItem value="other">{t('otherCost')}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-1" />
              {tc('refresh')}
            </Button>
          </div>
        </div>

        <StatsCards
          configs={[
            { key: 'total', label: t('totalCostRecords'), icon: FileText, ...StatsTheme.blue },
            { key: 'material', label: t('materialCost'), icon: DollarSign, ...StatsTheme.green },
            { key: 'labor', label: t('laborCost'), icon: DollarSign, ...StatsTheme.orange },
            { key: 'manufacturing', label: t('manufacturingCost'), icon: DollarSign, ...StatsTheme.red },
          ]}
          stats={[
            { key: 'total', count: total },
            { key: 'material', count: summary.material },
            { key: 'labor', count: summary.labor },
            { key: 'manufacturing', count: summary.manufacturing },
          ]}
          cols={{ mobile: 2, tablet: 2, desktop: 4 }}
        />

        <Card>
          <CardContent className="p-0">
            <StandardTable<CostRecord>
              columns={columns}
              dataSource={list}
              total={total}
              page={page}
              pageSize={pageSize}
              pageSizeOptions={[20, 25, 30]}
              rowKey="id"
              rowSelectable={false}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              onRetry={fetchData}
              emptyText={t('noData')}
            />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
