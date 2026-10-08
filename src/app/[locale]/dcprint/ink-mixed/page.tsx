'use client';

import { authFetch } from '@/lib/auth-fetch';
import { toDateTimeLocal, nowDateTimeLocal } from '@/lib/date-utils';
import { useRowSelection } from '@/lib/useRowSelection';
import { BatchDeleteBar } from '@/components/BatchDeleteBar';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { PageHeroHeader } from '@/components/layout/PageHeroHeader';
import { ListToolbar } from '@/components/layout/ListToolbar';
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
import { Plus, Search, Edit, Trash2, Beaker, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserSelect } from '@/components/ui/user-select';
import { useTranslations } from 'next-intl';
import { StatsCards, StatsTheme } from '@/components/stats-cards';

interface InkMixedRecord {
  id: number;
  record_no: string;
  base_ink_id: number;
  base_ink_code: string;
  base_ink_name: string;
  mix_ratio: string;
  color_name: string;
  color_code: string;
  company_id: number;
  company_name: string;
  mix_time: string;
  operator_id: number;
  operator_name: string;
  quantity: number;
  unit: string;
  warehouse_id: number;
  location_id: number;
  status: number;
  expire_time: string;
  remark: string;
}

interface CustomerOption {
  id: number;
  customer_code: string;
  customer_name: string;
}

interface InkOption {
  id: number;
  ink_code: string;
  ink_name: string;
  color_name?: string;
  color_code?: string;
}

const statusMap: Record<
  number,
  { label: string; variant: 'default' | 'secondary' | 'destructive' }
> = {
  1: { label: '已入库', variant: 'default' },
  2: { label: '已使用', variant: 'secondary' },
  3: { label: '已过期', variant: 'destructive' },
};

