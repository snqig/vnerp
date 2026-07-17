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
import { RefreshCw, CreditCard, FileText } from 'lucide-react';

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
  const tc = useTranslations('Common');

  const [payables, setPayables] = useState<Payable[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [showPayment, setShowPayment] = useState(false);
  const [selectedPay, setSelectedPay] = useState<Payable | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  const pageSize = 20;

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
  }, [page]);

  const getStatusBadge = (status: number) => {
    const map: Record<number, { label: string; variant: Loose }> = {
      1: { label: '未付款', variant: 'secondary' },
      2: { label: '部分付款', variant: 'warning' },
      3: { label: '已结清', variant: 'success' },
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

  return (
    <div className="container mx-auto py-6 space-y-6">
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tc('payableNoLabel')}</TableHead>
                <TableHead>{tc('sourceNo')}</TableHead>
                <TableHead>{tc('supplier')}</TableHead>
                <TableHead>{tc('amount')}</TableHead>
                <TableHead>{tc('paidAmount')}</TableHead>
                <TableHead>{tc('balance')}</TableHead>
                <TableHead>{tc('currency')}</TableHead>
                <TableHead>{tc('dueDate')}</TableHead>
                <TableHead>{tc('status')}</TableHead>
                <TableHead>{tc('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payables.map((pay) => (
                <TableRow key={pay.id}>
                  <TableCell className="font-medium">{pay.payable_no}</TableCell>
                  <TableCell>
                    {pay.source_currency ? (
                      <span title={`${tc('sourceCurrency', { currency: pay.source_currency })}`}>
                        <FileText className="w-3 h-3 inline mr-1 text-muted-foreground" />
                        {pay.source_no}
                        <span className="text-xs text-muted-foreground ml-1">
                          ({pay.source_currency})
                        </span>
                      </span>
                    ) : (
                      pay.source_no
                    )}
                  </TableCell>
                  <TableCell>{pay.supplier_name}</TableCell>
                  <TableCell>
                    <MoneyDisplay amount={pay.amount} currency={pay.currency || 'CNY'} />
                  </TableCell>
                  <TableCell>
                    <MoneyDisplay amount={pay.paid_amount} currency={pay.currency || 'CNY'} />
                  </TableCell>
                  <TableCell className={pay.balance > 0 ? 'text-orange-600 font-medium' : ''}>
                    <MoneyDisplay amount={pay.balance} currency={pay.currency || 'CNY'} />
                  </TableCell>
                  <TableCell>
                    {pay.currency || <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell>{formatDate(pay.due_date)}</TableCell>
                  <TableCell>{getStatusBadge(pay.status)}</TableCell>
                  <TableCell>
                    {pay.status !== 3 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          <TableCell>{getStatusBadge(pay.status)}</TableCell>;
                          setShowPayment(true);
                        }}
                      >
                        <CreditCard className="w-3 h-3 mr-1" />
                        {tc('paymentTitle')}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {payables.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    {tc('noData')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
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
