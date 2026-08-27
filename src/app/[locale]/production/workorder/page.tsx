'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { MainLayout } from '@/components/layout';
import { formatDate } from '@/lib/date-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { SearchInput } from '@/components/ui/search-input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  MoreHorizontal,
  Eye,
  Play,
  Factory,
  CheckCircle,
  Clock,
  Package,
  TrendingUp,
  Filter,
  Printer,
  Trash2,
  Pencil,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

interface WorkOrderItem {
  id: number;
  line_no: number;
  material_id: number | null;
  material_name: string;
  material_code?: string;
  quantity: number;
  unit: string;
  status?: string;
}

interface WorkOrder {
  id: number;
  work_order_no: string;
  order_no: string;
  bom_id: number;
  customer_name: string;
  product_name: string;
  product_id: number;
  unit: string;
  status: string;
  priority: string;
  plan_start_date: string;
  plan_end_date: string;
  actual_start_date: string | null;
  actual_end_date: string | null;
  remark: string | null;
  create_time: string;
  update_time: string;
  item_count?: number;
  items?: WorkOrderItem[];
  [key: string]: unknown;
}

interface SalesOrder {
  id: number;
  order_no: string;
  customer_name: string;
  product_name: string;
  quantity: number;
  status: number;
}

interface BOMItem {
  id: number;
  bom_code: string;
  bom_no?: string;
  product_name: string;
  product_id?: number;
  version: string;
}

const getStatusConfig = (status: string, t: (key: string) => string) => {
  const configs: Record<string, { label: string; className: string }> = {
    pending: {
      label: t('status.pending'),
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    },
    confirmed: {
      label: t('status.confirmed'),
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    },
    producing: {
      label: t('status.producing'),
      className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    },
    completed: {
      label: t('status.completed'),
      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    },
    cancelled: {
      label: t('status.cancelled'),
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    },
  };
  return (
    configs[status] || {
      label: status,
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    }
  );
};

const getPriorityConfig = (priority: string, t: (key: string) => string) => {
  const configs: Record<string, { label: string; className: string }> = {
    urgent: {
      label: t('priority.urgent'),
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    },
    high: {
      label: t('priority.high'),
      className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    },
    normal: {
      label: t('priority.normal'),
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    },
    low: {
      label: t('priority.low'),
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    },
  };
  return (
    configs[priority] || {
      label: priority,
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    }
  );
};

