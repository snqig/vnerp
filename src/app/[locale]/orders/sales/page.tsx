'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useRouter } from '@/i18n/navigation';
import { useRowSelection } from '@/lib/useRowSelection';
import { useTranslations } from 'next-intl';
import {
  SALES_ORDER_STATUS_CODES,
  SALES_ORDER_STATUS_META,
  salesOrderStatusMeta,
} from '@/lib/order-status';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { SearchInput } from '@/components/ui/search-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MoneyDisplay } from '@/components/ui/money-display';
import {
  Plus,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  FileText,
  RefreshCw,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Printer,
  ChevronDown,
  ChevronRight,
  ShoppingCart,
  CheckCircle,
  ClipboardList,
  CheckCheck,
  Truck,
  CircleCheckBig,
  XCircle,
} from 'lucide-react';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/use-debounce';
import { useCompanyName } from '@/hooks/useCompanyName';
import { GlobalExportToolbar } from '@/components/ui/global-export-toolbar';
import { SalesStatsCards } from './sales-stats-cards';

type SortField =
  | 'order_no'
  | 'customer_name'
  | 'order_date'
  | 'delivery_date'
  | 'total_amount'
  | 'status';
type SortOrder = 'asc' | 'desc' | null;

interface Order {
  id: number;
  order_no: string;
  customer_id?: number;
  customer_name: string;
  contact_name?: string;
  contact_phone?: string;
  delivery_address?: string;
  order_date: string;
  delivery_date: string;
  total_amount: number;
  total_with_tax?: number;
  tax_amount?: number;
  status: number;
  currency?: string;
  exchange_rate?: number;
  base_currency?: string;
  base_total_amount?: number;
  base_tax_amount?: number;
  base_grand_total?: number;
  items: {
    material_id?: number | null;
    material_code?: string;
    material_name: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total_price: number;
    base_unit_price?: number;
    base_amount?: number;
    base_tax_amount?: number;
    base_line_total?: number;
  }[];
  remark?: string;
  create_time?: string;
  update_time?: string;
}

/**
 * 状态徽标映射 —— 不再手写。
 *
 * 本文件此前有 **4 份**互不引用的状态表（列表徽标、Excel 导出、打印、表格 formatter），
 * 加上筛选下拉的第 5 份硬编码。它们与 /api/orders/sales 的 1/2/3、领域层的 0/1/2/3/4/6/9、
 * 导出的 10-60 家族并存，正是 BUG-ORD-002 的界面侧表现。
 * 现统一由 src/lib/order-status.ts 派生（契约依据：sal_order.status 列注释）。
 */
const STATUS_MAP: Record<number, { labelKey: string; className: string }> = Object.fromEntries(
  Object.values(SALES_ORDER_STATUS_META).map((m) => [
    m.code,
    { labelKey: m.labelKey, className: m.className },
  ])
);

/** 生成「码 → 已翻译标签」表，供导出/打印/formatter 复用 */
const buildStatusLabelMap = (t: (key: string) => string): Record<number, string> =>
  Object.fromEntries(SALES_ORDER_STATUS_CODES.map((c) => [c, t(salesOrderStatusMeta(c).labelKey)]));

const getStatusBadge = (status: number, t: (key: string) => string) => {
  // 历史码（0/10/20/…）在此被归一后再取标签，列表不会出现空白徽标
  const meta = salesOrderStatusMeta(status);
  return <Badge className={meta.className}>{t(meta.labelKey)}</Badge>;
};

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('zh-CN');
  } catch {
    return dateStr;
  }
};

