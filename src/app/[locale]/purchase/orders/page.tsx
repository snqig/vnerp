'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useTranslations } from 'next-intl';
import { StatsCards, StatsTheme } from '@/components/stats-cards';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
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
import { Plus, MoreHorizontal, Eye, Trash2, ShoppingCart, Send, FileText, RefreshCw, ChevronDown, ChevronRight, Printer, ArrowUpDown, ArrowUp, ArrowDown, CheckCircle, Clock, AlertTriangle, PackageOpen, Banknote } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import Link from 'next/link';
import { useRouter } from '@/i18n/navigation';
import { useToastContext } from '@/components/ui/toast';
import { useDebounce } from '@/hooks/use-debounce';
import { useCompanyName } from '@/hooks/useCompanyName';
import ApiClient from '@/lib/api-client';
import { logger } from '@/lib/logger';
import { useRowSelection } from '@/lib/useRowSelection';
import { GlobalExportToolbar } from '@/components/ui/global-export-toolbar';
import { MoneyDisplay } from '@/components/ui/money-display';

interface PurchaseOrder {
  id: number;
  po_no: string;
  supplier_id: number;
  supplier_name: string;
  supplier_code: string;
  order_date: string;
  delivery_date: string;
  currency: string;
  total_amount: number;
  total_quantity: number;
  tax_rate: number;
  tax_amount: number;
  grand_total: number;
  base_currency?: string;
  base_total_amount?: number;
  base_tax_amount?: number;
  base_grand_total?: number;
  status: number;
  over_receipt_tolerance: number;
  payment_terms: string;
  remark: string;
  create_time: string;
  update_time: string;
  audit_time: string | null;
  lines?: OrderItem[];
  [key: string]: unknown;
}

interface Supplier {
  id: number;
  supplier_code: string;
  supplier_name: string;
  short_name: string;
  grade: string;
  status: string;
}

interface OrderItem {
  id: number;
  material_code: string;
  material_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  base_unit_price?: number;
  base_amount?: number;
  base_tax_amount?: number;
  base_line_total?: number;
}

const PO_STATUS = {
  DRAFT: 10,
  PENDING_APPROVAL: 20,
  APPROVED: 30,
  PARTIALLY_RECEIVED: 40,
  COMPLETED: 50,
  CLOSED: 90,
} as const;

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return dateStr;
  }
};

