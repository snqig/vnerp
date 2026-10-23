'use client';
import { useRowSelection } from '@/lib/useRowSelection';

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
import { Plus, Search, MoreHorizontal, Edit, Trash2, FileText, CheckCircle2, Loader2, ArrowUpDown, ArrowUp, ArrowDown, ClipboardList, CheckCircle, Clock, AlertTriangle, Calendar, Factory, Truck } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/use-debounce';
import { formatDate } from '@/lib/date-utils';
import { GlobalExportToolbar } from '@/components/ui/global-export-toolbar';
import { useTranslations } from 'next-intl';
import { StatsCards, StatsTheme } from '@/components/stats-cards';

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
  status: string;
  remark: string;
  create_time: string;
  update_time: string;
}

// 签样登记：色样行（表单编辑态，Lab 值为字符串输入）
interface SignColorRow {
  color_name: string;
  l_value: string;
  a_value: string;
  b_value: string;
  measure_device: string;
  measure_date: string;
  color_sample_url: string;
  de_threshold: string;
}

// 签样登记查看数据（GET /api/sample/sign-records）
interface SignRecordView {
  record: {
    sign_no: string;
    sign_date: string;
    customer_rep: string | null;
    retained_qty: number;
    retained_location: string | null;
    remark: string | null;
  };
  colors: Array<{
    id: number;
    color_no: string;
    color_name: string;
    l_value: string;
    a_value: string;
    b_value: string;
    measure_device: string | null;
    measure_date: string | null;
    color_sample_url: string | null;
    de_threshold: string;
  }>;
}