export default function SalesOrdersPage() {
  const ts = useTranslations('Orders');
  const t = useTranslations('Orders');
  const tc = useTranslations('Common');
  const router = useRouter();
  const { companyName } = useCompanyName();
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [stats, setStats] = useState<{ status: number; count: number; amount: number }[]>([]);

  const fetchOrders = useCallback(
    async (keyword?: string, status?: string, pageNum?: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (keyword) params.append('keyword', keyword);
        const st = status ?? statusFilter;
        if (st && st !== 'all') params.append('status', st);
        params.append('page', String(pageNum ?? 1));
        params.append('pageSize', '20');
        const response = await authFetch(`/api/orders/sales?${params}`);
        const result = await response.json();
        if (result.success) {
          const data = result.data;
          const orderList = data?.list || [];
          setOrders(orderList);
          setTotalRecords(data?.total ?? 0);
          setStats(data?.summary ?? []);
        } else {
          toast.error(result.message || t('fetchOrdersFailed'));
        }
      } catch {
        toast.error(t('fetchOrdersFailed'));
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, t]
  );

  useEffect(() => {
    fetchOrders(undefined, undefined, 1);
  }, []);

  const debouncedSearchKeyword = useDebounce(searchKeyword, 300);

  useEffect(() => {
    setPage(1);
    fetchOrders(debouncedSearchKeyword, statusFilter, 1);
  }, [debouncedSearchKeyword, statusFilter]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else if (sortOrder === 'desc') {
        setSortField(null);
        setSortOrder(null);
      }
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    if (sortOrder === 'asc') return <ArrowUp className="ml-1 h-3 w-3" />;
    return <ArrowDown className="ml-1 h-3 w-3" />;
  };

  const getAriaSort = (field: SortField): 'ascending' | 'descending' | 'none' => {
    if (sortField !== field || !sortOrder) return 'none';
    return sortOrder === 'asc' ? 'ascending' : 'descending';
  };

  const handleSortKeyDown = (e: React.KeyboardEvent, field: SortField) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSort(field);
    }
  };

  const filteredOrders = useMemo(() => {
    const filtered = [...orders];

    if (sortField && sortOrder) {
      filtered.sort((a, b) => {
        let aVal: string | number = a[sortField];
        let bVal: string | number = b[sortField];

        if (sortField === 'total_amount') {
          aVal = Number(aVal) || 0;
          bVal = Number(bVal) || 0;
        } else if (sortField === 'status') {
          aVal = Number(aVal) || 0;
          bVal = Number(bVal) || 0;
        } else {
          aVal = String(aVal || '').toLowerCase();
          bVal = String(bVal || '').toLowerCase();
        }

        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [orders, sortField, sortOrder]);

  const {
    selected,
    selectedCount,
    isSelected,
    allSelected,
    toggle,
    toggleAll,
    selectAllRef,
  } = useRowSelection(filteredOrders, (o) => String(o.id));

  const toggleRowExpand = (orderId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedRows(newExpanded);
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsViewOpen(true);
  };

  const handleEditOrder = (order: Order) => {
    // 编辑走独立全页表单（与新建同一套组件），路由参数用订单号
    router.push(`/orders/sales/${encodeURIComponent(order.order_no)}/edit`);
  };

  const handleDeleteOrder = async (orderId: number) => {
    if (confirm(t('confirmDelete'))) {
      try {
        const response = await authFetch(`/api/orders?id=${orderId}`, { method: 'DELETE' });
        const result = await response.json();
        if (result.success) {
          toast.success(t('deleteSuccess'));
          fetchOrders();
        } else {
          toast.error(result.message || t('deleteFailed'));
        }
      } catch {
        toast.error(t('deleteFailed'));
      }
    }
  };

  const handleConfirmOrder = async (orderId: number) => {
    try {
      const response = await authFetch('/api/orders/sales', {
        method: 'PUT',
        body: JSON.stringify({ id: orderId, action: 'submit' }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success(t('confirmSuccess'));
        fetchOrders();
      } else {
        toast.error(result.message || t('confirmFailed'));
      }
    } catch {
      toast.error(t('confirmFailed'));
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    if (!confirm(t('confirmCancelOrder'))) return;
    try {
      const response = await authFetch('/api/orders/sales', {
        method: 'PUT',
        body: JSON.stringify({ id: orderId, action: 'cancel' }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success(result.message || t('cancelOrderSuccess'));
        fetchOrders();
      } else {
        toast.error(result.message || t('cancelOrderFailed'));
      }
    } catch {
      toast.error(t('cancelOrderFailed'));
    }
  };

  const handleBatchConfirm = async () => {
    if (!selected.size) {
      toast.warning(t('selectOrderFirst'));
      return;
    }
    const pendingOrders = filteredOrders.filter(
      (o) => selected.has(String(o.id)) && o.status === 1
    );
    if (pendingOrders.length === 0) {
      toast.warning(t('noPendingOrder'));
      return;
    }
    if (!confirm(t('confirmSelected', { count: pendingOrders.length }))) return;

    try {
      let successCount = 0;
      for (const order of pendingOrders) {
        const res = await authFetch('/api/orders/sales', {
          method: 'PUT',
          body: JSON.stringify({ id: order.id, action: 'submit' }),
        });
        const data = await res.json();
        if (data.success) successCount++;
      }
      if (successCount > 0) {
        toast.success(t('confirmSuccessCount', { count: successCount }));
        fetchOrders();
      } else {
        toast.error(t('confirmFailed'));
      }
    } catch {
      toast.error(t('confirmFailed'));
    }
  };

  const handleBatchDelete = async () => {
    if (!selected.size) return;
    if (!confirm(t('confirmDeleteSelected', { count: selected.size }))) return;

    try {
      setLoading(true);
      let successCount = 0;
      for (const orderId of selected) {
        const res = await authFetch(`/api/orders?id=${orderId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) successCount++;
      }
      if (successCount > 0) {
        toast.success(t('deleteSuccessCount', { count: successCount }));
        fetchOrders();
      } else {
        toast.error(t('deleteFailed'));
      }
    } catch {
      toast.error(t('deleteFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateWorkOrder = async (order: Order) => {
    if (String(order.status) === '5') {
      toast.error(t('cancelledCannotGenerate'));
      return;
    }
    if (String(order.status) === '4') {
      toast.error(t('completedCannotGenerate'));
      return;
    }
    if (!order.items || order.items.length === 0) {
      toast.error(t('noItemsCannotGenerate'));
      return;
    }
    if (!confirm(t('confirmGenerateWorkOrder', { orderNo: order.order_no }))) return;

    try {
      const response = await authFetch('/api/workorders', {
        method: 'POST',
        body: JSON.stringify({
          order_id: order.id,
          order_no: order.order_no,
          customer_name: order.customer_name,
          items: order.items.map((item) => ({
            material_name: item.material_name,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
          })),
        }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success(result.message || t('generateWorkOrderSuccess', { orderNo: order.order_no }));
        fetchOrders();
      } else {
        toast.error(result.message || t('generateWorkOrderFailed'));
      }
    } catch {
      toast.error(t('networkError'));
    }
  };

  const _handleExport = (format: string) => {
    const dataToExport =
      selected.size > 0
        ? filteredOrders.filter((o) => selected.has(String(o.id)))
        : filteredOrders;

    if (dataToExport.length === 0) {
      toast.warning(t('noExportData'));
      return;
    }

    const statusLabels: Record<number, string> = buildStatusLabelMap(t);

    if (format === 'excel') {
      const headers = [
        t('orderNo'),
        t('customer'),
        t('orderDate'),
        t('deliveryDate'),
        t('amount'),
        tc('status'),
        t('productDetail'),
      ];
      const rows = dataToExport.map((o) => {
        const itemsStr =
          o.items?.map((i) => `${i.material_name} x${i.quantity}${i.unit}`).join('; ') || '';
        return [
          o.order_no,
          o.customer_name || '-',
          formatDate(o.order_date),
          formatDate(o.delivery_date),
          Number(o.total_amount || 0).toFixed(2),
          statusLabels[o.status] || `${t('unknown')}(${o.status})`,
          itemsStr,
        ];
      });
      const csvContent = [headers.join('\t'), ...rows.map((row) => row.join('\t'))].join('\n');
      const bom = '\uFEFF';
      const blob = new Blob([bom + csvContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${t('salesOrderTitle')}_${new Date().toISOString().slice(0, 10)}.xls`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('exportSuccess'));
    } else if (format === 'pdf') {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error(t('cannotOpenPrintWindow'));
        return;
      }
      const tableRows = dataToExport
        .map((o) => {
          const itemsStr =
            o.items?.map((i) => `${i.material_name} x${i.quantity}${i.unit}`).join('<br>') || '-';
          return `<tr>
          <td>${o.order_no}</td>
          <td>${o.customer_name || '-'}</td>
          <td>${formatDate(o.order_date)}</td>
          <td>${formatDate(o.delivery_date)}</td>
                          <td style="text-align:right">¥${Number(o.total_amount || 0).toLocaleString()}</td>
          <td>${statusLabels[o.status] || t('unknown')}</td>
          <td>${itemsStr}</td>
        </tr>`;
        })
        .join('');
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${t('orderList')}</title>
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          body { font-family: "Microsoft YaHei", Arial, sans-serif; padding: 20px; color: #333; }
          h1 { text-align: center; border-bottom: 2px solid #1a56db; padding-bottom: 10px; color: #1a56db; }
          .info { text-align: center; color: #666; margin-bottom: 15px; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #999; padding: 5px 6px; text-align: center; }
          th { background-color: #f0f4ff; font-weight: bold; color: #1a56db; }
          .footer { margin-top: 20px; text-align: right; color: #999; font-size: 11px; }
          @media print { body { padding: 0; } }
        </style></head>
        <body>
          <h1>${t('orderList')}</h1>
          <div class="info">${t('exportTime')}：${new Date().toLocaleString('zh-CN')} | ${tc('total', { count: dataToExport.length })}</div>
          <table>
            <thead><tr><th>${t('orderNo')}</th><th>${t('customer')}</th><th>${t('orderDate')}</th><th>${t('deliveryDate')}</th><th>${t('amount')}</th><th>${tc('status')}</th><th>${t('productDetail')}</th></tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
          <div class="footer">${companyName}</div>
          <script>window.onload=function(){window.print();}</script>
        </body></html>`;
      printWindow.document.write(html);
      printWindow.document.close();
      toast.success(t('exportPdfSuccess'));
    } else if (format === 'word') {
      const tableRows = dataToExport
        .map((o) => {
          const itemsStr =
            o.items?.map((i) => `${i.material_name} x${i.quantity}${i.unit}`).join('<br>') || '-';
          return `<tr>
          <td style="border:1px solid #333;padding:6px">${o.order_no}</td>
          <td style="border:1px solid #333;padding:6px">${o.customer_name || '-'}</td>
          <td style="border:1px solid #333;padding:6px">${formatDate(o.order_date)}</td>
          <td style="border:1px solid #333;padding:6px">${formatDate(o.delivery_date)}</td>
          <td style="border:1px solid #333;padding:6px;text-align:right">¥${Number(o.total_amount || 0).toLocaleString()}</td>
          <td style="border:1px solid #333;padding:6px">${statusLabels[o.status] || t('unknown')}</td>
          <td style="border:1px solid #333;padding:6px">${itemsStr}</td>
        </tr>`;
        })
        .join('');
      const thCells = [
        t('orderNo'),
        t('customer'),
        t('orderDate'),
        t('deliveryDate'),
        t('amount'),
        tc('status'),
        t('productDetail'),
      ]
        .map((h) => `<th style="border:1px solid #333;padding:6px;background:#f0f0f0">${h}</th>`)
        .join('');
      const htmlContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="utf-8"><title>${t('salesOrderTitle')}</title></head>
        <body style="font-family:'Microsoft YaHei',sans-serif;padding:20px">
          <h1 style="text-align:center">${t('orderList')}</h1>
          <p style="text-align:center;color:#666;font-size:12px">${t('exportTime')}：${new Date().toLocaleString()}</p>
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead><tr>${thCells}</tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body></html>`;
      const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${t('salesOrderTitle')}_${new Date().toISOString().slice(0, 10)}.doc`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('exportWordSuccess'));
    }
  };

  const handlePrintList = () => {
    const dataToPrint =
      selected.size > 0
        ? filteredOrders.filter((o) => selected.has(String(o.id)))
        : filteredOrders;

    if (dataToPrint.length === 0) {
      toast.warning(t('noPrintData'));
      return;
    }

    const statusLabels = buildStatusLabelMap(t);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error(t('checkPopupSettings'));
      return;
    }

    const rows = dataToPrint
      .map(
        (o, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${o.order_no}</td>
        <td>${o.customer_name || '-'}</td>
        <td>${formatDate(o.order_date)}</td>
        <td>${formatDate(o.delivery_date)}</td>
        <td>¥${Number(o.total_amount || 0).toLocaleString()}</td>
        <td>${statusLabels[o.status] || t('unknown')}</td>
        <td>${o.remark || ''}</td>
      </tr>`
      )
      .join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${t('salesOrderTitle')}${tc('print')}</title>
      <style>
        @page { size: A4 landscape; margin: 10mm; }
        body { font-family: "Microsoft YaHei", Arial, sans-serif; padding: 20px; color: #333; }
        h1 { text-align: center; border-bottom: 2px solid #1a56db; padding-bottom: 10px; color: #1a56db; font-size: 20px; }
        .info { text-align: center; color: #666; margin-bottom: 15px; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th, td { border: 1px solid #999; padding: 5px 6px; text-align: center; }
        th { background-color: #f0f4ff; font-weight: bold; color: #1a56db; }
        .footer { margin-top: 20px; text-align: right; color: #999; font-size: 11px; }
        @media print { body { padding: 0; } }
      </style></head>
      <body>
        <h1>${t('orderList')}</h1>
        <div class="info">${t('printTime')}：${new Date().toLocaleString('zh-CN')} | ${tc('total', { count: dataToPrint.length })}</div>
        <table>
          <thead><tr><th>${t('sequence')}</th><th>${t('orderNo')}</th><th>${t('customer')}</th><th>${t('orderDate')}</th><th>${t('deliveryDate')}</th><th>${t('amount')}</th><th>${tc('status')}</th><th>${t('remarkCol')}</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="footer">${companyName}</div>
        <script>window.onload=function(){window.print();}</script>
      </body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    toast.success(t('printSuccess', { count: dataToPrint.length }));
  };

  return (
    <MainLayout title={t('salesOrderTitle')}>
      <div className="space-y-6">
        <SalesStatsCards
          stats={stats}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onFetchOrders={fetchOrders}
          onPageChange={setPage}
          t={t}
        />
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-1 gap-4 items-center w-full md:w-auto">
                <SearchInput
                  placeholder={t('searchPlaceholder')}
                  value={searchKeyword}
                  onChange={setSearchKeyword}
                  onSearch={(kw) => fetchOrders(kw)}
                  className="flex-1 max-w-sm"
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder={t('orderStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allStatus')}</SelectItem>
                    {SALES_ORDER_STATUS_CODES.map((code) => (
                      <SelectItem key={code} value={String(code)}>
                        {t(salesOrderStatusMeta(code).labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => { setStatusFilter('all'); setSearchKeyword(''); setPage(1); fetchOrders(undefined, undefined, 1); }}>
                  <Filter className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => fetchOrders()}>
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <div className="flex gap-2">
                {selectedCount > 0 && (
                  <Button variant="default" onClick={handleBatchConfirm}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {tc('confirm')}(
                    {
                      filteredOrders.filter((o) => selected.has(String(o.id)) && o.status === 1)
                        .length
                    }
                    )
                  </Button>
                )}
                <Button variant="outline" onClick={handlePrintList}>
                  <Printer className="h-4 w-4 mr-2" />
                  {tc('print')}
                  {selectedCount > 0 ? `(${selectedCount})` : ''}
                </Button>
                {selectedCount > 0 && (
                  <Button variant="destructive" onClick={handleBatchDelete}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    {tc('delete')}({selectedCount})
                  </Button>
                )}
                <GlobalExportToolbar
                  filename={ts('k_m6144y')}
                  title={ts('k_vj18tx')}
                  landscape
                  columns={[
                    { key: 'order_no', label: t('orderNo'), width: 18 },
                    { key: 'customer_name', label: t('customer'), width: 20 },
                    {
                      key: 'order_date',
                      label: t('orderDate'),
                      width: 12,
                      formatter: (v) => formatDate(v),
                    },
                    {
                      key: 'delivery_date',
                      label: t('deliveryDate'),
                      width: 12,
                      formatter: (v) => formatDate(v),
                    },
                    {
                      key: 'total_amount',
                      label: t('amount'),
                      width: 12,
                      formatter: (v) => Number(v || 0).toFixed(2),
                    },
                    {
                      key: 'status',
                      label: tc('status'),
                      width: 10,
                      formatter: (v) => {
                        const m = buildStatusLabelMap(t);
                        return m[v] || `${t('unknown')}(${v})`;
                      },
                    },
                    {
                      key: 'items',
                      label: t('productDetail'),
                      width: 30,
                      formatter: (_v, row) =>
                      ((row.items as unknown as Loose[] | null | undefined)
                        ?.map((i: Loose) => `${i.material_name} x${i.quantity}${i.unit}`)
                        .join('; ') || '-'),
                    },
                  ]}
                  data={
                    selected.size > 0
                      ? filteredOrders.filter((o) => selected.has(String(o.id)))
                      : filteredOrders
                  }
                />
                <Button onClick={() => router.push('/orders/sales/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('newOrder')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('orderList')}</CardTitle>
            <CardDescription>
              {tc('total', { count: totalRecords })}
              {statusFilter !== 'all' ? ` (${t('filtered')})` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && orders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">{t('loading')}</div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{orders.length === 0 ? t('noOrderData') : t('noMatchingOrder')}</p>
              </div>
            ) : (
              <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer accent-blue-600"
                        checked={allSelected}
                        onChange={toggleAll}
                        aria-label={tc('selectAll')}
                      />
                    </TableHead>
                    <TableHead className="w-10"></TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted/50"
                      tabIndex={0}
                      aria-sort={getAriaSort('order_no')}
                      onClick={() => handleSort('order_no')}
                      onKeyDown={(e) => handleSortKeyDown(e, 'order_no')}
                    >
                      <span className="inline-flex items-center">
                        {t('orderNo')}
                        {getSortIcon('order_no')}
                      </span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted/50"
                      tabIndex={0}
                      aria-sort={getAriaSort('customer_name')}
                      onClick={() => handleSort('customer_name')}
                      onKeyDown={(e) => handleSortKeyDown(e, 'customer_name')}
                    >
                      <span className="inline-flex items-center">
                        {t('customer')}
                        {getSortIcon('customer_name')}
                      </span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted/50"
                      tabIndex={0}
                      aria-sort={getAriaSort('order_date')}
                      onClick={() => handleSort('order_date')}
                      onKeyDown={(e) => handleSortKeyDown(e, 'order_date')}
                    >
                      <span className="inline-flex items-center">
                        {t('orderDate')}
                        {getSortIcon('order_date')}
                      </span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted/50"
                      tabIndex={0}
                      aria-sort={getAriaSort('delivery_date')}
                      onClick={() => handleSort('delivery_date')}
                      onKeyDown={(e) => handleSortKeyDown(e, 'delivery_date')}
                    >
                      <span className="inline-flex items-center">
                        {t('deliveryDate')}
                        {getSortIcon('delivery_date')}
                      </span>
                    </TableHead>
                    <TableHead
                      className="text-right cursor-pointer select-none hover:bg-muted/50"
                      tabIndex={0}
                      aria-sort={getAriaSort('total_amount')}
                      onClick={() => handleSort('total_amount')}
                      onKeyDown={(e) => handleSortKeyDown(e, 'total_amount')}
                    >
                      <span className="inline-flex items-center justify-end">
                        {t('amount')}
                        {getSortIcon('total_amount')}
                      </span>
                    </TableHead>
                    <TableHead className="text-right">{tc('currency')}</TableHead>
                    <TableHead className="text-right">{t('baseAmount')}</TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted/50"
                      tabIndex={0}
                      aria-sort={getAriaSort('status')}
                      onClick={() => handleSort('status')}
                      onKeyDown={(e) => handleSortKeyDown(e, 'status')}
                    >
                      <span className="inline-flex items-center">
                        {tc('status')}
                        {getSortIcon('status')}
                      </span>
                    </TableHead>
                    <TableHead className="text-right">{tc('operation')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const isExpanded = expandedRows.has(order.id);
                    const lines = order.items || [];
                    return (
                      <React.Fragment key={order.id}>
                        <TableRow className="hover:bg-muted/50">
                          <TableCell>
                            <Checkbox
                              checked={isSelected(String(order.id))}
                              onCheckedChange={() => toggle(String(order.id))}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => toggleRowExpand(order.id)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="font-mono">{order.order_no}</TableCell>
                          <TableCell>{order.customer_name || '-'}</TableCell>
                          <TableCell>{formatDate(order.order_date)}</TableCell>
                          <TableCell>{formatDate(order.delivery_date)}</TableCell>
                          <TableCell className="text-right font-medium">
                            <MoneyDisplay
                              amount={order.total_amount || 0}
                              currency={order.currency || 'CNY'}
                              baseAmount={order.base_total_amount}
                              baseCurrency={order.base_currency}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            {order.currency || <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell className="text-right">
                            {order.base_total_amount != null ? (
                              <MoneyDisplay
                                amount={order.base_total_amount}
                                currency={order.base_currency || 'CNY'}
                              />
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(order.status, t)}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewOrder(order)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  {t('viewDetail')}
                                </DropdownMenuItem>
                                {order.status === 1 && (
                                  <DropdownMenuItem onClick={() => handleConfirmOrder(order.id)}>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    {t('confirmOrder')}
                                  </DropdownMenuItem>
                                )}
                                {order.status === 1 || order.status === 2 ? (
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => handleCancelOrder(order.id)}
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    {t('cancelOrder')}
                                  </DropdownMenuItem>
                                ) : null}
                                <DropdownMenuItem onClick={() => handleEditOrder(order)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  {tc('edit')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleGenerateWorkOrder(order)}>
                                  <FileText className="h-4 w-4 mr-2" />
                                  {t('generateWorkOrder')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteOrder(order.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  {tc('delete')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow key={`${order.id}-detail`}>
                            <TableCell colSpan={11} className="p-0">
                              <div className="bg-slate-50 dark:bg-gray-800 border-t">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-slate-100/50 hover:bg-slate-100/50 dark:bg-gray-700/30 dark:hover:bg-gray-700/50">
                                      <TableHead className="pl-8 text-xs font-normal text-muted-foreground">
                                        {t('productNameCol')}
                                      </TableHead>
                                      <TableHead className="text-xs font-normal text-muted-foreground">
                                        {t('materialCode') || ts('k_zsv6bq')}
                                      </TableHead>
                                      <TableHead className="text-xs font-normal text-muted-foreground text-right">
                                        {t('quantity')}
                                      </TableHead>
                                      <TableHead className="text-xs font-normal text-muted-foreground">
                                        {t('unit')}
                                      </TableHead>
                                      <TableHead className="text-xs font-normal text-muted-foreground text-right">
                                        {t('unitPrice')}
                                      </TableHead>
                                      <TableHead className="text-xs font-normal text-muted-foreground text-right">
                                        {t('amount')}
                                      </TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {lines.length > 0 ? (
                                      lines.map((item, idx) => (
                                        <TableRow
                                          key={idx}
                                          className="bg-transparent hover:bg-white/60 dark:hover:bg-gray-700/30"
                                        >
                                          <TableCell className="pl-8 text-sm">
                                            {item.material_name || '-'}
                                          </TableCell>
                                          <TableCell className="text-sm font-mono text-muted-foreground">
                                            {item.material_code || '-'}
                                          </TableCell>
                                          <TableCell className="text-sm text-right">
                                            {item.quantity ?? 0}
                                          </TableCell>
                                          <TableCell className="text-sm">
                                            {item.unit || '-'}
                                          </TableCell>
                                          <TableCell className="text-sm text-right">
                                            <MoneyDisplay
                                              amount={item.unit_price || 0}
                                              currency={order.currency || 'CNY'}
                                            />
                                          </TableCell>
                                          <TableCell className="text-sm text-right font-medium">
                                            <MoneyDisplay
                                              amount={
                                                item.total_price ||
                                                (item.quantity || 0) * (item.unit_price || 0)
                                              }
                                              currency={order.currency || 'CNY'}
                                            />
                                          </TableCell>
                                        </TableRow>
                                      ))
                                    ) : (
                                      <TableRow>
                                        <TableCell
                                          colSpan={6}
                                          className="text-center py-3 text-muted-foreground text-sm"
                                        >
                                          {t('noDetailData')}
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </TableBody>
                                </Table>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
              {totalRecords > pageSize && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-muted-foreground">
                    {t('orderCount')}: {totalRecords}
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
                    <span className="flex items-center px-3 text-sm text-muted-foreground">
                      {tc('pageOf', { page, pages: Math.ceil(totalRecords / pageSize) })}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page * pageSize >= totalRecords}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      {tc('nextPage')}
                    </Button>
                  </div>
                </div>
              )}
              </>
            )}
          </CardContent>
        </Card>

        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-5xl w-[92vw] max-h-[90vh] overflow-y-auto" resizable>
            <DialogHeader>
              <DialogTitle>{t('orderDetail')}</DialogTitle>
              <DialogDescription>
                {t('orderNo')}: {selectedOrder?.order_no}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">{t('customer')}</Label>
                  <p className="font-medium">{selectedOrder?.customer_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{tc('status')}</Label>
                  <p>{selectedOrder && getStatusBadge(selectedOrder.status, t)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('orderDate')}</Label>
                  <p className="font-medium">{formatDate(selectedOrder?.order_date)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('deliveryDate')}</Label>
                  <p className="font-medium">{formatDate(selectedOrder?.delivery_date)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('orderAmount')}</Label>
                  <p className="font-medium text-lg">
                    <MoneyDisplay
                      amount={selectedOrder?.total_amount || 0}
                      currency={selectedOrder?.currency || 'CNY'}
                      baseAmount={selectedOrder?.base_total_amount}
                      baseCurrency={selectedOrder?.base_currency}
                    />
                  </p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">{t('orderItems')}</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('product')}</TableHead>
                      <TableHead>{t('materialCode') || ts('k_zsv6bq')}</TableHead>
                      <TableHead>{t('quantity')}</TableHead>
                      <TableHead>{t('unit')}</TableHead>
                      <TableHead>{t('unitPrice')}</TableHead>
                      <TableHead>{t('amount')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder?.items?.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.material_name}</TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {item.material_code || '-'}
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell>
                          <MoneyDisplay
                            amount={item.unit_price || 0}
                            currency={selectedOrder?.currency || 'CNY'}
                          />
                        </TableCell>
                        <TableCell>
                          <MoneyDisplay
                            amount={item.total_price || 0}
                            currency={selectedOrder?.currency || 'CNY'}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {selectedOrder?.remark && (
                <div>
                  <Label className="text-muted-foreground">{tc('remark')}</Label>
                  <p className="text-sm">{selectedOrder.remark}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setIsViewOpen(false)}>{tc('close')}</Button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </MainLayout>
  );
}