export default function PurchaseOrdersPage() {
  const ts = useTranslations('Purchase');
  // 翻译钩子
  const t = useTranslations('Purchase');
  const tc = useTranslations('Common');

  const STATUS_MAP: Record<number, { label: string; className: string }> = {
    10: {
      label: tc('draft'),
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    },
    20: {
      label: tc('pending'),
      className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200',
    },
    30: {
      label: tc('approved'),
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
    },
    40: {
      label: t('partialReceived'),
      className: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200',
    },
    50: {
      label: t('completed'),
      className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200',
    },
    90: {
      label: tc('closed'),
      className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200',
    },
  };

  const getStatusBadge = (status: number) => {
    const config = STATUS_MAP[status] || {
      label: `${tc('unknown')}(${status})`,
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const router = useRouter();
  const { companyName } = useCompanyName();
  const { addToast: toast } = useToastContext();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({
    pending: 0,
    ordered: 0,
    partial: 0,
    completed: 0,
    monthlyAmount: 0,
  });

  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);

  const fetchOrders = useCallback(
    async (searchKeyword?: string) => {
      logger.info({ module: 'Purchase', action: 'fetchOrders' }, ts('k_v0c763'), {
        page,
        pageSize,
        statusFilter,
        searchKeyword,
      });
      try {
        setLoading(true);

        const data = await ApiClient.get('/api/purchase/orders', {
          page,
          pageSize,
          keyword: searchKeyword,
          status: statusFilter !== 'all' ? statusFilter : undefined,
        });

        if (data.success) {
          const ordersList = Array.isArray(data.data) ? data.data : data.data?.list || [];
          setOrders(ordersList);
          setTotal(data.pagination?.total || 0);
          logger.info({ module: 'Purchase', action: 'fetchOrders' }, ts('k_1fywe87'), {
            count: ordersList.length,
          });
        } else {
          logger.warn({ module: 'Purchase', action: 'fetchOrders' }, ts('k_11ohwaz'), {
            message: data.message,
          });
        }
      } catch (error) {
        logger.error({ module: 'Purchase', action: 'fetchOrders' }, ts('k_thrhgq'), {
          error: (error as Error).message,
        });
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, statusFilter, ts]
  );

  const fetchSuppliers = useCallback(async () => {
    logger.info({ module: 'Purchase', action: 'fetchSuppliers' }, ts('k_4hpxzn'));
    try {
      const data = await ApiClient.get('/api/purchase/suppliers');
      if (data.success) {
        setSuppliers(data.data?.list || data.data || []);
        logger.info({ module: 'Purchase', action: 'fetchSuppliers' }, ts('k_1ppv1hb'), {
          count: (data.data?.list || []).length,
        });
      }
    } catch (error) {
      logger.error({ module: 'Purchase', action: 'fetchSuppliers' }, ts('k_j12ivi'), {
        error: (error as Error).message,
      });
    }
  }, [ts]);

  const fetchStats = async () => {
    try {
      const res = await authFetch('/api/purchase/orders/stats');
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

  const debouncedKeyword = useDebounce(keyword, 300);

  useEffect(() => {
    fetchOrders(debouncedKeyword);
  }, [debouncedKeyword, statusFilter, fetchOrders]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleViewDetail = (orderId: number) => {
    router.push(`/purchase/orders/${orderId}`);
  };

  const toggleRowExpand = (order: PurchaseOrder) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(order.id)) {
      newExpanded.delete(order.id);
    } else {
      newExpanded.add(order.id);
    }
    setExpandedRows(newExpanded);
  };

  const handleDelete = async (order: PurchaseOrder) => {
    if (!confirm(tc('confirmDeletePrefix', { name: order.po_no }))) return;

    try {
      const data = await ApiClient.delete('/api/purchase/orders', { id: order.id });
      if (data.success) {
        toast({ title: tc('success'), description: tc('deleteSuccess') });
        fetchOrders();
      } else {
        toast({
          title: tc('error'),
          description: data.message || tc('deleteFailed'),
          variant: 'destructive',
        });
      }
    } catch {
      toast({ title: tc('error'), description: tc('deleteFailed'), variant: 'destructive' });
    }
  };

  const handleBatchDelete = async () => {
    if (!selected.size) return;

    const selectedOrderInfo = orders.filter((o) => selected.has(String(o.id)));
    const orderNumbers = selectedOrderInfo.map((o) => o.po_no).join(', ');

    if (!confirm(tc('confirmBatchDelete', { count: selectedOrderInfo.length, orderNumbers }))) return;

    try {
      setLoading(true);

      // 逐个删除采购单
      let successCount = 0;
      for (const { id: orderId } of selectedOrderInfo) {
        const data = await ApiClient.delete('/api/purchase/orders', { id: orderId });
        if (data.success) {
          successCount++;
        }
      }

      if (successCount > 0) {
        toast({ title: ts('k_1rraohc'), description: `成功删除 ${successCount} 个采购单` });
        fetchOrders();
      } else {
        toast({ title: ts('k_v9pftt'), description: ts('k_1ijrr73'), variant: 'destructive' });
      }
    } catch {
      toast({ title: ts('k_v9pftt'), description: ts('k_1ijrr73'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: number, action: string) => {
    let _newStatus = 0;
    if (action === 'submit') _newStatus = PO_STATUS.PENDING_APPROVAL;
    else if (action === 'approve') _newStatus = PO_STATUS.APPROVED;
    else return;

    try {
      const data = await ApiClient.put('/api/purchase/orders', { id: orderId, action });
      if (data.success) {
        toast({ title: tc('success'), description: tc('statusUpdateSuccess') });
        fetchOrders();
      } else {
        toast({
          title: tc('error'),
          description: data.message || tc('statusUpdateFailed'),
          variant: 'destructive',
        });
      }
    } catch {
      toast({ title: tc('error'), description: tc('statusUpdateFailed'), variant: 'destructive' });
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchOrders(keyword);
  };

  const _handleExport = (format: string) => {
    const statusMap: Record<number, string> = {
      10: tc('draft'),
      20: tc('pending'),
      30: tc('approved'),
      40: t('partialReceived'),
      50: t('completed'),
      90: tc('closed'),
    };
    const data = orders.map((o) => ({
      [t('poNo')]: o.po_no,
      [t('supplier')]: o.supplier_name,
      [t('orderDate')]: formatDate(o.order_date),
      [t('expectedDelivery')]: formatDate(o.delivery_date),
      [t('totalQty')]: o.total_quantity,
      [t('totalAmount')]: Number(o.grand_total || o.total_amount || 0).toFixed(2),
      [tc('status')]: statusMap[o.status] || `${tc('unknown')}(${o.status})`,
      [tc('remark')]: o.remark || '',
    }));

    if (format === 'xls' || format === 'excel') {
      const headers = Object.keys(data[0] || {});
      const csvContent = [
        headers.join('\t'),
        ...data.map((row) =>
          headers.map((h) => (row as Record<string, unknown>)[h] ?? '').join('\t')
        ),
      ].join('\n');
      const bom = '\uFEFF';
      const blob = new Blob([bom + csvContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `采购订单_${new Date().toISOString().slice(0, 10)}.xls`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: ts('k_1hkfymq'), description: ts('k_y6mc99') });
    } else if (format === 'pdf') {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;
      const headers = Object.keys(data[0] || {});
      const thCells = headers.map((h) => `<th>${h}</th>`).join('');
      const rows = data
        .map(
          (row) =>
            '<tr>' +
            headers.map((h) => `<td>${(row as Record<string, unknown>)[h] ?? ''}</td>`).join('') +
            '</tr>'
        )
        .join('');
      printWindow.document.write(`<!DOCTYPE html><html><head><title>采购订单导出</title>
<style>
  body{font-family:"Microsoft YaHei",sans-serif;padding:20px}
  h1{text-align:center;font-size:18px;margin-bottom:4px}
  p.sub{text-align:center;color:#666;font-size:12px;margin-bottom:16px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{border:1px solid #333;padding:6px 8px;text-align:center}
  th{background:#f0f0f0;font-weight:bold}
  @media print{body{padding:0}}
</style></head><body>
<h1>采购订单列表</h1>
<p class="sub">导出时间：${new Date().toLocaleString()} | 共 ${data.length} 条</p>
<table><thead><tr>${thCells}</tr></thead><tbody>${rows}</tbody></table>
<script>window.onload=function(){window.print()}</script>
</body></html>`);
      printWindow.document.close();
      toast({ title: ts('k_1hkfymq'), description: ts('k_1fd5yss') });
    } else if (format === 'word') {
      const headers = Object.keys(data[0] || {});
      const thCells = headers
        .map((h) => `<th style="border:1px solid #333;padding:6px;background:#f0f0f0">${h}</th>`)
        .join('');
      const rows = data
        .map(
          (row) =>
            '<tr>' +
            headers
              .map(
                (h) =>
                  `<td style="border:1px solid #333;padding:6px">${(row as Record<string, unknown>)[h] ?? ''}</td>`
              )
              .join('') +
            '</tr>'
        )
        .join('');
      const htmlContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>采购订单</title></head>
<body style="font-family:'Microsoft YaHei',sans-serif;padding:20px">
<h1 style="text-align:center">采购订单列表</h1>
<p style="text-align:center;color:#666;font-size:12px">导出时间：${new Date().toLocaleString()}</p>
<table style="width:100%;border-collapse:collapse;font-size:12px">
<thead><tr>${thCells}</tr></thead><tbody>${rows}</tbody></table>
</body></html>`;
      const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `采购订单_${new Date().toISOString().slice(0, 10)}.doc`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: ts('k_1hkfymq'), description: ts('k_kcr5su') });
    }
  };

  const handleSort = (field: string) => {
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

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    if (sortOrder === 'asc') return <ArrowUp className="ml-1 h-3 w-3" />;
    return <ArrowDown className="ml-1 h-3 w-3" />;
  };

  const sortedOrders = useMemo(() => {
    if (!sortField || !sortOrder) return orders;
    return [...orders].sort((a, b) => {
      let aVal: string | number = (a as Record<string, unknown>)[sortField] as string | number;
      let bVal: string | number = (b as Record<string, unknown>)[sortField] as string | number;
      if (
        sortField === 'total_amount' ||
        sortField === 'grand_total' ||
        sortField === 'total_quantity' ||
        sortField === 'status'
      ) {
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
  }, [orders, sortField, sortOrder]);

  const {
    selected,
    selectedCount,
    isSelected,
    allSelected,
    toggle,
    toggleAll,
    selectAllRef,
  } = useRowSelection(sortedOrders, (o) => String(o.id));

  const handlePrintList = () => {
    const dataToPrint = selected.size > 0 ? orders.filter((o) => selected.has(String(o.id))) : orders;

    if (dataToPrint.length === 0) {
      toast({ title: tc('info'), description: tc('noDataToPrint'), variant: 'destructive' });
      return;
    }

    const statusLabels: Record<number, string> = {
      10: tc('draft'),
      20: tc('pending'),
      30: tc('approved'),
      40: t('partialReceived'),
      50: t('completed'),
      90: tc('closed'),
    };

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: tc('error'),
        description: tc('printWindowBlocked'),
        variant: 'destructive',
      });
      return;
    }

    const orderSections = dataToPrint
      .map((o, _orderIndex) => {
        const lines = o.lines || [];
        const lineRows =
          lines.length > 0
            ? lines
                .map(
                  (item: Loose, idx: number) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${item.material_code || '-'}</td>
            <td>${item.material_name || '-'}</td>
            <td>${item.material_spec || item.specification || '-'}</td>
            <td class="num">${item.order_qty ?? item.quantity ?? 0}</td>
            <td>${item.unit || '-'}</td>
            <td class="num">${Number(item.unit_price || 0).toFixed(2)}</td>
            <td class="num">${Number(item.amount || (item.order_qty || item.quantity) * (item.unit_price || 0)).toFixed(2)}</td>
            <td class="num">${item.received_qty ?? 0}</td>
          </tr>`
                )
                .join('')
            : ts('k_epq0m0');

        return `
        <div class="order-block">
          <div class="order-header">
            <span class="order-no">${o.po_no}</span>
            <span class="order-info">供应商：${o.supplier_name} | 下单日期：${formatDate(o.order_date)} | 期望到货：${formatDate(o.delivery_date)} | 状态：${statusLabels[o.status] || tc('unknown')}</span>
          </div>
          <table>
            <thead><tr><th>{tc("serialNo")}</th><th>物料编码</th><th>物料名称</th><th>规格型号</th><th>{tc("quantity")}</th><th>{tc("unit")}</th><th>单价</th><th>{tc("amount")}</th><th>已收数量</th></tr></thead>
            <tbody>${lineRows}</tbody>
            <tfoot>
              <tr>
                <td colspan="4" style="text-align:right;font-weight:bold;">{tc("total")}</td>
                <td class="num" style="font-weight:bold;">${o.total_quantity || 0}</td>
                <td></td>
                <td></td>
                <td class="num" style="font-weight:bold;">¥${Number(o.grand_total || o.total_amount || 0).toLocaleString()}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
          ${o.remark ? `<div class="remark">备注：${o.remark}</div>` : ''}
        </div>`;
      })
      .join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>采购订单打印</title>
      <style>
        @page { size: A4; margin: 10mm; }
        body { font-family: "Microsoft YaHei", Arial, sans-serif; padding: 20px; color: #333; font-size: 12px; }
        h1 { text-align: center; border-bottom: 2px solid #1a56db; padding-bottom: 10px; color: #1a56db; font-size: 20px; margin-bottom: 5px; }
        .info { text-align: center; color: #666; margin-bottom: 15px; font-size: 13px; }
        .order-block { margin-bottom: 20px; page-break-inside: avoid; }
        .order-header { background: #f0f4ff; padding: 8px 12px; border: 1px solid #c8d6f0; border-bottom: none; border-radius: 4px 4px 0 0; display: flex; justify-content: space-between; align-items: center; }
        .order-no { font-weight: bold; font-size: 14px; color: #1a56db; }
        .order-info { color: #555; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th, td { border: 1px solid #999; padding: 4px 6px; text-align: center; }
        th { background-color: #f0f4ff; font-weight: bold; color: #1a56db; }
        tfoot td { background-color: #f8f9fa; }
        .num { text-align: right; }
        .remark { padding: 4px 12px; color: #666; font-size: 11px; border: 1px solid #c8d6f0; border-top: none; border-radius: 0 0 4px 4px; }
        .footer { margin-top: 20px; text-align: right; color: #999; font-size: 11px; }
        @media print { body { padding: 0; } .order-block { page-break-inside: avoid; } }
      </style></head>
      <body>
        <h1>采购订单</h1>
        <div class="info">打印时间：${new Date().toLocaleString('zh-CN')} | 共 ${dataToPrint.length} 条采购订单</div>
        ${orderSections}
        <div class="footer">${companyName}</div>
        <script>window.onload=function(){window.print();}</script>
      </body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    toast({ title: tc('print'), description: `正在打印 ${dataToPrint.length} 条采购订单` });
  };

  return (
    <MainLayout title={t('purchaseOrder')}>
      <div className="space-y-6">        <StatsCards
          configs={[
            { key: 'pending', label: '待下单', icon: Clock, ...StatsTheme.orange },
            { key: 'ordered', label: '已下单', icon: ShoppingCart, ...StatsTheme.blue },
            { key: 'partial', label: '部分到货', icon: PackageOpen, ...StatsTheme.yellow },
            { key: 'completed', label: '已完成', icon: CheckCircle, ...StatsTheme.green },
            { key: 'monthlyAmount', label: '本月采购额', icon: Banknote, ...StatsTheme.purple },
          ]}
          stats={[
            { key: 'pending', count: stats.pending },
            { key: 'ordered', count: stats.ordered },
            { key: 'partial', count: stats.partial },
            { key: 'completed', count: stats.completed },
            { key: 'monthlyAmount', count: stats.monthlyAmount, prefix: '¥' },
          ]}
          cols={{ mobile: 2, tablet: 3, desktop: 5 }}
        />


        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-1 gap-4 items-center w-full md:w-auto">
                <SearchInput
                  placeholder={t('searchOrderPlaceholder')}
                  value={keyword}
                  onChange={setKeyword}
                  onSearch={(kw) => {
                    setPage(1);
                    fetchOrders(kw);
                  }}
                  className="flex-1 max-w-sm"
                />
                <Select
                  value={statusFilter}
                  onValueChange={(v) => {
                    setStatusFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder={tc('orderStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{tc('allStatus')}</SelectItem>
                    <SelectItem value="10">{tc('draft')}</SelectItem>
                    <SelectItem value="20">{tc('pending')}</SelectItem>
                    <SelectItem value="30">{tc('approved')}</SelectItem>
                    <SelectItem value="40">{t('partialReceived')}</SelectItem>
                    <SelectItem value="50">{tc('completed')}</SelectItem>
                    <SelectItem value="90">{tc('closed')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={handleSearch}>
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <div className="flex gap-2">
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
                  filename={ts('k_1sy8pjo')}
                  title={ts('k_1w93sn7')}
                  landscape
                  columns={[
                    { key: 'po_no', label: t('poNo'), width: 18 },
                    { key: 'supplier_name', label: t('supplier'), width: 20 },
                    {
                      key: 'order_date',
                      label: t('orderDate'),
                      width: 12,
                      formatter: (v) => formatDate(v),
                    },
                    {
                      key: 'delivery_date',
                      label: t('expectedDelivery'),
                      width: 12,
                      formatter: (v) => formatDate(v),
                    },
                    { key: 'total_quantity', label: t('totalQty'), width: 10 },
                    {
                      key: 'grand_total',
                      label: tc('amount'),
                      width: 12,
                      formatter: (_v, row) =>
                        Number(row.grand_total || row.total_amount || 0).toFixed(2),
                    },
                    {
                      key: 'status',
                      label: tc('status'),
                      width: 10,
                      formatter: (v) => {
                        const m: Record<number, string> = {
                          10: tc('draft'),
                          20: tc('pending'),
                          30: tc('approved'),
                          40: t('partialReceived'),
                          50: t('completed'),
                          90: tc('closed'),
                        };
                        return m[v] || `${tc('unknown')}(${v})`;
                      },
                    },
                    { key: 'remark', label: tc('remark'), width: 20 },
                  ]}
                  data={
                    selected.size > 0
                      ? orders.filter((o) => selected.has(String(o.id)))
                      : sortedOrders
                  }
                />
                <Link href="/purchase/orders/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('newPurchaseOrder')}
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('purchaseOrders')}</CardTitle>
            <CardDescription>
              {tc('totalRecords', { count: total })} {tc('purchase')}
              {tc('record')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && orders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">{tc('loading')}</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{t('noPurchaseOrders')}</p>
              </div>
            ) : (
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
                      onClick={() => handleSort('po_no')}
                    >
                      <span className="inline-flex items-center">
                        {t('poNo')}
                        {getSortIcon('po_no')}
                      </span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => handleSort('supplier_name')}
                    >
                      <span className="inline-flex items-center">
                        {t('supplier')}
                        {getSortIcon('supplier_name')}
                      </span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => handleSort('order_date')}
                    >
                      <span className="inline-flex items-center">
                        {t('orderDate')}
                        {getSortIcon('order_date')}
                      </span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => handleSort('delivery_date')}
                    >
                      <span className="inline-flex items-center">
                        {t('expectedDelivery')}
                        {getSortIcon('delivery_date')}
                      </span>
                    </TableHead>
                    <TableHead
                      className="text-right cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => handleSort('total_quantity')}
                    >
                      <span className="inline-flex items-center justify-end">
                        {t('totalQty')}
                        {getSortIcon('total_quantity')}
                      </span>
                    </TableHead>
                    <TableHead
                      className="text-right cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => handleSort('grand_total')}
                    >
                      <span className="inline-flex items-center justify-end">
                        {tc('amount')}
                        {getSortIcon('grand_total')}
                      </span>
                    </TableHead>
                    <TableHead className="text-right">{tc('baseCurrencyAmount')}</TableHead>
                    <TableHead>{tc('currency')}</TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => handleSort('status')}
                    >
                      <span className="inline-flex items-center">
                        {tc('status')}
                        {getSortIcon('status')}
                      </span>
                    </TableHead>
                    <TableHead className="text-right">{tc('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedOrders.map((order) => {
                    const isExpanded = expandedRows.has(order.id);
                    const lines = order.lines || [];
                    return (
                      <Fragment key={order.id}>
                        <TableRow key={order.id} className="hover:bg-muted/50">
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
                              onClick={() => toggleRowExpand(order)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="font-mono">{order.po_no}</TableCell>
                          <TableCell>{order.supplier_name}</TableCell>
                          <TableCell>{formatDate(order.order_date)}</TableCell>
                          <TableCell>{formatDate(order.delivery_date)}</TableCell>
                          <TableCell className="text-right">{order.total_quantity}</TableCell>
                          <TableCell className="text-right">
                            <MoneyDisplay
                              amount={Number(order.grand_total || order.total_amount || 0)}
                              currency={order.currency || 'CNY'}
                              baseAmount={order.base_grand_total}
                              baseCurrency={order.base_currency}
                              showSymbol={false}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            {order.base_currency && order.base_grand_total !== undefined ? (
                              <span className="font-medium">
                                {Number(order.base_grand_total).toLocaleString('zh-CN', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                                <span className="text-xs text-muted-foreground ml-1">
                                  {order.base_currency}
                                </span>
                              </span>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>{order.currency || 'CNY'}</TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewDetail(order.id)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  {t('viewDetail')}
                                </DropdownMenuItem>
                                {order.status === 10 && (
                                  <DropdownMenuItem
                                    onClick={() => handleStatusChange(order.id, 'submit')}
                                  >
                                    <Send className="h-4 w-4 mr-2" />
                                    {t('submitApproval')}
                                  </DropdownMenuItem>
                                )}
                                {order.status === 20 && (
                                  <DropdownMenuItem
                                    onClick={() => handleStatusChange(order.id, 'approve')}
                                  >
                                    <FileText className="h-4 w-4 mr-2" />
                                    {t('approve')}
                                  </DropdownMenuItem>
                                )}
                                {order.status < 30 && (
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => handleDelete(order)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {tc('delete')}
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow key={`${order.id}-detail`}>
                            <TableCell colSpan={12} className="p-0">
                              <div className="bg-slate-50 dark:bg-slate-800 border-t dark:border-slate-700">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-slate-100/50 dark:bg-slate-700/50 hover:bg-slate-100/50 dark:hover:bg-slate-700/50">
                                      <TableHead className="pl-8 text-xs font-normal text-muted-foreground">
                                        {t('materialCode')}
                                      </TableHead>
                                      <TableHead className="text-xs font-normal text-muted-foreground">
                                        {t('materialName')}
                                      </TableHead>
                                      <TableHead className="text-xs font-normal text-muted-foreground">
                                        {t('specification')}
                                      </TableHead>
                                      <TableHead className="text-xs font-normal text-muted-foreground text-right">
                                        {tc('quantity')}
                                      </TableHead>
                                      <TableHead className="text-xs font-normal text-muted-foreground">
                                        {tc('unit')}
                                      </TableHead>
                                      <TableHead className="text-xs font-normal text-muted-foreground text-right">
                                        {t('unitPrice')}
                                      </TableHead>
                                      <TableHead className="text-xs font-normal text-muted-foreground text-right">
                                        {tc('amount')}
                                      </TableHead>
                                      <TableHead className="text-xs font-normal text-muted-foreground text-right">
                                        {tc('baseCurrencyAmount')}
                                      </TableHead>
                                      <TableHead className="text-xs font-normal text-muted-foreground">
                                        {t('receivedQty')}
                                      </TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {lines.length > 0 ? (
                                      lines.map((item: Loose, idx: number) => (
                                        <TableRow
                                          key={idx}
                                          className="bg-transparent hover:bg-white/60 dark:hover:bg-slate-700/60"
                                        >
                                          <TableCell className="pl-8 font-mono text-sm">
                                            {item.material_code || '-'}
                                          </TableCell>
                                          <TableCell className="text-sm">
                                            {item.material_name || '-'}
                                          </TableCell>
                                          <TableCell className="text-sm">
                                            {item.material_spec || item.specification || '-'}
                                          </TableCell>
                                          <TableCell className="text-sm text-right">
                                            {item.order_qty ?? item.quantity ?? 0}
                                          </TableCell>
                                          <TableCell className="text-sm">
                                            {item.unit || '-'}
                                          </TableCell>
                                          <TableCell className="text-sm text-right">
                                            {Number(item.unit_price || 0).toFixed(2)}
                                          </TableCell>
                                          <TableCell className="text-sm text-right font-medium">
                                            {Number(
                                              item.amount ||
                                                (item.order_qty || item.quantity) *
                                                  (item.unit_price || 0)
                                            ).toFixed(2)}
                                          </TableCell>
                                          <TableCell className="text-sm text-right">
                                            {item.base_amount !== undefined ? (
                                              <span className="font-medium">
                                                {Number(item.base_amount).toLocaleString('zh-CN', {
                                                  minimumFractionDigits: 2,
                                                  maximumFractionDigits: 2,
                                                })}
                                                <span className="text-xs text-muted-foreground ml-1">
                                                  {order.base_currency || 'CNY'}
                                                </span>
                                              </span>
                                            ) : (
                                              '-'
                                            )}
                                          </TableCell>
                                          <TableCell className="text-sm">
                                            {item.received_qty ?? 0}
                                          </TableCell>
                                        </TableRow>
                                      ))
                                    ) : (
                                      <TableRow>
                                        <TableCell
                                          colSpan={9}
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
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {total > pageSize && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-muted-foreground">
              {ts('k_1vsm2qk')}{total}{ts('k_1rfm5gs')}
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
                {tc('pageOf', { page, pages: Math.ceil(total / pageSize) })}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page * pageSize >= total}
                onClick={() => setPage((p) => p + 1)}
              >
                {tc('nextPage')}
              </Button>
            </div>
          </div>
        )}

      </div>
    </MainLayout>
  );
}