const lifecycleStatusMap: Record<string, { label: string; color: string }> = {
  draft: { label: 'draft', color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200' },
  pending: { label: 'pending', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' },
  printing: { label: 'printing', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' },
  in_progress: { label: 'inProgress', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  completed: { label: 'completed', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
  confirmed: { label: 'confirmed', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' },
  converted: { label: 'converted', color: 'bg-black text-white' },
  cancelled: { label: 'cancelled', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
};

export default function SampleOrdersPage() {
  const ts = useTranslations('Common');
  // 翻译钩子
  const t = useTranslations('SampleOrders');
  const tc = useTranslations('Common');
  const tStd = useTranslations('StandardTable');

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
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [jumpValue, setJumpValue] = useState('');
  const [jumpError, setJumpError] = useState<string | null>(null);

  // 签样登记（签样标准管理闭环）
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [signTargetOrder, setSignTargetOrder] = useState<SampleOrder | null>(null);
  const [signForm, setSignForm] = useState({
    sign_date: '',
    customer_rep: '',
    retained_qty: '',
    retained_location: '',
    remark: '',
  });
  const [signColors, setSignColors] = useState<SignColorRow[]>([]);
  const [signSubmitting, setSignSubmitting] = useState(false);
  const [viewSignOpen, setViewSignOpen] = useState(false);
  const [viewSignData, setViewSignData] = useState<SignRecordView | null>(null);
  const [viewSignLoading, setViewSignLoading] = useState(false);
  const doJump = () => {
    const n = Number(jumpValue);
    if (!jumpValue || isNaN(n) || n < 1 || n > pagination.totalPages) {
      setJumpError(tStd('invalidPage', { max: pagination.totalPages }));
      return;
    }
    setJumpError(null);
    setPagination((p) => ({ ...p, page: n }));
  };
  const [stats, setStats] = useState({
    pending: 0,
    inProgress: 0,
    completed: 0,
    producing: 0,
    shipping: 0,
    totalAmount: 0,
    monthlyCount: 0,
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
      const aVal = String((a as Loose)[sortField] ?? '').toLowerCase();
      const bVal = String((b as Loose)[sortField] ?? '').toLowerCase();
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [orders, sortField, sortOrder]);
  const { selectedCount, isSelected, allSelected, toggle, toggleAll } = useRowSelection(
    sortedOrders,
    (r) => String(r.id)
  );

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
        keyword: debouncedKeyword,
      });
      if (selectedStatus && selectedStatus !== 'all') {
        params.append('status', selectedStatus);
      }
      if (selectedCustomer && selectedCustomer !== 'all') {
        params.append('customerName', selectedCustomer);
      }
      const response = await authFetch(`/api/sample/orders?${params}`);
      const result = await response.json();
      if (result.success) {
        const orderList = Array.isArray(result.data) ? result.data : result.data?.list || [];
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

  const fetchStats = async () => {
    try {
      const res = await authFetch('/api/sample/orders/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, [fetchOrders]);

  const handleCreate = async () => {
    // 与服务端 validateRequestBody 必填四字段对齐（notify_date/customer_name/product_name/material_no）
    if (!formData.notify_date || !formData.customer_name || !formData.product_name || !formData.material_no) {
      toast({ title: tc('required'), variant: 'destructive' });
      return;
    }
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

  const handleDeliveryAction = async (id: number, action: 'deliver') => {
    try {
      const response = await authFetch('/api/sample/orders/linkage', {
        method: 'PUT',
        body: JSON.stringify({
          sample_order_id: id,
          action,
          actual_delivery_date: new Date().toISOString().split('T')[0],
        }),
      });
      const result = await response.json();
      if (result.success) {
        toast({ title: result.message || t('statusUpdated', { status: action }) });
        fetchOrders();
      } else {
        toast({ title: result.message || t('statusUpdateFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: t('statusUpdateFailed'), variant: 'destructive' });
    }
  };

  // ===== 签样标准管理闭环：签样登记 + 色样档案 =====

  // delivered → 打开签样登记弹窗（登记留样/色样后置为已签样）
  const openSignDialog = (order: SampleOrder) => {
    setSignTargetOrder(order);
    setSignForm({
      sign_date: new Date().toISOString().split('T')[0],
      customer_rep: '',
      retained_qty: '',
      retained_location: '',
      remark: '',
    });
    setSignColors([]);
    setSignDialogOpen(true);
  };

  const updateSignColor = (idx: number, patch: Partial<SignColorRow>) => {
    setSignColors((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const handleSignSubmit = async () => {
    if (!signTargetOrder) return;
    setSignSubmitting(true);
    try {
      const colors = signColors
        .filter((c) => c.color_name)
        .map((c) => ({
          color_name: c.color_name,
          l_value: Number(c.l_value),
          a_value: Number(c.a_value),
          b_value: Number(c.b_value),
          measure_device: c.measure_device || null,
          measure_date: c.measure_date || null,
          color_sample_url: c.color_sample_url || null,
          de_threshold: c.de_threshold ? Number(c.de_threshold) : null,
        }));
      const response = await authFetch('/api/sample/sign-records', {
        method: 'POST',
        body: JSON.stringify({
          sample_order_id: signTargetOrder.id,
          sign_date: signForm.sign_date || undefined,
          customer_rep: signForm.customer_rep || undefined,
          retained_qty: signForm.retained_qty ? Number(signForm.retained_qty) : undefined,
          retained_location: signForm.retained_location || undefined,
          remark: signForm.remark || undefined,
          colors,
        }),
      });
      const result = await response.json();
      if (result.success) {
        toast({ title: result.message || t('k_sign_success') });
        setSignDialogOpen(false);
        setSignTargetOrder(null);
        fetchOrders();
      } else {
        toast({ title: result.message || t('k_sign_failed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: t('k_sign_failed'), variant: 'destructive' });
    } finally {
      setSignSubmitting(false);
    }
  };

  // signed → 查看签样登记与色样档案
  const openViewSign = async (order: SampleOrder) => {
    setViewSignOpen(true);
    setViewSignLoading(true);
    setViewSignData(null);
    try {
      const response = await authFetch(`/api/sample/sign-records?sample_order_id=${order.id}`);
      const result = await response.json();
      if (result.success) setViewSignData(result.data);
    } finally {
      setViewSignLoading(false);
    }
  };

  const handleLifecycleAction = async (id: number, action: string) => {
    try {
      const response = await authFetch('/api/sample/orders/status', {
        method: 'PUT',
        body: JSON.stringify({ id, action }),
      });
      const result = await response.json();
      if (result.success) {
        toast({ title: result.message || t('statusUpdated', { status: action }) });
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

  const getLifecycleStatusBadge = (status: string) => {
    const config = lifecycleStatusMap[status];
    if (!config) return <Badge variant="secondary">{status}</Badge>;
    return <Badge className={config.color}>{t(config.label)}</Badge>;
  };

  const customers = Array.from(new Set(orders.map((o) => o.customer_name)));

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleSelect = (id: number) => toggle(String(id));
  const toggleSelectAll = () => toggleAll();;

  const _exportColumns = [
    { key: 'notify_date', header: t('notifyDate') },
    { key: 'customer_name', header: tc('customer') },
    { key: 'product_name', header: t('productName') },
    { key: 'material_no', header: t('materialNo') },
    { key: 'version', header: tc('version') },
    { key: 'size_spec', header: tc('size') },
    { key: 'quantity', header: tc('quantity') },
    { key: 'customer_require_date', header: t('requireDate') },
    { key: 'status', header: tc('status') },
  ];
  const _getExportData = () =>
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
      [tc('status')]: t(lifecycleStatusMap[s.status]?.label || s.status),
    }));

  const _handlePrint = () => {
    const items =
      selectedCount > 0 ? sortedOrders.filter((o) => isSelected(String(o.id))) : sortedOrders;
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
        <td>${t(lifecycleStatusMap[o.status]?.label || o.status)}</td>
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
          {t('notifyDate')} <span className="text-red-500 dark:text-red-400">*</span>
        </Label>
        <Input
          type="date"
          value={formData.notify_date}
          onChange={(e) => handleInputChange('notify_date', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>
          {tc('customer')} <span className="text-red-500 dark:text-red-400">*</span>
        </Label>
        <Input
          placeholder={tc('customer')}
          value={formData.customer_name}
          onChange={(e) => handleInputChange('customer_name', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>
          {t('productName')} <span className="text-red-500 dark:text-red-400">*</span>
        </Label>
        <Input
          placeholder={t('productName')}
          value={formData.product_name}
          onChange={(e) => handleInputChange('product_name', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>
          {t('materialNo')} <span className="text-red-500 dark:text-red-400">*</span>
        </Label>
        <Input
          placeholder={t('materialNo')}
          value={formData.material_no}
          onChange={(e) => handleInputChange('material_no', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>{tc('version')}</Label>
        <Input
          placeholder={tc('version')}
          value={formData.version}
          onChange={(e) => handleInputChange('version', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>{tc('quantity')}</Label>
        <Input
          type="number"
          placeholder={tc('quantity')}
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
        <Label>{tc('remark')}</Label>
        <Input
          placeholder={tc('remark')}
          value={formData.remark}
          onChange={(e) => handleInputChange('remark', e.target.value)}
        />
      </div>
    </div>
  );

  return (
    <MainLayout title={t('sampleOrderManagement')}>
      <div className="space-y-6">        <StatsCards
          configs={[
            { key: 'pending', label: '待确认', icon: Clock, ...StatsTheme.orange },
            { key: 'producing', label: '生产中', icon: Factory, ...StatsTheme.blue },
            { key: 'shipping', label: '待发货', icon: Truck, ...StatsTheme.cyan },
            { key: 'completed', label: '已完成', icon: CheckCircle, ...StatsTheme.green },
            { key: 'monthlyCount', label: '本月订单数', icon: Calendar, ...StatsTheme.purple },
          ]}
          stats={[
            { key: 'pending', count: stats.pending },
            { key: 'producing', count: stats.producing },
            { key: 'shipping', count: stats.shipping },
            { key: 'completed', count: stats.completed },
            { key: 'monthlyCount', count: stats.monthlyCount },
          ]}
          cols={{ mobile: 2, tablet: 3, desktop: 5 }}
        />


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
                    <SelectItem value="draft">{t('draft')}</SelectItem>
                    <SelectItem value="pending">{t('pending')}</SelectItem>
                    <SelectItem value="printing">{t('printing')}</SelectItem>
                    <SelectItem value="in_progress">{t('inProgress')}</SelectItem>
                    <SelectItem value="completed">{t('completed')}</SelectItem>
                    <SelectItem value="confirmed">{t('confirmed')}</SelectItem>
                    <SelectItem value="converted">{t('converted')}</SelectItem>
                    <SelectItem value="cancelled">{t('cancelled')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 items-center">
                <GlobalExportToolbar
                  filename={ts('k_enl3xj')}
                  title={ts('k_enl3xj')}
                  columns={[
                    {
                      key: 'notify_date',
                      label: t('notifyDate'),
                      width: 12,
                      formatter: (v) => formatDate(v),
                    },
                    { key: 'customer_name', label: tc('customer'), width: 18 },
                    { key: 'product_name', label: t('productName'), width: 22 },
                    { key: 'material_no', label: t('materialNo'), width: 12 },
                    { key: 'version', label: tc('version'), width: 8 },
                    { key: 'size_spec', label: tc('size'), width: 12 },
                    { key: 'quantity', label: tc('quantity'), width: 8 },
                    {
                      key: 'customer_require_date',
                      label: t('requireDate'),
                      width: 12,
                      formatter: (v) => formatDate(v),
                    },
                    {
                      key: 'status',
                      label: tc('status'),
                      width: 12,
                      formatter: (v) => t(lifecycleStatusMap[v]?.label || v),
                    },
                  ]}
                  data={
                    selectedCount > 0
                      ? sortedOrders.filter((o) => isSelected(String(o.id)))
                      : sortedOrders
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
              {selectedCount > 0 ? `，${t('selectedItems', { count: selectedCount })}` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : sortedOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {t('noSampleOrderData')}
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="h-12 px-4 text-left align-middle font-medium w-[40px]">
                        <Checkbox
                          checked={allSelected}
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
                      <th className="h-12 px-4 text-left align-middle font-medium">
                        {tc('status')}
                      </th>
                      <th className="h-12 px-4 text-right align-middle font-medium">
                        {tc('actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedOrders.map((order, index) => (
                      <tr
                        key={order.id}
                        className={`border-b transition-colors hover:bg-muted/50 ${isSelected(String(order.id)) ? 'bg-primary/5' : ''}`}
                      >
                        <td className="p-4">
                          <Checkbox
                            checked={isSelected(String(order.id))}
                            onCheckedChange={() => toggleSelect(order.id)}
                          />
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {(pagination.page - 1) * pagination.pageSize + index + 1}
                        </td>
                        <td className="p-4 font-mono text-sm">{order.order_no}</td>
                        <td className="p-4">{formatDate(order.notify_date)}</td>
                        <td className="p-4 font-medium">{order.customer_name}</td>
                        <td className="p-4">{order.product_name}</td>
                        <td className="p-4 font-mono text-xs">{order.material_no}</td>
                        <td className="p-4">{order.version}</td>
                        <td className="p-4 text-xs">{order.size_spec || '-'}</td>
                        <td className="p-4">{order.quantity}</td>
                        <td className="p-4">{formatDate(order.customer_require_date)}</td>
                        <td className="p-4">{getLifecycleStatusBadge(order.status)}</td>
                        <td className="p-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {order.status === 'draft' && (
                                <DropdownMenuItem
                                  onClick={() => handleLifecycleAction(order.id, 'submit')}
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  {t('submit')}
                                </DropdownMenuItem>
                              )}
                              {order.status === 'pending' && (
                                <DropdownMenuItem
                                  onClick={() => handleLifecycleAction(order.id, 'startProduction')}
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  {t('startProduction')}
                                </DropdownMenuItem>
                              )}
                              {order.status === 'in_progress' && (
                                <DropdownMenuItem
                                  onClick={() => handleLifecycleAction(order.id, 'complete')}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  {t('complete')}
                                </DropdownMenuItem>
                              )}
                              {order.status === 'completed' && (
                                <DropdownMenuItem
                                  onClick={() => handleLifecycleAction(order.id, 'confirm')}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  {t('confirm')}
                                </DropdownMenuItem>
                              )}
                              {order.delivery_status === 'pending' &&
                                order.status === 'completed' && (
                                  <DropdownMenuItem
                                    onClick={() => handleDeliveryAction(order.id, 'deliver')}
                                  >
                                    <FileText className="h-4 w-4 mr-2" />
                                    {t('markDelivered')}
                                  </DropdownMenuItem>
                                )}
                              {order.delivery_status === 'delivered' && (
                                <DropdownMenuItem onClick={() => openSignDialog(order)}>
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  {t('markSigned')}
                                </DropdownMenuItem>
                              )}
                              {order.delivery_status === 'signed' && (
                                <DropdownMenuItem onClick={() => openViewSign(order)}>
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  {t('k_view_sign')}
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

            {pagination.total > 0 && (
              <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
                <span className="text-sm text-muted-foreground">
                  {tStd('paginationSummary', { total: pagination.total, pages: pagination.totalPages })}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={String(pagination.pageSize)} onValueChange={(v) => { setPagination((p) => ({ ...p, pageSize: Number(v), page: 1 })); }}>
                    <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20{tStd('pageSizeUnit')}</SelectItem>
                      <SelectItem value="50">50{tStd('pageSizeUnit')}</SelectItem>
                      <SelectItem value="100">100{tStd('pageSizeUnit')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))} disabled={pagination.page <= 1}>{tStd('prevPage')}</Button>
                  <span className="text-sm">{tStd('pageNumber', { page: pagination.page, pages: pagination.totalPages })}</span>
                  <Button variant="outline" size="sm" onClick={() => setPagination((p) => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))} disabled={pagination.page >= pagination.totalPages}>{tStd('nextPage')}</Button>
                  <div className="flex items-center gap-1">
                    <Input className="w-[70px]" value={jumpValue} onChange={(e) => setJumpValue(e.target.value)} placeholder={tStd('pageNumber', { page: pagination.page, pages: pagination.totalPages })} onKeyDown={(e) => { if (e.key === 'Enter') doJump(); }} />
                    <Button variant="outline" size="sm" onClick={doJump}>{tStd('jump')}</Button>
                  </div>
                </div>
              </div>
            )}
            {jumpError && <p className="text-destructive text-sm mt-2">{jumpError}</p>}
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

      {/* 签样登记弹窗：登记签样信息 + 留样 + 色样 Lab 基准 */}
      <Dialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" resizable>
          <DialogHeader>
            <DialogTitle>{t('k_signrec_title')}</DialogTitle>
            <DialogDescription>
              {signTargetOrder?.order_no} — {signTargetOrder?.product_name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t('k_sign_date')}</Label>
              <Input
                type="date"
                value={signForm.sign_date}
                onChange={(e) => setSignForm((f) => ({ ...f, sign_date: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>{t('k_customer_rep')}</Label>
              <Input
                value={signForm.customer_rep}
                onChange={(e) => setSignForm((f) => ({ ...f, customer_rep: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>{t('k_retained_qty')}</Label>
              <Input
                type="number"
                min="0"
                value={signForm.retained_qty}
                onChange={(e) => setSignForm((f) => ({ ...f, retained_qty: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>{t('k_retained_location')}</Label>
              <Input
                value={signForm.retained_location}
                onChange={(e) => setSignForm((f) => ({ ...f, retained_location: e.target.value }))}
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>{tc('remark')}</Label>
              <Input
                value={signForm.remark}
                onChange={(e) => setSignForm((f) => ({ ...f, remark: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('k_color_list')}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setSignColors((rows) => [
                    ...rows,
                    {
                      color_name: '',
                      l_value: '',
                      a_value: '',
                      b_value: '',
                      measure_device: '',
                      measure_date: '',
                      color_sample_url: '',
                      de_threshold: '1.5',
                    },
                  ])
                }
              >
                <Plus className="h-4 w-4 mr-1" />
                {t('k_add_color')}
              </Button>
            </div>
            {signColors.map((row, idx) => (
              <div key={idx} className="grid grid-cols-4 gap-2 items-end border rounded-md p-2">
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">{t('k_color_name')}</Label>
                  <Input
                    value={row.color_name}
                    onChange={(e) => updateSignColor(idx, { color_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t('k_lab_l')}</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={row.l_value}
                    onChange={(e) => updateSignColor(idx, { l_value: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t('k_lab_a')}</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={row.a_value}
                    onChange={(e) => updateSignColor(idx, { a_value: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t('k_lab_b')}</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={row.b_value}
                    onChange={(e) => updateSignColor(idx, { b_value: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t('k_de_threshold')}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={row.de_threshold}
                    onChange={(e) => updateSignColor(idx, { de_threshold: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t('k_measure_device')}</Label>
                  <Input
                    value={row.measure_device}
                    onChange={(e) => updateSignColor(idx, { measure_device: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t('k_measure_date')}</Label>
                  <Input
                    type="date"
                    value={row.measure_date}
                    onChange={(e) => updateSignColor(idx, { measure_date: e.target.value })}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs">{t('k_color_url')}</Label>
                    <Input
                      value={row.color_sample_url}
                      onChange={(e) => updateSignColor(idx, { color_sample_url: e.target.value })}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => setSignColors((rows) => rows.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSignDialogOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleSignSubmit} disabled={signSubmitting}>
              {signSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {t('k_sign_submit')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 查看签样登记：签样信息 + 色样档案（Lab 基准） */}
      <Dialog open={viewSignOpen} onOpenChange={setViewSignOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" resizable>
          <DialogHeader>
            <DialogTitle>{t('k_signrec_title')}</DialogTitle>
            <DialogDescription>{viewSignData?.record.sign_no}</DialogDescription>
          </DialogHeader>
          {viewSignLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !viewSignData ? (
            <p className="text-sm text-muted-foreground text-center py-6">{t('k_no_sign_record')}</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">{t('k_sign_date')}：</span>
                  {viewSignData.record.sign_date?.slice(0, 10)}
                </div>
                <div>
                  <span className="text-muted-foreground">{t('k_customer_rep')}：</span>
                  {viewSignData.record.customer_rep || '-'}
                </div>
                <div>
                  <span className="text-muted-foreground">{t('k_retained_qty')}：</span>
                  {viewSignData.record.retained_qty ?? 0}
                </div>
                <div>
                  <span className="text-muted-foreground">{t('k_retained_location')}：</span>
                  {viewSignData.record.retained_location || '-'}
                </div>
                {viewSignData.record.remark && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">{tc('remark')}：</span>
                    {viewSignData.record.remark}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>{t('k_color_list')}</Label>
                {viewSignData.colors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('k_no_sign_record')}</p>
                ) : (
                  <table className="w-full text-sm border">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-2 text-left">{t('k_color_name')}</th>
                        <th className="p-2 text-left">L*</th>
                        <th className="p-2 text-left">a*</th>
                        <th className="p-2 text-left">b*</th>
                        <th className="p-2 text-left">{t('k_de_threshold')}</th>
                        <th className="p-2 text-left">{t('k_measure_device')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewSignData.colors.map((c) => (
                        <tr key={c.id} className="border-b">
                          <td className="p-2">
                            {c.color_name}
                            <span className="ml-1 font-mono text-xs text-muted-foreground">
                              {c.color_no}
                            </span>
                          </td>
                          <td className="p-2">{Number(c.l_value)}</td>
                          <td className="p-2">{Number(c.a_value)}</td>
                          <td className="p-2">{Number(c.b_value)}</td>
                          <td className="p-2">{Number(c.de_threshold)}</td>
                          <td className="p-2">{c.measure_device || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
