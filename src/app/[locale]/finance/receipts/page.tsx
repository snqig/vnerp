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
import { RefreshCw, CheckCircle, TrendingUp, Calculator, DollarSign } from 'lucide-react';
import { StatsCards, StatsTheme } from '@/components/stats-cards';
import { PAYMENT_METHOD_LABEL } from '@/lib/status-labels';

interface Receipt {
  id: number;
  receipt_no: string;
  customer_name: string;
  amount: number;
  payment_method: string;
  receivable_no: string;
  receipt_date: string;
  currency?: string;
}

const METHOD_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  bank_transfer: { label: PAYMENT_METHOD_LABEL['bank_transfer'], variant: 'default' },
  cash: { label: PAYMENT_METHOD_LABEL['cash'], variant: 'secondary' },
  check: { label: PAYMENT_METHOD_LABEL['check'], variant: 'outline' },
  other: { label: '其他', variant: 'outline' },
};

export default function ReceiptsPage() {
  const tc = useTranslations('Common');
  const t = useTranslations('Finance');

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const loadReceipts = async () => {
    setLoading(true);
    try {
      const result = await ApiClient.get('/api/finance/receipts', { page: String(page), pageSize: String(pageSize) });
      if (result.success) {
        setReceipts(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch {
      toast.error(tc('fetchReceiptListFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReceipts();
  }, [page, pageSize]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const columns: StandardTableColumn<Receipt>[] = [
    {
      key: 'receipt_no',
      title: tc('receiptNo'),
      render: (r) => <span className="font-mono text-sm">{r.receipt_no}</span>,
    },
    {
      key: 'customer_name',
      title: tc('customerName'),
      render: (r) => <span className="font-medium">{r.customer_name}</span>,
    },
    {
      key: 'amount',
      title: tc('amount'),
      align: 'right',
      render: (r) => (
        <span className="text-green-600 dark:text-green-400 font-medium">
          <MoneyDisplay amount={r.amount} currency={r.currency || 'CNY'} />
        </span>
      ),
    },
    {
      key: 'payment_method',
      title: tc('paymentMethod'),
      render: (r) => (
        <Badge variant={METHOD_BADGE[r.payment_method]?.variant || 'outline'}>
          {METHOD_BADGE[r.payment_method]?.label || r.payment_method || '-'}
        </Badge>
      ),
    },
    {
      key: 'receivable_no',
      title: t('receivableNo'),
      render: (r) => <span className="font-mono text-sm">{r.receivable_no || '-'}</span>,
    },
    {
      key: 'receipt_date',
      title: tc('receiptDate'),
      render: (r) => formatDate(r.receipt_date),
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
          { key: 'total', label: tc('totalRecords'), icon: DollarSign, ...StatsTheme.blue },
          { key: 'monthly', label: tc('monthlyReceipt'), icon: TrendingUp, ...StatsTheme.green },
          { key: 'big', label: tc('bigReceipt'), icon: TrendingUp, ...StatsTheme.red },
          { key: 'avg', label: tc('avgReceipt'), icon: Calculator, ...StatsTheme.purple },
        ]}
        stats={[
          { key: 'total', count: receipts.length },
          { key: 'monthly', count: receipts.filter((r) => new Date(r.receipt_date) >= monthStart).reduce((sum, r) => sum + (r.amount || 0), 0) },
          { key: 'big', count: receipts.filter((r) => (r.amount || 0) > 100000).reduce((sum, r) => sum + (r.amount || 0), 0) },
          { key: 'avg', count: receipts.length > 0 ? Math.round(receipts.reduce((sum, r) => sum + (r.amount || 0), 0) / receipts.length) : 0 },
        ]}
        cols={{ mobile: 2, tablet: 2, desktop: 4 }}
      />

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{tc('tabReceipt')}</h1>
        <Button onClick={loadReceipts} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {tc('refresh')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{tc('receiptRecords')}</CardTitle>
        </CardHeader>
        <CardContent>
          <StandardTable<Receipt>
            columns={columns}
            dataSource={receipts}
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
            onRetry={loadReceipts}
            emptyText={tc('noData')}
          />
        </CardContent>
      </Card>
    </div>
  );
}
