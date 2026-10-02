'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Trash2, CheckCircle, DollarSign, Receipt, Banknote, Clock, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';
import { StatsCards, StatsTheme } from '@/components/stats-cards';
import { useRowSelection } from '@/lib/useRowSelection';
import { BatchDeleteBar } from '@/components/BatchDeleteBar';

interface OutsourceSettlement {
  id: number;
  settlement_no: string;
  outsource_order_id: number;
  outsource_order_no: string;
  supplier_id: number;
  supplier_name: string;
  settlement_date: string;
  settlement_qty: number;
  unit_price: number;
  settlement_amount: number;
  deduct_amount: number;
  actual_amount: number;
  payment_status: number;
  payment_date: string;
  status: number;
  remark: string;
}

export default function OutsourceSettlementPage() {
  const t = useTranslations('Outsource');
  const tc = useTranslations('Common');
  const tStd = useTranslations('StandardTable');

  const statusMap: Record<
    number,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    1: { label: tc('pending'), variant: 'outline' },
    2: { label: tc('approved'), variant: 'default' },
    3: { label: t('settlementCompleted'), variant: 'secondary' },
    9: { label: t('cancelled'), variant: 'destructive' },
  };

  const paymentStatusMap: Record<
    number,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    1: { label: t('unpaid'), variant: 'destructive' },
    2: { label: t('partialPayment'), variant: 'outline' },
    3: { label: t('paid'), variant: 'secondary' },
  };

  const { toast } = useToast();
  const [list, setList] = useState<OutsourceSettlement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [jumpValue, setJumpValue] = useState('');
  const [jumpError, setJumpError] = useState<string | null>(null);
  const doJump = () => {
    const n = Number(jumpValue);
    if (!jumpValue || isNaN(n) || n < 1 || n > totalPages) {
      setJumpError(tStd('invalidPage', { max: totalPages }));
      return;
    }
    setJumpError(null);
    setPage(n);
  };
  const [searchNo, setSearchNo] = useState('');
  const [stats, setStats] = useState({
    pending: 0,
    settling: 0,
    settled: 0,
    unpaid: 0,
    monthlyAmount: 0,
  });
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState<Loose>({});
  const [outsourceOrders, setOutsourceOrders] = useState<Loose[]>([]);

  const { selected, selectedCount, isSelected, allSelected, toggle, toggleAll, clear, selectAllRef } =
    useRowSelection(list, (r) => String(r.id));
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        settlementNo: searchNo,
      });
      const res = await authFetch('/api/outsource/settlement?' + params);
      const result = await res.json();
      if (result.success) {
        setList(result.data.list || []);
        setTotal(result.data.total || 0);
        setTotalPages(Math.ceil((result.data.total || 0) / pageSize));
      }
    } catch {}
  };

  const fetchOutsourceOrders = async () => {
    try {
      const res = await authFetch('/api/outsource/order?pageSize=100');
      const result = await res.json();
      if (result.success) setOutsourceOrders(result.data?.list || []);
    } catch {}
  };

  const fetchStats = async () => {
    try {
      const res = await authFetch('/api/outsource/settlement/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    fetchData();
    fetchStats();
  }, [page, pageSize]);
  useEffect(() => {
    fetchOutsourceOrders();
  }, []);

  const handleSave = async () => {
    try {
      const res = await authFetch('/api/outsource/settlement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('createSuccess') });
        setShowDialog(false);
        setForm({});
        fetchData();
      } else {
        toast({ title: tc('error'), description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), variant: 'destructive' });
    }
  };

  const handleConfirm = async (id: number) => {
    if (!confirm(t('confirmSettlement'))) return;
    try {
      const res = await authFetch('/api/outsource/settlement', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'confirm' }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: t('settlementConfirmSuccess') });
        fetchData();
      } else {
        toast({
          title: t('settlementConfirmFailed'),
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch {
      toast({ title: tc('error'), variant: 'destructive' });
    }
  };

  const handlePayment = async (id: number) => {
    if (!confirm(t('confirmPayment'))) return;
    try {
      const res = await authFetch('/api/outsource/settlement', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'payment' }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: t('paymentConfirmSuccess') });
        fetchData();
      }
    } catch {
      toast({ title: tc('error'), variant: 'destructive' });
    }
  };

  const handleBatchDelete = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!confirm(tc('batchDeleteConfirm', { count: ids.length }))) return;
    setDeleting(true);
    let okCount = 0; let failMsg = '';
    for (const id of ids) {
      try {
        const res = await authFetch(`/api/outsource/settlement?id=${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) okCount++; else failMsg = data.message || failMsg;
      } catch { failMsg = tc('error'); }
    }
    setDeleting(false);
    if (okCount > 0) toast({ title: tc('success'), description: tc('batchDeleteSuccess', { count: okCount }) });
    if (failMsg) toast({ title: tc('error'), description: failMsg, variant: 'destructive' });
    clear();
    fetchData();
  };

  const handleDelete = async (id: number) => {
    if (!confirm(tc('confirmDelete'))) return;
    try {
      const res = await authFetch('/api/outsource/settlement?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('deleteSuccess') });
        fetchData();
      } else {
        toast({ title: tc('deleteFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('deleteFailed'), variant: 'destructive' });
    }
  };

  const formatAmount = (amount: number) => {
    return ((amount || 0) / 100).toFixed(2);
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('settlement')}</h1>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder={tc('searchOrderNo')}
                value={searchNo}
                onChange={(e) => setSearchNo(e.target.value)}
                className="w-36 h-8 text-sm"
              />
              <Button size="sm" variant="outline" onClick={fetchData}>
                <Search className="h-3 w-3" />
              </Button>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setForm({});
                setShowDialog(true);
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              {t('addSettlement')}
            </Button>
          </div>
        </div>        <StatsCards
          configs={[
            { key: 'pending', label: '待结算', icon: Clock, ...StatsTheme.orange },
            { key: 'settling', label: '结算中', icon: Receipt, ...StatsTheme.blue },
            { key: 'settled', label: '已结算', icon: CheckCircle, ...StatsTheme.green },
            { key: 'unpaid', label: '待付款', icon: AlertTriangle, ...StatsTheme.red },
            { key: 'monthlyAmount', label: '本月结算金额', icon: Banknote, ...StatsTheme.purple },
          ]}
          stats={[
            { key: 'pending', count: stats.pending },
            { key: 'settling', count: stats.settling },
            { key: 'settled', count: stats.settled },
            { key: 'unpaid', count: stats.unpaid },
            { key: 'monthlyAmount', count: stats.monthlyAmount, prefix: '¥' },
          ]}
          cols={{ mobile: 2, tablet: 3, desktop: 5 }}
        />



        <Card>
          <CardContent className="p-0">
            <BatchDeleteBar count={selectedCount} onClear={clear} onDelete={handleBatchDelete} loading={deleting} />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input ref={selectAllRef} type="checkbox" className="h-4 w-4 cursor-pointer accent-blue-600" checked={allSelected} onChange={toggleAll} aria-label={tc('selectAll')} />
                  </TableHead>
                  <TableHead className="text-xs">{t('settlementNo')}</TableHead>
                  <TableHead className="text-xs">{t('orderNo')}</TableHead>
                  <TableHead className="text-xs">{tc('supplier')}</TableHead>
                  <TableHead className="text-xs">{t('settlementDate')}</TableHead>
                  <TableHead className="text-xs text-right">{t('settlementQty')}</TableHead>
                  <TableHead className="text-xs text-right">{t('settlementAmount')}</TableHead>
                  <TableHead className="text-xs text-right">{t('deductAmount')}</TableHead>
                  <TableHead className="text-xs text-right">{t('actualAmount')}</TableHead>
                  <TableHead className="text-xs">{t('paymentStatus')}</TableHead>
                  <TableHead className="text-xs">{tc('status')}</TableHead>
                  <TableHead className="text-xs">{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((item) => {
                  const st = statusMap[item.status] || statusMap[1];
                  const ps = paymentStatusMap[item.payment_status] || paymentStatusMap[1];
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <input type="checkbox" className="h-4 w-4 cursor-pointer accent-blue-600" checked={isSelected(String(item.id))} onChange={() => toggle(String(item.id))} aria-label={tc('selectRow', { id: item.id })} />
                      </TableCell>
                      <TableCell className="text-xs font-mono">{item.settlement_no}</TableCell>
                      <TableCell className="text-xs font-mono">
                        {item.outsource_order_no || '-'}
                      </TableCell>
                      <TableCell className="text-xs">{item.supplier_name || '-'}</TableCell>
                      <TableCell className="text-xs">{item.settlement_date || '-'}</TableCell>
                      <TableCell className="text-xs text-right">
                        {item.settlement_qty || 0}
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        {formatAmount(item.settlement_amount)}
                      </TableCell>
                      <TableCell className="text-xs text-right text-red-500 dark:text-red-400">
                        {formatAmount(item.deduct_amount)}
                      </TableCell>
                      <TableCell className="text-xs text-right font-medium text-green-600 dark:text-green-400">
                        {formatAmount(item.actual_amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={ps.variant} className="text-xs">
                          {ps.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={st.variant} className="text-xs">
                          {st.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {item.status < 3 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs px-2 text-blue-600 dark:text-blue-400"
                              onClick={() => handleConfirm(item.id)}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {t('confirm')}
                            </Button>
                          )}
                          {item.status === 3 && item.payment_status < 3 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs px-2 text-green-600 dark:text-green-400"
                              onClick={() => handlePayment(item.id)}
                            >
                              <DollarSign className="h-3 w-3 mr-1" />
                              {t('payment')}
                            </Button>
                          )}
                          {item.status === 1 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-red-600 dark:text-red-400"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {list.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-gray-400 py-8">
                      {t('noSettlementRecords')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {total > 0 && (
          <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
            <span className="text-sm text-muted-foreground">
              {tStd('paginationSummary', { total, pages: totalPages })}
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20{tStd('pageSizeUnit')}</SelectItem>
                  <SelectItem value="50">50{tStd('pageSizeUnit')}</SelectItem>
                  <SelectItem value="100">100{tStd('pageSizeUnit')}</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>{tStd('prevPage')}</Button>
              <span className="text-sm">{tStd('pageNumber', { page, pages: totalPages })}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>{tStd('nextPage')}</Button>
              <div className="flex items-center gap-1">
                <Input className="w-[70px]" value={jumpValue} onChange={(e) => setJumpValue(e.target.value)} placeholder={tStd('pageNumber', { page, pages: totalPages })} onKeyDown={(e) => { if (e.key === 'Enter') doJump(); }} />
                <Button variant="outline" size="sm" onClick={doJump}>{tStd('jump')}</Button>
              </div>
            </div>
          </div>
        )}
        {jumpError && <p className="text-destructive text-sm mt-2">{jumpError}</p>}

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg" resizable>
            <DialogHeader>
              <DialogTitle>{t('createSettlement')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>
                  {t('orderNo')} <span className="text-red-500 dark:text-red-400">*</span>
                </Label>
                <Select
                  value={String(form.outsource_order_id || '')}
                  onValueChange={(v) => {
                    const o = outsourceOrders.find((x) => x.id === Number(v));
                    setForm({
                      ...form,
                      outsource_order_id: Number(v),
                      outsource_order_no: o?.order_no,
                      supplier_id: o?.supplier_id,
                      supplier_name: o?.supplier_name,
                      unit_price: o?.unit_price,
                      settlement_qty: o?.qualified_qty,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectOutsourceOrder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {outsourceOrders
                      .filter((o) => o.status >= 3 && o.status < 9)
                      .map((o) => (
                        <SelectItem key={o.id} value={String(o.id)}>
                          {o.order_no} - {o.supplier_name || ''}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('settlementDate')}</Label>
                <Input
                  type="date"
                  value={form.settlement_date || ''}
                  onChange={(e) => setForm({ ...form, settlement_date: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('settlementQty')}</Label>
                <Input
                  type="number"
                  value={form.settlement_qty || ''}
                  onChange={(e) => setForm({ ...form, settlement_qty: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>{t('unitPrice')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.unit_price ? form.unit_price / 100 : ''}
                  onChange={(e) =>
                    setForm({ ...form, unit_price: Math.round(Number(e.target.value) * 100) })
                  }
                />
              </div>
              <div>
                <Label>{t('deductAmount')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.deduct_amount ? form.deduct_amount / 100 : ''}
                  onChange={(e) =>
                    setForm({ ...form, deduct_amount: Math.round(Number(e.target.value) * 100) })
                  }
                />
              </div>
              <div className="col-span-2">
                <Label>{tc('remark')}</Label>
                <Input
                  value={form.remark || ''}
                  onChange={(e) => setForm({ ...form, remark: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                {tc('cancel')}
              </Button>
              <Button onClick={handleSave}>{tc('save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
