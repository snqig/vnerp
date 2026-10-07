'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useEffect, useState } from 'react';
import { useRowSelection } from '@/lib/useRowSelection';
import { BatchDeleteBar } from '@/components/BatchDeleteBar';
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
import { Plus, Search, Trash2, CheckCircle, XCircle, PackageCheck, Truck, Clock, AlertTriangle, PackageOpen, Boxes } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserSelect } from '@/components/ui/user-select';
import { WarehouseSelect } from '@/components/ui/warehouse-select';
import { useTranslations } from 'next-intl';
import { StatsCards, StatsTheme } from '@/components/stats-cards';

interface OutsourceReceive {
  id: number;
  receive_no: string;
  outsource_order_id: number;
  outsource_order_no: string;
  warehouse_id: number;
  warehouse_name: string;
  receive_date: string;
  receive_qty: number;
  qualified_qty: number;
  defective_qty: number;
  qc_status: number;
  status: number;
  operator_name: string;
  remark: string;
}

export default function OutsourceReceivePage() {
  const t = useTranslations('Outsource');
  const tc = useTranslations('Common');
  const tStd = useTranslations('StandardTable');

  const statusMap: Record<
    number,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    1: { label: tc('pending'), variant: 'outline' },
    2: { label: tc('approved'), variant: 'default' },
    3: { label: t('received'), variant: 'secondary' },
    9: { label: t('cancelled'), variant: 'destructive' },
  };

  const qcStatusMap: Record<
    number,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    1: { label: t('pendingQc'), variant: 'outline' },
    2: { label: t('qcPass'), variant: 'secondary' },
    3: { label: t('qcFail'), variant: 'destructive' },
  };

  const { toast } = useToast();
  const [list, setList] = useState<OutsourceReceive[]>([]);
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
    partial: 0,
    received: 0,
    todayCount: 0,
    monthlyQty: 0,
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
        receiveNo: searchNo,
      });
      const res = await authFetch('/api/outsource/receive?' + params);
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
      const res = await authFetch('/api/outsource/receive/stats');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchData 依赖 searchNo，搜索应由搜索按钮/事件触发而非自动随输入变化
  }, [page, pageSize]);
  useEffect(() => {
    fetchOutsourceOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 初始加载，仅执行一次
  }, []);

  useEffect(() => {
    clear();
  }, [page, clear]);

  const handleSave = async () => {
    try {
      const res = await authFetch('/api/outsource/receive', {
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

  const handlePost = async (id: number) => {
    if (!confirm(t('confirmPostReceive'))) return;
    try {
      const res = await authFetch('/api/outsource/receive', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'post' }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: t('receivePostSuccess') });
        fetchData();
      } else {
        toast({
          title: t('receivePostFailed'),
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch {
      toast({ title: tc('error'), variant: 'destructive' });
    }
  };

  const handleQc = async (id: number, action: string) => {
    try {
      const res = await authFetch('/api/outsource/receive', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: action === 'qc_pass' ? t('qcPassTitle') : t('qcFailTitle') });
        fetchData();
      }
    } catch {
      toast({ title: tc('error'), variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(tc('confirmDelete'))) return;
    try {
      const res = await authFetch('/api/outsource/receive?id=' + id, { method: 'DELETE' });
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

  const handleBatchDelete = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!confirm(tc('batchDeleteConfirm', { count: ids.length }))) return;
    setDeleting(true);
    let okCount = 0; let failMsg = '';
    for (const id of ids) {
      try {
        const res = await authFetch(`/api/outsource/receive?id=${id}`, { method: 'DELETE' });
        const result = await res.json();
        if (result.success) okCount++; else failMsg = result.message || failMsg;
      } catch { failMsg = tc('error'); }
    }
    setDeleting(false);
    if (okCount > 0) toast({ title: tc('success'), description: tc('batchDeleteSuccess', { count: okCount }) });
    if (failMsg) toast({ title: tc('error'), description: failMsg, variant: 'destructive' });
    clear();
    fetchData();
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('receive')}</h1>
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
              {t('addReceive')}
            </Button>
          </div>
        </div>        <StatsCards
          configs={[
            { key: 'pending', label: '待收货', icon: Clock, ...StatsTheme.orange },
            { key: 'partial', label: '部分收货', icon: PackageOpen, ...StatsTheme.yellow },
            { key: 'received', label: '已收货', icon: CheckCircle, ...StatsTheme.green },
            { key: 'todayCount', label: '今日收货单数', icon: Truck, ...StatsTheme.blue },
            { key: 'monthlyQty', label: '本月收货数量', icon: Boxes, ...StatsTheme.purple },
          ]}
          stats={[
            { key: 'pending', count: stats.pending },
            { key: 'partial', count: stats.partial },
            { key: 'received', count: stats.received },
            { key: 'todayCount', count: stats.todayCount },
            { key: 'monthlyQty', count: stats.monthlyQty },
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
                  <TableHead className="text-xs">{t('receiveNo')}</TableHead>
                  <TableHead className="text-xs">{t('orderNo')}</TableHead>
                  <TableHead className="text-xs">{t('warehouseIn')}</TableHead>
                  <TableHead className="text-xs">{t('receiveDate')}</TableHead>
                  <TableHead className="text-xs text-right">{t('receiveQty')}</TableHead>
                  <TableHead className="text-xs text-right">{t('qualifiedQty')}</TableHead>
                  <TableHead className="text-xs text-right">{t('defectiveQty')}</TableHead>
                  <TableHead className="text-xs">{t('qcStatus')}</TableHead>
                  <TableHead className="text-xs">{tc('status')}</TableHead>
                  <TableHead className="text-xs">{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((item) => {
                  const st = statusMap[item.status] || statusMap[1];
                  const qc = qcStatusMap[item.qc_status] || qcStatusMap[1];
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <input type="checkbox" className="h-4 w-4 cursor-pointer accent-blue-600" checked={isSelected(String(item.id))} onChange={() => toggle(String(item.id))} aria-label={tc('selectRow', { id: item.id })} />
                      </TableCell>
                      <TableCell className="text-xs font-mono">{item.receive_no}</TableCell>
                      <TableCell className="text-xs font-mono">
                        {item.outsource_order_no || '-'}
                      </TableCell>
                      <TableCell className="text-xs">{item.warehouse_name || '-'}</TableCell>
                      <TableCell className="text-xs">{item.receive_date || '-'}</TableCell>
                      <TableCell className="text-xs text-right">{item.receive_qty || 0}</TableCell>
                      <TableCell className="text-xs text-right text-green-600 dark:text-green-400">
                        {item.qualified_qty || 0}
                      </TableCell>
                      <TableCell className="text-xs text-right text-red-500 dark:text-red-400">
                        {item.defective_qty || 0}
                      </TableCell>
                      <TableCell>
                        <Badge variant={qc.variant} className="text-xs">
                          {qc.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={st.variant} className="text-xs">
                          {st.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {item.qc_status === 1 && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-green-600 dark:text-green-400"
                                onClick={() => handleQc(item.id, 'qc_pass')}
                                title={t('qcPass')}
                              >
                                <CheckCircle className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-red-600 dark:text-red-400"
                                onClick={() => handleQc(item.id, 'qc_fail')}
                                title={t('qcFail')}
                              >
                                <XCircle className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                          {item.status < 3 && item.qc_status !== 3 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs px-2 text-blue-600 dark:text-blue-400"
                              onClick={() => handlePost(item.id)}
                            >
                              <PackageCheck className="h-3 w-3 mr-1" />
                              {t('storeIn')}
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
                      {t('noReceiveRecords')}
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
              <DialogTitle>{t('createReceive')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
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
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectOutsourceOrder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {outsourceOrders
                      .filter((o) => o.status >= 2 && o.status < 9)
                      .map((o) => (
                        <SelectItem key={o.id} value={String(o.id)}>
                          {o.order_no} - {o.product_name || ''}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>
                  {t('warehouseIn')} <span className="text-red-500 dark:text-red-400">*</span>
                </Label>
                <WarehouseSelect
                  value={form.warehouse_id || ''}
                  onChange={(v) => setForm({ ...form, warehouse_id: Number(v) })}
                  placeholder={t('selectWarehouse')}
                />
              </div>
              <div>
                <Label>{t('receiveDate')}</Label>
                <Input
                  type="date"
                  value={form.receive_date || ''}
                  onChange={(e) => setForm({ ...form, receive_date: e.target.value })}
                />
              </div>
              <div>
                <Label>
                  {t('receiveQty')} <span className="text-red-500 dark:text-red-400">*</span>
                </Label>
                <Input
                  type="number"
                  value={form.receive_qty || ''}
                  onChange={(e) => setForm({ ...form, receive_qty: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>{t('qualifiedQty')}</Label>
                <Input
                  type="number"
                  value={form.qualified_qty || ''}
                  onChange={(e) => setForm({ ...form, qualified_qty: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>{t('defectiveQty')}</Label>
                <Input
                  type="number"
                  value={form.defective_qty || ''}
                  onChange={(e) => setForm({ ...form, defective_qty: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>{t('operatorName')}</Label>
                <UserSelect
                  value={form.operator_name || ''}
                  onChange={(v) => setForm({ ...form, operator_name: v })}
                />
              </div>
              <div>
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
