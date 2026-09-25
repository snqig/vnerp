'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ApiClient } from '@/lib/api-client';
import { formatDate, formatAmount } from '@/lib/utils';
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

  const pageSize = 20;

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
  }, [page]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tc('receiptNo')}</TableHead>
                <TableHead>{tc('customerName')}</TableHead>
                <TableHead className="text-right">{tc('amount')}</TableHead>
                <TableHead>{tc('paymentMethod')}</TableHead>
                <TableHead>{t('receivableNo')}</TableHead>
                <TableHead>{tc('receiptDate')}</TableHead>
                <TableHead>{tc('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipts.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-sm">{r.receipt_no}</TableCell>
                  <TableCell className="font-medium">{r.customer_name}</TableCell>
                  <TableCell className="text-right text-green-600 dark:text-green-400 font-medium">
                    <MoneyDisplay amount={r.amount} currency={r.currency || 'CNY'} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={METHOD_BADGE[r.payment_method]?.variant || 'outline'}>
                      {METHOD_BADGE[r.payment_method]?.label || r.payment_method || '-'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{r.receivable_no || '-'}</TableCell>
                  <TableCell>{formatDate(r.receipt_date)}</TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{tc('noActions')}</span>
                  </TableCell>
                </TableRow>
              ))}
              {receipts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {tc('noData')}
                  </TableCell>
                </TableRow>
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
            {tc('previousPage')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page * pageSize >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            {tc('nextPage')}
          </Button>
        </div>
      </div>
    </div>
  );
}
