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
import { RefreshCw, Plus, DollarSign } from 'lucide-react';

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

  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

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
    } catch (error) {
      toast.error('加载应收单失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReceivables();
  }, [page]);

  const getStatusBadge = (status: number) => {
    const map: Record<number, { label: string; variant: any }> = {
      1: { label: '未收款', variant: 'secondary' },
      2: { label: '部分收款', variant: 'warning' },
      3: { label: '已结清', variant: 'success' },
    };
    const s = map[status] || { label: tc('unknown'), variant: 'default' };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const handleReceipt = async () => {
    if (!selectedRec || !receiptAmount || !receiptDate) {
      toast.error('请填写完整信息');
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
    } catch (error) {
      toast.error('回款失败');
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">应收管理</h1>
        <Button onClick={loadReceivables} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> 刷新
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>应收单列表</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>应收单号</TableHead>
                <TableHead>来源订单</TableHead>
                <TableHead>{tc("customer")}</TableHead>
                <TableHead>应收金额</TableHead>
                <TableHead>已收金额</TableHead>
                <TableHead>{tc("balance")}</TableHead>
                <TableHead>到期日</TableHead>
                <TableHead>{tc("status")}</TableHead>
                <TableHead>{tc("actions")}</TableHead>
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
                          setSelectedRec(rec);
                          setShowReceipt(true);
                        }}
                      >
                        <DollarSign className="w-3 h-3 mr-1" /> 回款
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {receivables.length === 0 && (
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

      {/* 回款弹窗 */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>录入回款 - {selectedRec?.receivable_no}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>应收金额</Label>
              <Input value={selectedRec ? formatAmount(selectedRec.amount) : ''} disabled />
            </div>
            <div>
              <Label>{tc("balance")}</Label>
              <Input value={selectedRec ? formatAmount(selectedRec.balance) : ''} disabled />
            </div>
            <div>
              <Label>回款金额</Label>
              <Input
                type="number"
                value={receiptAmount}
                onChange={(e) => setReceiptAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>回款方式</Label>
              <select
                className="w-full border rounded-md p-2"
                value={receiptMethod}
                onChange={(e) => setReceiptMethod(e.target.value)}
              >
                <option value="bank_transfer">银行转账</option>
                <option value="cash">现金</option>
                <option value="check">支票</option>
                <option value="wechat">微信支付</option>
                <option value="alipay">支付宝</option>
              </select>
            </div>
            <div>
              <Label>回款日期</Label>
              <Input
                type="date"
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReceipt(false)}>
              取消
            </Button>
            <Button onClick={handleReceipt}>确认回款</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
