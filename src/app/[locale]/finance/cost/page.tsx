'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  StandardTable,
  type StandardTableColumn,
  type SortState,
} from '@/components/common';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, RefreshCw, DollarSign, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { StatsCards, StatsTheme } from '@/components/stats-cards';
import { authFetch } from '@/lib/auth-fetch';
import { formatDate } from '@/lib/date-utils';
import { useToast } from '@/hooks/use-toast';
import { BatchDeleteBar } from '@/components/BatchDeleteBar';

interface CostItem {
  id: number;
  cost_no: string;
  cost_type: string;
  source_type: string;
  order_no: string;
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
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState<SortState>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [summary, setSummary] = useState({
    material: 0,
    labor: 0,
    overhead: 0,
    outsource: 0,
    total: 0,
  });

  const { toast } = useToast();
  const [selectedRows, setSelectedRows] = useState<CostItem[]>([]);
  const clear = () => setSelectedRows([]);
  const [deleting, setDeleting] = useState(false);

  const handleBatchDelete = async () => {
    const ids = selectedRows.map((r) => String(r.id));
    if (ids.length === 0) return;
    if (!confirm(tc('batchDeleteConfirm', { count: ids.length }))) return;
    setDeleting(true);
    let okCount = 0; let failMsg = '';
    for (const id of ids) {
      try {
        const res = await authFetch(`/api/finance/cost?id=${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) okCount++; else failMsg = data.message || failMsg;
      } catch { failMsg = tc('error'); }
    }
    setDeleting(false);
    if (okCount > 0) toast({ title: tc('success'), description: tc('batchDeleteSuccess', { count: okCount }) });
    if (failMsg) toast({ title: tc('error'), description: failMsg, variant: 'destructive' });
    clear();
    fetchData();
    fetchSummary();
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        keyword,
        cost_type: typeFilter,
      });
      if (sort) {
        params.set('sortField', sort.field);
        params.set('sortDirection', sort.direction);
      }
      const res = await authFetch('/api/finance/cost?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data?.list || []);
        setTotal(result.data?.total || 0);
      }
    } catch {
      setError(tc('error'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, typeFilter, sort, tc]);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await authFetch('/api/finance/cost');
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

  // fin_cost_record.amount 以「元」存储（如 1250.00 = ¥1250.00），直接格式化即可，无需 /100。
  const formatAmount = (amount: number) => Number(amount || 0).toFixed(2);

  const handleSortChange = (next: SortState) => {
    setSort(next);
    setPage(1);
  };

  const columns: StandardTableColumn<CostItem>[] = [
    {
      key: 'cost_no',
      title: t('costNo'),
      sortable: true,
      render: (r) => <span className="font-mono text-sm">{r.cost_no}</span>,
    },
    {
      key: 'cost_type',
      title: t('costType'),
      sortable: true,
      render: (r) => (
        <Badge variant="outline">{t(costTypeMap[r.cost_type]) || r.cost_type}</Badge>
      ),
    },
    {
      key: 'order_no',
      title: t('sourceNo'),
      sortable: true,
      render: (r) => <span className="font-mono text-sm">{r.order_no}</span>,
    },
    { key: 'department', title: tc('department'), sortable: true },
    {
      key: 'amount',
      title: tc('amount'),
      align: 'right',
      sortable: true,
      render: (r) => `¥${formatAmount(r.amount)}`,
    },
    {
      key: 'cost_date',
      title: tc('date'),
      sortable: true,
      render: (r) => formatDate(r.cost_date),
    },
    {
      key: 'description',
      title: t('description'),
      sortable: true,
      render: (r) => <span className="max-w-xs truncate block">{r.description}</span>,
    },
  ];

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

        <StatsCards
          configs={[
            { key: 'total', label: tc('total'), icon: DollarSign, ...StatsTheme.blue },
            { key: 'active', label: tc('active'), icon: CheckCircle, ...StatsTheme.green },
            { key: 'pending', label: tc('pending'), icon: Clock, ...StatsTheme.orange },
            { key: 'warning', label: tc('warning'), icon: AlertTriangle, ...StatsTheme.red },
          ]}
          stats={[
            { key: 'total', count: list.length },
            { key: 'active', count: list.length },
            { key: 'pending', count: list.length },
            { key: 'warning', count: list.length },
          ]}
          cols={{ mobile: 2, tablet: 2, desktop: 4 }}
        />

        <Card>
          <CardContent className="p-0">
            <BatchDeleteBar count={selectedRows.length} onClear={clear} onDelete={handleBatchDelete} loading={deleting} />
            <StandardTable<CostItem>
              columns={columns}
              dataSource={list}
              total={total}
              page={page}
              pageSize={pageSize}
              pageSizeOptions={[20, 25, 30]}
              rowKey="id"
              rowSelectable
              selectedRows={selectedRows}
              onRowSelectedChange={setSelectedRows}
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
              sortState={sort}
              onSortChange={handleSortChange}
              loading={loading}
              error={error}
              onRetry={fetchData}
              emptyText={t('noData')}
              customStyle={{ containerClassName: 'px-2 pb-2' }}
            />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
