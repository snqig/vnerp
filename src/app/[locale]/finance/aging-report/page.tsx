'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  StandardTable,
  type StandardTableColumn,
  type SortState,
} from '@/components/common';
import { ApiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { MoneyDisplay } from '@/components/ui/money-display';
import { RefreshCw, AlertTriangle, Clock, Wallet, TrendingUp } from 'lucide-react';
import { StatsCards, StatsTheme } from '@/components/stats-cards';

interface AgingBucket {
  bucket: string;
  label: string;
  amount: number;
}

interface ReceivableAging {
  total: number;
  overdue: number;
  dueSoon: number;
  overdue90: number;
  buckets: AgingBucket[];
}

interface PayableAging {
  total: number;
  overdue: number;
  dueSoon: number;
  overdue90: number;
  buckets: AgingBucket[];
}

export default function AgingReportPage() {
  const tc = useTranslations('Common');
  const t = useTranslations('Finance');

  const [activeTab, setActiveTab] = useState<'receivable' | 'payable'>('receivable');
  const [receivableAging, setReceivableAging] = useState<ReceivableAging | null>(null);
  const [payableAging, setPayableAging] = useState<PayableAging | null>(null);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState<SortState>(null);

  const loadAging = async (type: 'receivable' | 'payable') => {
    setLoading(true);
    try {
      const endpoint = type === 'receivable' ? '/api/finance/receivable-aging' : '/api/finance/payable-aging';
      const result = await ApiClient.get(endpoint);
      if (result.success) {
        const data = result.data;
        if (type === 'receivable') {
          setReceivableAging({
            total: data.total || 0,
            overdue: data.overdue || 0,
            dueSoon: data.dueSoon || 0,
            overdue90: data.overdue90 || 0,
            buckets: data.buckets || [],
          });
        } else {
          setPayableAging({
            total: data.total || 0,
            overdue: data.overdue || 0,
            dueSoon: data.dueSoon || 0,
            overdue90: data.overdue90 || 0,
            buckets: data.buckets || [],
          });
        }
      }
    } catch {
      toast.error(tc('loadPayableFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAging('receivable');
    loadAging('payable');
  }, []);

  const currentAging = activeTab === 'receivable' ? receivableAging : payableAging;

  const reloadAll = () => {
    loadAging('receivable');
    loadAging('payable');
  };

  const columns: StandardTableColumn<AgingBucket>[] = [
    { key: 'bucket', title: tc('agingBucket'), sortable: true, render: (b) => b.label },
    {
      key: 'amount',
      title: tc('amount'),
      align: 'right',
      sortable: true,
      render: (b) => <MoneyDisplay amount={b.amount} currency="CNY" />,
    },
  ];

  // 账龄区间为一次性返回的全量数据，排序在页面本地完成
  const agingRows = useMemo(() => {
    const list = currentAging?.buckets ?? [];
    if (!sort) return list;
    const dir = sort.direction === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sort.field];
      const bv = (b as unknown as Record<string, unknown>)[sort.field];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
    });
  }, [currentAging, sort]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t('agingAnalysis')}</h1>
        <Button onClick={() => { loadAging('receivable'); loadAging('payable'); }} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {tc('refresh')}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'receivable' | 'payable')}>
        <TabsList>
          <TabsTrigger value="receivable">{t('receivable')}</TabsTrigger>
          <TabsTrigger value="payable">{t('payable')}</TabsTrigger>
        </TabsList>

        <TabsContent value="receivable" className="space-y-6 mt-4">
          <StatsCards
            configs={[
              { key: 'total', label: t('totalReceivable'), icon: Wallet, ...StatsTheme.blue },
              { key: 'overdue', label: t('overdueBalance'), icon: AlertTriangle, ...StatsTheme.red },
              { key: 'dueSoon', label: tc('dueSoon'), icon: Clock, ...StatsTheme.orange },
              { key: 'overdue90', label: t('overdue90Days'), icon: TrendingUp, ...StatsTheme.purple },
            ]}
            stats={receivableAging ? [
              { key: 'total', count: receivableAging.total },
              { key: 'overdue', count: receivableAging.overdue },
              { key: 'dueSoon', count: receivableAging.dueSoon },
              { key: 'overdue90', count: receivableAging.overdue90 },
            ] : []}
            cols={{ mobile: 2, tablet: 2, desktop: 4 }}
          />

          <Card>
            <CardHeader>
              <CardTitle>{t('receivable')}</CardTitle>
            </CardHeader>
            <CardContent>
              <StandardTable<AgingBucket>
                columns={columns}
                dataSource={agingRows}
                rowKey="bucket"
                rowSelectable={false}
                showPagination={false}
                sortState={sort}
                onSortChange={setSort}
                loading={loading}
                onRetry={reloadAll}
                emptyText={tc('noData')}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payable" className="space-y-6 mt-4">
          <StatsCards
            configs={[
              { key: 'total', label: t('totalPayable'), icon: Wallet, ...StatsTheme.blue },
              { key: 'overdue', label: t('overdueBalance'), icon: AlertTriangle, ...StatsTheme.red },
              { key: 'dueSoon', label: tc('dueSoon'), icon: Clock, ...StatsTheme.orange },
              { key: 'overdue90', label: t('overdue90Days'), icon: TrendingUp, ...StatsTheme.purple },
            ]}
            stats={payableAging ? [
              { key: 'total', count: payableAging.total },
              { key: 'overdue', count: payableAging.overdue },
              { key: 'dueSoon', count: payableAging.dueSoon },
              { key: 'overdue90', count: payableAging.overdue90 },
            ] : []}
            cols={{ mobile: 2, tablet: 2, desktop: 4 }}
          />

          <Card>
            <CardHeader>
              <CardTitle>{t('payable')}</CardTitle>
            </CardHeader>
            <CardContent>
              <StandardTable<AgingBucket>
                columns={columns}
                dataSource={agingRows}
                rowKey="bucket"
                rowSelectable={false}
                showPagination={false}
                sortState={sort}
                onSortChange={setSort}
                loading={loading}
                onRetry={reloadAll}
                emptyText={tc('noData')}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
