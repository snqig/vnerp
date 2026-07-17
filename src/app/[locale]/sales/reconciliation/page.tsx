'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useTranslations } from 'next-intl';
import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MoneyDisplay } from '@/components/ui/money-display';
import { Plus, Search, RefreshCw, Calculator, Eye, Download } from 'lucide-react';
import { toast } from 'sonner';

interface Reconciliation {
  id: number;
  reconciliation_no: string;
  customer_id: number;
  customer_name: string;
  period_start: string;
  period_end: string;
  delivery_amount: number;
  return_amount: number;
  discount_amount: number;
  net_amount: number;
  received_amount: number;
  balance_amount: number;
  status: number;
  currency?: string;
  source_currency?: string;
  has_mismatch?: boolean;
  remark: string;
  create_time: string;
}

interface ReconciliationDetailItem {
  id?: number;
  reconciliation_id?: number;
  type: 'delivery' | 'return';
  ref_no: string;
  amount: number;
}

interface Customer {
  id: number;
  customer_name: string;
  customer_code: string;
}

export default function ReconciliationPage() {
  // 翻译钩子
  const t = useTranslations('SalesReconciliation');
  const tc = useTranslations('Common');

  const STATUS_MAP: Record<number, { label: string; color: string }> = {
    1: {
      label: tc('draft'),
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    },
    2: {
      label: t('confirmed'),
      color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    },
    3: {
      label: t('partialWriteoff'),
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    },
    4: {
      label: t('fullyWrittenOff'),
      color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    },
    9: {
      label: tc('closed'),
      color: 'bg-stone-100 text-stone-800 dark:bg-stone-700 dark:text-stone-200',
    },
  };

  const [list, setList] = useState<Reconciliation[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<Reconciliation | null>(null);
  const [detailItems, setDetailItems] = useState<ReconciliationDetailItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState({
    customer_id: 0,
    customer_name: '',
    period_start: '',
    period_end: '',
    remark: '',
  });
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({
    totalDelivery: 0,
    totalReturn: 0,
    totalNet: 0,
    totalBalance: 0,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (keyword) params.append('keyword', keyword);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      const res = await authFetch(`/api/sales/reconciliation?${params.toString()}`);
      const result = await res.json();
      if (result.success) {
        const data = result.data?.list || [];
        setList(data);
        setTotal(result.data?.total || 0);
        setSummary({
          totalDelivery: data.reduce(
            (s: number, r: Loose) => s + parseFloat(String(r.delivery_amount || 0)),
            0
          ),
          totalReturn: data.reduce(
            (s: number, r: Loose) => s + parseFloat(String(r.return_amount || 0)),
            0
          ),
          totalNet: data.reduce(
            (s: number, r: Loose) => s + parseFloat(String(r.net_amount || 0)),
            0
          ),
          totalBalance: data.reduce(
            (s: number, r: Loose) => s + parseFloat(String(r.balance_amount || 0)),
            0
          ),
        });
      }
    } catch {
      toast.error(t('fetchListFailed'));
    } finally {
      setLoading(false);
    }
  }, [keyword, statusFilter]);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await authFetch('/api/customers');
      const result = await res.json();
      if (result.success) {
        setCustomers(result.data?.list || result.data || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchData();
    fetchCustomers();
  }, [fetchData, fetchCustomers]);

  const createReconciliation = async () => {
    if (!form.customer_id) {
      toast.error(t('selectCustomer'));
      return;
    }
    if (!form.period_start || !form.period_end) {
      toast.error(t('selectPeriod'));
      return;
    }
    try {
      const res = await authFetch('/api/sales/reconciliation', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(
          `${t('createSuccess')}, ${t('netAmount')}: ¥${parseFloat(result.data?.net_amount || 0).toFixed(2)}`
        );
        setDialogOpen(false);
        fetchData();
      } else {
        toast.error(result.message || tc('createFailed'));
      }
    } catch {
      toast.error(t('createFailed'));
    }
  };

  const viewDetail = async (rc: Reconciliation) => {
    setDetailData(rc);
    try {
      const res = await authFetch(`/api/sales/reconciliation?id=${rc.id}`);
      const result = await res.json();
      if (result.success) {
        setDetailItems(result.data?.lines || []);
      }
    } catch {
      setDetailItems([]);
    }
    setDetailOpen(true);
  };

  const exportReconciliation = (rc: Reconciliation) => {
    const csvContent = [
      ['对账单号', '客户名称', '期间', '送货金额', '退货金额', '净额', '已收', '余额'].join(','),
      [
        rc.reconciliation_no,
        rc.customer_name,
        `${rc.period_start} ~ ${rc.period_end}`,
        rc.delivery_amount,
        rc.return_amount,
        rc.net_amount,
        rc.received_amount,
        rc.balance_amount,
      ].join(','),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `对账单_${rc.reconciliation_no}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('exportSuccess'));
  };

  return (
    <MainLayout title={t('pageTitle')}>
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                {t('pageTitle')}
              </CardTitle>
              <CardDescription>{t('pageDescription')}</CardDescription>
            </div>
            <Button
              onClick={() => {
                setForm({
                  customer_id: 0,
                  customer_name: '',
                  period_start: '',
                  period_end: '',
                  remark: '',
                });
                setDialogOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('generateReconciliation')}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder={t('searchPlaceholder')}
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={tc('status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tc('allStatus')}</SelectItem>
                  {Object.entries(STATUS_MAP).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchData}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-gray-500">{t('totalDelivery')}</div>
                  <div className="text-2xl font-bold text-blue-600">
                    <MoneyDisplay amount={summary.totalDelivery} currency="CNY" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-gray-500">{t('totalReturn')}</div>
                  <div className="text-2xl font-bold text-red-600">
                    <MoneyDisplay amount={summary.totalReturn} currency="CNY" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-gray-500">{t('netAmount')}</div>
                  <div className="text-2xl font-bold text-green-600">
                    <MoneyDisplay amount={summary.totalNet} currency="CNY" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-gray-500">{t('balanceAmount')}</div>
                  <div className="text-2xl font-bold text-orange-600">
                    <MoneyDisplay amount={summary.totalBalance} currency="CNY" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('reconciliationNo')}</TableHead>
                    <TableHead>{tc('customerName')}</TableHead>
                    <TableHead>{t('reconciliationPeriod')}</TableHead>
                    <TableHead>{t('deliveryAmount')}</TableHead>
                    <TableHead>{t('returnAmount')}</TableHead>
                    <TableHead>{t('netAmount')}</TableHead>
                    <TableHead>{t('receivedAmount')}</TableHead>
                    <TableHead>{tc('balance')}</TableHead>
                    <TableHead>{tc('currency')}</TableHead>
                    <TableHead>{tc('status')}</TableHead>
                    <TableHead className="text-right">{tc('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.reconciliation_no}</TableCell>
                      <TableCell>{r.customer_name || '-'}</TableCell>
                      {r.has_mismatch && (
                        <TableCell colSpan={1} className="text-red-600 text-xs">
                          {t('currencyMismatch')}
                        </TableCell>
                      )}
                      <TableCell className="text-xs">
                        {r.period_start} ~ {r.period_end}
                      </TableCell>
                      <TableCell className="text-blue-600">
                        <MoneyDisplay
                          amount={parseFloat(String(r.delivery_amount || 0))}
                          currency={r.currency || 'CNY'}
                        />
                      </TableCell>
                      <TableCell className="text-red-600">
                        <MoneyDisplay
                          amount={parseFloat(String(r.return_amount || 0))}
                          currency={r.currency || 'CNY'}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <MoneyDisplay
                          amount={parseFloat(String(r.net_amount || 0))}
                          currency={r.currency || 'CNY'}
                        />
                      </TableCell>
                      <TableCell>
                        <MoneyDisplay
                          amount={parseFloat(String(r.received_amount || 0))}
                          currency={r.currency || 'CNY'}
                        />
                      </TableCell>
                      <TableCell className="text-orange-600">
                        <MoneyDisplay
                          amount={parseFloat(String(r.balance_amount || 0))}
                          currency={r.currency || 'CNY'}
                        />
                      </TableCell>
                      <TableCell>
                        {r.currency || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_MAP[r.status]?.color || 'bg-gray-100'}>
                          {STATUS_MAP[r.status]?.label || tc('unknown')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => viewDetail(r)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => exportReconciliation(r)}
                            title={tc('export')}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {list.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-8 text-gray-500">
                        {tc('noData')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" resizable>
          <DialogHeader>
            <DialogTitle>{t('generateReconciliation')}</DialogTitle>
            <DialogDescription>{t('dialogDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>
                {tc('customer')} <span className="text-red-500">*</span>
              </Label>
              <Select
                value={String(form.customer_id || '')}
                onValueChange={(v) => {
                  const cust = customers.find((c: Loose) => c.id === parseInt(v));
                  setForm((prev) => ({
                    ...prev,
                    customer_id: parseInt(v),
                    customer_name: cust?.customer_name || '',
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectCustomer')} />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c: Loose) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.customer_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  {t('periodStart')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={form.period_start}
                  onChange={(e) => setForm((prev) => ({ ...prev, period_start: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  {t('periodEnd')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={form.period_end}
                  onChange={(e) => setForm((prev) => ({ ...prev, period_end: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{tc('remark')}</Label>
              <Input
                value={form.remark}
                onChange={(e) => setForm((prev) => ({ ...prev, remark: e.target.value }))}
                placeholder={tc('remark')}
              />
            </div>
            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
              {t('autoGenerateHint')}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={createReconciliation} className="bg-blue-600 hover:bg-blue-700">
              {t('generateReconciliation')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl" resizable>
          <DialogHeader>
            <DialogTitle>{t('reconciliationDetail')}</DialogTitle>
            <DialogDescription>
              {detailData?.reconciliation_no} | {detailData?.customer_name}
            </DialogDescription>
          </DialogHeader>
          {detailData && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">{t('reconciliationPeriod')}：</span>
                  {detailData.period_start} ~ {detailData.period_end}
                </div>
                <div>
                  <span className="text-gray-500">{tc('currency')}：</span>
                  {detailData.currency || 'CNY'}
                </div>
              </div>
              {detailData.has_mismatch && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                  <span className="text-sm text-red-700">{t('currencyMismatch')}</span>
                </div>
              )}
              <div className="grid grid-cols-5 gap-3 text-center">
                <Card>
                  <CardContent className="pt-3 pb-3">
                    <div className="text-xs text-gray-500">{t('deliveryAmount')}</div>
                    <div className="text-lg font-bold text-blue-600">
                      <MoneyDisplay
                        amount={parseFloat(String(detailData.delivery_amount || 0))}
                        currency={detailData.currency || 'CNY'}
                      />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-3 pb-3">
                    <div className="text-xs text-gray-500">{t('returnAmount')}</div>
                    <div className="text-lg font-bold text-red-600">
                      <MoneyDisplay
                        amount={parseFloat(String(detailData.return_amount || 0))}
                        currency={detailData.currency || 'CNY'}
                      />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-3 pb-3">
                    <div className="text-xs text-gray-500">{tc('discount')}</div>
                    <div className="text-lg font-bold">
                      <MoneyDisplay
                        amount={parseFloat(String(detailData.discount_amount || 0))}
                        currency={detailData.currency || 'CNY'}
                      />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-3 pb-3">
                    <div className="text-xs text-gray-500">{t('netAmount')}</div>
                    <div className="text-lg font-bold text-green-600">
                      <MoneyDisplay
                        amount={parseFloat(String(detailData.net_amount || 0))}
                        currency={detailData.currency || 'CNY'}
                      />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-3 pb-3">
                    <div className="text-xs text-gray-500">{t('balanceAmount')}</div>
                    <div className="text-lg font-bold text-orange-600">
                      <MoneyDisplay
                        amount={parseFloat(String(detailData.balance_amount || 0))}
                        currency={detailData.currency || 'CNY'}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
              {detailItems.length > 0 && (
                <div className="border-t pt-4">
                  <Label className="text-base font-semibold mb-3 block">
                    {t('reconciliationDetails')}
                  </Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{tc('type')}</TableHead>
                        <TableHead>{t('orderNo')}</TableHead>
                        <TableHead>{tc('date')}</TableHead>
                        <TableHead>{tc('amount')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailItems.map((item: Loose, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Badge variant="outline">
                              {item.source_type === 1 ? t('delivery') : t('return')}
                            </Badge>
                          </TableCell>
                          <TableCell>{item.source_no}</TableCell>
                          <TableCell>{item.source_date}</TableCell>
                          <TableCell
                            className={item.source_type === 1 ? 'text-blue-600' : 'text-red-600'}
                          >
                            <MoneyDisplay
                              amount={parseFloat(String(item.amount || 0))}
                              currency={detailData?.currency || 'CNY'}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              {tc('close')}
            </Button>
            {detailData && (
              <Button onClick={() => exportReconciliation(detailData)} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                {tc('export')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