export default function InkMixedPage() {
  const ts = useTranslations('Dcprint');
  // 翻译钩子
  const tc = useTranslations('Common');
  const tStd = useTranslations('StandardTable');

  const { toast } = useToast();
  const [list, setList] = useState<InkMixedRecord[]>([]);
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
  const [searchColor, setSearchColor] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    inStock: 0,
    inUse: 0,
    expired: 0,
  });
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Partial<InkMixedRecord>>({});
  const [activeStatKey, setActiveStatKey] = useState<string | undefined>(undefined);

  const { selected, selectedCount, isSelected, allSelected, toggle, toggleAll, clear, selectAllRef } =
    useRowSelection(list, (r) => String(r.id));
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [inks, setInks] = useState<InkOption[]>([]);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        recordNo: searchNo,
        colorName: searchColor,
      });
      if (activeStatKey && activeStatKey !== 'total') {
        const statusMap: Record<string, string> = { inStock: '1', inUse: '2', expired: '3' };
        if (statusMap[activeStatKey]) params.set('status', statusMap[activeStatKey]);
      }
      const res = await authFetch('/api/dcprint/ink-mixed?' + params);
      const result = await res.json();
      if (result.success) {
        const tot = result.data.total || 0;
        setList(result.data.list || []);
        setTotal(tot);
        setTotalPages(Math.ceil(tot / pageSize));
      }
    } catch {}
  };

  const fetchStats = async () => {
    try {
      const res = await authFetch('/api/dcprint/ink-mixed/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch ink-mixed stats:', error);
    }
  };

  useEffect(() => {
    fetchData();
    fetchStats();
  }, [page, pageSize, activeStatKey]);

  const fetchDialogOptions = async () => {
    try {
      const [custRes, inkRes] = await Promise.all([
        authFetch('/api/customers?pageSize=999&status=1'),
        authFetch('/api/dcprint/ink?pageSize=999&status=1'),
      ]);
      const custData = await custRes.json();
      const inkData = await inkRes.json();
      if (custData.success) setCustomers(custData.data.list || []);
      if (inkData.success) setInks(inkData.data.list || []);
    } catch {}
  };

  const handleCustomerChange = (customerId: string) => {
    const cid = Number(customerId);
    const customer = customers.find((c) => c.id === cid);
    setEditItem((prev) => ({
      ...prev,
      company_id: cid,
      company_name: customer?.customer_name || '',
    }));
  };

  const handleInkChange = (inkId: string) => {
    const iid = Number(inkId);
    const ink = inks.find((i) => i.id === iid);
    setEditItem((prev) => ({
      ...prev,
      base_ink_id: iid,
      base_ink_code: ink?.ink_code || '',
      base_ink_name: ink?.ink_name || '',
      color_name: ink?.color_name || prev.color_name,
      color_code: ink?.color_code || prev.color_code,
    }));
  };

  const handleSave = async () => {
    try {
      const method = editItem.id ? 'PUT' : 'POST';
      const res = await authFetch('/api/dcprint/ink-mixed', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editItem),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: editItem.id ? ts('k_1795bzg') : tc('inboundSuccess') });
        setShowDialog(false);
        fetchData();
      } else {
        toast({ title: tc('error'), description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(tc('confirmDelete'))) return;
    try {
      const res = await authFetch('/api/dcprint/ink-mixed?id=' + id, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('deleteSuccess') });
        fetchData();
      }
    } catch {
      toast({ title: tc('deleteFailed'), variant: 'destructive' });
    }
  };

  const handleStatusChange = async (id: number, status: number) => {
    try {
      const res = await authFetch('/api/dcprint/ink-mixed', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('statusUpdateSuccess') });
        fetchData();
      }
    } catch {
      toast({ title: tc('statusUpdateFailed'), variant: 'destructive' });
    }
  };

  const handleStatClick = (key: string) => {
    if (key === 'total') {
      setActiveStatKey(undefined);
    } else {
      setActiveStatKey(key);
    }
  };

  const handleBatchDelete = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!confirm(tc('confirmBatchDelete', { count: ids.length }))) return;
    let okCount = 0;
    let failMsg = '';
    for (const id of ids) {
      try {
        const res = await authFetch(`/api/dcprint/ink-mixed?id=${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) okCount++;
        else failMsg = data.message || failMsg;
      } catch {
        failMsg = tc('error');
      }
    }
    if (okCount > 0)
      toast({ title: tc('success'), description: tc('batchDeleteSuccess', { count: okCount }) });
    if (failMsg) toast({ title: tc('error'), description: failMsg, variant: 'destructive' });
    clear();
    fetchData();
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <PageHeroHeader
          icon={Beaker}
          title={tc('dcInkMixedTitle')}
          action={
            <Button
              size="sm"
              className="bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/20 transition hover:shadow-lg"
              onClick={() => {
                setEditItem({ mix_time: nowDateTimeLocal(), unit: 'kg' });
                fetchDialogOptions();
                setShowDialog(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              {ts('k_5sawab')}
            </Button>
          }
        />

        <ListToolbar>
          <Input
            placeholder={tc('searchOrderNo')}
            value={searchNo}
            onChange={(e) => setSearchNo(e.target.value)}
            className="w-36 h-8 text-sm"
          />
          <Input
            placeholder={ts('k_138bir9')}
            value={searchColor}
            onChange={(e) => setSearchColor(e.target.value)}
            className="w-36 h-8 text-sm"
          />
          <Button size="sm" variant="outline" onClick={fetchData}>
            <Search className="h-3 w-3" />
          </Button>
        </ListToolbar>

        <StatsCards
          clickable
          activeKey={activeStatKey}
          onCardClick={handleStatClick}
          configs={[
            { key: 'total', label: ts('dcInkMixedTotalLabel'), icon: Beaker, ...StatsTheme.blue, description: ts('dcInkMixedTotalDesc') },
            { key: 'inStock', label: ts('dcInkMixedInStockLabel'), icon: CheckCircle, ...StatsTheme.green, description: ts('dcInkMixedInStockDesc') },
            { key: 'inUse', label: ts('dcInkMixedInUseLabel'), icon: Clock, ...StatsTheme.orange, description: ts('dcInkMixedInUseDesc') },
            { key: 'expired', label: ts('dcInkMixedExpiredLabel'), icon: AlertTriangle, ...StatsTheme.red, description: ts('dcInkMixedExpiredDesc') },
          ]}
          stats={[
            { key: 'total', count: stats.total },
            { key: 'inStock', count: stats.inStock },
            { key: 'inUse', count: stats.inUse },
            { key: 'expired', count: stats.expired },
          ]}
          cols={{ mobile: 2, tablet: 2, desktop: 4 }}
        />

        <Card className="overflow-hidden rounded-xl border-slate-200 shadow-sm dark:border-slate-800">
          <CardContent className="p-0">
            <BatchDeleteBar count={selectedCount} onClear={clear} onDelete={handleBatchDelete} />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      className="h-4 w-4 cursor-pointer accent-blue-600"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label={tc('selectAll')}
                    />
                  </TableHead>
                  <TableHead className="text-xs">{ts('k_4gtnya')}</TableHead>
                  <TableHead className="text-xs">{tc('dcBaseInkHead')}</TableHead>
                  <TableHead className="text-xs">{ts('k_1a44qj9')}</TableHead>
                  <TableHead className="text-xs">{ts('k_1nsepld')}</TableHead>
                  <TableHead className="text-xs">{tc('customer')}</TableHead>
                  <TableHead className="text-xs">{tc('quantity')}</TableHead>
                  <TableHead className="text-xs">{ts('k_en6vuk')}</TableHead>
                  <TableHead className="text-xs">{ts('k_5ctrcy')}</TableHead>
                  <TableHead className="text-xs">{ts('k_1oc35yx')}</TableHead>
                  <TableHead className="text-xs">{tc('status')}</TableHead>
                  <TableHead className="text-xs">{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((item) => {
                  const st = statusMap[item.status] || statusMap[1];
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer accent-blue-600"
                          checked={isSelected(String(item.id))}
                          onChange={() => toggle(String(item.id))}
                          aria-label={tc('selectRow', { id: item.id })}
                        />
                      </TableCell>
                      <TableCell className="text-xs font-mono">{item.record_no}</TableCell>
                      <TableCell className="text-xs">
                        {item.base_ink_name || item.base_ink_code || '-'}
                      </TableCell>
                      <TableCell className="text-xs">{item.mix_ratio || '-'}</TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1">
                          {item.color_code && (
                            <span
                              className="w-3 h-3 rounded-full border"
                              style={{ backgroundColor: item.color_code }}
                            />
                          )}
                          {item.color_name || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{item.company_name || '-'}</TableCell>
                      <TableCell className="text-xs">
                        {item.quantity} {item.unit}
                      </TableCell>
                      <TableCell className="text-xs">{item.operator_name || '-'}</TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {item.mix_time || '-'}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {item.expire_time || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={st.variant} className="text-xs">
                          {st.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {item.status === 1 && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-xs px-2"
                                onClick={() => handleStatusChange(item.id, 2)}
                              >
                                {ts('k_lv5sqq')}</Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-xs px-2 text-orange-600 dark:text-orange-400"
                                onClick={() => handleStatusChange(item.id, 3)}
                              >
                                {ts('k_1g217or')}</Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              setEditItem(item);
                              fetchDialogOptions();
                              setShowDialog(true);
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-red-600 dark:text-red-400"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {list.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-gray-400 py-8">
                      {ts('k_zkg3f0')}</TableCell>
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
          <DialogContent className="max-w-2xl" resizable>
            <DialogHeader>
              <DialogTitle>{editItem.id ? ts('k_h5zj94') : ts('k_244e9j')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{ts('k_1q88ld3')}</Label>
                <Select
                  value={editItem.base_ink_id ? String(editItem.base_ink_id) : ''}
                  onValueChange={handleInkChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={ts('k_s7gv1d')} />
                  </SelectTrigger>
                  <SelectContent>
                    {inks.map((ink) => (
                      <SelectItem key={ink.id} value={String(ink.id)}>
                        {ink.ink_code} - {ink.ink_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{ts('k_1pugj3w')}</Label>
                <Input
                  value={editItem.base_ink_code || ''}
                  onChange={(e) => setEditItem({ ...editItem, base_ink_code: e.target.value })}
                  placeholder={ts('k_wvevyq')}
                />
              </div>
              <div>
                <Label>{ts('k_1g4ewtm')}</Label>
                <Input
                  value={editItem.base_ink_name || ''}
                  onChange={(e) => setEditItem({ ...editItem, base_ink_name: e.target.value })}
                  placeholder={ts('k_wvevyq')}
                />
              </div>
              <div>
                <Label>{ts('k_1a44qj9')}</Label>
                <Input
                  value={editItem.mix_ratio || ''}
                  onChange={(e) => setEditItem({ ...editItem, mix_ratio: e.target.value })}
                  placeholder={ts('k_dwbbim')}
                />
              </div>
              <div>
                <Label>{ts('k_1nsepld')}</Label>
                <Input
                  value={editItem.color_name || ''}
                  onChange={(e) => setEditItem({ ...editItem, color_name: e.target.value })}
                />
              </div>
              <div>
                <Label>{ts('k_ywn539')}</Label>
                <Input
                  value={editItem.color_code || ''}
                  onChange={(e) => setEditItem({ ...editItem, color_code: e.target.value })}
                  placeholder={ts('k_klpud2')}
                />
              </div>
              <div>
                <Label>{ts('k_1o7upb7')}</Label>
                <Select
                  value={editItem.company_id ? String(editItem.company_id) : ''}
                  onValueChange={handleCustomerChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={ts('k_ec192g')} />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.customer_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{ts('k_5ctrcy')}</Label>
                <Input
                  type="datetime-local"
                  value={toDateTimeLocal(editItem.mix_time)}
                  onChange={(e) => setEditItem({ ...editItem, mix_time: e.target.value })}
                />
              </div>
              <div>
                <Label>{ts('k_en6vuk')}</Label>
                <UserSelect
                  value={editItem.operator_name || ''}
                  onChange={(v) => setEditItem({ ...editItem, operator_name: v })}
                />
              </div>
              <div>
                <Label>{tc('quantity')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editItem.quantity || ''}
                  onChange={(e) => setEditItem({ ...editItem, quantity: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>{tc('unit')}</Label>
                <Select
                  value={editItem.unit || 'kg'}
                  onValueChange={(v) => setEditItem({ ...editItem, unit: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="L">L</SelectItem>
                    <SelectItem value="mL">mL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{ts('k_1oc35yx')}</Label>
                <Input
                  type="datetime-local"
                  value={toDateTimeLocal(editItem.expire_time)}
                  onChange={(e) => setEditItem({ ...editItem, expire_time: e.target.value })}
                />
              </div>
              <div>
                <Label>{tc('remark')}</Label>
                <Input
                  value={editItem.remark || ''}
                  onChange={(e) => setEditItem({ ...editItem, remark: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                {ts('k_1589w37')}</Button>
              <Button onClick={handleSave}>{tc('save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
