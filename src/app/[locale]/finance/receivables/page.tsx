'use client';

import React, { useState, useEffect } from 'react';
import { formatDate } from '@/lib/date-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  StandardTable,
  type StandardTableColumn,
} from '@/components/common';
import { ApiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { MoneyDisplay } from '@/components/ui/money-display';
import { RefreshCw, FileText, AlertTriangle, Clock, Wallet, CheckCircle } from 'lucide-react';
import { StatsCards, StatsTheme } from '@/components/stats-cards';
import { RECEIVABLE_STATUS_LABEL } from '@/lib/status-labels';

interface Receivable {
  id: number;
  receivable_no: string;
  source_no: string;
  customer_name: string;
  amount: number;
  received_amount: number;
  balance: number;
  status: number;
  due_date: string;
  currency?: string;
}

const STATUS_BADGE: Record<number, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  1: { label: RECEIVABLE_STATUS_LABEL[1], variant: 'outline' },
  2: { label: RECEIVABLE_STATUS_LABEL[2], variant: 'secondary' },
  3: { label: RECEIVABLE_STATUS_LABEL[3], variant: 'default' },
  9: { label: '已坏账', variant: 'destructive' },
};

export default function ReceivablesPage() {
  const tc = useTranslations('Common');
  const t = useTranslations('Finance');

  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const loadReceivables = async () => {
    setLoading(true);
    try {
      const result = await ApiClient.get('/api/finance/receivables', { page: String(page), pageSize: String(pageSize) });
      if (result.success) {
        setReceivables(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch {
      toast.error(tc('loadPayableFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReceivables();
  }, [page, pageSize]);

  const columns: StandardTableColumn<Receivable>[] = [
    {
      key: 'customer_name',
      title: tc('customerName'),
      render: (r) => <span className="font-medium">{r.customer_name}</span>,
    },
    {
      key: 'receivable_no',
      title: t('receivableNo'),
      render: (r) => <span className="font-mono text-sm">{r.receivable_no}</span>,
    },
    {
      key: 'source_no',
      title: tc('sourceNo'),
      render: (r) =>
        r.source_no ? (
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
            {r.source_no}
          </span>
        ) : (
          '-'
        ),
    },
    {
      key: 'amount',
      title: t('receivableAmount'),
      align: 'right',
      render: (r) => <MoneyDisplay amount={r.amount} currency={r.currency || 'CNY'} />,
    },
    {
      key: 'received_amount',
      title: t('receivedAmount'),
      align: 'right',
      render: (r) => <MoneyDisplay amount={r.received_amount} currency={r.currency || 'CNY'} />,
    },
    {
      key: 'balance',
      title: tc('balance'),
      align: 'right',
      render: (r) => (
        <span className={r.balance > 0 ? 'text-orange-600 dark:text-orange-400 font-medium' : ''}>
          <MoneyDisplay amount={r.balance} currency={r.currency || 'CNY'} />
        </span>
      ),
    },
    {
      key: 'status',
      title: tc('status'),
      render: (r) => (
        <Badge variant={STATUS_BADGE[r.status]?.variant || 'default'}>
          {STATUS_BADGE[r.status]?.label || tc('unknown')}
        </Badge>
      ),
    },
    {
      key: 'due_date',
      title: tc('dueDate'),
      render: (r) => formatDate(r.due_date),
    },
    {
      key: 'actions',
      title: tc('actions'),
      render: () => <span className="text-sm text-muted-foreground">{tc('noActions')}</span>,
    },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <StatsCards
        configs={[
          { key: 'total', label: t('totalReceivable'), icon: Wallet, ...StatsTheme.blue },
          { key: 'received', label: t('receivedAmount'), icon: CheckCircle, ...StatsTheme.green },
          { key: 'overdue', label: t('overdueBalance'), icon: AlertTriangle, ...StatsTheme.red },
          { key: 'dueSoon', label: tc('dueSoon'), icon: Clock, ...StatsTheme.orange },
        ]}
        stats={[
          { key: 'total', count: receivables.reduce((sum, r) => sum + (r.amount || 0), 0) },
          { key: 'received', count: receivables.reduce((sum, r) => sum + (r.received_amount || 0), 0) },
          { key: 'overdue', count: receivables.filter((r) => r.balance! > 0 && new Date(r.due_date) < new Date()).reduce((sum, r) => sum + (r.balance || 0), 0) },
          { key: 'dueSoon', count: receivables.filter((r) => {
            const d = new Date(r.due_date);
            const now = new Date();
            const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return diff >= 0 && diff <= 30 && r.balance! > 0;
          }).reduce((sum, r) => sum + (r.balance || 0), 0) },
        ]}
        cols={{ mobile: 2, tablet: 2, desktop: 4 }}
      />

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t('receivableManagement')}</h1>
        <Button onClick={loadReceivables} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {tc('refresh')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('receivableListTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <StandardTable<Receivable>
            columns={columns}
            dataSource={receivables}
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
            loading={loading}
            onRetry={loadReceivables}
            emptyText={tc('noData')}
          />
        </CardContent>
      </Card>
    </div>
  );
}