export default function WorkOrderPage() {
  const t = useTranslations('Production');
  const tc = useTranslations('Common');
  const locale = useLocale();
  const { toast } = useToast();

  const getStatusBadge = (status: number | string) => {
    const config = getStatusConfig(String(status), t);
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: number | string) => {
    const config = getPriorityConfig(String(priority), t);
    return <Badge className={config.className}>{config.label}</Badge>;
  };
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);

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
  const sortedWorkOrders = useMemo(() => {
    if (!sortField || !sortOrder) return workOrders;
    return [...workOrders].sort((a, b) => {
      const aVal = String((a as Record<string, unknown>)[sortField] ?? '').toLowerCase();
      const bVal = String((b as Record<string, unknown>)[sortField] ?? '').toLowerCase();
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [workOrders, sortField, sortOrder]);

  // 已存在未取消工单的销售订单号集合（用于创建工单时过滤下拉，避免选到不可再建工单的订单）
  const ordersWithActiveWo = useMemo(
    () => new Set(workOrders.filter((wo) => wo.status !== 'cancelled').map((wo) => wo.order_no)),
    [workOrders]
  );
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [bomList, setBomList] = useState<BOMItem[]>([]);
  const [newOrder, setNewOrder] = useState({
    order_no: '',
    bom_id: '',
    priority: 'normal',
    plan_start_date: '',
    plan_end_date: '',
    remark: '',
  });
  const [selectedSalesOrder, setSelectedSalesOrder] = useState<{
    customer_name: string;
    items: {
      material_id: number | null;
      material_name: string;
      quantity: number;
      unit: string;
      unit_price: number;
    }[];
  } | null>(null);

  const [selectedWo, setSelectedWo] = useState<Set<string>>(new Set());

  const allSelected =
    sortedWorkOrders.length > 0 &&
    sortedWorkOrders.every((o) => selectedWo.has(o.work_order_no));
  const someSelected = sortedWorkOrders.some((o) => selectedWo.has(o.work_order_no));
  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected && !allSelected;
    }
  }, [someSelected, allSelected]);

  const toggleSelect = (no: string) => {
    setSelectedWo((prev) => {
      const next = new Set(prev);
      if (next.has(no)) next.delete(no);
      else next.add(no);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) setSelectedWo(new Set());
    else setSelectedWo(new Set(sortedWorkOrders.map((o) => o.work_order_no)));
  };

  const handleBatchDelete = async () => {
    const nos = Array.from(selectedWo);
    if (nos.length === 0) return;
    if (!confirm(t('confirmBatchDelete', { count: nos.length }))) return;
    let okCount = 0;
    let failMsg = '';
    for (const no of nos) {
      try {
        const res = await authFetch(`/api/workorders?work_order_no=${no}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) okCount++;
        else failMsg = data.message || failMsg;
      } catch {
        failMsg = t('deleteFailed');
      }
    }
    if (okCount > 0) {
      toast({ title: tc('success'), description: t('batchDeleteSuccess', { count: okCount }) });
    }
    if (failMsg) {
      toast({ title: tc('error'), description: failMsg, variant: 'destructive' });
    }
    setSelectedWo(new Set());
    fetchWorkOrders();
  };

  const fetchWorkOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (activeTab !== 'all') params.append('status', activeTab);
      if (searchQuery) params.append('order_no', searchQuery);
      params.append('page', '1');
      params.append('page_size', '100');

      const res = await authFetch(`/api/workorders?${params}`);
      const data = await res.json();

      if (data.success) {
        const list = data.data?.list || (Array.isArray(data.data) ? data.data : []);
        setWorkOrders(list);
      } else {
        toast({
          title: tc('error'),
          description: data.message || t('fetchListFailed'),
          variant: 'destructive',
        });
      }
    } catch {
      toast({ title: tc('error'), description: t('fetchListFailed'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, toast]);

  const fetchSalesOrders = useCallback(async () => {
    try {
      const res = await authFetch('/api/orders');
      const data = await res.json();
      if (data.success) {
        setSalesOrders(data.data?.list || (Array.isArray(data.data) ? data.data : []));
      }
    } catch {}
  }, []);

  const fetchBomList = useCallback(async () => {
    try {
      const res = await authFetch('/api/orders/bom');
      const data = await res.json();
      if (data.success) {
        setBomList(data.data?.list || (Array.isArray(data.data) ? data.data : []));
      }
    } catch {}
  }, []);

  const fetchSalesOrderDetail = useCallback(async (orderNo: string) => {
    try {
      const res = await authFetch(`/api/orders?id=${encodeURIComponent(orderNo)}`);
      const data = await res.json();
      if (data.success && data.data) {
        setSelectedSalesOrder({
          customer_name: data.data.customer_name || '',
          items: Array.isArray(data.data.items) ? data.data.items : [],
        });
      } else {
        setSelectedSalesOrder(null);
      }
    } catch {
      setSelectedSalesOrder(null);
    }
  }, []);

  useEffect(() => {
    fetchWorkOrders();
  }, [fetchWorkOrders]);

  useEffect(() => {
    fetchSalesOrders();
    fetchBomList();
  }, [fetchSalesOrders, fetchBomList]);

  const handleViewDetail = async (order: WorkOrder) => {
    try {
      const res = await authFetch(`/api/workorders?id=${order.work_order_no}`);
      const data = await res.json();
      if (data.success) {
        setSelectedOrder(data.data);
      } else {
        setSelectedOrder(order);
      }
    } catch {
      setSelectedOrder(order);
    }
    setIsDetailOpen(true);
  };

  const handleCreateOrder = async () => {
    try {
      if (!newOrder.order_no) {
        toast({
          title: tc('error'),
          description: t('selectSalesOrder'),
          variant: 'destructive',
        });
        return;
      }
      const items = selectedSalesOrder?.items || [];
      if (items.length === 0) {
        toast({
          title: tc('error'),
          description: t('salesOrderNoItems'),
          variant: 'destructive',
        });
        return;
      }
      const res = await authFetch('/api/workorders', {
        method: 'POST',
        body: JSON.stringify({
          order_no: newOrder.order_no,
          customer_name: selectedSalesOrder?.customer_name || '',
          items: items.map((i) => ({
            material_id: i.material_id ?? null,
            material_name: i.material_name,
            quantity: i.quantity,
            unit: i.unit,
            unit_price: i.unit_price,
          })),
          bom_id: parseInt(newOrder.bom_id) || null,
          priority: newOrder.priority,
          plan_start_date: newOrder.plan_start_date || null,
          plan_end_date: newOrder.plan_end_date || null,
          remark: newOrder.remark,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: tc('success'), description: t('createSuccess') });
        setIsCreateOpen(false);
        setNewOrder({
          order_no: '',
          bom_id: '',
          priority: 'normal',
          plan_start_date: '',
          plan_end_date: '',
          remark: '',
        });
        setSelectedSalesOrder(null);
        fetchWorkOrders();
      } else {
        toast({
          title: tc('error'),
          description: data.message || t('createFailed'),
          variant: 'destructive',
        });
      }
    } catch {
      toast({ title: tc('error'), description: t('createFailed'), variant: 'destructive' });
    }
  };

  const handleStatusChange = async (order: WorkOrder, newStatus: string) => {
    try {
      const res = await authFetch('/api/workorders', {
        method: 'PUT',
        body: JSON.stringify({ work_order_no: order.work_order_no, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        const statusConfig = getStatusConfig(newStatus, t);
        toast({
          title: tc('success'),
          description: t('statusUpdatedTo', { status: statusConfig.label }),
        });
        fetchWorkOrders();
      } else {
        toast({
          title: tc('error'),
          description: data.message || t('statusUpdateFailed'),
          variant: 'destructive',
        });
      }
    } catch {
      toast({ title: tc('error'), description: t('statusUpdateFailed'), variant: 'destructive' });
    }
  };

  const handleDelete = async (order: WorkOrder) => {
    if (!confirm(t('confirmDelete', { orderNo: order.work_order_no }))) return;
    try {
      const res = await authFetch(`/api/workorders?work_order_no=${order.work_order_no}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: tc('success'), description: t('deleteSuccess') });
        fetchWorkOrders();
      } else {
        toast({
          title: tc('error'),
          description: data.message || t('deleteFailed'),
          variant: 'destructive',
        });
      }
    } catch {
      toast({ title: tc('error'), description: t('deleteFailed'), variant: 'destructive' });
    }
  };

  const handlePrintWorkOrder = async (order: WorkOrder) => {
    try {
      const res = await authFetch(`/api/workorders?id=${order.work_order_no}`);
      const data = await res.json();
      const src = data.success && data.data ? data.data : order;
      const items: WorkOrderItem[] = Array.isArray(src.items)
        ? src.items
        : order.items || [];

      const esc = (v: unknown) => {
        const s = v === null || v === undefined ? '' : String(v);
        return s.replace(
          /[&<>"']/g,
          (c) =>
            ({
              '&': '&amp;',
              '<': '&lt;',
              '>': '&gt;',
              '"': '&quot;',
              "'": '&#39;',
            })[c] as string
        );
      };

      const statusLabel = getStatusConfig(String(src.status), t).label;
      const priorityLabel = getPriorityConfig(String(src.priority), t).label;

      const itemRows = items.length
        ? items
            .map(
              (it) => `
        <tr>
          <td>${esc(it.line_no)}</td>
          <td>${esc(it.material_code || it.material_id || '-')}</td>
          <td>${esc(it.material_name || '-')}</td>
          <td class="num">${esc(it.quantity)}</td>
          <td>${esc(it.unit || '-')}</td>
          <td>${it.status ? esc(getStatusConfig(String(it.status), t).label) : '-'}</td>
        </tr>`
            )
            .join('')
        : `<tr><td colspan="6" class="empty">${esc(t('workOrderMaterials'))} -</td></tr>`;

      const html = `
      <!DOCTYPE html>
      <html><head><meta charset="utf-8">
      <title>${esc(src.work_order_no)} - ${esc(t('workOrder'))}</title>
      <style>
        @page { size: A4; margin: 14mm; }
        * { box-sizing: border-box; }
        body { font-family: -apple-system, "Microsoft YaHei", "PingFang SC", sans-serif; color:#111; font-size:12px; margin:0; }
        h1 { font-size:18px; text-align:center; margin:0 0 4px; }
        .sub { text-align:center; color:#666; font-size:11px; margin-bottom:14px; }
        .grid { display:grid; grid-template-columns: 1fr 1fr; gap:4px 24px; margin-bottom:14px; }
        .row { display:flex; border-bottom:1px dashed #e2e8f0; padding:3px 0; }
        .row .k { width:88px; color:#64748b; flex:none; }
        .row .v { flex:1; font-weight:500; word-break:break-all; }
        h3 { margin:0 0 4px; font-size:13px; }
        table { width:100%; border-collapse:collapse; font-size:11px; margin-top:6px; }
        th { background:#1e3a8a; color:#fff; padding:6px 8px; text-align:left; }
        td { padding:5px 8px; border-bottom:1px solid #e2e8f0; }
        td.num { text-align:right; }
        tr:nth-child(even) td { background:#f8fafc; }
        .empty { text-align:center; color:#94a3b8; padding:12px; }
        .footer { margin-top:18px; font-size:10px; color:#94a3b8; text-align:center; }
      </style></head><body>
      <h1>${esc(t('workOrderDetail'))}: ${esc(src.work_order_no)}</h1>
      <div class="sub">${esc(statusLabel)} · ${esc(priorityLabel)}</div>
      <div class="grid">
        <div class="row"><span class="k">${esc(t('workOrderNo'))}</span><span class="v">${esc(src.work_order_no)}</span></div>
        <div class="row"><span class="k">${esc(t('relatedOrder'))}</span><span class="v">${esc(src.order_no || '-')}</span></div>
        <div class="row"><span class="k">${esc(t('customerName'))}</span><span class="v">${esc(src.customer_name || '-')}</span></div>
        <div class="row"><span class="k">${esc(t('productName'))}</span><span class="v">${esc(src.product_name || '-')}</span></div>
        <div class="row"><span class="k">${esc(t('plannedQuantity'))}</span><span class="v">${esc(src.quantity)} ${esc(src.unit)}</span></div>
        <div class="row"><span class="k">${esc(t('priority.label'))}</span><span class="v">${esc(priorityLabel)}</span></div>
        <div class="row"><span class="k">${esc(t('planStartDate'))}</span><span class="v">${esc(src.plan_start_date || '-')}</span></div>
        <div class="row"><span class="k">${esc(t('planEndDate'))}</span><span class="v">${esc(src.plan_end_date || '-')}</span></div>
        <div class="row"><span class="k">${esc(t('startDate'))}(${esc(t('actualTime'))})</span><span class="v">${esc(src.actual_start_date || '-')}</span></div>
        <div class="row"><span class="k">${esc(t('endDate'))}(${esc(t('actualTime'))})</span><span class="v">${esc(src.actual_end_date || '-')}</span></div>
      </div>
      <h3>${esc(t('workOrderMaterials'))}</h3>
      <table>
        <thead><tr>
          <th>${esc(t('lineNo'))}</th><th>${esc(t('materialCode'))}</th><th>${esc(t('materialName'))}</th>
          <th style="text-align:right;">${esc(t('quantity'))}</th><th>${esc(t('unit'))}</th><th>${esc(t('status.label'))}</th>
        </tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
      ${src.remark ? `<div style="margin-top:12px;"><b>${esc(t('remark'))}:</b> ${esc(src.remark)}</div>` : ''}
      <div class="footer">${esc(t('createTime'))}: ${esc(src.create_time)} · ${esc(t('print'))}: ${new Date().toLocaleString(locale)}</div>
      </body></html>`;

      const pw = window.open('', '_blank', 'width=900,height=700');
      if (!pw) {
        toast({ title: tc('error'), description: t('printBlocked'), variant: 'destructive' });
        return;
      }
      pw.document.open();
      pw.document.write(html);
      pw.document.close();
      pw.focus();
      setTimeout(() => pw.print(), 400);
    } catch {
      toast({
        title: tc('error'),
        description: t('printWorkOrderFailed'),
        variant: 'destructive',
      });
    }
  };

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editOrder, setEditOrder] = useState<WorkOrder | null>(null);
  const [editForm, setEditForm] = useState({
    bom_id: '',
    priority: 'normal',
    plan_start_date: '',
    plan_end_date: '',
    customer_name: '',
    remark: '',
  });

  const handleOpenEdit = async (order: WorkOrder) => {
    try {
      const res = await authFetch(`/api/workorders?id=${order.work_order_no}`);
      const data = await res.json();
      const src = data.success && data.data ? data.data : order;
      setEditOrder(src);
      setEditForm({
        bom_id: src.bom_id ? String(src.bom_id) : '',
        priority: src.priority || 'normal',
        plan_start_date: src.plan_start_date ? String(src.plan_start_date).slice(0, 10) : '',
        plan_end_date: src.plan_end_date ? String(src.plan_end_date).slice(0, 10) : '',
        customer_name: src.customer_name || '',
        remark: src.remark || '',
      });
      setIsEditOpen(true);
    } catch {
      toast({ title: tc('error'), description: t('fetchDetailFailed'), variant: 'destructive' });
    }
  };

  const handleSaveEdit = async () => {
    if (!editOrder) return;
    try {
      const res = await authFetch('/api/workorders', {
        method: 'PUT',
        body: JSON.stringify({
          work_order_no: editOrder.work_order_no,
          bom_id: editForm.bom_id ? parseInt(editForm.bom_id) : null,
          priority: editForm.priority,
          plan_start_date: editForm.plan_start_date || null,
          plan_end_date: editForm.plan_end_date || null,
          customer_name: editForm.customer_name,
          remark: editForm.remark,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: tc('success'), description: t('editSuccess') });
        setIsEditOpen(false);
        setEditOrder(null);
        fetchWorkOrders();
      } else {
        toast({
          title: tc('error'),
          description: data.message || t('editFailed'),
          variant: 'destructive',
        });
      }
    } catch {
      toast({ title: tc('error'), description: t('editFailed'), variant: 'destructive' });
    }
  };

  const stats = {
    total: workOrders.length,
    producing: workOrders.filter((o) => o.status === 'producing').length,
    completed: workOrders.filter((o) => o.status === 'completed').length,
    confirmed: workOrders.filter((o) => o.status === 'confirmed').length,
    pending: workOrders.filter((o) => o.status === 'pending').length,
    totalQty: workOrders.reduce((sum, o) => sum + (parseFloat(String(o.quantity)) || 0), 0),
  };

  return (
    <MainLayout title={t('workOrder')}>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalOrders')}</CardTitle>
              <Factory className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {t('producing')}: {stats.producing} | {t('status.completed')}: {stats.completed}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('plannedQuantity')}</CardTitle>
              <Package className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalQty.toLocaleString(locale)}</div>
              <p className="text-xs text-muted-foreground">
                {t('involvingProducts', { count: workOrders.filter((o) => o.product_name).length })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('producing')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.producing}</div>
              <p className="text-xs text-muted-foreground">{t('inProduction')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('pendingSchedule')}</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending + stats.confirmed}</div>
              <p className="text-xs text-muted-foreground">
                {t('status.pending')}: {stats.pending} | {t('status.confirmed')}: {stats.confirmed}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-1 gap-4 items-center w-full md:w-auto">
                <SearchInput
                  placeholder={t('searchPlaceholder')}
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onSearch={() => fetchWorkOrders()}
                  className="flex-1 max-w-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => fetchWorkOrders()}>
                  <Filter className="h-4 w-4 mr-2" />
                  {tc('refresh')}
                </Button>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('newWorkOrder')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl" resizable>
                    <DialogHeader>
                      <DialogTitle>{t('newWorkOrder')}</DialogTitle>
                      <DialogDescription>{t('createWorkOrderDesc')}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{t('relatedSalesOrder')}</Label>
                          <Select
                            value={newOrder.order_no}
                            onValueChange={(v) => {
                              setNewOrder({ ...newOrder, order_no: v });
                              fetchSalesOrderDetail(v);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('selectSalesOrder')} />
                            </SelectTrigger>
                            <SelectContent position="popper">
                              {salesOrders
                                .filter((so) => !ordersWithActiveWo.has(so.order_no))
                                .map((so) => (
                                  <SelectItem key={so.id} value={so.order_no}>
                                    {so.order_no} - {so.customer_name || t('unknownCustomer')}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>{t('relatedBOM')}</Label>
                          <Select
                            value={newOrder.bom_id}
                            onValueChange={(v) => setNewOrder({ ...newOrder, bom_id: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('selectBOM')} />
                            </SelectTrigger>
                            <SelectContent position="popper">
                              {bomList.map((b) => (
                                <SelectItem key={b.id} value={String(b.id)}>
                                  {b.bom_no} - {b.product_name || t('unknownProduct')}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {selectedSalesOrder ? (
                        <div className="col-span-2 space-y-2">
                          <Label>{t('workOrderMaterials')}</Label>
                          <div className="max-h-44 overflow-auto rounded-md border p-3 text-sm">
                            <p className="mb-2 text-muted-foreground">
                              {t('customer')}: {selectedSalesOrder.customer_name || t('unknownCustomer')}
                              {' · '}
                              {t('quantity')}: {selectedSalesOrder.items.length}
                            </p>
                            {selectedSalesOrder.items.map((it, idx) => (
                              <div key={idx} className="flex justify-between py-0.5">
                                <span>{it.material_name || t('unknownProduct')}</span>
                                <span className="text-muted-foreground">
                                  {parseFloat(String(it.quantity)).toLocaleString(locale)} {it.unit}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="col-span-2 text-sm text-muted-foreground">
                          {t('selectSalesOrder')}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{t('priority.label')}</Label>
                          <Select
                            value={newOrder.priority}
                            onValueChange={(v) => setNewOrder({ ...newOrder, priority: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('selectPriority')} />
                            </SelectTrigger>
                            <SelectContent position="popper">
                              <SelectItem value="urgent">{t('priority.urgent')}</SelectItem>
                              <SelectItem value="high">{t('priority.high')}</SelectItem>
                              <SelectItem value="normal">{t('priority.normal')}</SelectItem>
                              <SelectItem value="low">{t('priority.low')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>{t('remark')}</Label>
                          <Input
                            placeholder={t('enterRemark')}
                            value={newOrder.remark}
                            onChange={(e) => setNewOrder({ ...newOrder, remark: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{t('planStartDate')}</Label>
                          <Input
                            type="date"
                            value={newOrder.plan_start_date}
                            onChange={(e) =>
                              setNewOrder({ ...newOrder, plan_start_date: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('planEndDate')}</Label>
                          <Input
                            type="date"
                            value={newOrder.plan_end_date}
                            onChange={(e) =>
                              setNewOrder({ ...newOrder, plan_end_date: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                        {tc('cancel')}
                      </Button>
                      <Button onClick={handleCreateOrder}>{t('createWorkOrder')}</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">
              {t('all')} ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="producing">
              {t('producing')} ({stats.producing})
            </TabsTrigger>
            <TabsTrigger value="confirmed">
              {t('status.confirmed')} ({stats.confirmed})
            </TabsTrigger>
            <TabsTrigger value="pending">
              {t('status.pending')} ({stats.pending})
            </TabsTrigger>
            <TabsTrigger value="completed">
              {t('status.completed')} ({stats.completed})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <Card>
              <CardContent className="p-0">
                {selectedWo.size > 0 && (
                  <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-4 py-2 text-sm">
                    <span className="font-medium">
                      {t('selectedCount', { count: selectedWo.size })}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedWo(new Set())}>
                        {tc('clear')}
                      </Button>
                      <Button variant="destructive" size="sm" onClick={handleBatchDelete}>
                        {t('batchDelete')}
                      </Button>
                    </div>
                  </div>
                )}
                {loading ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    {tc('loading')}
                  </div>
                ) : workOrders.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    {t('noWorkOrderData')}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <input
                            ref={selectAllRef}
                            type="checkbox"
                            className="h-4 w-4 cursor-pointer accent-blue-600"
                            checked={allSelected}
                            onChange={toggleSelectAll}
                            aria-label={t('select')}
                          />
                        </TableHead>
                        <TableHead
                          className="cursor-pointer select-none hover:bg-muted"
                          onClick={() => handleSort('work_order_no')}
                        >
                          <span className="inline-flex items-center">
                            {t('workOrderNo')}
                            {getSortIcon('work_order_no')}
                          </span>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer select-none hover:bg-muted"
                          onClick={() => handleSort('product_name')}
                        >
                          <span className="inline-flex items-center">
                            {t('productInfo')}
                            {getSortIcon('product_name')}
                          </span>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer select-none hover:bg-muted"
                          onClick={() => handleSort('customer_name')}
                        >
                          <span className="inline-flex items-center">
                            {t('customer')}
                            {getSortIcon('customer_name')}
                          </span>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer select-none hover:bg-muted"
                          onClick={() => handleSort('quantity')}
                        >
                          <span className="inline-flex items-center">
                            {t('quantity')}
                            {getSortIcon('quantity')}
                          </span>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer select-none hover:bg-muted"
                          onClick={() => handleSort('status')}
                        >
                          <span className="inline-flex items-center">
                            {t('status.label')}
                            {getSortIcon('status')}
                          </span>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer select-none hover:bg-muted"
                          onClick={() => handleSort('priority')}
                        >
                          <span className="inline-flex items-center">
                            {t('priority.label')}
                            {getSortIcon('priority')}
                          </span>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer select-none hover:bg-muted"
                          onClick={() => handleSort('planned_start_date')}
                        >
                          <span className="inline-flex items-center">
                            {t('plannedDate')}
                            {getSortIcon('planned_start_date')}
                          </span>
                        </TableHead>
                        <TableHead>{t('operation')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedWorkOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              className="h-4 w-4 cursor-pointer accent-blue-600"
                              checked={selectedWo.has(order.work_order_no)}
                              onChange={() => toggleSelect(order.work_order_no)}
                              aria-label={t('select')}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{order.work_order_no}</span>
                              {order.order_no && (
                                <span className="text-xs text-muted-foreground">
                                  {t('related')}: {order.order_no}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{order.product_name || '-'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span>{order.customer_name || '-'}</span>
                          </TableCell>
                          <TableCell>
                            <span>
                              {parseFloat(String(order.quantity)).toLocaleString(locale)}{' '}
                              {order.unit}
                            </span>
                          </TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell>{getPriorityBadge(order.priority)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col text-xs">
                              <span>{formatDate(order.plan_start_date) || '-'}</span>
                              <span className="text-muted-foreground">{t('to')}</span>
                              <span>{formatDate(order.plan_end_date) || '-'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewDetail(order)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleViewDetail(order)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    {t('viewDetail')}
                                  </DropdownMenuItem>
                                  {order.status !== 'completed' && order.status !== 'cancelled' && (
                                    <DropdownMenuItem onClick={() => handleOpenEdit(order)}>
                                      <Pencil className="h-4 w-4 mr-2" />
                                      {t('editWorkOrder')}
                                    </DropdownMenuItem>
                                  )}
                                  {order.status === 'pending' && (
                                    <DropdownMenuItem
                                      onClick={() => handleStatusChange(order, 'confirmed')}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      {t('confirmWorkOrder')}
                                    </DropdownMenuItem>
                                  )}
                                  {order.status === 'confirmed' && (
                                    <DropdownMenuItem
                                      onClick={() => handleStatusChange(order, 'producing')}
                                    >
                                      <Play className="h-4 w-4 mr-2" />
                                      {t('startProduction')}
                                    </DropdownMenuItem>
                                  )}
                                  {order.status === 'producing' && (
                                    <DropdownMenuItem
                                      onClick={() => handleStatusChange(order, 'completed')}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      {t('completeWorkOrder')}
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => handlePrintWorkOrder(order)}>
                                    <Printer className="h-4 w-4 mr-2" />
                                    {t('printWorkOrder')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => handleDelete(order)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {tc('delete')}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-2xl" resizable>
            <DialogHeader>
              <DialogTitle>{t('editWorkOrder')}</DialogTitle>
              <DialogDescription>{t('editWorkOrderDesc')}</DialogDescription>
            </DialogHeader>
            {editOrder && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <span className="text-muted-foreground">{t('workOrderNo')}</span>
                    <div className="font-mono">{editOrder.work_order_no}</div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground">{t('relatedOrder')}</span>
                    <div>{editOrder.order_no || '-'}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('relatedBOM')}</Label>
                    <Select
                      value={editForm.bom_id}
                      onValueChange={(v) => setEditForm({ ...editForm, bom_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectBOM')} />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {bomList.map((b) => (
                          <SelectItem key={b.id} value={String(b.id)}>
                            {b.bom_no} - {b.product_name || t('unknownProduct')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('priority.label')}</Label>
                    <Select
                      value={editForm.priority}
                      onValueChange={(v) => setEditForm({ ...editForm, priority: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectPriority')} />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        <SelectItem value="urgent">{t('priority.urgent')}</SelectItem>
                        <SelectItem value="high">{t('priority.high')}</SelectItem>
                        <SelectItem value="normal">{t('priority.normal')}</SelectItem>
                        <SelectItem value="low">{t('priority.low')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t('customerName')}</Label>
                  <Input
                    placeholder={t('enterCustomerName')}
                    value={editForm.customer_name}
                    onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('planStartDate')}</Label>
                    <Input
                      type="date"
                      value={editForm.plan_start_date}
                      onChange={(e) =>
                        setEditForm({ ...editForm, plan_start_date: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('planEndDate')}</Label>
                    <Input
                      type="date"
                      value={editForm.plan_end_date}
                      onChange={(e) =>
                        setEditForm({ ...editForm, plan_end_date: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t('remark')}</Label>
                  <Input
                    placeholder={t('enterRemark')}
                    value={editForm.remark}
                    onChange={(e) => setEditForm({ ...editForm, remark: e.target.value })}
                  />
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                {tc('cancel')}
              </Button>
              <Button onClick={handleSaveEdit}>{tc('save')}</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" resizable>
            {selectedOrder && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {t('workOrderDetail')}: {selectedOrder.work_order_no}
                    {getStatusBadge(selectedOrder.status)}
                  </DialogTitle>
                  <DialogDescription>{t('viewWorkOrderDetailDesc')}</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground">
                        {t('productInfo')}
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">{t('productName')}:</span>
                        <span>{selectedOrder.product_name || '-'}</span>
                        <span className="text-muted-foreground">{t('plannedQuantity')}:</span>
                        <span>
                          {parseFloat(String(selectedOrder.quantity)).toLocaleString(locale)}{' '}
                          {selectedOrder.unit}
                        </span>
                        <span className="text-muted-foreground">{t('priority.label')}:</span>
                        <span>{getPriorityBadge(selectedOrder.priority)}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground">
                        {t('customerInfo')}
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">{t('customerName')}:</span>
                        <span>{selectedOrder.customer_name || '-'}</span>
                        <span className="text-muted-foreground">{t('relatedOrder')}:</span>
                        <span>{selectedOrder.order_no || '-'}</span>
                        <span className="text-muted-foreground">{t('status.label')}:</span>
                        <span>{getStatusBadge(selectedOrder.status)}</span>
                      </div>
                    </div>
                  </div>

                  {selectedOrder.items && selectedOrder.items.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground">
                        {t('workOrderMaterials')}
                      </h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('lineNo')}</TableHead>
                            <TableHead>{t('materialCode')}</TableHead>
                            <TableHead>{t('materialName')}</TableHead>
                            <TableHead>{t('quantity')}</TableHead>
                            <TableHead>{t('unit')}</TableHead>
                            <TableHead>{t('status.label')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedOrder.items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>{item.line_no}</TableCell>
                              <TableCell>{item.material_code || item.material_id || '-'}</TableCell>
                              <TableCell>{item.material_name || '-'}</TableCell>
                              <TableCell>
                                {parseFloat(String(item.quantity)).toLocaleString(locale)}
                              </TableCell>
                              <TableCell>{item.unit || '-'}</TableCell>
                              <TableCell>
                                {item.status ? getStatusBadge(item.status) : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground">
                        {t('plannedTime')}
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">{t('startDate')}:</span>
                        <span>{formatDate(selectedOrder.plan_start_date) || '-'}</span>
                        <span className="text-muted-foreground">{t('endDate')}:</span>
                        <span>{formatDate(selectedOrder.plan_end_date) || '-'}</span>
                      </div>
                    </div>

                    {selectedOrder.actual_start_date && (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm text-muted-foreground">
                          {t('actualTime')}
                        </h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <span className="text-muted-foreground">{t('startDate')}:</span>
                          <span>{selectedOrder.actual_start_date}</span>
                          {selectedOrder.actual_end_date && (
                            <>
                              <span className="text-muted-foreground">{t('endDate')}:</span>
                              <span>{selectedOrder.actual_end_date}</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedOrder.remark && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground">{t('remark')}</h4>
                      <p className="text-sm bg-gray-50 p-3 rounded">{selectedOrder.remark}</p>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                      {tc('close')}
                    </Button>
                    {selectedOrder.status === 'confirmed' && (
                      <Button
                        onClick={() => {
                          handleStatusChange(selectedOrder, 'producing');
                          setIsDetailOpen(false);
                        }}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        {t('startProduction')}
                      </Button>
                    )}
                    {selectedOrder.status === 'producing' && (
                      <Button
                        onClick={() => {
                          handleStatusChange(selectedOrder, 'completed');
                          setIsDetailOpen(false);
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {t('completeWorkOrder')}
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
