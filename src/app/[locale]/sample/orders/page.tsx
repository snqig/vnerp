'use client';

import { authFetch } from '@/lib/auth-fetch';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  FileText,
  CheckCircle2,
  Clock,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/use-debounce';
import { formatDate } from '@/lib/date-utils';
import {
  TableExportToolbar,
  printTable,
  exportTableToPDF,
  exportTableToXLS,
  exportTableToWORD,
} from '@/components/ui/table-export-toolbar';
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
  actual_delivery_date: string | null;
  delivery_status: string;
  remark: string;
  create_time: string;
  update_time: string;
}

const statusLabelMap: Record<string, string> = {
  pending: 'pendingDelivery',
  delivered: 'delivered',
  signed: 'signed',
  approved: 'approved',
  completed: 'completed',
  producing: 'producing',
};

export default function SampleOrdersPage() {
  // 翻译钩子
  const t = useTranslations('SampleOrders');
  const tc = useTranslations('Common');

  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<SampleOrder | null>(null);
  const [orders, setOrders] = useState<SampleOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const debouncedKeyword = useDebounce(searchKeyword, 300);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  const [formData, setFormData] = useState({
    notify_date: '',
    customer_name: '',
    product_name: '',
    material_no: '',
    version: 'A',
    size_spec: '',
    material_spec: '',
    quantity: '',
    customer_require_date: '',
    remark: '',
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortOrder === 'asc') setSortOrder('desc');
      else if (sortOrder === 'desc') {
        setSortField(null);
        setSortOrder(null);
      }
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    return sortOrder === 'asc' ? (
      <ArrowUp className="ml-1 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3" />
    );
  };

  const sortedOrders = useMemo(() => {
    if (!sortField || !sortOrder) return orders;
    return [...orders].sort((a, b) => {
      const aVal = String((a as any)[sortField] ?? '').toLowerCase();
      const bVal = String((b as any)[sortField] ?? '').toLowerCase();
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [orders, sortField, sortOrder]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
        keyword: debouncedKeyword,
      });
      if (selectedStatus && selectedStatus !== 'all') {
        params.append('deliveryStatus', selectedStatus);
      }
      if (selectedCustomer && selectedCustomer !== 'all') {
        params.append('customerName', selectedCustomer);
      }
      const response = await authFetch(`/api/sample/orders?${params}`);
      const result = await response.json();
      if (result.success) {
        const orderList = Array.isArray(result.data) ? result.data : (result.data?.list || []);
        setOrders(orderList);
        const total = result.pagination?.total || result.data?.total || orderList.length;
        setPagination((prev) => ({
          ...prev,
          total: total,
          totalPages: Math.ceil(total / prev.pageSize) || 1,
        }));
      }
    } catch {
      toast({ title: t('fetchOrdersFailed'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [
    pagination.page,
    pagination.pageSize,
    debouncedKeyword,
    selectedStatus,
    selectedCustomer,
    toast,
  ]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleCreate = async () => {
    try {
      const response = await authFetch('/api/sample/orders', {
        method: 'POST',
        body: JSON.stringify({ ...formData, quantity: parseInt(formData.quantity) || 0 }),
      });
      const result = await response.json();
      if (result.success) {
        toast({ title: t('orderCreated', { orderNo: result.data.order_no }) });
        setIsCreateOpen(false);
        resetForm();
        fetchOrders();
      } else {
        toast({ title: result.message || tc('createFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('createFailed'), variant: 'destructive' });
    }
  };

  const handleUpdate = async () => {
    if (!editingOrder) return;
    try {
      const response = await authFetch('/api/sample/orders', {
        method: 'PUT',
        body: JSON.stringify({
          id: editingOrder.id,
          ...formData,
          quantity: parseInt(formData.quantity) || 0,
        }),
      });
      const result = await response.json();
      if (result.success) {
        toast({ title: tc('updateSuccess') });
        setIsEditOpen(false);
        setEditingOrder(null);
        resetForm();
        fetchOrders();
      } else {
        toast({ title: result.message || tc('updateFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('updateFailed'), variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('confirmDelete'))) return;
    try {
      const response = await authFetch(`/api/sample/orders?id=${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        toast({ title: tc('deleteSuccess') });
        fetchOrders();
      } else {
        toast({ title: result.message || tc('deleteFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('deleteFailed'), variant: 'destructive' });
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      const response = await authFetch('/api/sample/orders', {
        method: 'PUT',
        body: JSON.stringify({
          id,
          delivery_status: status,
          actual_delivery_date: new Date().toISOString().split('T')[0],
        }),
      });
      const result = await response.json();
      if (result.success) {
        toast({ title: t('statusUpdated', { status: t(statusLabelMap[status] || status) }) });
        fetchOrders();
      } else {
        toast({ title: result.message || t('statusUpdateFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: t('statusUpdateFailed'), variant: 'destructive' });
    }
  };

  const openEditDialog = (order: SampleOrder) => {
    setEditingOrder(order);
    setFormData({
      notify_date: (order.notify_date || '').slice(0, 10),
      customer_name: order.customer_name,
      product_name: order.product_name,
      material_no: order.material_no,
      version: order.version,
      size_spec: order.size_spec,
      material_spec: order.material_spec,
      quantity: order.quantity.toString(),
      customer_require_date: (order.customer_require_date || '').slice(0, 10),
      remark: order.remark,
    });
    setIsEditOpen(true);
  };

  const resetForm = () => {
    setFormData({
      notify_date: '',
      customer_name: '',
      product_name: '',
      material_no: '',
      version: 'A',
      size_spec: '',
      material_spec: '',
      quantity: '',
      customer_require_date: '',
      remark: '',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'signed':
        return (
          <Badge className="bg-green-100 text-green-700">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t('signed')}
          </Badge>
        );
      case 'delivered':
        return (
          <Badge className="bg-blue-100 text-blue-700">
            <FileText className="h-3 w-3 mr-1" />
            {t('delivered')}
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-700">
            <Clock className="h-3 w-3 mr-1" />
            {t('pendingDelivery')}
          </Badge>
        );
      default:
        return <Badge variant="secondary">{statusLabelMap[status] || status}</Badge>;
    }
  };

  const customers = Array.from(new Set(orders.map((o) => o.customer_name)));

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === sortedOrders.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(sortedOrders.map((o) => o.id)));
  };

  const exportColumns = [
    { key: 'notify_date', header: t('notifyDate') },
    { key: 'customer_name', header: tc('customer') },
    { key: 'product_name', header: t('productName') },
    { key: 'material_no', header: t('materialNo') },
    { key: 'version', header: tc('version') },
    { key: 'size_spec', header: tc('size') },
    { key: 'quantity', header: tc('quantity') },
    { key: 'customer_require_date', header: t('requireDate') },
    { key: 'delivery_status', header: tc('status') },
  ];
  const getExportData = () =>
    sortedOrders.map((s, i) => ({
      [tc('serialNo')]: i + 1,
      [t('notifyDate')]: formatDate(s.notify_date),
      [tc('customer')]: s.customer_name,
      [t('productName')]: s.product_name,
      [t('materialNo')]: s.material_no,
      [tc('version')]: s.version,
      [tc('size')]: s.size_spec,
      [tc('quantity')]: s.quantity,
      [t('requireDate')]: formatDate(s.customer_require_date),
      [tc('status')]: t(statusLabelMap[s.delivery_status] || s.delivery_status),
    }));

  const handlePrint = () => {
    const items =
      selectedIds.size > 0 ? sortedOrders.filter((o) => selectedIds.has(o.id)) : sortedOrders;
    if (items.length === 0) {
      toast({ title: t('noDataToPrint'), variant: 'destructive' });
      return;
    }
    const printWindow = window.open('', '_blank', 'width=900,height=600');
    if (!printWindow) return;
    printWindow.document.write(`<html><head><title>${t('sampleOrderList')}</title>
      <style>
        body { font-family: 'Microsoft YaHei', sans-serif; margin: 20px; }
        h2 { text-align: center; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid #333; padding: 6px 8px; text-align: center; }
        th { background: #f0f0f0; font-weight: bold; }
        .right { text-align: right; }
      </style></head><body>
      <h2>${t('sampleOrderList')}</h2>
      <table><thead><tr>
        <th>${tc('serialNo')}</th><th>${t('notifyDate')}</th><th>${tc('customer')}</th><th>${t('productName')}</th><th>${t('materialNo')}</th><th>${tc('version')}</th><th>${tc('size')}</th><th>${tc('quantity')}</th><th>${t('requireDate')}</th><th>${tc('status')}</th>
      </tr></thead><tbody>`);
    items.forEach((o, i) => {
      printWindow.document.write(`<tr>
        <td>${i + 1}</td><td>${formatDate(o.notify_date)}</td><td>${o.customer_name}</td>
        <td>${o.product_name}</td><td>${o.material_no}</td><td>${o.version}</td>
        <td>${o.size_spec || '-'}</td><td>${o.quantity}</td><td>${formatDate(o.customer_require_date)}</td>
        <td>${t(statusLabelMap[o.delivery_status] || o.delivery_status)}</td>
      </tr>`);
    });
    printWindow.document.write(`</tbody></table></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  const sortableHeader = (field: string, label: string) => (
    <th
      className="h-12 px-4 text-left align-middle font-medium cursor-pointer select-none hover:bg-muted/80 transition-colors"
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center">
        {label}
        {getSortIcon(field)}
      </span>
    </th>
  );

  const formFields = (
    <div className="grid grid-cols-2 gap-4 py-4">
      <div className="space-y-2">
        <Label>
          {t('notifyDate')} <span className="text-red-500">*</span>
        </Label>
        <Input
          type="date"
          value={formData.notify_date}
          onChange={(e) => handleInputChange('notify_date', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>
          {tc('customer')} <span className="text-red-500">*</span>
        </Label>
        <Input
          placeholder={tc('customer')}
          value={formData.customer_name}
          onChange={(e) => handleInputChange('customer_name', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>
          {t('productName')} <span className="text-red-500">*</span>
        </Label>
        <Input
          placeholder={t('productName')}
          value={formData.product_name}
          onChange={(e) => handleInputChange('product_name', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>
          {t('materialNo')} <span className="text-red-500">*</span>
        </Label>
        <Input
          placeholder={t('materialNo')}
          value={formData.material_no}
          onChange={(e) => handleInputChange('material_no', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>{tc("version")}</Label>
        <Input
          placeholder={tc("version")}
          value={formData.version}
          onChange={(e) => handleInputChange('version', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>{tc("quantity")}</Label>
        <Input
          type="number"
          placeholder={tc("quantity")}
          value={formData.quantity}
          onChange={(e) => handleInputChange('quantity', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>{t('sizeSpec')}</Label>
        <Input
          placeholder={t('sizeSpec')}
          value={formData.size_spec}
          onChange={(e) => handleInputChange('size_spec', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>{t('requireDate')}</Label>
        <Input
          type="date"
          value={formData.customer_require_date}
          onChange={(e) => handleInputChange('customer_require_date', e.target.value)}
        />
      </div>
      <div className="col-span-2 space-y-2">
        <Label>{t('materialSpec')}</Label>
        <Input
          placeholder={t('materialSpec')}
          value={formData.material_spec}
          onChange={(e) => handleInputChange('material_spec', e.target.value)}
        />
      </div>
      <div className="col-span-2 space-y-2">
        <Label>{tc("remark")}</Label>
        <Input
          placeholder={tc("remark")}
          value={formData.remark}
          onChange={(e) => handleInputChange('remark', e.target.value)}
        />
      </div>
    </div>
  );

  return (
    <MainLayout title={t('sampleOrderManagement')}>
      <div className="space-y-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-1 gap-4 items-center w-full md:w-auto flex-wrap">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('searchPlaceholder')}
                    className="pl-10"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                  />
                </div>
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder={t('customerFilter')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allCustomers')}</SelectItem>
                    {customers.map((customer) => (
                      <SelectItem key={customer} value={customer}>
                        {customer}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder={t('statusFilter')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{tc('all')}</SelectItem>
                    <SelectItem value="pending">{t('pendingDelivery')}</SelectItem>
                    <SelectItem value="delivered">{t('delivered')}</SelectItem>
                    <SelectItem value="signed">{t('signed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 items-center">
                <TableExportToolbar
                  selectedCount={selectedIds.size}
                  totalCount={sortedOrders.length}
                  onSelectAll={toggleSelectAll}
                  onDeselectAll={() => setSelectedIds(new Set())}
                  onPrint={handlePrint}
                  onExportPDF={() =>
                    exportTableToPDF(getExportData(), t('sampleOrderList'), exportColumns, t('sampleOrderList'))
                  }
                  onExportXLS={() =>
                    exportTableToXLS(getExportData(), t('sampleOrderList'), exportColumns)
                  }
                  onExportWORD={() =>
                    exportTableToWORD(
                      getExportData(),
                      t('sampleOrderList'),
                      exportColumns,
                      t('sampleOrderList')
                    )
                  }
                />
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('createSampleOrder')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" resizable>
                    <DialogHeader>
                      <DialogTitle>{t('createSampleOrder')}</DialogTitle>
                      <DialogDescription>{t('fillSampleOrderInfo')}</DialogDescription>
                    </DialogHeader>
                    {formFields}
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsCreateOpen(false);
                          resetForm();
                        }}
                      >
                        {tc('cancel')}
                      </Button>
                      <Button onClick={handleCreate}>{tc('save')}</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('sampleOrderList')}</CardTitle>
            <CardDescription>
              {t('totalOrders', { total: pagination.total })}
              {selectedIds.size > 0 ? `，${t('selectedItems', { count: selectedIds.size })}` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : sortedOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">{t('noSampleOrderData')}</div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="h-12 px-4 text-left align-middle font-medium w-[40px]">
                        <Checkbox
                          checked={selectedIds.size > 0 && selectedIds.size === sortedOrders.length}
                          onCheckedChange={toggleSelectAll}
                        />
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-medium w-[60px]">
                        {tc('sequence')}
                      </th>
                      {sortableHeader('order_no', t('orderNo'))}
                      {sortableHeader('notify_date', t('notifyDate'))}
                      {sortableHeader('customer_name', tc('customer'))}
                      {sortableHeader('product_name', t('productName'))}
                      {sortableHeader('material_no', t('materialNo'))}
                      {sortableHeader('version', tc('version'))}
                      {sortableHeader('size_spec', tc('size'))}
                      {sortableHeader('quantity', tc('quantity'))}
                      {sortableHeader('customer_require_date', t('requireDate'))}
                      <th className="h-12 px-4 text-left align-middle font-medium">{tc("status")}</th>
                      <th className="h-12 px-4 text-right align-middle font-medium">{tc("actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedOrders.map((order, index) => (
                      <tr
                        key={order.id}
                        className={`border-b transition-colors hover:bg-muted/50 ${selectedIds.has(order.id) ? 'bg-primary/5' : ''}`}
                      >
                        <td className="p-4">
                          <Checkbox
                            checked={selectedIds.has(order.id)}
                            onCheckedChange={() => toggleSelect(order.id)}
                          />
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {(pagination.page - 1) * pagination.pageSize + index + 1}
                        </td>
                        <td className="p-4 font-mono text-sm">{order.order_no}</td>
                        <td className="p-4">{formatDate(order.notify_date)}</td>
                        <td className="p-4">{getStatusBadge(order.delivery_status)}</td>
                        <td className="p-4 font-medium">{order.product_name}</td>
                        <td className="p-4 font-mono text-xs">{order.material_no}</td>
                        <td className="p-4">{order.version}</td>
                        <td className="p-4 text-xs">{order.size_spec || '-'}</td>
                        <td className="p-4">{order.quantity}</td>
                        <td className="p-4">{formatDate(order.customer_require_date)}</td>
                        <td className="p-4">{getStatusBadge(order.delivery_status)}</td>
                        <td className="p-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {order.delivery_status === 'pending' && (
                                <DropdownMenuItem
                                  onClick={() => handleUpdateStatus(order.id, 'delivered')}
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  {t('markDelivered')}
                                </DropdownMenuItem>
                              )}
                              {order.delivery_status === 'delivered' && (
                                <DropdownMenuItem
                                  onClick={() => handleUpdateStatus(order.id, 'signed')}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  {t('markSigned')}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => openEditDialog(order)}>
                                <Edit className="h-4 w-4 mr-2" />
                                {tc('edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDelete(order.id)}
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

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">
                  {t('paginationInfo', { total: pagination.total, page: pagination.page, totalPages: pagination.totalPages })}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === 1}
                    onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                  >
                    {tc('prevPage')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                  >
                    {tc('nextPage')}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" resizable>
          <DialogHeader>
            <DialogTitle>{t('editSampleOrder')}</DialogTitle>
            <DialogDescription>{t('modifySampleOrderInfo')}</DialogDescription>
          </DialogHeader>
          {formFields}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditOpen(false);
                setEditingOrder(null);
                resetForm();
              }}
            >
              {tc('cancel')}
            </Button>
            <Button onClick={handleUpdate}>{tc('save')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
