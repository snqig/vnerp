'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Search, RefreshCw, DollarSign, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';

interface Receivable {
  id: number;
  receivable_no: string;
  source_type: number;
  source_no: string;
  customer_id: number;
  customer_name: string;
  amount: number;
  received_amount: number;
  balance: number;
  due_date: string;
  status: number;
  remark: string;
}

interface ReceivableDetail extends Receivable {
  create_time?: string;
  update_time?: string;
  receipts?: Array<{
    id: number;
    receipt_no: string;
    amount: number;
    receipt_date: string;
    remark?: string;
  }>;
  receipt_records?: Array<{
    id: number;
    receipt_no: string;
    amount: number;
    receipt_date: string;
    remark?: string;
  }>;
}

export default function ReceivablePage() {
  // 翻译钩子
  const t = useTranslations('Finance');
  const tc = useTranslations('Common');

  const statusMap: Record<
    number,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    1: { label: t('notReceived'), variant: 'outline' },
    2: { label: t('partialReceived'), variant: 'secondary' },
    3: { label: t('fullyReceived'), variant: 'default' },
    9: { label: tc('cancelled'), variant: 'destructive' },
  };

  const { toast } = useToast();
  const [list, setList] = useState<Receivable[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [detailItem, setDetailItem] = useState<ReceivableDetail | null>(null);
  const [receiptForm, setReceiptForm] = useState({ amount: 0, receipt_date: '', remark: '' });

  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        keyword,
        status: statusFilter,
      });
      const res = await authFetch('/api/finance/receivable?' + params);
      const result = await res.json();
      if (result.success) {
        // 统一处理API返回的数据结构
        const rawData = result.data;
        const rawList = Array.isArray(rawData) ? rawData : (rawData?.list || []);
        const list = rawList.map((item: any) => ({
          id: item.id,
          receivable_no: item.receivableNo || item.receivable_no,
          source_type: item.sourceType || item.source_type,
          source_no: item.sourceNo || item.source_no,
          customer_id: item.customerId || item.customer_id,
          customer_name: item.customerName || item.customer_name,
          amount: item.amount,
          received_amount: item.receivedAmount || item.received_amount,
          balance: item.balance,
          due_date: item.dueDate || item.due_date,
          status: item.status,
          remark: item.remark,
        }));
        setList(list);
        setTotal(rawData?.total || list.length || 0);
      }
    } catch (e) {
      console.error(e);
    }
  }, [page, keyword, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleViewDetail = async (id: number) => {
    try {
      const res = await authFetch(`/api/finance/receivable?id=${id}`);
      const result = await res.json();
      if (result.success) {
        setDetailItem(result.data);
        setShowDialog(true);
      }
    } catch (e) {
      toast({ title: '获取详情失败', variant: 'destructive' });
    }
  };

  const handleReceipt = async () => {
    if (!detailItem) return;
    try {
      const res = await authFetch('/api/finance/receipt', {
        method: 'POST',
        body: JSON.stringify({
          receivable_id: detailItem.id,
          amount: receiptForm.amount,
          receipt_date: receiptForm.receipt_date,
          remark: receiptForm.remark,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: '收款成功' });
        setShowDialog(false);
        fetchData();
      } else {
        toast({ title: '收款失败', description: result.message, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: tc('error'), variant: 'destructive' });
    }
  };

  const formatAmount = (amount: number) => ((amount || 0) / 100).toFixed(2);

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{t('receivableManagement')}</h2>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchNoOrCustomer')}
                value={keyword}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v === 'all' ? '' : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-32 h-9">
                <SelectValue placeholder={t('statusFilter')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tc("all")}</SelectItem>
                <SelectItem value="1">{t('notReceived')}</SelectItem>
                <SelectItem value="2">{t('partialReceived')}</SelectItem>
                <SelectItem value="3">{t('fullyReceived')}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4" />
              {tc('refresh')}
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('receivableNo')}</TableHead>
                  <TableHead>{t('sourceNo')}</TableHead>
                  <TableHead>{t('customerName')}</TableHead>
                  <TableHead className="text-right">{t('receivableAmount')}</TableHead>
                  <TableHead className="text-right">{t('receivedAmount')}</TableHead>
                  <TableHead className="text-right">{tc("balance")}</TableHead>
                  <TableHead>{t('dueDate')}</TableHead>
                  <TableHead>{tc("status")}</TableHead>
                  <TableHead>{tc("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      {t('noData')}
                    </TableCell>
                  </TableRow>
                ) : (
                  list.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-sm">{r.receivable_no}</TableCell>
                      <TableCell className="font-mono text-sm">{r.source_no}</TableCell>
                      <TableCell>{r.customer_name}</TableCell>
                      <TableCell className="text-right">¥{formatAmount(r.amount)}</TableCell>
                      <TableCell className="text-right">
                        ¥{formatAmount(r.received_amount)}
                      </TableCell>
                      <TableCell
                        className={`text-right ${Number(r.balance) > 0 ? 'text-red-600 font-medium' : ''}`}
                      >
                        ¥{formatAmount(r.balance)}
                      </TableCell>
                      <TableCell>{r.due_date ? r.due_date.slice(0, 10) : ''}</TableCell>
                      <TableCell>
                        <Badge variant={statusMap[r.status]?.variant || 'outline'}>
                          {statusMap[r.status]?.label || tc('unknown')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleViewDetail(r.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{tc('totalRecords', { total })}</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              {t('previousPage')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page * 20 >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              {t('nextPage')}
            </Button>
          </div>
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader>
              <DialogTitle>{t('receivableDetail')}</DialogTitle>
            </DialogHeader>
            {detailItem && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t('receivableNo')}：</span>
                    {detailItem.receivable_no}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('customerName')}：</span>
                    {detailItem.customer_name}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('receivableAmount')}：</span>¥
                    {formatAmount(detailItem.amount)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('receivedAmount')}：</span>¥
                    {formatAmount(detailItem.received_amount)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{tc('balance')}：</span>¥
                    {formatAmount(detailItem.balance)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('dueDate')}：</span>
                    {detailItem.due_date?.slice(0, 10)}
                  </div>
                </div>
                {Number(detailItem.balance) > 0 && (
                  <div className="border-t pt-4 space-y-3">
                    <h4 className="font-medium">{t('registerReceipt')}</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>{t('receiptAmount')}</Label>
                        <Input
                          type="number"
                          value={receiptForm.amount}
                          onChange={(e) =>
                            setReceiptForm({ ...receiptForm, amount: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div>
                        <Label>{t('receiptDate')}</Label>
                        <Input
                          type="date"
                          value={receiptForm.receipt_date}
                          onChange={(e) =>
                            setReceiptForm({ ...receiptForm, receipt_date: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <Label>{tc("remark")}</Label>
                      <Input
                        value={receiptForm.remark}
                        onChange={(e) => setReceiptForm({ ...receiptForm, remark: e.target.value })}
                      />
                    </div>
                  </div>
                )}
                {detailItem.receipts && detailItem.receipts.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">{t('receiptRecords')}</h4>
                    {detailItem.receipts.map((rc: any) => (
                      <div key={rc.id} className="flex justify-between text-sm py-1 border-b">
                        <span>{rc.receipt_date?.slice(0, 10)}</span>
                        <span>¥{formatAmount(rc.amount)}</span>
                        <span className="text-muted-foreground">{rc.remark || ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              {detailItem && Number(detailItem.balance) > 0 && (
                <Button onClick={handleReceipt}>{t('confirmReceipt')}</Button>
              )}
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                {tc('close')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
