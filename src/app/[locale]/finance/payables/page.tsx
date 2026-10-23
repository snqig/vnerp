'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { StandardTable, type StandardTableColumn } from '@/components/common';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiClient } from '@/lib/api-client';
import { formatDate, formatAmount } from '@/lib/utils';
import { toast } from 'sonner';
import { MoneyDisplay } from '@/components/ui/money-display';
import { RefreshCw, CreditCard, FileText, TrendingDown, AlertTriangle, Clock } from 'lucide-react';
import { StatsCards, StatsTheme } from '@/components/stats-cards';

interface Payable {
  id: number;
  payable_no: string;
  source_no: string;
  supplier_name: string;
  amount: number;
  paid_amount: number;
  balance: number;
  due_date: string;
  status: number;
  create_time: string;
  currency?: string;
  source_currency?: string;
  source_amount?: number;
}

export default function PayablesPage() {
  // 翻译钩子
  const ts = useTranslations('Common');
  const tc = useTranslations('Common');

  const [payables, setPayables] = useState<Payable[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const [showPayment, setShowPayment] = useState(false);
  const [selectedPay, setSelectedPay] = useState<Payable | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  const loadPayables = async () => {
    setLoading(true);
    try {
      const result = await ApiClient.get('/api/finance/payables', { page, pageSize });
      if (result.success) {
        setPayables(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch {
      toast.error(tc('loadPayableFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayables();
  }, [page, pageSize]);

  const getStatusBadge = (status: number) => {
    const map: Record<number, { label: string; variant: Loose }> = {
      1: { label: ts('k_1i13brn'), variant: 'secondary' },
      2: { label: ts('k_o8ogod'), variant: 'warning' },
      3: { label: ts('k_1wu2z9'), variant: 'success' },
    };
    const s = map[status] || { label: tc('unknown'), variant: 'default' };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const handlePayment = async () => {
    if (!selectedPay || !paymentAmount || !paymentDate) {
      toast.error(tc('fillCompleteInfo'));
      return;
    }
    try {
      const result = await ApiClient.post(`/api/finance/payables/${selectedPay.id}/payment`, {
        amount: Number(paymentAmount),
        paymentMethod,
        paymentDate,
      });
      if (result.success) {
        toast.success(result.message);
        setShowPayment(false);
        setSelectedPay(null);
        setPaymentAmount('');
        loadPayables();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error(tc('paymentFailed'));
    }
  };

  // 注：/api/finance/payables 暂不支持 sortField/sortDirection，故先不开启 sortable，
  // 避免出现点击无反应的排序控件；待后端补齐排序参数后再打开。
  const columns: StandardTableColumn<Payable>[] = [
    { key: 'payable_no', title: tc('payableNoLabel'), render: (r) => <span className="font-medium">{r.payable_no}</span> },
    {
      key: 'source_no',
      title: tc('sourceNo'),
      render: (r) =>
        r.source_currency ? (
          <span title={`${tc('sourceCurrency', { currency: r.source_currency })}`}>
            <FileText className="w-3 h-3 inline mr-1 text-muted-foreground" />
            {r.source_no}
            <span className="text-xs text-muted-foreground ml-1">({r.source_currency})</span>
          </span>
        ) : (
          r.source_no
        ),
    },
    { key: 'supplier_name', title: tc('supplier') },
    {
      key: 'amount',
      title: tc('amount'),
      render: (r) => <MoneyDisplay amount={r.amount} currency={r.currency || 'CNY'} />,
    },
    {
      key: 'paid_amount',
      title: tc('paidAmount'),
      render: (r) => <MoneyDisplay amount={r.paid_amount} currency={r.currency || 'CNY'} />,
    },
    {
      key: 'balance',
      title: tc('balance'),
      className: '',
      render: (r) => (
        <span className={r.balance > 0 ? 'text-orange-600 dark:text-orange-400 font-medium' : ''}>
          <MoneyDisplay amount={r.balance} currency={r.currency || 'CNY'} />
        </span>
      ),
    },
    {
      key: 'currency',
      title: tc('currency'),
      render: (r) => r.currency || <span className="text-muted-foreground">-</span>,
    },
    { key: 'due_date', title: tc('dueDate'), render: (r) => formatDate(r.due_date) },
    { key: 'status', title: tc('status'), render: (r) => getStatusBadge(r.status) },
    {
      key: 'actions',
      title: tc('actions'),
      // 原有操作列：付款按钮，逻辑保持原样
      render: (r) =>
        r.status !== 3 && (
          <Button
            size="sm"
            variant="outline"
            // 原有逻辑保持原样：仅打开付款弹窗
            // ⚠️ 遗留缺陷（改造前即存在，本次未改）：此处未调用 setSelectedPay(r)，
            //    导致 selectedPay 恒为 null，handlePayment 会因取不到应付单而报错。
            //    需业务方确认后再单独修复。
            onClick={() => {
              setShowPayment(true);
            }}
          >
            <CreditCard className="w-3 h-3 mr-1" />
            {tc('paymentTitle')}
          </Button>
        ),
    },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
        <StatsCards
          configs={[
            { key: 'total', label: tc('totalPayable'), icon: FileText, ...StatsTheme.blue },
            { key: 'unpaid', label: tc('unpaidAmount'), icon: TrendingDown, ...StatsTheme.orange },
            { key: 'overdue', label: tc('overdue'), icon: AlertTriangle, ...StatsTheme.red },
            { key: 'monthly', label: tc('monthlyDue'), icon: Clock, ...StatsTheme.green },
          ]}
          stats={[
            { key: 'total', count: payables.reduce((sum, p) => sum + (p.amount || 0), 0) },
            { key: 'unpaid', count: payables.reduce((sum, p) => sum + (p.balance || 0), 0) },
            { key: 'overdue', count: payables.filter((p) => p.balance! > 0 && new Date(p.due_date) < new Date()).length },
            { key: 'monthly', count: payables.filter((p) => {
              const d = new Date(p.due_date);
              const now = new Date();
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).length },
          ]}
          cols={{ mobile: 2, tablet: 2, desktop: 4 }}
        />

        <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{tc('tabPayable')}</h1>
        <Button onClick={loadPayables} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {tc('refresh')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{tc('payableListTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <StandardTable<Payable>
            columns={columns}
            dataSource={payables}
            total={total}
            page={page}
            pageSize={pageSize}
            pageSizeOptions={[20, 25, 30]}
            rowKey="id"
            rowSelectable={false}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
            }}
            loading={loading}
            onRetry={loadPayables}
            emptyText={tc('noData')}
          />
        </CardContent>
      </Card>

      {/* 付款弹窗 */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {tc('paymentTitle')}
              {selectedPay?.payable_no}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>{tc('amount')}</Label>
              <Input value={selectedPay ? formatAmount(selectedPay.amount) : ''} disabled />
            </div>
            <div>
              <Label>{tc('balance')}</Label>
              <Input value={selectedPay ? formatAmount(selectedPay.balance) : ''} disabled />
            </div>
            <div>
              <Label>{tc('paymentAmount')}</Label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>{tc('paymentMethod')}</Label>
              <select
                className="w-full border rounded-md p-2"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="bank_transfer">{tc('bankTransfer')}</option>
                <option value="cash">{tc('cash')}</option>
                <option value="check">{tc('check')}</option>
                <option value="wechat">{tc('wechat')}</option>
                <option value="alipay">{tc('alipay')}</option>
              </select>
            </div>
            <div>
              <Label>{tc('paymentDate')}</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayment(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handlePayment}>{tc('createPayment')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
