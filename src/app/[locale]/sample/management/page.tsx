'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useState, useCallback, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/use-debounce';
import {
  TableExportToolbar,
  printTable,
  exportTableToPDF,
  exportTableToXLS,
  exportTableToWORD,
} from '@/components/ui/table-export-toolbar';
import { formatDate } from '@/lib/date-utils';
import { useTranslations } from 'next-intl';

interface SampleOrder {
  id: number;
  order_no: string;
  notify_date: string;
  customer_name: string;
  product_name: string;
  material_no: string;
  version: string;
  size_spec: string;
  material_spec: string;
  quantity: number;
  customer_require_date: string;
  actual_delivery_date: string;
  delivery_status: string;
  delivery_status_label?: string;
  remark: string;
  create_time: string;
  update_time: string;
}

const statusColorMap: Record<string, { className: string }> = {
  pending: { className: 'bg-yellow-100 text-yellow-700' },
  approved: { className: 'bg-green-100 text-green-700' },
  rejected: { className: 'bg-red-100 text-red-700' },
  producing: { className: 'bg-purple-100 text-purple-700' },
  completed: { className: 'bg-blue-100 text-blue-700' },
  delivered: { className: 'bg-cyan-100 text-cyan-700' },
  signed: { className: 'bg-emerald-100 text-emerald-700' },
};

const statusLabelMap: Record<string, string> = {
  pending: 'pendingApproval',
  approved: 'approved',
  rejected: 'rejected',
  producing: 'producing',
  completed: 'completed',
  delivered: 'delivered',
  signed: 'signed',
};

const deliveryStatusLabelMap: Record<number, string> = {
  0: 'notDelivered',
  1: 'partialDelivered',
  2: 'delivered',
  3: 'partialSigned',
  4: 'allSigned',
};

const emptyForm = {
  notify_date: '',
  customer_name: '',
  product_name: '',
  material_no: '',
  version: 'A',
  size_spec: '',
  material_spec: '',
  quantity: 0,
  customer_require_date: '',
  remark: '',
};

