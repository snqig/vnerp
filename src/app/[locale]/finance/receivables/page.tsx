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
import { RefreshCw, DollarSign } from 'lucide-react';

interface Receivable {
  id: number;
  receivable_no: string;
  source_no: string;
  customer_name: string;
  amount: number;
  received_amount: number;
  balance: number;
  due_date: string;
  status: number;
  create_time: string;
}

export default function ReceivablesPage() {
  // 翻译钩子
  const tc = useTranslations('Common');

  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, _setPage] = useState(1);
  const [_total, setTotal] = useState(0);

  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedRec, setSelectedRec] = useState<Receivable | null>(null);
  const [receiptAmount, setReceiptAmount] = useState('');
  const [receiptMethod, setReceiptMethod] = useState('bank_transfer');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);

  const pageSize = 20;

  const loadReceivables = async () => {
    setLoading(true);
    try {
      const result = await ApiClient.get('/api/finance/receivables', { page, pageSize });
      if (result.success) {
        setReceivables(result.data.list || []);
        setTotal(result.data.total || 0);
      }
    } catch {
      toast.error(tc('loadReceivableFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReceivables();
  }, [page]);

  const getStatusBadge = (status: number) => {
    const map: Record<number, { label: string; variant: Loose }> = {
      1: { label: '未收款', variant: 'secondary' },
      2: { label: '部分收款', variant: 'warning' },
      3: { label: '已结清', variant: 'success' },
    };
    const s = map[status] || { label: tc('unknown'), variant: 'default' };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const handleReceipt = async () => {
    if (!selectedRec || !receiptAmount || !receiptDate) {
      toast.error(tc('fillCompleteInfo'));
      return;
    }
    try {
      const result = await ApiClient.post(`/api/finance/receivables/${selectedRec.id}/receipt`, {
        amount: Number(receiptAmount),
        receiptMethod,
        receiptDate,
      });
      if (result.success) {
        toast.success(result.message);
        setShowReceipt(false);
        setSelectedRec(null);
        setReceiptAmount('');
        loadReceivables();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error(tc('receiptFailed'));
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{tc('tabReceivable')}</h1>
        <Button onClick={loadReceivables} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {tc('refresh')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{tc('receivableListTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tc('receivableNoLabel')}</TableHead>
                <TableHead>{tc('sourceNo')}</TableHead>
                <TableHead>{tc('customer')}</TableHead>
                <TableHead>{tc('amount')}</TableHead>
                <TableHead>{tc('receivedAmount')}</TableHead>
                <TableHead>{tc('balance')}</TableHead>
                <TableHead>{tc('dueDate')}</TableHead>
                <TableHead>{tc('status')}</TableHead>
                <TableHead>{tc('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receivables.map((rec) => (
                <TableRow key={rec.id}>
                  <TableCell className="font-medium">{rec.receivable_no}</TableCell>
                  <TableCell>{rec.source_no}</TableCell>
                  <TableCell>{rec.customer_name}</TableCell>
                  <TableCell>{formatAmount(rec.amount)}</TableCell>
                  <TableCell>{formatAmount(rec.received_amount)}</TableCell>
                  <TableCell className={rec.balance > 0 ? 'text-orange-600 font-medium' : ''}>
                    {formatAmount(rec.balance)}
                  </TableCell>
                  <TableCell>{formatDate(rec.due_date)}</TableCell>
                  <TableCell>{getStatusBadge(rec.status)}</TableCell>
                  <TableCell>
                    {rec.status !== 3 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          <TableCell>{getStatusBadge(rec.status)}</TableCell>;
                          setShowReceipt(true);
                        }}
                      >
                        <DollarSign className="w-3 h-3 mr-1" />
                        {tc('receiptButton')}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {receivables.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    {tc('noData')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 回款弹窗 */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {tc('receiptTitle')}
              {selectedRec?.receivable_no}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>{tc('amount')}</Label>
              <Input value={selectedRec ? formatAmount(selectedRec.amount) : ''} disabled />
            </div>
            <div>
              <Label>{tc('balance')}</Label>
              <Input value={selectedRec ? formatAmount(selectedRec.balance) : ''} disabled />
            </div>
            <div>
              <Label>{tc('receiptAmount')}</Label>
              <Input
                type="number"
                value={receiptAmount}
                onChange={(e) => setReceiptAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>{tc('paymentMethod')}</Label>
              <select
                className="w-full border rounded-md p-2"
                value={receiptMethod}
                onChange={(e) => setReceiptMethod(e.target.value)}
              >
                <option value="bank_transfer">{tc('bankTransfer')}</option>
                <option value="cash">{tc('cash')}</option>
                <option value="check">{tc('check')}</option>
                <option value="wechat">{tc('wechat')}</option>
                <option value="alipay">{tc('alipay')}</option>
              </select>
            </div>
            <div>
              <Label>{tc('receiptDate')}</Label>
              <Input
                type="date"
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReceipt(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleReceipt}>{tc('confirmReceipt')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
