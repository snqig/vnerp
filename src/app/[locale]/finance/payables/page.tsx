'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { RefreshCw, CreditCard } from 'lucide-react';

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
}

export default function PayablesPage() {
const authFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return fetch(url, { ...options, headers });
};

  // 翻译钩子
  const t = useTranslations('Finance');
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
    } catch (error) {
      toast.error('加载应付单失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayables();
  }, [page]);

  const getStatusBadge = (status: number) => {
    const map: Record<number, { label: string; variant: any }> = {
      1: { label: '未付款', variant: 'secondary' },
      2: { label: '部分付款', variant: 'warning' },
      3: { label: '已结清', variant: 'success' },
    };
    const s = map[status] || { label: tc('unknown'), variant: 'default' };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const handlePayment = async () => {
    if (!selectedPay || !paymentAmount || !paymentDate) {
      toast.error('请填写完整信息');
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
    } catch (error) {
      toast.error('付款失败');
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">应付管理</h1>
        <Button onClick={loadPayables} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> 刷新
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>应付单列表</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>应付单号</TableHead>
                <TableHead>来源订单</TableHead>
                <TableHead>{tc("supplier")}</TableHead>
                <TableHead>应付金额</TableHead>
                <TableHead>已付金额</TableHead>
                <TableHead>{tc("balance")}</TableHead>
                <TableHead>到期日</TableHead>
                <TableHead>{tc("status")}</TableHead>
                <TableHead>{tc("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payables.map((pay) => (
                <TableRow key={pay.id}>
                  <TableCell className="font-medium">{pay.payable_no}</TableCell>
                  <TableCell>{pay.source_no}</TableCell>
                  <TableCell>{pay.supplier_name}</TableCell>
                  <TableCell>{formatAmount(pay.amount)}</TableCell>
                  <TableCell>{formatAmount(pay.paid_amount)}</TableCell>
                  <TableCell className={pay.balance > 0 ? 'text-orange-600 font-medium' : ''}>
                    {formatAmount(pay.balance)}
                  </TableCell>
                  <TableCell>{formatDate(pay.due_date)}</TableCell>
                  <TableCell>{getStatusBadge(pay.status)}</TableCell>
                  <TableCell>
                    {pay.status !== 3 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedPay(pay);
                          setShowPayment(true);
                        }}
                      >
                        <CreditCard className="w-3 h-3 mr-1" /> 付款
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {payables.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    暂无数据
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
            <DialogTitle>录入付款 - {selectedPay?.payable_no}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>应付金额</Label>
              <Input value={selectedPay ? formatAmount(selectedPay.amount) : ''} disabled />
            </div>
            <div>
              <Label>{tc("balance")}</Label>
              <Input value={selectedPay ? formatAmount(selectedPay.balance) : ''} disabled />
            </div>
            <div>
              <Label>付款金额</Label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>付款方式</Label>
              <select
                className="w-full border rounded-md p-2"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="bank_transfer">银行转账</option>
                <option value="cash">现金</option>
                <option value="check">支票</option>
                <option value="wechat">微信支付</option>
                <option value="alipay">支付宝</option>
              </select>
            </div>
            <div>
              <Label>付款日期</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayment(false)}>
              取消
            </Button>
            <Button onClick={handlePayment}>确认付款</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