export default function SampleManagementPage() {
  // 翻译钩子
  const t = useTranslations('SampleManagement');
  const tc = useTranslations('Common');

  const { toast } = useToast();
  const [list, setList] = useState<SampleOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebounce(keyword, 300);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [detailItem, setDetailItem] = useState<SampleOrder | null>(null);

  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="ml-1 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3" />
    );
  };

  const sortedList = [...list].sort((a, b) => {
    if (!sortField) return 0;
    const aVal = (a as any)[sortField];
    const bVal = (b as any)[sortField];
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    let cmp = 0;
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      cmp = aVal.localeCompare(bVal, 'zh-CN');
    } else {
      cmp = (aVal as number) - (bVal as number);
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const getStatusBadge = (item: SampleOrder) => {
    const status = item.delivery_status || 'pending';
    const label = item.delivery_status_label || status;
    const colorConfig = statusColorMap[status] || statusColorMap.pending;
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorConfig.className}`}
      >
        {label}
      </span>
    );
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (debouncedKeyword) params.set('keyword', debouncedKeyword);
      if (statusFilter !== 'all') params.set('deliveryStatus', statusFilter);
      const res = await authFetch(`/api/sample/orders?${params}`);
      const result = await res.json();
      if (result.success) {
        const sampleList = Array.isArray(result.data) ? result.data : (result.data?.list || []);
        setList(sampleList);
        setTotal(result.pagination?.total || result.data?.total || sampleList.length);
      }
    } catch (e) {
      console.error('Failed to fetch sample list:', e);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedKeyword, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleViewDetail = (item: SampleOrder) => {
    setDetailItem(item);
    setShowDetailDialog(true);
  };

  const handleOpenAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setShowFormDialog(true);
  };

  const handleOpenEdit = (item: SampleOrder) => {
    setEditId(item.id);
    setForm({
      notify_date: (item.notify_date || '').slice(0, 10),
      customer_name: item.customer_name || '',
      product_name: item.product_name || '',
      material_no: item.material_no || '',
      version: item.version || 'A',
      size_spec: item.size_spec || '',
      material_spec: item.material_spec || '',
      quantity: item.quantity || 0,
      customer_require_date: (item.customer_require_date || '').slice(0, 10),
      remark: item.remark || '',
    });
    setShowFormDialog(true);
  };

  const handleSave = async () => {
    if (!form.notify_date || !form.customer_name || !form.product_name || !form.material_no) {
      toast({
        title: t('fillRequiredFields'),
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    try {
      const url = '/api/sample/orders';
      const method = editId ? 'PUT' : 'POST';
      const body = editId ? { id: editId, ...form } : form;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: editId ? tc('updateSuccess') : tc('createSuccess') });
        setShowFormDialog(false);
        fetchData();
      } else {
        toast({ title: result.message || tc('error'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('saveFailed'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('confirmDelete'))) return;
    try {
      const res = await authFetch(`/api/sample/orders?id=${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({ title: tc('deleteSuccess') });
        fetchData();
      } else {
        toast({ title: result.message || tc('deleteFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('deleteFailed'), variant: 'destructive' });
    }
  };

  const exportColumns = [
    { key: 'order_no', header: t('sampleNo') },
    { key: 'product_name', header: t('productName') },
    { key: 'customer_name', header: tc('customer') },
    { key: 'notify_date', header: t('notifyDate') },
    { key: 'customer_require_date', header: t('requireDeliveryDate') },
    { key: 'delivery_status', header: tc('status') },
  ];
  const getExportData = () =>
    sortedList.map((s) => ({
      order_no: s.order_no,
      product_name: s.product_name,
      customer_name: s.customer_name,
      notify_date: formatDate(s.notify_date),
      customer_require_date: formatDate(s.customer_require_date),
      delivery_status: t(statusLabelMap[s.delivery_status] || s.delivery_status),
    }));

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === sortedList.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(sortedList.map((s) => s.id)));
  };

  return (
    <MainLayout title={t('sampleManagement')}>
      <div className="space-y-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-1 gap-4 items-center w-full md:w-auto">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('searchPlaceholder')}
                    className="pl-10"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder={tc("status")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{tc("all")}</SelectItem>
                    <SelectItem value="pending">{t('pendingApproval')}</SelectItem>
                    <SelectItem value="approved">{t('approved')}</SelectItem>
                    <SelectItem value="producing">{t('producing')}</SelectItem>
                    <SelectItem value="completed">{tc("completed")}</SelectItem>
                    <SelectItem value="delivered">{t('delivered')}</SelectItem>
                    <SelectItem value="signed">{t('signed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 items-center">
                <TableExportToolbar
                  selectedCount={selectedIds.size}
                  totalCount={list.length}
                  onSelectAll={toggleSelectAll}
                  onDeselectAll={() => setSelectedIds(new Set())}
                  onPrint={() => printTable(getExportData(), exportColumns, t('sampleList'))}
                  onExportPDF={() =>
                    exportTableToPDF(getExportData(), t('sampleList'), exportColumns, t('sampleList'))
                  }
                  onExportXLS={() => exportTableToXLS(getExportData(), t('sampleList'), exportColumns)}
                  onExportWORD={() =>
                    exportTableToWORD(getExportData(), t('sampleList'), exportColumns, t('sampleList'))
                  }
                />
                <Button onClick={handleOpenAdd}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('addSample')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('sampleList')}{total > 0 ? ` (${total})` : ''}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">{tc('loading')}</span>
              </div>
            ) : list.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">{t('noSampleData')}</div>
            ) : (
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="h-12 px-4 text-left align-middle font-medium w-[40px]">
                        <Checkbox
                          checked={selectedIds.size > 0 && selectedIds.size === sortedList.length}
                          onCheckedChange={toggleSelectAll}
                        />
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-medium w-[60px]">
                        {tc('sequence')}
                      </th>
                      <th
                        className="h-12 px-4 text-left align-middle font-medium cursor-pointer select-none hover:bg-muted/80"
                        onClick={() => handleSort('order_no')}
                      >
                        <span className="inline-flex items-center">
                          {t('sampleNo')}{getSortIcon('order_no')}
                        </span>
                      </th>
                      <th
                        className="h-12 px-4 text-left align-middle font-medium cursor-pointer select-none hover:bg-muted/80"
                        onClick={() => handleSort('product_name')}
                      >
                        <span className="inline-flex items-center">
                          {t('productName')}{getSortIcon('product_name')}
                        </span>
                      </th>
                      <th
                        className="h-12 px-4 text-left align-middle font-medium cursor-pointer select-none hover:bg-muted/80"
                        onClick={() => handleSort('customer_name')}
                      >
                        <span className="inline-flex items-center">
                          {tc('customer')}{getSortIcon('customer_name')}
                        </span>
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-medium">{tc("specification")}</th>
                      <th
                        className="h-12 px-4 text-left align-middle font-medium cursor-pointer select-none hover:bg-muted/80"
                        onClick={() => handleSort('quantity')}
                      >
                        <span className="inline-flex items-center">
                          {tc('quantity')}{getSortIcon('quantity')}
                        </span>
                      </th>
                      <th
                        className="h-12 px-4 text-left align-middle font-medium cursor-pointer select-none hover:bg-muted/80"
                        onClick={() => handleSort('notify_date')}
                      >
                        <span className="inline-flex items-center">
                          {t('notifyDate')}{getSortIcon('notify_date')}
                        </span>
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-medium">{t('requireDeliveryDate')}</th>
                      <th
                        className="h-12 px-4 text-left align-middle font-medium cursor-pointer select-none hover:bg-muted/80"
                        onClick={() => handleSort('delivery_status')}
                      >
                        <span className="inline-flex items-center">
                          {tc('status')}{getSortIcon('delivery_status')}
                        </span>
                      </th>
                      <th className="h-12 px-4 text-right align-middle font-medium">{tc("actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedList.map((item, index) => (
                      <tr
                        key={item.id}
                        className={`border-b transition-colors hover:bg-muted/50 ${selectedIds.has(item.id) ? 'bg-primary/5' : ''}`}
                      >
                        <td className="p-4">
                          <Checkbox
                            checked={selectedIds.has(item.id)}
                            onCheckedChange={() => toggleSelect(item.id)}
                          />
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {(page - 1) * pageSize + index + 1}
                        </td>
                        <td className="p-4 font-mono text-sm">{item.order_no}</td>
                        <td className="p-4 font-medium">{item.product_name}</td>
                        <td className="p-4">{item.customer_name}</td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {item.size_spec || '-'}
                        </td>
                        <td className="p-4">{item.quantity || 0}</td>
                        <td className="p-4 text-muted-foreground">
                          {formatDate(item.notify_date)}
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {formatDate(item.customer_require_date)}
                        </td>
                        <td className="p-4">{getStatusBadge(item)}</td>
                        <td className="p-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewDetail(item)}>
                                <Eye className="h-4 w-4 mr-2" />
                                {t('viewDetail')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenEdit(item)}>
                                <Edit className="h-4 w-4 mr-2" />
                                {tc('edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDelete(item.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {tc('delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {total > pageSize && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">
                  {t('totalRecordsPage', { total, page, totalPages: Math.ceil(total / pageSize) })}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    {tc('prevPage')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= Math.ceil(total / pageSize)}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    {tc('nextPage')}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('sampleDetail')} - {detailItem?.order_no}</DialogTitle>
          </DialogHeader>
          {detailItem && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div>
                <Label className="text-muted-foreground">{t('sampleNo')}</Label>
                <p className="font-mono">{detailItem.order_no}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{t('customerName')}</Label>
                <p>{detailItem.customer_name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{t('productName')}</Label>
                <p className="font-medium">{detailItem.product_name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{t('materialNo')}</Label>
                <p className="font-mono">{detailItem.material_no}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{tc("version")}</Label>
                <p>{detailItem.version || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{tc("specification")}</Label>
                <p>{detailItem.size_spec || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{t('materialSpec')}</Label>
                <p>{detailItem.material_spec || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{tc("quantity")}</Label>
                <p>{detailItem.quantity || 0}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{t('notifyDate')}</Label>
                <p>{formatDate(detailItem.notify_date)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{t('requireDeliveryDate')}</Label>
                <p>{formatDate(detailItem.customer_require_date)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{t('actualDeliveryDate')}</Label>
                <p>{formatDate(detailItem.actual_delivery_date) || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{tc("status")}</Label>
                <p>{getStatusBadge(detailItem)}</p>
              </div>
              <div className="col-span-2">
                <Label className="text-muted-foreground">{tc("remark")}</Label>
                <p>{detailItem.remark || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{tc("createdAt")}</Label>
                <p className="text-sm text-muted-foreground">
                  {formatDate(detailItem.create_time)}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">{tc("updatedAt")}</Label>
                <p className="text-sm text-muted-foreground">
                  {formatDate(detailItem.update_time)}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              {tc('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editId ? t('editSampleOrder') : t('addSampleOrder')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <Label>
                {t('notifyDate')} <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={form.notify_date}
                onChange={(e) => setForm((f) => ({ ...f, notify_date: e.target.value }))}
              />
            </div>
            <div>
              <Label>
                {t('customerName')} <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.customer_name}
                onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))}
                placeholder={t('enterCustomerName')}
              />
            </div>
            <div>
              <Label>
                {t('productName')} <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.product_name}
                onChange={(e) => setForm((f) => ({ ...f, product_name: e.target.value }))}
                placeholder={t('enterProductName')}
              />
            </div>
            <div>
              <Label>
                {t('materialNo')} <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.material_no}
                onChange={(e) => setForm((f) => ({ ...f, material_no: e.target.value }))}
                placeholder={t('enterMaterialNo')}
              />
            </div>
            <div>
              <Label>{tc("version")}</Label>
              <Input
                value={form.version}
                onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
                placeholder={t('versionPlaceholder')}
              />
            </div>
            <div>
              <Label>{tc("specification")}</Label>
              <Input
                value={form.size_spec}
                onChange={(e) => setForm((f) => ({ ...f, size_spec: e.target.value }))}
                placeholder={t('specPlaceholder')}
              />
            </div>
            <div>
              <Label>{t('materialSpec')}</Label>
              <Input
                value={form.material_spec}
                onChange={(e) => setForm((f) => ({ ...f, material_spec: e.target.value }))}
                placeholder={t('materialSpecPlaceholder')}
              />
            </div>
            <div>
              <Label>{tc("quantity")}</Label>
              <Input
                type="number"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
              />
            </div>
            <div>
              <Label>{t('requireDeliveryDate')}</Label>
              <Input
                type="date"
                value={form.customer_require_date}
                onChange={(e) => setForm((f) => ({ ...f, customer_require_date: e.target.value }))}
              />
            </div>
            <div className="col-span-2">
              <Label>{tc("remark")}</Label>
              <Input
                value={form.remark}
                onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))}
                placeholder={tc('enterRemark')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFormDialog(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editId ? tc('save') : tc('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
