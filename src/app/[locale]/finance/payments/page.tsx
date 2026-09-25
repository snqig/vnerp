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
import { RefreshCw, CheckCircle, TrendingDown, Calculator, DollarSign } from 'lucide-react';
import { StatsCards, StatsTheme } from '@/components/stats-cards';
import { PAYMENT_METHOD_LABEL } from '@/lib/status-labels';

interface Payment {
  id: number;
  payment_no: string;
  supplier_name: string;
  amount: number;
  payment_method: string;
  payable_no: string;
  payment_date: string;
  currency?: string;
}

const METHOD_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  bank_transfer: { label: PAYMENT_METHOD_LABEL['bank_transfer'], variant: 'default' },
  cash: { label: PAYMENT_METHOD_LABEL['cash'], variant: 'secondary' },
  check: { label: PAYMENT_METHOD_LABEL['check'], variant: 'outline' },
  other: { label: '其他', variant: 'outline' },
};

export default function PaymentsPage() {
  const tc = useTranslations('Common');
  const t = useTranslations('Finance');

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const pageSize = 20;

  const loadPayments = async () => {
    setLoading(true);
    try {
      const result = await ApiClient.get('/api/finance/payments', { page: String(page), pageSize: String(pageSize) });
      if (result.success) {
        setPayments(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch {
      toast.error(tc('fetchPaymentListFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [page]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <StatsCards
        configs={[
          { key: 'total', label: tc('totalRecords'), icon: DollarSign, ...StatsTheme.blue },
          { key: 'monthly', label: tc('monthlyPayment'), icon: TrendingDown, ...StatsTheme.green },
          { key: 'big', label: tc('bigPayment'), icon: TrendingDown, ...StatsTheme.red },
          { key: 'avg', label: tc('avgPayment'), icon: Calculator, ...StatsTheme.purple },
        ]}
        stats={[
          { key: 'total', count: payments.length },
          { key: 'monthly', count: payments.filter((p) => new Date(p.payment_date) >= monthStart).reduce((sum, p) => sum + (p.amount || 0), 0) },
          { key: 'big', count: payments.filter((p) => (p.amount || 0) > 100000).reduce((sum, p) => sum + (p.amount || 0), 0) },
          { key: 'avg', count: payments.length > 0 ? Math.round(payments.reduce((sum, p) => sum + (p.amount || 0), 0) / payments.length) : 0 },
        ]}
        cols={{ mobile: 2, tablet: 2, desktop: 4 }}
      />

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{tc('tabPayment')}</h1>
        <Button onClick={loadPayments} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {tc('refresh')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{tc('paymentRecords')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tc('paymentNo')}</TableHead>
                <TableHead>{tc('supplier')}</TableHead>
                <TableHead className="text-right">{tc('amount')}</TableHead>
                <TableHead>{tc('paymentMethod')}</TableHead>
                <TableHead>{tc('payableNoLabel')}</TableHead>
                <TableHead>{tc('paymentDate')}</TableHead>
                <TableHead>{tc('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-sm">{p.payment_no}</TableCell>
                  <TableCell className="font-medium">{p.supplier_name}</TableCell>
                  <TableCell className="text-right text-red-600 dark:text-red-400 font-medium">
                    <MoneyDisplay amount={p.amount} currency={p.currency || 'CNY'} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={METHOD_BADGE[p.payment_method]?.variant || 'outline'}>
                      {METHOD_BADGE[p.payment_method]?.label || p.payment_method || '-'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{p.payable_no || '-'}</TableCell>
                  <TableCell>{formatDate(p.payment_date)}</TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{tc('noActions')}</span>
                  </TableCell>
                </TableRow>
              ))}
              {payments.length === 0 && (
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
